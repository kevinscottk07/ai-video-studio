"""Release helper: publishes the web app bundled in this Lambda package
(studio/site/*) to the site bucket, writing config.js from stack outputs.
Invoked by the deploy tooling as worker action "publish_site"."""
from __future__ import annotations

import json
import os

from . import common

TYPES = {".html": "text/html", ".css": "text/css", ".js": "text/javascript"}


def publish_site(event: dict) -> dict:
    bucket = common.env("SITE_BUCKET")
    site_dir = os.path.join(os.path.dirname(__file__), "site")
    s3 = common.client("s3")
    written = []
    for name in sorted(os.listdir(site_dir)):
        ext = os.path.splitext(name)[1]
        if ext not in TYPES or name == "config.js":
            continue
        with open(os.path.join(site_dir, name), "rb") as f:
            s3.put_object(Bucket=bucket, Key=name, Body=f.read(), ContentType=TYPES[ext] + "; charset=utf-8")
        written.append(name)
    cfg = {"apiUrl": event["apiUrl"], "region": common.region(), "userPoolClientId": event["userPoolClientId"]}
    s3.put_object(Bucket=bucket, Key="config.js", ContentType="text/javascript; charset=utf-8",
                  Body=f"window.KYVERIN_CONFIG = {json.dumps(cfg)};\n".encode())
    return {"published": written + ["config.js"]}
