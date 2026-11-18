"""Keyframes (Stability AI Stable Image Core on Bedrock) and voiceover (Amazon
Polly neural voices, timed to fit each shot exactly)."""
from __future__ import annotations

import base64
import json
from xml.sax.saxutils import escape

from . import common

KEYFRAME_MODEL = "stability.stable-image-core-v1:1"

NEGATIVE = ("text, watermark, logo, caption, signature, blurry, deformed hands, extra fingers, "
            "duplicate person, lowres, jpeg artifacts")

# Polly neural voices per language: (female, male)
VOICES = {
    "en-US": ("Ruth", "Stephen"), "es-US": ("Lupe", "Pedro"), "es-ES": ("Lucia", "Sergio"),
    "pt-BR": ("Camila", "Thiago"), "fr-FR": ("Lea", "Remi"), "de-DE": ("Vicki", "Daniel"),
    "it-IT": ("Bianca", "Adriano"), "ja-JP": ("Kazuha", "Takumi"), "hi-IN": ("Kajal", "Kajal"),
}


def voice_for(language: str, gender: str = "female") -> str:
    f, m = VOICES.get(language, VOICES["en-US"])
    return m if gender == "male" else f


def generate_keyframe(prompt: str, aspect_ratio: str, seed: int) -> bytes:
    body = {
        "prompt": prompt[:10000],
        "negative_prompt": NEGATIVE,
        "aspect_ratio": aspect_ratio if aspect_ratio != "21:9" else "21:9",
        "output_format": "jpeg",
        "seed": int(seed) % 4294967294,
    }
    r = common.client("bedrock-runtime").invoke_model(
        modelId=KEYFRAME_MODEL, body=json.dumps(body), contentType="application/json", accept="application/json")
    out = json.loads(r["body"].read())
    if out.get("finish_reasons") and out["finish_reasons"][0]:
        raise common.HttpError(422, "The image model filtered this keyframe. Try rewording the shot.",
                               code="content_policy")
    return base64.b64decode(out["images"][0])


# --------------------------------------------------------------------------- #
# Voiceover
# --------------------------------------------------------------------------- #

def ssml(text: str, rate: int = 100, pad_ms: int = 0, mark: bool = False) -> str:
    inner = escape(text)
    if rate != 100:
        inner = f'<prosody rate="{rate}%">{inner}</prosody>'
    if mark:
        inner += '<mark name="end"/>'
    breaks = ""
    while pad_ms > 0:  # Polly caps a single <break> at 10s
        chunk = min(pad_ms, 10000)
        breaks += f'<break time="{chunk}ms"/>'
        pad_ms -= chunk
    return f"<speak>{inner}{breaks}</speak>"


def _spoken_ms(polly, text: str, voice: str, rate: int) -> int:
    r = polly.synthesize_speech(Text=ssml(text, rate, mark=True), TextType="ssml", VoiceId=voice,
                                Engine="neural", OutputFormat="json", SpeechMarkTypes=["ssml"])
    marks = [json.loads(line) for line in r["AudioStream"].read().decode().splitlines() if line.strip()]
    ends = [m["time"] for m in marks if m.get("value") == "end"]
    return int(ends[-1]) if ends else 0


def plan_voiceover(spoken_ms: int, target_ms: int, rate: int = 100) -> tuple[int, int]:
    """Return (rate %, padding ms) so speech + padding fills the shot exactly.
    Speeds speech up (max 140%) when the line is too long."""
    head_room = 250
    if spoken_ms + head_room > target_ms and spoken_ms > 0:
        rate = min(140, int(rate * (spoken_ms + head_room) / target_ms) + 3)
        spoken_ms = int(spoken_ms * 100 / rate)
    return rate, max(0, target_ms - spoken_ms)


def synthesize_shot_voiceover(text: str, duration_s: int, language: str, gender: str) -> dict:
    """Synthesize narration for one shot, padded with silence to exactly the
    shot's duration so clips and audio line up during assembly."""
    polly = common.client("polly")
    voice = voice_for(language, gender)
    target = duration_s * 1000
    spoken = _spoken_ms(polly, text, voice, 100)
    rate, pad = plan_voiceover(spoken, target)
    if rate != 100:
        spoken = _spoken_ms(polly, text, voice, rate)
        pad = max(0, target - spoken)
    audio = polly.synthesize_speech(Text=ssml(text, rate, pad_ms=pad), TextType="ssml", VoiceId=voice,
                                    Engine="neural", OutputFormat="mp3", SampleRate="24000")
    return {"audio": audio["AudioStream"].read(), "spokenMs": min(spoken, target), "voice": voice, "rate": rate}


def _ts(ms: int, sep: str = ".") -> str:
    h, rem = divmod(int(ms), 3600000)
    m, rem = divmod(rem, 60000)
    s, ms = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}"


def caption_cues(shots: list[dict]) -> list[dict]:
    cues, offset = [], 0
    for s in shots:
        vo = s.get("voiceover") or {}
        if s.get("narration") and vo.get("spokenMs"):
            cues.append({"start": offset + 100, "end": offset + vo["spokenMs"] + 150, "text": s["narration"]})
        offset += int(s["duration"]) * 1000
    return cues


def build_vtt(shots: list[dict]) -> str:
    out = ["WEBVTT", ""]
    for c in caption_cues(shots):
        out += [f"{_ts(c['start'])} --> {_ts(c['end'])}", c["text"], ""]
    return "\n".join(out)


def build_srt(shots: list[dict]) -> str:
    out = []
    for i, c in enumerate(caption_cues(shots), 1):
        out += [str(i), f"{_ts(c['start'], ',')} --> {_ts(c['end'], ',')}", c["text"], ""]
    return "\n".join(out)
