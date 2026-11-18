"""Credit pricing. 1 credit = $0.10 of underlying AWS cost (rounded up).

Raw AWS prices (us-west-2, Nov 2026):
  Luma Ray2 on Bedrock   $0.75 / s at 540p, $1.50 / s at 720p
  Stable Image Core      ~$0.04 / image
  Claude (director)      a storyboard is a few thousand tokens, well under $0.10
  Polly neural           $16 / 1M chars -> negligible per shot
  MediaConvert basic     ~$0.0075 / output minute -> negligible
"""
from __future__ import annotations

import math

CREDIT_USD = 0.10

RAY2_USD_PER_SECOND = {"540p": 0.75, "720p": 1.50}
KEYFRAME_USD = 0.04
STORYBOARD_USD = 0.05
ASSEMBLY_USD = 0.02

SHOT_DURATIONS = (5, 9)


def credits_for(usd: float) -> int:
    return max(1, math.ceil(round(usd / CREDIT_USD, 6)))


def storyboard_credits() -> int:
    return credits_for(STORYBOARD_USD)


def keyframe_credits() -> int:
    return credits_for(KEYFRAME_USD)


def shot_render_credits(duration: int, resolution: str) -> int:
    if duration not in SHOT_DURATIONS:
        raise ValueError(f"duration must be one of {SHOT_DURATIONS}")
    if resolution not in RAY2_USD_PER_SECOND:
        raise ValueError("resolution must be 540p or 720p")
    return credits_for(duration * RAY2_USD_PER_SECOND[resolution])


def estimate_render(shots: list[dict], resolution: str, reuse_rendered: bool = True) -> dict:
    """Cost of rendering the given shots. Shots that already have a clip at the
    same resolution are free when reuse_rendered is set (only changed shots are
    re-rendered, which is how iterative editing stays affordable)."""
    lines = []
    total = 0
    seconds = 0
    for s in shots:
        d = int(s.get("duration", 5))
        cached = reuse_rendered and s.get("clip", {}).get("resolution") == resolution \
            and s.get("clip", {}).get("fingerprint") == shot_fingerprint(s, resolution)
        c = 0 if cached else shot_render_credits(d, resolution)
        lines.append({"shotId": s["id"], "duration": d, "credits": c, "cached": bool(cached)})
        total += c
        seconds += d
    assembly = credits_for(ASSEMBLY_USD)
    total += assembly
    return {
        "resolution": resolution,
        "seconds": seconds,
        "shots": lines,
        "assemblyCredits": assembly,
        "totalCredits": total,
        "estimatedUsd": round(total * CREDIT_USD, 2),
    }


def shot_fingerprint(shot: dict, resolution: str) -> str:
    """Identity of a rendered clip: if any of these change the clip is stale."""
    import hashlib
    parts = [
        shot.get("videoPrompt", ""), str(shot.get("duration", 5)), resolution,
        shot.get("keyframe", {}).get("key", ""), shot.get("endKeyframeKey", "") or "",
        shot.get("aspectRatio", ""),
    ]
    return hashlib.sha256("|".join(parts).encode()).hexdigest()[:16]
