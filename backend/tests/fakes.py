"""In-memory fakes of the AWS APIs the studio uses."""
import base64
import io
import json


class ConditionalCheckFailedException(Exception):
    pass


class FakeDynamo:
    def __init__(self):
        self.items = {}

    def _k(self, key):
        return key["pk"]["S"], key["sk"]["S"]

    def put_item(self, TableName, Item):
        self.items[(Item["pk"]["S"], Item["sk"]["S"])] = json.loads(json.dumps(Item))

    def get_item(self, TableName, Key, ConsistentRead=False):
        it = self.items.get(self._k(Key))
        return {"Item": json.loads(json.dumps(it))} if it else {}

    def delete_item(self, TableName, Key):
        self.items.pop(self._k(Key), None)

    def query(self, TableName, KeyConditionExpression, ExpressionAttributeValues, ScanIndexForward=True, Limit=100):
        pk, pre = ExpressionAttributeValues[":pk"]["S"], ExpressionAttributeValues[":sk"]["S"]
        rows = sorted((k, v) for k, v in self.items.items() if k[0] == pk and k[1].startswith(pre))
        if not ScanIndexForward:
            rows.reverse()
        return {"Items": [v for _, v in rows[:Limit]]}

    def update_item(self, TableName, Key, UpdateExpression, ExpressionAttributeValues,
                    ConditionExpression=None, ReturnValues=None):
        k = self._k(Key)
        it = self.items.setdefault(k, {"pk": Key["pk"], "sk": Key["sk"]})
        attr = "credits" if "credits" in UpdateExpression else "usd"
        cur = float(it[attr]["N"]) if attr in it else None
        delta = float(ExpressionAttributeValues[":d" if attr == "credits" else ":u"]["N"])
        if ConditionExpression and attr == "credits":
            if cur is None or cur < float(ExpressionAttributeValues[":need"]["N"]):
                raise ConditionalCheckFailedException("ConditionalCheckFailed")
        if ConditionExpression and attr == "usd":
            if cur is not None and cur > float(ExpressionAttributeValues[":room"]["N"]):
                raise ConditionalCheckFailedException("ConditionalCheckFailed")
        new = (cur or 0) + delta
        it[attr] = {"N": str(int(new)) if attr == "credits" else str(new)}
        return {"Attributes": {attr: it[attr]}}


class FakeS3:
    def __init__(self):
        self.objects = {}

    def put_object(self, Bucket, Key, Body, ContentType=None):
        self.objects[Key] = Body if isinstance(Body, bytes) else Body.encode()

    def get_object(self, Bucket, Key):
        return {"Body": io.BytesIO(self.objects[Key])}

    def generate_presigned_url(self, op, Params, ExpiresIn):
        return f"https://signed.example/{Params['Key']}"

    def list_objects_v2(self, Bucket, Prefix, ContinuationToken=None):
        return {"Contents": [{"Key": k} for k in sorted(self.objects) if k.startswith(Prefix)], "IsTruncated": False}

    def delete_objects(self, Bucket, Delete):
        for o in Delete["Objects"]:
            self.objects.pop(o["Key"], None)


class _Body:
    def __init__(self, data):
        self._d = data

    def read(self):
        return self._d


class FakeBedrock:
    def __init__(self, s3):
        self.s3 = s3
        self.async_jobs = {}
        self.converse_calls = []
        self.block_text = None
        self.fail_shots = set()

    def apply_guardrail(self, guardrailIdentifier, guardrailVersion, source, content):
        text = content[0]["text"]["text"]
        if self.block_text and self.block_text in text:
            return {"action": "GUARDRAIL_INTERVENED"}
        return {"action": "NONE"}

    def converse(self, **kw):
        self.converse_calls.append(kw)
        n = int(kw["messages"][0]["content"][0]["text"].split("Number of shots: ")[1].split("\n")[0])
        shots = [{"title": f"Shot {i}", "duration": 5 if i % 2 else 9, "camera": "slow push in",
                  "castInShot": ["Ana"], "keyframePrompt": f"Ana at a lighthouse, frame {i}",
                  "videoPrompt": "waves crash as the light turns", "narration": "The sea remembers every storm.",
                  "transition": "continuous" if i == 1 else "cut"} for i in range(1, n + 1)]
        return {"output": {"message": {"content": [{"toolUse": {"name": "submit_storyboard", "input": {
            "title": "Keeper of the Light", "logline": "A keeper's last night.", "styleBible": "teal and amber, 35mm",
            "cast": [{"name": "Ana", "look": "woman in her 60s, grey braid, yellow raincoat"}], "shots": shots}}}]}}}

    def invoke_model(self, modelId, body, contentType, accept):
        assert modelId.startswith("stability.")
        img = b"\xff\xd8\xff\xe0fakejpeg"
        return {"body": _Body(json.dumps({"images": [base64.b64encode(img).decode()], "finish_reasons": [None]}).encode())}

    def start_async_invoke(self, modelId, modelInput, outputDataConfig, clientRequestToken):
        arn = f"arn:aws:bedrock:us-west-2:1:async-invoke/{len(self.async_jobs)}"
        uri = outputDataConfig["s3OutputDataConfig"]["s3Uri"]
        self.async_jobs[arn] = {"input": modelInput, "uri": uri, "polls": 0}
        return {"invocationArn": arn}

    def get_async_invoke(self, invocationArn):
        j = self.async_jobs[invocationArn]
        j["polls"] += 1
        if j["polls"] < 2:
            return {"status": "InProgress"}
        if any(s in j["uri"] for s in self.fail_shots):
            return {"status": "Failed", "failureMessage": "model error"}
        uri = j["uri"] + "/abc123"
        self.s3.objects[uri.split("s3://bucket/", 1)[1] + "/output.mp4"] = b"mp4"
        return {"status": "Completed", "outputDataConfig": {"s3OutputDataConfig": {"s3Uri": uri}}}


class FakePolly:
    def __init__(self, spoken_ms=3000):
        self.spoken_ms = spoken_ms
        self.calls = []

    def synthesize_speech(self, **kw):
        self.calls.append(kw)
        if kw["OutputFormat"] == "json":
            rate = 100
            if "prosody rate=" in kw["Text"]:
                rate = int(kw["Text"].split('prosody rate="')[1].split("%")[0])
            t = int(self.spoken_ms * 100 / rate)
            return {"AudioStream": io.BytesIO(json.dumps({"time": t, "type": "ssml", "value": "end"}).encode() + b"\n")}
        return {"AudioStream": io.BytesIO(b"ID3mp3")}


class FakeSfn:
    def __init__(self):
        self.executions = []

    def start_execution(self, stateMachineArn, name, input):
        self.executions.append(json.loads(input))
        return {"executionArn": "arn:exec"}


class FakeMediaConvert:
    def __init__(self, s3):
        self.s3 = s3
        self.jobs = {}

    def describe_endpoints(self, MaxResults):
        raise Exception("not needed")

    def create_job(self, Role, Settings, UserMetadata, Tags):
        jid = f"job{len(self.jobs)}"
        self.jobs[jid] = Settings
        dest = Settings["OutputGroups"][0]["OutputGroupSettings"]["FileGroupSettings"]["Destination"]
        self.s3.objects[dest.split("s3://bucket/", 1)[1] + "_final.mp4"] = b"final-video-bytes"
        return {"Job": {"Id": jid}}

    def get_job(self, Id):
        return {"Job": {"Id": Id, "Status": "COMPLETE"}}
