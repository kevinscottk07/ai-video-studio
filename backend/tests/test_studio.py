import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from studio import api, common, media, pricing, render  # noqa: E402
from tests import fakes  # noqa: E402

ADMIN = "kevin@example.com"


def ev(method, path, body=None, email=ADMIN, sub="user-1"):
    e = {"rawPath": path, "requestContext": {"http": {"method": method}}, "body": json.dumps(body or {})}
    if email is not None:
        e["requestContext"]["authorizer"] = {"jwt": {"claims": {"sub": sub, "email": email}}}
    return e


def call(*a, **kw):
    r = api.handler(ev(*a, **kw))
    return r["statusCode"], json.loads(r["body"])


class StudioTest(unittest.TestCase):
    def setUp(self):
        os.environ.update(TABLE_NAME="t", MEDIA_BUCKET="bucket", ADMIN_EMAILS=ADMIN, RENDER_POLICY="admins",
                          WELCOME_CREDITS="25", ADMIN_START_CREDITS="500", MONTHLY_RENDER_CAP_USD="50",
                          DIRECTOR_MODEL_ID="us.anthropic.claude-test", GUARDRAIL_ID="g1",
                          STATE_MACHINE_ARN="arn:sm", MEDIACONVERT_ROLE_ARN="arn:role")
        common.reset_clients()
        self.ddb, self.s3 = fakes.FakeDynamo(), fakes.FakeS3()
        self.br, self.polly, self.sfn = fakes.FakeBedrock(self.s3), fakes.FakePolly(), fakes.FakeSfn()
        self.mc = fakes.FakeMediaConvert(self.s3)
        for name, f in (("dynamodb", self.ddb), ("s3", self.s3), ("bedrock-runtime", self.br),
                        ("polly", self.polly), ("stepfunctions", self.sfn), ("mediaconvert", self.mc)):
            common.set_client(name, f)

    # ---------------------------------------------------------------- helpers
    def make_board(self, shots=3, email=ADMIN):
        st, p = call("POST", "/projects", {"idea": "A lighthouse keeper's last night", "shots": shots}, email=email)
        self.assertEqual(st, 201)
        st, p = call("POST", f"/projects/{p['id']}/storyboard", email=email)
        self.assertEqual(st, 200, p)
        return p

    def run_pipeline(self, execution):
        prep = render.handler({"action": "prepare", "payload": execution})
        results = []
        for item in prep["shots"]:
            st = render.handler({"action": "start_shot", "payload": {**execution, **item}})
            while st["status"] == "InProgress":
                st = render.handler({"action": "check_shot", "payload": st})
            results.append(st)
        a = render.handler({"action": "assemble", "payload": {**execution, "results": results}})
        while a.get("assembleStatus") == "InProgress":
            a = render.handler({"action": "check_assemble", "payload": a})
        return render.handler({"action": "finalize", "payload": a})

    # ------------------------------------------------------------------ tests
    def test_auth_required(self):
        st, body = call("GET", "/me", email=None)
        self.assertEqual(st, 401)
        self.assertEqual(call("GET", "/health", email=None)[0], 200)

    def test_welcome_credits_and_admin(self):
        st, me = call("GET", "/me", email="someone@else.com", sub="u2")
        self.assertEqual((me["credits"], me["canRender"], me["isAdmin"]), (25, False, False))
        st, me = call("GET", "/me")
        self.assertEqual((me["credits"], me["canRender"]), (500, True))
        st, me = call("GET", "/me")  # idempotent
        self.assertEqual(me["credits"], 500)

    def test_storyboard_character_lock_and_keyframes(self):
        p = self.make_board(3)
        board = p["board"]
        self.assertEqual(len(board["shots"]), 3)
        self.assertEqual([s["duration"] for s in board["shots"]], [5, 9, 5])
        self.assertEqual(board["shots"][0]["transition"], "continuous")
        sid = board["shots"][1]["id"]
        st, p = call("POST", f"/projects/{p['id']}/shots/{sid}/keyframe")
        self.assertEqual(st, 200, p)
        shot = p["board"]["shots"][1]
        self.assertTrue(shot["keyframe"]["url"].startswith("https://signed.example/projects/user-1/"))
        self.assertFalse(shot["keyframeStale"])
        st, me = call("GET", "/me")
        self.assertEqual(me["credits"], 500 - pricing.storyboard_credits() - pricing.keyframe_credits())

    def test_guardrail_blocks_and_refunds(self):
        self.br.block_text = "celebrity"
        st, p = call("POST", "/projects", {"idea": "a famous celebrity dancing"})
        st, body = call("POST", f"/projects/{p['id']}/storyboard")
        self.assertEqual((st, body["code"]), (422, "content_policy"))
        self.assertEqual(call("GET", "/me")[1]["credits"], 500)  # refunded

    def test_insufficient_credits(self):
        os.environ["WELCOME_CREDITS"] = "0"
        st, p = call("POST", "/projects", {"idea": "x"}, email="poor@x.com", sub="u3")
        st, body = call("POST", f"/projects/{p['id']}/storyboard", email="poor@x.com", sub="u3")
        self.assertEqual((st, body["code"]), (402, "credits"))

    def test_merge_shots_cannot_steal_assets(self):
        p = self.make_board(2)
        sid = p["board"]["shots"][0]["id"]
        call("POST", f"/projects/{p['id']}/shots/{sid}/keyframe")
        shots = p["board"]["shots"]
        evil = [{**shots[0], "keyframePrompt": "new prompt", "keyframe": {"key": "projects/other-user/x.jpg"}},
                {"title": "Brand new shot", "duration": 7, "camera": "warp", "clip": {"key": "stolen"}}]
        st, p2 = call("PATCH", f"/projects/{p['id']}", {"board": {"shots": evil}})
        self.assertEqual(st, 200)
        a, b = p2["board"]["shots"]
        self.assertTrue(a["keyframe"]["key"].startswith("projects/user-1/"))
        self.assertTrue(a["keyframeStale"])
        self.assertNotIn("clip", b)
        self.assertEqual((b["duration"], b["camera"]), (9, "static"))

    def test_other_users_cannot_read_project(self):
        p = self.make_board(1)
        st, _ = call("GET", f"/projects/{p['id']}", email="x@y.com", sub="intruder")
        self.assertEqual(st, 404)

    def test_render_blocked_for_non_admin(self):
        p = self.make_board(1, email="fan@x.com")
        st, body = call("POST", f"/projects/{p['id']}/renders", {}, email="fan@x.com")
        self.assertEqual((st, body["code"]), (403, "render_disabled"))

    def test_render_requires_keyframes(self):
        p = self.make_board(2)
        st, body = call("POST", f"/projects/{p['id']}/renders", {})
        self.assertEqual(st, 400)
        self.assertIn("keyframe", body["error"])

    def test_full_render_pipeline(self):
        p = self.make_board(3)
        for s in p["board"]["shots"]:
            call("POST", f"/projects/{p['id']}/shots/{s['id']}/keyframe")
        st, est = call("POST", f"/projects/{p['id']}/estimate", {"resolution": "540p"})
        self.assertEqual(est["seconds"], 19)
        self.assertEqual(est["totalCredits"], 38 + 68 + 38 + 1)
        before = call("GET", "/me")[1]["credits"]
        st, r = call("POST", f"/projects/{p['id']}/renders", {"resolution": "540p"})
        self.assertEqual(st, 202, r)
        self.assertEqual(call("GET", "/me")[1]["credits"], before - est["totalCredits"])
        # continuous transition on shot 1 => Ray2 gets an end keyframe from shot 2
        out = self.run_pipeline(self.sfn.executions[0])
        self.assertEqual(out["status"], "complete")
        first_job = list(self.br.async_jobs.values())[0]["input"]
        self.assertIn("frame1", first_job["keyframes"])
        self.assertEqual(first_job["resolution"], "540p")
        settings = self.mc.jobs["job0"]
        self.assertEqual(len(settings["Inputs"]), 3)
        self.assertIn("ExternalAudioFileInput", settings["Inputs"][0]["AudioSelectors"]["Audio Selector 1"])
        st, view = call("GET", f"/projects/{p['id']}/renders/{r['id']}")
        self.assertEqual(view["status"], "complete")
        self.assertTrue(view["videoUrl"].endswith("video_final.mp4"))
        prov = json.loads(self.s3.objects[view["provenanceUrl"].split("signed.example/")[1]])
        self.assertEqual(prov["assertions"][0]["label"], "c2pa.actions")
        vtt = self.s3.objects[view["captionsUrl"].split("signed.example/")[1]].decode()
        self.assertTrue(vtt.startswith("WEBVTT"))
        self.assertIn("00:00:05.100 -->", vtt)
        # Re-render with one edited shot: only that shot is charged.
        st, p = call("GET", f"/projects/{p['id']}")
        self.assertTrue(all(s.get("clip") for s in p["board"]["shots"]))
        shots = p["board"]["shots"]
        shots[2]["videoPrompt"] = "the lamp goes dark"
        call("PATCH", f"/projects/{p['id']}", {"board": {"shots": shots}})
        st, est2 = call("POST", f"/projects/{p['id']}/estimate", {"resolution": "540p"})
        self.assertEqual(est2["totalCredits"], 38 + 1)

    def test_failed_shot_refunds(self):
        p = self.make_board(2)
        for s in p["board"]["shots"]:
            call("POST", f"/projects/{p['id']}/shots/{s['id']}/keyframe")
        self.br.fail_shots = {p["board"]["shots"][1]["id"] + "-"}
        before = call("GET", "/me")[1]["credits"]
        st, r = call("POST", f"/projects/{p['id']}/renders", {})
        out = self.run_pipeline(self.sfn.executions[0])
        self.assertEqual(out["status"], "failed")
        # shot 2 (9s, 68 credits) + assembly (1) refunded; shot 1 kept & cached
        self.assertEqual(call("GET", "/me")[1]["credits"], before - 38)
        st, est = call("POST", f"/projects/{p['id']}/estimate", {})
        self.assertEqual(est["totalCredits"], 68 + 1)

    def test_step_functions_catch_refunds_everything(self):
        p = self.make_board(2)
        for s in p["board"]["shots"]:
            call("POST", f"/projects/{p['id']}/shots/{s['id']}/keyframe")
        before = call("GET", "/me")[1]["credits"]
        st, r = call("POST", f"/projects/{p['id']}/renders", {})
        ex = self.sfn.executions[0]
        out = render.handler({"action": "finalize", "payload": {**ex, "error": {"Error": "States.Runtime", "Cause": "boom"}}})
        self.assertEqual(out["status"], "failed")
        self.assertEqual(call("GET", "/me")[1]["credits"], before)
        st, view = call("GET", f"/projects/{p['id']}/renders/{r['id']}")
        self.assertIn("States.Runtime", view["error"])

    def test_shot_poll_timeout(self):
        self.br.async_jobs["arn:x"] = {"input": {}, "uri": "s3://bucket/x", "polls": -999}
        out = render.check_shot({"invocationArn": "arn:x", "status": "InProgress", "polls": render.MAX_SHOT_POLLS - 1})
        self.assertEqual(out["status"], "Failed")

    def test_monthly_budget_cap(self):
        os.environ["MONTHLY_RENDER_CAP_USD"] = "5"
        p = self.make_board(2)
        for s in p["board"]["shots"]:
            call("POST", f"/projects/{p['id']}/shots/{s['id']}/keyframe")
        st, body = call("POST", f"/projects/{p['id']}/renders", {})
        self.assertEqual((st, body["code"]), (429, "budget"))


