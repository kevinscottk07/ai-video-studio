"""HTTP API (API Gateway HTTP API -> Lambda, Cognito JWT authorizer)."""
from __future__ import annotations

import base64
import json
import re
import time
import traceback

from . import common, director, media, pricing
from .common import HttpError

EDITABLE_SHOT_FIELDS = ("title", "duration", "camera", "keyframePrompt", "videoPrompt", "narration",
                        "transition", "castInShot")
SERVER_SHOT_FIELDS = ("keyframe", "voiceover", "clip")


# ------------------------------ identity ----------------------------------- #

def identity(event: dict) -> dict:
    claims = (event.get("requestContext", {}).get("authorizer", {}).get("jwt", {}) or {}).get("claims", {})
    if not claims.get("sub"):
        raise HttpError(401, "Sign in required.")
    email = (claims.get("email") or "").lower()
    admins = {e.strip().lower() for e in common.env("ADMIN_EMAILS").split(",") if e.strip()}
    return {"userId": claims["sub"], "email": email, "isAdmin": email in admins}


def can_render(who: dict) -> bool:
    policy = common.env("RENDER_POLICY", "admins")
    return policy == "all" or who["isAdmin"]


def ensure_profile(who: dict) -> dict:
    pk = f"USER#{who['userId']}"
    prof = common.get_item(pk, "PROFILE")
    if not prof:
        prof = {"userId": who["userId"], "email": who["email"], "created": common.now(), "plan": "creator"}
        common.put_item(pk, "PROFILE", prof)
        if common.get_credits(who["userId"]) is None:
            start = int(common.env("ADMIN_START_CREDITS" if who["isAdmin"] else "WELCOME_CREDITS", "25"))
            common.adjust_credits(who["userId"], start, "welcome credits")
    return prof


# ------------------------------ projects ----------------------------------- #

def project_key(who: dict, pid: str):
    if not re.fullmatch(r"p[0-9a-f]{12}", pid or ""):
        raise HttpError(404, "Project not found.")
    return f"USER#{who['userId']}", f"PROJECT#{pid}"


def load_project(who: dict, pid: str) -> dict:
    p = common.get_item(*project_key(who, pid))
    if not p:
        raise HttpError(404, "Project not found.")
    return p


def save_project(who: dict, p: dict) -> None:
    p["updated"] = common.now()
    common.put_item(*project_key(who, p["id"]), p)


def with_urls(p: dict) -> dict:
    out = json.loads(json.dumps(p))
    for s in (out.get("board") or {}).get("shots", []):
        for f in SERVER_SHOT_FIELDS:
            if s.get(f, {}).get("key"):
                s[f]["url"] = common.presign(s[f]["key"])
        s["keyframeStale"] = bool(s.get("keyframe")) and s["keyframe"].get("prompt") != s.get("keyframePrompt")
    return out


def find_shot(p: dict, shot_id: str) -> dict:
    for s in (p.get("board") or {}).get("shots", []):
        if s["id"] == shot_id:
            return s
    raise HttpError(404, "Shot not found.")


def merge_shots(existing: list[dict], incoming: list[dict]) -> list[dict]:
    """Apply client edits to the shot list. Only editable fields are taken from
    the client; generated assets are carried over from the server copy, so a
    client can never point a shot at another user's media."""
    old = {s["id"]: s for s in existing}
    used = set()
    out = []
    for i, s in enumerate(incoming[:director.MAX_SHOTS]):
        sid = s.get("id") if s.get("id") in old and s.get("id") not in used else None
        base = dict(old[sid]) if sid else {"id": None}
        for f in EDITABLE_SHOT_FIELDS:
            if f in s:
                base[f] = s[f]
        base["duration"] = 9 if int(base.get("duration", 5)) >= 7 else 5
        if base.get("camera") not in director.CAMERA_MOVES:
            base["camera"] = "static"
        base["transition"] = "continuous" if base.get("transition") == "continuous" else "cut"
        for f in ("title", "keyframePrompt", "videoPrompt", "narration"):
            base[f] = str(base.get(f, ""))[:1200]
        base["castInShot"] = [str(c)[:40] for c in base.get("castInShot", [])][:6]
        if not sid:
            base["id"] = common.new_id("s")
        used.add(base["id"])
        out.append(base)
    return out


