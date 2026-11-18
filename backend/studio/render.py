"""Render pipeline steps, invoked by the Step Functions state machine.

  prepare -> Map(start_shot -> wait -> check_shot ...) -> assemble -> wait ->
  check_assemble ... -> finalize

Shots are rendered with Luma Ray2 on Bedrock (image-to-video from the shot's
keyframe, optionally ending on the next shot's keyframe for seamless
"continuous" transitions). Clips and padded voiceover tracks are stitched by
AWS Elemental MediaConvert. A provenance manifest (content credentials) is
written next to the final file.
"""
from __future__ import annotations

import base64
import hashlib
import json

from . import common, director, pricing

RAY2_MODEL = "luma.ray-v2:0"
MAX_SHOT_POLLS = 60       # x 30s wait = 30 minutes per shot
MAX_ASSEMBLE_POLLS = 80   # x 15s wait = 20 minutes


def _render_keys(user_id: str, project_id: str, render_id: str):
    return f"PROJECT#{project_id}", f"RENDER#{render_id}"


def load_render(project_id: str, render_id: str) -> dict:
    r = common.get_item(*_render_keys("", project_id, render_id))
    if not r:
        raise RuntimeError(f"render {render_id} not found")
    return r


def save_render(render: dict) -> None:
    common.put_item(f"PROJECT#{render['projectId']}", f"RENDER#{render['id']}", render)


def s3_uri(key: str) -> str:
    return f"s3://{common.bucket()}/{key}"


def _b64_object(key: str) -> str:
    body = common.client("s3").get_object(Bucket=common.bucket(), Key=key)["Body"].read()
    return base64.b64encode(body).decode()


def ray2_input(render: dict, shot: dict, next_shot: dict | None) -> dict:
    board = render["board"]
    model_input = {
        "prompt": director.compose_video_prompt(board, shot),
        "aspect_ratio": board.get("aspectRatio", "16:9"),
        "duration": f"{shot['duration']}s",
        "resolution": render["resolution"],
        "loop": False,
    }
    keyframes = {}
    if shot.get("keyframe", {}).get("key"):
        keyframes["frame0"] = {"type": "image", "source": {
            "type": "base64", "media_type": "image/jpeg", "data": _b64_object(shot["keyframe"]["key"])}}
    if shot.get("transition") == "continuous" and next_shot and next_shot.get("keyframe", {}).get("key"):
        keyframes["frame1"] = {"type": "image", "source": {
            "type": "base64", "media_type": "image/jpeg", "data": _b64_object(next_shot["keyframe"]["key"])}}
    if keyframes:
        model_input["keyframes"] = keyframes
    return model_input


# ------------------------------- steps ------------------------------------- #

def prepare(event: dict) -> dict:
    render = load_render(event["projectId"], event["renderId"])
    render["status"] = "rendering"
    save_render(render)
    return {**event, "shots": [{"shotId": s["id"], "index": i} for i, s in enumerate(render["board"]["shots"])
                               if s["id"] in render["shotIds"]]}


def start_shot(event: dict) -> dict:
    render = load_render(event["projectId"], event["renderId"])
    shots = render["board"]["shots"]
    i = event["index"]
    shot = shots[i]
    fp = pricing.shot_fingerprint(shot, render["resolution"])
    if shot.get("clip", {}).get("fingerprint") == fp and shot["clip"].get("key"):
        return {**event, "status": "Completed", "clipKey": shot["clip"]["key"], "cached": True, "fingerprint": fp}
    next_shot = shots[i + 1] if i + 1 < len(shots) else None
    prefix = f"renders/{render['userId']}/{render['projectId']}/clips/{shot['id']}-{fp}"
    r = common.client("bedrock-runtime").start_async_invoke(
        modelId=RAY2_MODEL, modelInput=ray2_input(render, shot, next_shot),
        outputDataConfig={"s3OutputDataConfig": {"s3Uri": s3_uri(prefix)}},
        clientRequestToken=hashlib.sha256(f"{render['id']}{shot['id']}{fp}".encode()).hexdigest()[:64],
    )
    return {**event, "status": "InProgress", "invocationArn": r["invocationArn"], "fingerprint": fp}