class UnitTest(unittest.TestCase):
    def test_pricing(self):
        self.assertEqual(pricing.shot_render_credits(5, "540p"), 38)
        self.assertEqual(pricing.shot_render_credits(9, "720p"), 135)
        with self.assertRaises(ValueError):
            pricing.shot_render_credits(6, "540p")

    def test_voiceover_plan(self):
        self.assertEqual(media.plan_voiceover(3000, 5000), (100, 2000))
        rate, pad = media.plan_voiceover(6000, 5000)
        self.assertGreater(rate, 100)
        self.assertLessEqual(rate, 140)

    def test_ssml_long_padding_and_escape(self):
        s = media.ssml("Fish & chips <3", pad_ms=23000)
        self.assertIn("Fish &amp; chips &lt;3", s)
        self.assertEqual(s.count("<break"), 3)

    def test_voiceover_fits_shot(self):
        common.reset_clients()
        polly = fakes.FakePolly(spoken_ms=7000)
        common.set_client("polly", polly)
        out = media.synthesize_shot_voiceover("a long line", 5, "es-US", "male")
        self.assertEqual(out["voice"], "Pedro")
        self.assertGreater(out["rate"], 100)
        self.assertLessEqual(out["spokenMs"], 5000)

    def test_routes(self):
        fn, params, auth = api.route("POST", "/projects/p0123456789ab/shots/s1/keyframe")
        self.assertEqual((fn.__name__, params["shotId"]), ("generate_keyframe", "s1"))
        with self.assertRaises(common.HttpError):
            api.route("GET", "/nope")


if __name__ == "__main__":
    unittest.main()