def list_projects(who, _body, _params):
    items = common.query_prefix(f"USER#{who['userId']}", "PROJECT#", limit=100)
    items.sort(key=lambda p: p.get("updated", 0), reverse=True)
    summaries = []
    for p in items:
        board = p.get("board") or {}
        thumb = next((s["keyframe"]["key"] for s in board.get("shots", []) if s.get("keyframe")), None)
        summaries.append({"id": p["id"], "title": board.get("title") or p["brief"]["idea"][:60],
                          "updated": p.get("updated"), "shots": len(board.get("shots", [])),
                          "aspectRatio": board.get("aspectRatio") or p["brief"].get("aspectRatio"),
                          "thumbnail": common.presign(thumb), "latestRenderId": p.get("latestRenderId")})
    return 200, {"projects": summaries}


def create_project(who, body, _params):
    brief = {k: body.get(k) for k in ("idea", "shots", "aspectRatio", "style", "tone", "purpose",
                                      "language", "brandNotes") if body.get(k) is not None}
    if not (brief.get("idea") or "").strip():
        raise HttpError(400, "Describe your video idea first.")
    p = {"id": common.new_id("p"), "userId": who["userId"], "created": common.now(), "brief": brief,
         "board": None, "seed": int(time.time() * 1000) % 2147483647,
         "settings": {"voiceGender": body.get("voiceGender", "female"), "resolution": "540p"}}
    save_project(who, p)
    return 201, with_urls(p)


def get_project(who, _body, params):
    p = load_project(who, params["id"])
    out = with_urls(p)
    if p.get("latestRenderId"):
        out["latestRender"] = render_view(common.get_item(f"PROJECT#{p['id']}", f"RENDER#{p['latestRenderId']}"))
    return 200, out


def update_project(who, body, params):
    p = load_project(who, params["id"])
    if "settings" in body:
        s = body["settings"]
        if s.get("voiceGender") in ("female", "male"):
            p["settings"]["voiceGender"] = s["voiceGender"]
        if s.get("resolution") in pricing.RAY2_USD_PER_SECOND:
            p["settings"]["resolution"] = s["resolution"]
    if p.get("board") and "board" in body:
        b = body["board"]
        for f, n in (("title", 120), ("logline", 300), ("styleBible", 600)):
            if f in b:
                p["board"][f] = str(b[f])[:n]
        if "cast" in b:
            p["board"]["cast"] = [{"name": str(c.get("name", ""))[:40], "look": str(c.get("look", ""))[:400]}
                                  for c in b["cast"][:6] if c.get("name")]
        if "shots" in b:
            p["board"]["shots"] = merge_shots(p["board"]["shots"], b["shots"])
            if not p["board"]["shots"]:
                raise HttpError(400, "A storyboard needs at least one shot.")
        director.guard(json.dumps({k: p["board"].get(k) for k in ("title", "styleBible", "cast", "shots")}))
    save_project(who, p)
    return 200, with_urls(p)


def delete_project(who, _body, params):
    p = load_project(who, params["id"])
    s3 = common.client("s3")
    for prefix in (f"projects/{who['userId']}/{p['id']}/", f"renders/{who['userId']}/{p['id']}/"):
        token = None
        while True:
            kw = {"Bucket": common.bucket(), "Prefix": prefix}
            if token:
                kw["ContinuationToken"] = token
            r = s3.list_objects_v2(**kw)
            objs = [{"Key": o["Key"]} for o in r.get("Contents", [])]
            if objs:
                s3.delete_objects(Bucket=common.bucket(), Delete={"Objects": objs, "Quiet": True})
            if not r.get("IsTruncated"):
                break
            token = r["NextContinuationToken"]
    common.delete_item(*project_key(who, p["id"]))
    return 200, {"deleted": p["id"]}


# --------------------------- AI generation --------------------------------- #

def generate_storyboard(who, body, params):
    p = load_project(who, params["id"])
    brief = {**p["brief"], **{k: v for k, v in body.items() if k in ("idea", "shots", "aspectRatio", "style",
                                                                      "tone", "purpose", "language", "brandNotes")}}
    cost = pricing.storyboard_credits()
    common.adjust_credits(who["userId"], -cost, "storyboard", p["id"])
    try:
        board = director.direct(brief)
    except Exception:
        common.adjust_credits(who["userId"], cost, "storyboard refund", p["id"])
        raise
    p["brief"], p["board"] = brief, board
    save_project(who, p)
    return 200, with_urls(p)