def check_shot(event: dict) -> dict:
    if event.get("status") == "Completed":
        return event
    polls = int(event.get("polls", 0)) + 1
    event = {**event, "polls": polls}
    r = common.client("bedrock-runtime").get_async_invoke(invocationArn=event["invocationArn"])
    status = r["status"]
    if status == "Completed":
        uri = r["outputDataConfig"]["s3OutputDataConfig"]["s3Uri"].rstrip("/")
        prefix = uri.split(f"s3://{common.bucket()}/", 1)[1]
        objs = common.client("s3").list_objects_v2(Bucket=common.bucket(), Prefix=prefix).get("Contents", [])
        mp4 = next((o["Key"] for o in objs if o["Key"].endswith(".mp4")), None)
        if not mp4:
            return {**event, "status": "Failed", "error": "clip missing from output"}
        return {**event, "status": "Completed", "clipKey": mp4}
    if status == "Failed":
        return {**event, "status": "Failed", "error": r.get("failureMessage", "generation failed")[:500]}
    if polls >= MAX_SHOT_POLLS:
        return {**event, "status": "Failed", "error": "timed out waiting for the video model"}
    return {**event, "status": "InProgress"}


def mediaconvert_client():
    mc = common.client("mediaconvert")
    try:
        ep = mc.describe_endpoints(MaxResults=1)["Endpoints"][0]["Url"]
        import boto3
        mc = boto3.client("mediaconvert", region_name=common.region(), endpoint_url=ep)
        common.set_client("mediaconvert", mc)
    except Exception:
        pass  # regional endpoint works for accounts that no longer need DescribeEndpoints
    return mc


def build_job_settings(clips: list[str], audio: list[str | None], destination: str) -> dict:
    with_audio = all(audio)
    inputs = []
    for clip, vo in zip(clips, audio):
        inp = {"FileInput": s3_uri(clip), "TimecodeSource": "ZEROBASED", "VideoSelector": {}}
        if with_audio:
            inp["AudioSelectors"] = {"Audio Selector 1": {"ExternalAudioFileInput": s3_uri(vo),
                                                           "DefaultSelection": "DEFAULT"}}
        inputs.append(inp)
    output = {
        "NameModifier": "_final",
        "ContainerSettings": {"Container": "MP4", "Mp4Settings": {"MoovPlacement": "PROGRESSIVE_DOWNLOAD"}},
        "VideoDescription": {"CodecSettings": {"Codec": "H_264", "H264Settings": {
            "RateControlMode": "QVBR", "QvbrSettings": {"QvbrQualityLevel": 8},
            "MaxBitrate": 8000000, "SceneChangeDetect": "TRANSITION_DETECTION"}}},
    }
    if with_audio:
        output["AudioDescriptions"] = [{"AudioSourceName": "Audio Selector 1", "CodecSettings": {
            "Codec": "AAC", "AacSettings": {"Bitrate": 96000, "CodingMode": "CODING_MODE_1_0", "SampleRate": 48000}}}]
    return {
        "TimecodeConfig": {"Source": "ZEROBASED"},
        "Inputs": inputs,
        "OutputGroups": [{
            "Name": "File Group",
            "OutputGroupSettings": {"Type": "FILE_GROUP_SETTINGS",
                                    "FileGroupSettings": {"Destination": s3_uri(destination)}},
            "Outputs": [output],
        }],
    }


def assemble(event: dict) -> dict:
    render = load_render(event["projectId"], event["renderId"])
    results = {r["shotId"]: r for r in event.get("results", [])}
    failed = [sid for sid, r in results.items() if r.get("status") != "Completed"]
    by_id = {s["id"]: s for s in render["board"]["shots"]}
    for sid, r in results.items():
        render.setdefault("shotStatus", {})[sid] = {k: r.get(k) for k in ("status", "clipKey", "error", "cached")}
        if r.get("status") == "Completed":
            by_id[sid]["clip"] = {"key": r["clipKey"], "resolution": render["resolution"],
                                  "fingerprint": r["fingerprint"]}
    save_render(render)
    if failed:
        return {**event, "assembleStatus": "Failed", "error": f"{len(failed)} shot(s) failed: {', '.join(failed)}"}
    shots = [s for s in render["board"]["shots"] if s.get("clip")]
    clips = [s["clip"]["key"] for s in shots]
    audio = [s.get("voiceover", {}).get("key") for s in shots]
    base = f"renders/{render['userId']}/{render['projectId']}/{render['id']}/video"
    job = mediaconvert_client().create_job(
        Role=common.env("MEDIACONVERT_ROLE_ARN"),
        Settings=build_job_settings(clips, audio, base),
        UserMetadata={"renderId": render["id"], "projectId": render["projectId"]},
        Tags={"app": "kyverin-studio"},
    )
    render["status"] = "assembling"
    render["finalKey"] = base + "_final.mp4"
    save_render(render)
    return {**event, "assembleStatus": "InProgress", "jobId": job["Job"]["Id"]}


