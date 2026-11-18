#!/usr/bin/env python3
"""One-command deploy of Kyverin Studio to your AWS account.

    pip install boto3
    python infra/deploy.py --admin-email you@example.com --budget-email you@example.com

Idempotent: re-run it after any code change. Teardown: --destroy.
Requires credentials for the target account (AWS_PROFILE or env vars).
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import mimetypes
import os
import sys
import time
import zipfile

import boto3
from botocore.exceptions import ClientError

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGION = "us-west-2"  # Luma Ray2 + Stable Image Core live here


def build_zip() -> bytes:
    buf = io.BytesIO()
    src = os.path.join(ROOT, "backend", "studio")
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for name in sorted(os.listdir(src)):
            if name.endswith(".py"):
                info = zipfile.ZipInfo(f"studio/{name}", date_time=(2026, 1, 1, 0, 0, 0))
                info.external_attr = 0o644 << 16
                z.writestr(info, open(os.path.join(src, name), "rb").read(), zipfile.ZIP_DEFLATED)
    return buf.getvalue()


def pick_director_model(bedrock) -> str:
    """Newest US cross-region Claude Sonnet inference profile, falling back to Haiku/Opus."""
    profiles = bedrock.list_inference_profiles(typeEquals="SYSTEM_DEFINED", maxResults=1000)["inferenceProfileSummaries"]
    ids = sorted((p["inferenceProfileId"] for p in profiles
                  if p["inferenceProfileId"].startswith("us.anthropic.claude") and p.get("status") == "ACTIVE"), reverse=True)
    for family in ("sonnet", "haiku", "opus"):
        for i in ids:
            if family in i:
                return i
    raise SystemExit("No Claude inference profile found in us-west-2. Enable Anthropic models in the Bedrock console.")


def stack_outputs(cfn, name):
    s = cfn.describe_stacks(StackName=name)["Stacks"][0]
    return s["StackStatus"], {o["OutputKey"]: o["OutputValue"] for o in s.get("Outputs", [])}


def wait(cfn, name):
    while True:
        status, out = stack_outputs(cfn, name)
        if not status.endswith("_IN_PROGRESS"):
            return status, out
        print(f"  {status} ...")
        time.sleep(15)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stack", default="kyverin-studio")
    ap.add_argument("--admin-email", default="")
    ap.add_argument("--budget-email", default="")
    ap.add_argument("--render-policy", default="admins", choices=["admins", "all"])
    ap.add_argument("--monthly-render-cap", default="50")
    ap.add_argument("--director-model", default="")
    ap.add_argument("--destroy", action="store_true")
    a = ap.parse_args()

    sess = boto3.Session(region_name=REGION)
    cfn, s3 = sess.client("cloudformation"), sess.client("s3")
    account = sess.client("sts").get_caller_identity()["Account"]
    artifacts = f"{a.stack}-artifacts-{account}-{REGION}"

    if a.destroy:
        _, out = stack_outputs(cfn, a.stack)
        for b in (out.get("SiteBucket"), out.get("MediaBucket")):
            if b:
                bucket = sess.resource("s3").Bucket(b)
                bucket.objects.all().delete()
        cfn.delete_stack(StackName=a.stack)
        print("Deleting stack (takes a few minutes for CloudFront)…")
        cfn.get_waiter("stack_delete_complete").wait(StackName=a.stack, WaiterConfig={"Delay": 20, "MaxAttempts": 90})
        print("Deleted. The artifacts bucket", artifacts, "was kept; delete it manually if you like.")
        return

    # 1. artifacts bucket + lambda zip
    try:
        s3.head_bucket(Bucket=artifacts)
    except ClientError:
        s3.create_bucket(Bucket=artifacts, CreateBucketConfiguration={"LocationConstraint": REGION})
        s3.put_public_access_block(Bucket=artifacts, PublicAccessBlockConfiguration={
            "BlockPublicAcls": True, "IgnorePublicAcls": True, "BlockPublicPolicy": True, "RestrictPublicBuckets": True})
    code = build_zip()
    key = f"lambda/studio-{hashlib.sha256(code).hexdigest()[:16]}.zip"
    s3.put_object(Bucket=artifacts, Key=key, Body=code)
    print(f"Uploaded {key} ({len(code)} bytes)")

    # 2. stack
    model = a.director_model or pick_director_model(sess.client("bedrock"))
    print("Director model:", model)
    params = {"CodeBucket": artifacts, "CodeKey": key, "DirectorModelId": model, "AdminEmails": a.admin_email,
              "RenderPolicy": a.render_policy, "BudgetAlertEmail": a.budget_email,
              "MonthlyRenderCapUsd": a.monthly_render_cap}
    kwargs = dict(StackName=a.stack, TemplateBody=open(os.path.join(ROOT, "infra", "template.yaml")).read(),
                  Parameters=[{"ParameterKey": k, "ParameterValue": v} for k, v in params.items()],
                  Capabilities=["CAPABILITY_IAM"], Tags=[{"Key": "app", "Value": "kyverin-studio"}])
    try:
        cfn.describe_stacks(StackName=a.stack)
        try:
            cfn.update_stack(**kwargs)
        except ClientError as e:
            if "No updates" not in str(e):
                raise
    except ClientError as e:
        if "does not exist" not in str(e):
            raise
        cfn.create_stack(OnFailure="DELETE", **kwargs)
    status, out = wait(cfn, a.stack)
    if status not in ("CREATE_COMPLETE", "UPDATE_COMPLETE"):
        sys.exit(f"Stack ended in {status}. See the CloudFormation console events.")

    # 3. frontend
    cfg = {"apiUrl": out["ApiUrl"], "region": REGION, "userPoolClientId": out["UserPoolClientId"]}
    files = {"config.js": f"window.KYVERIN_CONFIG = {json.dumps(cfg)};\n".encode()}
    for name in ("index.html", "styles.css", "app.js", "demo.js"):
        files[name] = open(os.path.join(ROOT, "frontend", name), "rb").read()
    for name, body in files.items():
        ctype = mimetypes.guess_type(name)[0] or "application/octet-stream"
        s3.put_object(Bucket=out["SiteBucket"], Key=name, Body=body, ContentType=f"{ctype}; charset=utf-8")
    print("\nKyverin Studio is live:", out["SiteUrl"])
    print("API:", out["ApiUrl"])


if __name__ == "__main__":
    main()