def generate_keyframe(who, body, params):
    p = load_project(who, params["id"])
    if not p.get("board"):
        raise HttpError(400, "Generate a storyboard first.")
    shot = find_shot(p, params["shotId"])
    prompt = director.compose_keyframe_prompt(p["board"], shot)
    director.guard(prompt)
    cost = pricing.keyframe_credits()
    common.adjust_credits(who["userId"], -cost, "keyframe", f"{p['id']}/{shot['id']}")
    try:
        seed = p["seed"] if not body.get("variation") else int(time.time()) % 2147483647
        img = media.generate_keyframe(prompt, p["board"]["aspectRatio"], seed)
    except Exception:
        common.adjust_credits(who["userId"], cost, "keyframe refund", f"{p['id']}/{shot['id']}")
        raise
    key = f"projects/{who['userId']}/{p['id']}/keyframes/{shot['id']}-{common.new_id()}.jpg"
    common.put_bytes(key, img, "image/jpeg")
    shot["keyframe"] = {"key": key, "prompt": shot["keyframePrompt"], "created": common.now()}
    save_project(who, p)
    return 200, with_urls(p)


def upload_keyframe(who, body, params):
    """Bring your own reference frame (product shot, character photo you own)."""
    p = load_project(who, params["id"])
    shot = find_shot(p, params["shotId"])
    try:
        data = base64.b64decode(body.get("imageBase64", ""), validate=True)
    except Exception:
        raise HttpError(400, "Invalid image data.")
    if not data.startswith(b"\xff\xd8") or len(data) > 6_000_000:
        raise HttpError(400, "Upload a JPEG under 6 MB.")
    key = f"projects/{who['userId']}/{p['id']}/keyframes/{shot['id']}-{common.new_id()}.jpg"
    common.put_bytes(key, data, "image/jpeg")
    shot["keyframe"] = {"key": key, "prompt": shot["keyframePrompt"], "uploaded": True, "created": common.now()}
    save_project(who, p)
    return 200, with_urls(p)


def _voiceover_current(p: dict, shot: dict) -> bool:
    vo = shot.get("voiceover") or {}
    return bool(vo.get("key")) and vo.get("text") == shot.get("narration", "") \
        and vo.get("duration") == shot["duration"] and vo.get("gender") == p["settings"]["voiceGender"]


def make_voiceover(who: dict, p: dict, shot: dict) -> None:
    text = shot.get("narration", "").strip()
    out = media.synthesize_shot_voiceover(text, shot["duration"], p["board"]["language"], p["settings"]["voiceGender"])
    key = f"projects/{who['userId']}/{p['id']}/voice/{shot['id']}-{common.new_id()}.mp3"
    common.put_bytes(key, out["audio"], "audio/mpeg")
    shot["voiceover"] = {"key": key, "text": shot.get("narration", ""), "duration": shot["duration"],
                         "gender": p["settings"]["voiceGender"], "spokenMs": out["spokenMs"],
                         "voice": out["voice"], "rate": out["rate"]}


def generate_voiceover(who, _body, params):
    p = load_project(who, params["id"])
    if not p.get("board"):
        raise HttpError(400, "Generate a storyboard first.")
    shot = find_shot(p, params["shotId"])
    director.guard(shot.get("narration", ""))
    make_voiceover(who, p, shot)
    save_project(who, p)
    return 200, with_urls(p)


# ------------------------------- renders ----------------------------------- #

def estimate(who, body, params):
    p = load_project(who, params["id"])
    if not p.get("board"):
        raise HttpError(400, "Generate a storyboard first.")
    res = body.get("resolution", p["settings"]["resolution"])
    shots = [{**s, "aspectRatio": p["board"]["aspectRatio"]} for s in p["board"]["shots"]]
    est = pricing.estimate_render(shots, res)
    est["balance"] = common.get_credits(who["userId"])
    est["canRender"] = can_render(who)
    return 200, est