def check_assemble(event: dict) -> dict:
    polls = int(event.get("assemblePolls", 0)) + 1
    event = {**event, "assemblePolls": polls}
    job = mediaconvert_client().get_job(Id=event["jobId"])["Job"]
    st = job["Status"]
    if st == "COMPLETE":
        return {**event, "assembleStatus": "Completed"}
    if st in ("ERROR", "CANCELED"):
        return {**event, "assembleStatus": "Failed", "error": job.get("ErrorMessage", st)[:500]}
    if polls >= MAX_ASSEMBLE_POLLS:
        return {**event, "assembleStatus": "Failed", "error": "timed out waiting for assembly"}
    return {**event, "assembleStatus": "InProgress"}


def provenance(render: dict, sha256: str, size: int) -> dict:
    """A C2PA-style content-credentials manifest describing how the video was made."""
    board = render["board"]
    return {
        "claim_generator": "Kyverin Studio/2.0",
        "format": "video/mp4",
        "asset": {"sha256": sha256, "bytes": size, "key": render.get("finalKey")},
        "created": common.now(),
        "creator": render["userId"],
        "assertions": [
            {"label": "c2pa.actions", "data": {"actions": [
                {"action": "c2pa.created", "digitalSourceType":
                 "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"}]}},
            {"label": "kyverin.models", "data": {
                "director": common.env("DIRECTOR_MODEL_ID"), "keyframes": "stability.stable-image-core-v1:1",
                "video": RAY2_MODEL, "voice": "amazon-polly-neural", "assembly": "aws-elemental-mediaconvert"}},
            {"label": "kyverin.storyboard", "data": {
                "title": board.get("title"), "styleBible": board.get("styleBible"),
                "shots": [{"id": s["id"], "keyframePrompt": s.get("keyframePrompt"),
                           "videoPrompt": s.get("videoPrompt"), "duration": s["duration"]} for s in board["shots"]]}},
        ],
        "notice": "This video was generated with AI.",
    }


def finalize(event: dict) -> dict:
    from . import media
    render = load_render(event["projectId"], event["renderId"])
    err = event.get("error")
    if isinstance(err, dict):  # a Step Functions Catch: {"Error": ..., "Cause": ...}
        err = f"{err.get('Error', 'error')}: {str(err.get('Cause', ''))[:300]}"
    ok = event.get("assembleStatus") == "Completed" and not err
    if ok:
        obj = common.client("s3").get_object(Bucket=common.bucket(), Key=render["finalKey"])
        h, size = hashlib.sha256(), 0
        for chunk in iter(lambda: obj["Body"].read(1 << 20), b""):
            h.update(chunk)
            size += len(chunk)
        base = render["finalKey"].rsplit("/", 1)[0]
        manifest = provenance(render, h.hexdigest(), size)
        common.put_bytes(f"{base}/provenance.json", json.dumps(manifest, indent=2).encode(), "application/json")
        common.put_bytes(f"{base}/captions.vtt", media.build_vtt(render["board"]["shots"]).encode(), "text/vtt")
        common.put_bytes(f"{base}/captions.srt", media.build_srt(render["board"]["shots"]).encode(), "application/x-subrip")
        render.update(status="complete", provenanceKey=f"{base}/provenance.json",
                      captionsKey=f"{base}/captions.vtt", srtKey=f"{base}/captions.srt", sha256=h.hexdigest())
    else:
        # Refund credits for shots that did not produce a clip, plus assembly.
        refund = sum(line["credits"] for line in render["estimate"]["shots"]
                     if render.get("shotStatus", {}).get(line["shotId"], {}).get("status") != "Completed")
        refund += render["estimate"]["assemblyCredits"]
        if refund and not render.get("refunded"):
            common.adjust_credits(render["userId"], refund, "render refund", render["id"])
            render["refunded"] = refund
        render.update(status="failed", error=str(err or "render failed")[:500])
    render["finished"] = common.now()
    save_render(render)
    # Write rendered clip info back to the project so unchanged shots are reused next time.
    pk, sk = f"USER#{render['userId']}", f"PROJECT#{render['projectId']}"
    project = common.get_item(pk, sk)
    if project and project.get("board"):
        clips = {s["id"]: s.get("clip") for s in render["board"]["shots"] if s.get("clip")}
        for s in project["board"]["shots"]:
            if s["id"] in clips and pricing.shot_fingerprint(s, render["resolution"]) == clips[s["id"]]["fingerprint"]:
                s["clip"] = clips[s["id"]]
        project["latestRenderId"] = render["id"]
        project["updated"] = common.now()
        common.put_item(pk, sk, project)
    return {"status": render["status"], "renderId": render["id"]}


STEPS = {"prepare": prepare, "start_shot": start_shot, "check_shot": check_shot, "assemble": assemble,
         "check_assemble": check_assemble, "finalize": finalize}


def handler(event, _context=None):
    if event.get("action") == "publish_site":
        from . import publish
        return publish.publish_site(event["payload"])
    return STEPS[event["action"]](event["payload"])
