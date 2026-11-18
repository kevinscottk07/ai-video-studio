"""Shared helpers: config, AWS clients, DynamoDB access, HTTP responses.

AWS clients are created lazily so the pure logic in this package can be unit
tested without boto3 installed (tests inject fakes through `set_client`).
"""
from __future__ import annotations

import json
import os
import time
import uuid
from decimal import Decimal
from typing import Any

_CLIENTS: dict[str, Any] = {}


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default)


def region() -> str:
    return env("AWS_REGION", "us-west-2")


def client(service: str):
    if service not in _CLIENTS:
        import boto3  # available in the Lambda runtime
        _CLIENTS[service] = boto3.client(service, region_name=region())
    return _CLIENTS[service]


def set_client(service: str, fake) -> None:
    """Test hook."""
    _CLIENTS[service] = fake


def reset_clients() -> None:
    _CLIENTS.clear()


def now() -> int:
    return int(time.time())


def new_id(prefix: str = "") -> str:
    return prefix + uuid.uuid4().hex[:12]


# --------------------------------------------------------------------------- #
# DynamoDB (low-level client, JSON documents stored in a "doc" string attr)
# Storing the document as JSON keeps nested storyboards simple and avoids
# Decimal/float conversions.
# --------------------------------------------------------------------------- #

def table() -> str:
    return env("TABLE_NAME", "kyverin-studio")


def put_item(pk: str, sk: str, doc: dict, extra: dict | None = None) -> None:
    item = {
        "pk": {"S": pk},
        "sk": {"S": sk},
        "doc": {"S": json.dumps(doc, separators=(",", ":"))},
        "updated": {"N": str(now())},
    }
    for k, v in (extra or {}).items():
        item[k] = {"N": str(v)} if isinstance(v, (int, float, Decimal)) else {"S": str(v)}
    client("dynamodb").put_item(TableName=table(), Item=item)


def get_item(pk: str, sk: str) -> dict | None:
    r = client("dynamodb").get_item(TableName=table(), Key={"pk": {"S": pk}, "sk": {"S": sk}}, ConsistentRead=True)
    item = r.get("Item")
    return json.loads(item["doc"]["S"]) if item else None


def delete_item(pk: str, sk: str) -> None:
    client("dynamodb").delete_item(TableName=table(), Key={"pk": {"S": pk}, "sk": {"S": sk}})


def query_prefix(pk: str, sk_prefix: str, limit: int = 100, newest_first: bool = True) -> list[dict]:
    r = client("dynamodb").query(
        TableName=table(),
        KeyConditionExpression="pk = :pk AND begins_with(sk, :sk)",
        ExpressionAttributeValues={":pk": {"S": pk}, ":sk": {"S": sk_prefix}},
        ScanIndexForward=not newest_first,
        Limit=limit,
    )
    return [json.loads(i["doc"]["S"]) for i in r.get("Items", [])]


# --------------------------------------------------------------------------- #
# Credits: an atomic counter kept on the user's BALANCE item.
# --------------------------------------------------------------------------- #

class InsufficientCredits(Exception):
    pass


def adjust_credits(user_id: str, delta: int, reason: str, ref: str = "") -> int:
    """Atomically add (or, with negative delta, spend) credits.

    Spending fails with InsufficientCredits rather than going negative.
    Every change is written to the ledger.
    """
    ddb = client("dynamodb")
    kwargs = dict(
        TableName=table(),
        Key={"pk": {"S": f"USER#{user_id}"}, "sk": {"S": "BALANCE"}},
        UpdateExpression="ADD credits :d",
        ExpressionAttributeValues={":d": {"N": str(delta)}},
        ReturnValues="UPDATED_NEW",
    )
    if delta < 0:
        kwargs["ConditionExpression"] = "credits >= :need"
        kwargs["ExpressionAttributeValues"][":need"] = {"N": str(-delta)}
    try:
        r = ddb.update_item(**kwargs)
    except Exception as e:  # ConditionalCheckFailedException
        if "ConditionalCheckFailed" in type(e).__name__ or "ConditionalCheckFailed" in str(e):
            raise InsufficientCredits(reason) from e
        raise
    balance = int(r["Attributes"]["credits"]["N"])
    ts = time.time_ns()
    put_item(f"USER#{user_id}", f"LEDGER#{ts}", {
        "ts": now(), "delta": delta, "reason": reason, "ref": ref, "balance": balance,
    })
    return balance


def get_credits(user_id: str) -> int | None:
    r = client("dynamodb").get_item(
        TableName=table(), Key={"pk": {"S": f"USER#{user_id}"}, "sk": {"S": "BALANCE"}}, ConsistentRead=True)
    item = r.get("Item")
    return int(item["credits"]["N"]) if item and "credits" in item else None


# --------------------------------------------------------------------------- #
# S3
# --------------------------------------------------------------------------- #

def bucket() -> str:
    return env("MEDIA_BUCKET")


def put_bytes(key: str, data: bytes, content_type: str) -> None:
    client("s3").put_object(Bucket=bucket(), Key=key, Body=data, ContentType=content_type)


def presign(key: str | None, expires: int = 3600) -> str | None:
    if not key:
        return None
    return client("s3").generate_presigned_url(
        "get_object", Params={"Bucket": bucket(), "Key": key}, ExpiresIn=expires)


# --------------------------------------------------------------------------- #
# HTTP
# --------------------------------------------------------------------------- #

class HttpError(Exception):
    def __init__(self, status: int, message: str, **extra):
        super().__init__(message)
        self.status = status
        self.message = message
        self.extra = extra


def response(status: int, body: Any) -> dict:
    return {
        "statusCode": status,
        "headers": {"content-type": "application/json", "cache-control": "no-store"},
        "body": json.dumps(body, default=str),
    }
