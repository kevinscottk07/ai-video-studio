"""The AI director: turns an idea into a shot-by-shot storyboard with a style
bible and a locked cast, using Claude on Amazon Bedrock (Converse API with a
forced tool call so the output is always valid structured JSON).
"""
from __future__ import annotations

import json

from . import common

STYLE_PRESETS = {
    "cinematic": "cinematic film still, anamorphic lens, shallow depth of field, natural film grain, rich color grade",
    "documentary": "documentary footage, handheld natural light, realistic textures, observational framing",
    "commercial": "high-end product commercial, clean studio lighting, crisp focus, polished color",
    "anime": "hand-drawn anime style, cel shading, vibrant palette, expressive linework",
    "3d-animation": "stylized 3D animated feature look, soft global illumination, appealing shapes",
    "noir": "black and white film noir, hard shadows, venetian blind light, high contrast",
    "vintage": "1970s 16mm film look, warm faded colors, light leaks, soft halation",
}

CAMERA_MOVES = [
    "static", "slow push in", "slow pull out", "pan left", "pan right", "tilt up", "tilt down",
    "orbit", "tracking shot", "crane up", "handheld", "aerial drone",
]

ASPECTS = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"]

LANGUAGES = {
    "en-US": "English", "es-US": "Spanish (Latin America)", "es-ES": "Spanish (Spain)",
    "pt-BR": "Portuguese (Brazil)", "fr-FR": "French", "de-DE": "German", "it-IT": "Italian",
    "ja-JP": "Japanese", "hi-IN": "Hindi",
}

MAX_SHOTS = 12
WORDS_PER_SECOND = 2.4  # comfortable narration pace; used to keep VO within the shot

STORYBOARD_TOOL = {
    "toolSpec": {
        "name": "submit_storyboard",
        "description": "Submit the finished storyboard for the video.",
        "inputSchema": {"json": {
            "type": "object",
            "required": ["title", "logline", "styleBible", "cast", "shots"],
            "properties": {
                "title": {"type": "string"},
                "logline": {"type": "string", "description": "One sentence pitch."},
                "styleBible": {"type": "string", "description": "Visual rules every shot follows: palette, lighting, lens, texture, era. 1-3 sentences, no character names."},
                "cast": {
                    "type": "array",
                    "description": "Recurring characters or hero objects with a fixed visual description reused verbatim in every shot they appear in.",
                    "items": {"type": "object", "required": ["name", "look"], "properties": {
                        "name": {"type": "string"},
                        "look": {"type": "string", "description": "Concrete, fixed appearance: age, build, hair, wardrobe, colors, distinguishing marks."},
                    }},
                },
                "shots": {
                    "type": "array",
                    "items": {"type": "object",
                              "required": ["title", "duration", "camera", "keyframePrompt", "videoPrompt", "narration"],
                              "properties": {
                                  "title": {"type": "string"},
                                  "duration": {"type": "integer", "enum": [5, 9]},
                                  "camera": {"type": "string", "enum": CAMERA_MOVES},
                                  "castInShot": {"type": "array", "items": {"type": "string"}},
                                  "keyframePrompt": {"type": "string", "description": "Still image description of the first frame. Under 60 words."},
                                  "videoPrompt": {"type": "string", "description": "What moves during the shot, including the camera move. Under 50 words."},
                                  "narration": {"type": "string", "description": "Voiceover line for this shot, may be empty."},
                                  "transition": {"type": "string", "enum": ["cut", "continuous"],
                                                 "description": "continuous = this shot should end on the next shot's first frame."},
                              }},
                },
            },
        }},
    }
}


def system_prompt(lang_name: str) -> str:
    return f"""You are the director of Kyverin Studio, an AI film studio. You plan short
videos as a sequence of 5 or 9 second shots for an image-to-video model.

Rules:
- Every shot must be filmable as a single continuous take; describe concrete
  visuals, never abstractions or on-screen text.
- Keep the cast visually identical across shots by reusing their "look".
- Vary shot sizes (wide, medium, close-up) and use camera moves with intent.
- Narration is written in {lang_name}. Keep each line short enough to speak in
  the shot's duration at about {WORDS_PER_SECOND} words per second, or leave it empty.
- Never depict real, identifiable people, logos you were not given, sexual
  content, or graphic violence.
Always answer by calling submit_storyboard."""