def render_view(r: dict | None) -> dict | None:
    if not r:
        return None
    out = {k: r.get(k) for k in ("id", "status", "resolution", "created", "finished", "error", "refunded",
                                 "shotStatus", "sha256")}
    out["estimate"] = r.get("estimate")
    out["videoUrl"] = common.presign(r.get("finalKey"), 6 * 3600) if r.get("status") == "complete" else None
    out["captionsUrl"] = common.presign(r.get("captionsKey"), 6 * 3600)
    out["srtUrl"] = common.presign(r.get("srtKey"), 6 * 3600)
    out["provenanceUrl"] = common.presign(r.get("provenanceKey"), 6 * 3600)
    return out


def _reserve_monthly_budget(usd: float) -> None:
    cap = float(common.env("MONTHLY_RENDER_CAP_USD", "50"))
    month = time.strftime("%Y%m", time.gmtime())
    if usd > cap:
        raise HttpError(429, f"This render (${usd:.2f}) is larger than the monthly render budget (${cap:.0f}).",
                        code="budget")
    try:
        common.client("dynamodb").update_item(
            TableName=common.table(), Key={"pk": {"S": "CONFIG"}, "sk": {"S": f"SPEND#{month}"}},
            UpdateExpression="ADD usd :u", ConditionExpression="attribute_not_exists(usd) OR usd <= :room",
            ExpressionAttributeValues={":u": {"N": str(usd)}, ":room": {"N": str(cap - usd)}})
    except Exception as e:
        if "ConditionalCheckFailed" in str(e) or "ConditionalCheckFailed" in type(e).__name__:
            raise HttpError(429, f"This month's render budget (${cap:.0f}) is used up. Raise MonthlyRenderCapUsd "
                                 "to continue.", code="budget")
        raise


def start_render(who, body, params):
    if not can_render(who):
        raise HttpError(403, "Video rendering is limited to studio admins on this deployment. "
                             "You can still build storyboards, keyframes, voiceover and the animatic.",
                        code="render_disabled")
    p = load_project(who, params["id"])
    board = p.get("board")
    if not board:
        raise HttpError(400, "Generate a storyboard first.")
    res = body.get("resolution", p["settings"]["resolution"])
    if res not in pricing.RAY2_USD_PER_SECOND:
        raise HttpError(400, "Resolution must be 540p or 720p.")
    missing = [s["title"] for s in board["shots"] if not s.get("keyframe")]
    if missing:
        raise HttpError(400, "Every shot needs a keyframe before rendering: " + ", ".join(missing[:4]))
    # Voiceover: if any shot is narrated, every shot gets a (possibly silent) track of exact length.
    if any(s.get("narration", "").strip() for s in board["shots"]):
        for s in board["shots"]:
            if not _voiceover_current(p, s):
                make_voiceover(who, p, s)
    else:
        for s in board["shots"]:
            s.pop("voiceover", None)
    shots = [{**s, "aspectRatio": board["aspectRatio"]} for s in board["shots"]]
    est = pricing.estimate_render(shots, res)
    rid = common.new_id("r")
    _reserve_monthly_budget(est["estimatedUsd"])
    common.adjust_credits(who["userId"], -est["totalCredits"], "render", rid)
    for s in board["shots"]:
        s["aspectRatio"] = board["aspectRatio"]
    render = {"id": rid, "userId": who["userId"], "projectId": p["id"], "created": common.now(),
              "status": "queued", "resolution": res, "estimate": est,
              "shotIds": [s["id"] for s in board["shots"]], "board": json.loads(json.dumps(board))}
    common.put_item(f"PROJECT#{p['id']}", f"RENDER#{rid}", render)
    p["latestRenderId"] = rid
    p["settings"]["resolution"] = res
    save_project(who, p)
    try:
        common.client("stepfunctions").start_execution(
            stateMachineArn=common.env("STATE_MACHINE_ARN"), name=rid,
            input=json.dumps({"userId": who["userId"], "projectId": p["id"], "renderId": rid}))
    except Exception:
        common.adjust_credits(who["userId"], est["totalCredits"], "render refund", rid)
        render.update(status="failed", error="could not start render", refunded=est["totalCredits"])
        common.put_item(f"PROJECT#{p['id']}", f"RENDER#{rid}", render)
        raise
    return 202, render_view(render)


def get_render(who, _body, params):
    load_project(who, params["id"])  # ownership check
    r = common.get_item(f"PROJECT#{params['id']}", f"RENDER#{params['renderId']}")
    if not r or r["userId"] != who["userId"]:
        raise HttpError(404, "Render not found.")
    return 200, render_view(r)


