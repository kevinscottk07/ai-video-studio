// Offline demo backend: same routes as the real API, in-memory, never bills anything.
const PALETTES = [["#0f3d3a", "#fbbf24"], ["#1a2547", "#2dd4bf"], ["#3b1d4a", "#f472b6"], ["#14281d", "#a3e635"], ["#3a1f12", "#fb923c"]];
const W = { "16:9": [1600, 900], "9:16": [900, 1600], "1:1": [1200, 1200] };

function frameSvg(text, i, aspect) {
  const [w, h] = W[aspect] || W["16:9"];
  const [a, b] = PALETTES[i % PALETTES.length];
  const words = text.split(" ").slice(0, 9).join(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="#050814"/></linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/><circle cx="${w * 0.72}" cy="${h * 0.35}" r="${h * 0.16}" fill="${b}" opacity=".85"/>
  <path d="M0 ${h * 0.78} Q ${w * 0.3} ${h * 0.62} ${w * 0.55} ${h * 0.76} T ${w} ${h * 0.7} V ${h} H 0Z" fill="#050814" opacity=".9"/>
  <text x="${w * 0.06}" y="${h * 0.14}" font-family="Georgia" font-size="${h * 0.05}" fill="#e8ecf8" opacity=".9">Shot ${i + 1}</text>
  <text x="${w * 0.06}" y="${h * 0.92}" font-family="Arial" font-size="${h * 0.03}" fill="#9aa6c7">${words.replace(/[<&]/g, "")}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const state = { credits: 400, ledger: [], projects: {} };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => Math.floor(Date.now() / 1000);
const id = (p) => p + Math.random().toString(16).slice(2, 14).padEnd(12, "0");
function spend(n, reason) {
  if (state.credits < n) { const e = new Error("Not enough credits for this step."); e.code = "credits"; throw e; }
  state.credits -= n; state.ledger.unshift({ ts: now(), delta: -n, reason: reason + " (demo)", balance: state.credits });
}
const clone = (x) => JSON.parse(JSON.stringify(x));

function storyboard(brief) {
  const n = brief.shots || 4;
  const cams = ["slow push in", "pan right", "orbit", "tracking shot", "tilt up", "handheld", "slow pull out", "crane up"];
  const lines = brief.language?.startsWith("es")
    ? ["Todo empieza con una idea.", "Cada detalle cuenta.", "La luz cambia, la historia avanza.", "Y entonces, todo encaja.", "Esto es solo el comienzo."]
    : ["It starts with a single idea.", "Every detail matters.", "The light shifts and the story moves.", "And then it all comes together.", "This is only the beginning."];
  return {
    title: brief.idea.split(/[.,]/)[0].slice(0, 60) || "Untitled", logline: "A demo storyboard written offline. Sign in to use the real AI director.",
    styleBible: "Teal and amber palette, soft morning haze, 35mm anamorphic, gentle film grain.",
    cast: [{ name: "Lead", look: "a person in their thirties, dark curly hair, olive field jacket, silver ring" }],
    aspectRatio: brief.aspectRatio || "16:9", language: brief.language || "en-US", style: brief.style || "cinematic",
    shots: Array.from({ length: n }, (_, i) => ({
      id: "s" + (i + 1), title: ["Establishing", "The detail", "Turning point", "Reveal", "Hero shot", "Close", "Epilogue", "Button"][i % 8],
      duration: i % 3 === 2 ? 9 : 5, camera: cams[i % cams.length], castInShot: i % 2 ? [] : ["Lead"],
      keyframePrompt: `${brief.idea.slice(0, 80)} (shot ${i + 1})`, videoPrompt: "subtle motion, drifting haze, the light warms",
      narration: lines[i % lines.length], transition: i === 0 ? "continuous" : "cut",
    })),
  };
}

function estimate(p, res) {
  const per = res === "720p" ? 30 : 15;
  const shots = p.board.shots.map((s) => ({ shotId: s.id, duration: s.duration, credits: Math.ceil(s.duration * per * 0.5), cached: false }));
  const total = shots.reduce((a, s) => a + s.credits, 0) + 1;
  return { resolution: res, seconds: p.board.shots.reduce((a, s) => a + s.duration, 0), shots, assemblyCredits: 1, totalCredits: total,
    estimatedUsd: +(total * 0.1).toFixed(2), balance: state.credits, canRender: true };
}

export async function demoApi(method, path, body = {}) {
  await sleep(250);
  const seg = path.split("/").filter(Boolean);
  if (path === "/me") return { userId: "demo-user", email: "demo@kyverin.studio", credits: state.credits, isAdmin: false, canRender: true,
    pricing: { storyboard: 1, keyframe: 1, shot540p5s: 38, shot720p5s: 75, creditUsd: 0.1 } };
  if (path === "/me/ledger") return { entries: state.ledger };
  if (path === "/projects" && method === "GET") return { projects: Object.values(state.projects).sort((a, b) => b.updated - a.updated).map((p) => ({
    id: p.id, title: p.board?.title || p.brief.idea.slice(0, 60), updated: p.updated, shots: p.board?.shots.length || 0,
    aspectRatio: p.brief.aspectRatio, thumbnail: p.board?.shots.find((s) => s.keyframe)?.keyframe.url })) };
  if (path === "/projects" && method === "POST") {
    const p = { id: id("p"), brief: body, board: null, settings: { voiceGender: body.voiceGender || "female", resolution: "540p" }, updated: now() };
    state.projects[p.id] = p; return clone(p);
  }
  const p = state.projects[seg[1]];
  if (!p) throw new Error("Project not found.");
  p.updated = now();
  const shot = seg[3] && p.board?.shots.find((s) => s.id === seg[3]);
  if (seg.length === 2 && method === "GET") return clone(p);
  if (seg.length === 2 && method === "PATCH") {
    if (body.settings) Object.assign(p.settings, body.settings);
    if (body.board) {
      const old = Object.fromEntries(p.board.shots.map((s) => [s.id, s]));
      Object.assign(p.board, { ...body.board, shots: (body.board.shots || p.board.shots).map((s) => {
        const o = old[s.id] || {}; const n = { ...o, ...s, id: s.id || id("s") };
        n.keyframeStale = !!n.keyframe && n.keyframe.prompt !== n.keyframePrompt; return n; }) });
    }
    return clone(p);
  }
  if (seg[2] === "storyboard") { spend(1, "storyboard"); await sleep(1200); p.board = storyboard(p.brief); return clone(p); }
  if (seg[2] === "shots" && seg[4] === "keyframe") {
    if (method === "POST") spend(1, "keyframe");
    await sleep(700);
    const i = p.board.shots.indexOf(shot);
    shot.keyframe = { url: method === "PUT" ? "data:image/jpeg;base64," + body.imageBase64 : frameSvg(shot.keyframePrompt + (body.variation ? " (variation)" : ""), i + (body.variation ? 2 : 0), p.board.aspectRatio), prompt: shot.keyframePrompt };
    shot.keyframeStale = false; return clone(p);
  }
  if (seg[2] === "shots" && seg[4] === "voiceover") { await sleep(300); return clone(p); } // demo uses browser speech
  if (seg[2] === "estimate") return estimate(p, body.resolution || p.settings.resolution);
  if (seg[2] === "renders" && method === "POST") {
    const est = estimate(p, body.resolution || "540p"); spend(est.totalCredits, "render");
    p.latestRender = { id: id("r"), status: "rendering", estimate: est, shotStatus: {}, started: Date.now(), demo: true };
    return clone(p.latestRender);
  }
  if (seg[2] === "renders" && method === "GET") {
    const r = p.latestRender; const elapsed = (Date.now() - r.started) / 1000;
    p.board.shots.forEach((s, i) => { if (elapsed > 6 * (i + 1)) r.shotStatus[s.id] = { status: "Completed" }; });
    if (Object.keys(r.shotStatus).length === p.board.shots.length) {
      r.status = "complete";
      r.error = "Demo mode: rendering is simulated, so no video file was produced. Sign in to render with Luma Ray2 on AWS.";
      const refund = r.estimate.totalCredits; if (!r.refunded) { state.credits += refund; r.refunded = refund; state.ledger.unshift({ ts: now(), delta: refund, reason: "demo refund", balance: state.credits }); }
    }
    return clone(r);
  }
  throw new Error("Not found.");
}