def build_request(brief: dict) -> dict:
    n = max(1, min(int(brief.get("shots", 4)), MAX_SHOTS))
    lang = brief.get("language", "en-US")
    style = STYLE_PRESETS.get(brief.get("style", "cinematic"), brief.get("style", ""))
    user = (
        f"Idea: {brief['idea'].strip()}\n"
        f"Number of shots: {n}\n"
        f"Aspect ratio: {brief.get('aspectRatio', '16:9')}\n"
        f"Visual style: {style}\n"
        f"Tone: {brief.get('tone', 'engaging')}\n"
        f"Audience / purpose: {brief.get('purpose', 'general audience')}\n"
    )
    if brief.get("brandNotes"):
        user += f"Brand notes: {brief['brandNotes']}\n"
    return {
        "modelId": common.env("DIRECTOR_MODEL_ID"),
        "system": [{"text": system_prompt(LANGUAGES.get(lang, "English"))}],
        "messages": [{"role": "user", "content": [{"text": user}]}],
        "toolConfig": {"tools": [STORYBOARD_TOOL], "toolChoice": {"tool": {"name": "submit_storyboard"}}},
        "inferenceConfig": {"maxTokens": 6000, "temperature": 0.7},
    }


def parse_tool_output(resp: dict) -> dict:
    for block in resp["output"]["message"]["content"]:
        if "toolUse" in block:
            return block["toolUse"]["input"]
    raise common.HttpError(502, "The director did not return a storyboard. Try again.")


def _trim_words(text: str, max_words: int) -> str:
    words = (text or "").split()
    return " ".join(words[:max_words])


def normalize(raw: dict, brief: dict) -> dict:
    """Validate the model's storyboard and fill derived fields."""
    shots = []
    for i, s in enumerate(raw.get("shots", [])[:MAX_SHOTS]):
        duration = 9 if int(s.get("duration", 5)) >= 7 else 5
        camera = s.get("camera") if s.get("camera") in CAMERA_MOVES else "static"
        shots.append({
            "id": f"s{i + 1}",
            "title": (s.get("title") or f"Shot {i + 1}")[:80],
            "duration": duration,
            "camera": camera,
            "castInShot": [c for c in s.get("castInShot", []) if isinstance(c, str)],
            "keyframePrompt": _trim_words(s.get("keyframePrompt", ""), 80),
            "videoPrompt": _trim_words(s.get("videoPrompt", ""), 70),
            "narration": _trim_words(s.get("narration", ""), int(duration * WORDS_PER_SECOND) + 2),
            "transition": "continuous" if s.get("transition") == "continuous" else "cut",
        })
    if not shots:
        raise common.HttpError(502, "The director returned an empty storyboard.")
    return {
        "title": (raw.get("title") or "Untitled")[:120],
        "logline": (raw.get("logline") or "")[:300],
        "styleBible": (raw.get("styleBible") or "")[:600],
        "cast": [{"name": c.get("name", "")[:40], "look": c.get("look", "")[:400]}
                 for c in raw.get("cast", [])[:6] if c.get("name")],
        "shots": shots,
        "aspectRatio": brief.get("aspectRatio", "16:9") if brief.get("aspectRatio") in ASPECTS else "16:9",
        "language": brief.get("language", "en-US") if brief.get("language") in LANGUAGES else "en-US",
        "style": brief.get("style", "cinematic"),
    }


def compose_keyframe_prompt(board: dict, shot: dict) -> str:
    """Character lock: the style bible and each cast member's fixed look are
    injected verbatim into every keyframe prompt."""
    cast = {c["name"]: c["look"] for c in board.get("cast", [])}
    looks = [f"{name}: {cast[name]}" for name in shot.get("castInShot", []) if name in cast]
    style = STYLE_PRESETS.get(board.get("style", ""), "")
    parts = [shot["keyframePrompt"]] + looks + [board.get("styleBible", ""), style]
    return ". ".join(p.strip().rstrip(".") for p in parts if p and p.strip())[:2000]


def compose_video_prompt(board: dict, shot: dict) -> str:
    text = f"{shot['videoPrompt'].rstrip('.')}. Camera: {shot['camera']}. {board.get('styleBible', '')}"
    return text[:1500]


def guard(text: str, source: str = "INPUT") -> None:
    """Run text through the account's Bedrock Guardrail (if configured)."""
    gid = common.env("GUARDRAIL_ID")
    if not gid or not text.strip():
        return
    r = common.client("bedrock-runtime").apply_guardrail(
        guardrailIdentifier=gid, guardrailVersion=common.env("GUARDRAIL_VERSION", "DRAFT"),
        source=source, content=[{"text": {"text": text[:20000]}}])
    if r.get("action") == "GUARDRAIL_INTERVENED":
        raise common.HttpError(422, "This request goes against Kyverin Studio's content policy. "
                                    "Please rephrase it (no real people, explicit or violent content).",
                               code="content_policy")


def direct(brief: dict) -> dict:
    if not (brief.get("idea") or "").strip():
        raise common.HttpError(400, "Describe your video idea first.")
    if len(brief["idea"]) > 4000:
        raise common.HttpError(400, "Keep the idea under 4,000 characters.")
    guard(brief["idea"] + "\n" + brief.get("brandNotes", ""))
    resp = common.client("bedrock-runtime").converse(**build_request(brief))
    board = normalize(parse_tool_output(resp), brief)
    guard(json.dumps(board), source="OUTPUT")
    return board