# -------------------------------- account ---------------------------------- #

def me(who, _body, _params):
    prof = ensure_profile(who)
    return 200, {**prof, "isAdmin": who["isAdmin"], "credits": common.get_credits(who["userId"]),
                 "canRender": can_render(who), "pricing": {
                     "storyboard": pricing.storyboard_credits(), "keyframe": pricing.keyframe_credits(),
                     "shot540p5s": pricing.shot_render_credits(5, "540p"),
                     "shot720p5s": pricing.shot_render_credits(5, "720p"), "creditUsd": pricing.CREDIT_USD}}


def ledger(who, _body, _params):
    return 200, {"entries": common.query_prefix(f"USER#{who['userId']}", "LEDGER#", limit=50)}


def admin_grant(who, body, _params):
    if not who["isAdmin"]:
        raise HttpError(403, "Admins only.")
    uid, amount = body.get("userId"), int(body.get("credits", 0))
    if not uid or not -10000 < amount < 10000:
        raise HttpError(400, "userId and credits (-10000..10000) required.")
    return 200, {"balance": common.adjust_credits(uid, amount, f"admin grant by {who['email']}")}


def health(_who, _body, _params):
    return 200, {"ok": True, "service": "kyverin-studio", "time": common.now()}


ROUTES = [
    ("GET", r"/health", health, False),
    ("GET", r"/me", me, True),
    ("GET", r"/me/ledger", ledger, True),
    ("GET", r"/projects", list_projects, True),
    ("POST", r"/projects", create_project, True),
    ("GET", r"/projects/(?P<id>[^/]+)", get_project, True),
    ("PATCH", r"/projects/(?P<id>[^/]+)", update_project, True),
    ("DELETE", r"/projects/(?P<id>[^/]+)", delete_project, True),
    ("POST", r"/projects/(?P<id>[^/]+)/storyboard", generate_storyboard, True),
    ("POST", r"/projects/(?P<id>[^/]+)/shots/(?P<shotId>[^/]+)/keyframe", generate_keyframe, True),
    ("PUT", r"/projects/(?P<id>[^/]+)/shots/(?P<shotId>[^/]+)/keyframe", upload_keyframe, True),
    ("POST", r"/projects/(?P<id>[^/]+)/shots/(?P<shotId>[^/]+)/voiceover", generate_voiceover, True),
    ("POST", r"/projects/(?P<id>[^/]+)/estimate", estimate, True),
    ("POST", r"/projects/(?P<id>[^/]+)/renders", start_render, True),
    ("GET", r"/projects/(?P<id>[^/]+)/renders/(?P<renderId>[^/]+)", get_render, True),
    ("POST", r"/admin/grant", admin_grant, True),
]


def route(method: str, path: str):
    for m, pattern, fn, auth in ROUTES:
        match = re.fullmatch(pattern, path)
        if match and m == method:
            return fn, match.groupdict(), auth
    raise HttpError(404, "Not found.")


def handler(event, _context=None):
    try:
        method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
        path = event.get("rawPath", "/").rstrip("/") or "/"
        fn, params, auth = route(method, path)
        who = identity(event) if auth else None
        if who:
            ensure_profile(who)
        raw = event.get("body") or "{}"
        if event.get("isBase64Encoded"):
            raw = base64.b64decode(raw).decode()
        body = json.loads(raw) if raw.strip() else {}
        status, payload = fn(who, body, params)
        return common.response(status, payload)
    except HttpError as e:
        return common.response(e.status, {"error": e.message, **e.extra})
    except common.InsufficientCredits:
        return common.response(402, {"error": "Not enough credits for this step.", "code": "credits"})
    except json.JSONDecodeError:
        return common.response(400, {"error": "Invalid JSON body."})
    except Exception as e:  # noqa: BLE001
        print(json.dumps({"level": "error", "error": repr(e), "trace": traceback.format_exc()}))
        msg = "Something went wrong."
        if "AccessDenied" in repr(e) and "model" in repr(e).lower():
            msg = "The AI model isn't enabled for this AWS account yet."
        elif "Throttling" in repr(e) or "ServiceQuota" in repr(e):
            msg = "The AI service is busy. Please retry in a moment."
        return common.response(500, {"error": msg})
