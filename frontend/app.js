// Kyverin Studio — single-page app (no build step, ES modules).
import { demoApi } from "./demo.js";

const CFG = window.KYVERIN_CONFIG || {};
const DEMO = !CFG.apiUrl || new URLSearchParams(location.search).has("demo");
const $app = document.getElementById("app");
const $nav = document.getElementById("nav");

// ------------------------------------------------------------------ utils
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};
function toast(msg, err = false) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.className = "show" + (err ? " err" : "");
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.className = ""), 4200);
}
const ratioClass = (r) => (r === "9:16" ? "r9x16" : r === "1:1" ? "r1x1" : "");
const fmtDate = (ts) => (ts ? new Date(ts * 1000).toLocaleString() : "");
async function busy(btn, fn) {
  const label = btn?.innerHTML; if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>'; }
  try { return await fn(); } catch (e) { toast(e.message, true); throw e; }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = label; } }
}

// ------------------------------------------------------------------ auth (Cognito user pool, no SDK)
const auth = {
  get session() { return store.get("kv.session"); },
  async cognito(target, body) {
    const r = await fetch(`https://cognito-idp.${CFG.region}.amazonaws.com/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Target": `AWSCognitoIdentityProviderService.${target}` },
      body: JSON.stringify({ ClientId: CFG.userPoolClientId, ...body }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((data.message || data.__type || "Sign-in error").replace(/^.*#/, ""));
    return data;
  },
  save(res, email) {
    const a = res.AuthenticationResult;
    const prev = this.session || {};
    store.set("kv.session", { email: email || prev.email, idToken: a.IdToken, refreshToken: a.RefreshToken || prev.refreshToken,
      expires: Date.now() + (a.ExpiresIn - 60) * 1000 });
  },
  async signIn(email, password) {
    this.save(await this.cognito("InitiateAuth", { AuthFlow: "USER_PASSWORD_AUTH", AuthParameters: { USERNAME: email, PASSWORD: password } }), email);
  },
  signUp: (email, password) => auth.cognito("SignUp", { Username: email, Password: password, UserAttributes: [{ Name: "email", Value: email }] }),
  confirm: (email, code) => auth.cognito("ConfirmSignUp", { Username: email, ConfirmationCode: code }),
  resend: (email) => auth.cognito("ResendConfirmationCode", { Username: email }),
  forgot: (email) => auth.cognito("ForgotPassword", { Username: email }),
  reset: (email, code, password) => auth.cognito("ConfirmForgotPassword", { Username: email, ConfirmationCode: code, Password: password }),
  async token() {
    const s = this.session; if (!s) return null;
    if (Date.now() < s.expires) return s.idToken;
    try { this.save(await this.cognito("InitiateAuth", { AuthFlow: "REFRESH_TOKEN_AUTH", AuthParameters: { REFRESH_TOKEN: s.refreshToken } })); }
    catch { this.signOut(); return null; }
    return this.session.idToken;
  },
  signOut() { store.del("kv.session"); },
  get signedIn() { return DEMO || !!this.session; },
};

// ------------------------------------------------------------------ api
async function api(method, path, body) {
  if (DEMO) return demoApi(method, path, body);
  const token = await auth.token();
  if (!token) { location.hash = "#/"; throw new Error("Please sign in."); }
  const r = await fetch(CFG.apiUrl.replace(/\/$/, "") + path, {
    method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401) { auth.signOut(); location.hash = "#/"; }
  if (!r.ok) { const e = new Error(data.error || `Request failed (${r.status})`); e.code = data.code; e.status = r.status; throw e; }
  return data;
}

let ME = null;
async function loadMe() { ME = await api("GET", "/me"); renderNav(); return ME; }

const ICON = {
  home: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
  film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9.5h4M17 9.5h4M3 14.5h4M17 14.5h4"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.5c0-1.2 1.1-2 2.5-2s2.5.8 2.5 2-1.1 1.7-2.5 2-2.5.8-2.5 2 1.1 2 2.5 2 2.5-.8 2.5-2M12 6v1.5M12 16.5V18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  left: '<path d="m15 5-7 7 7 7"/>', right: '<path d="m9 5 7 7-7 7"/>',
};
const icon = (n, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;

// Light by default, dark on request; the choice is remembered (set before paint in index.html).
function setTheme(t) { document.documentElement.dataset.theme = t; store.set("kv.theme", t); renderNav(); }

function renderNav() {
  const h = location.hash || "#/";
  const dark = document.documentElement.dataset.theme === "dark";
  const on = (test) => (test ? 'aria-current="page"' : "");
  $nav.innerHTML = `
    ${DEMO ? '<span class="tag">Demo</span>' : ""}
    <button class="iconbtn" id="theme" aria-label="Switch to ${dark ? "light" : "dark"} mode" title="Switch to ${dark ? "light" : "dark"} mode">${icon(dark ? "sun" : "moon")}</button>
    ${auth.signedIn ? `<a class="credits" href="#/credits" title="Credit balance">${icon("coin", 16)}<b>${ME?.credits ?? "–"}</b></a>
      ${DEMO ? "" : '<button class="btn ghost small" id="signout">Sign out</button>'}`
    : '<button class="btn small" id="signin">Sign in</button>'}`;
  document.getElementById("theme").onclick = () => setTheme(dark ? "light" : "dark");
  document.getElementById("signin")?.addEventListener("click", () => openAuth());
  document.getElementById("signout")?.addEventListener("click", () => { auth.signOut(); ME = null; location.hash = "#/"; route(); });
  const side = document.getElementById("side");
  side.innerHTML = `<nav aria-label="Main">
    <a href="#/" ${on(h === "#/" || h === "#/home")}>${icon("home")}<span>Home</span></a>
    <a href="#/studio" ${on(h.startsWith("#/studio") || h.startsWith("#/p/"))}>${icon("film")}<span>Films</span></a>
    <a href="#/credits" ${on(h.startsWith("#/credits"))}>${icon("coin")}<span>Credits</span></a>
    </nav>
    <a class="btn side-new" href="#/studio" data-new>${icon("plus", 16)}<span>New film</span></a>
    <div class="side-foot"><p>Made with Amazon Bedrock on AWS. Every video is labeled as AI-generated.</p><a href="https://github.com/kevinscottk07/ai-video-studio">Source code</a></div>`;
  side.querySelector("[data-new]").onclick = (e) => { if (!auth.signedIn) { e.preventDefault(); openAuth("#/studio"); } };
}

// ------------------------------------------------------------------ auth dialog
let AFTER_AUTH = null;
function openAuth(next = null, mode = "signin") {
  AFTER_AUTH = next;
  const dlg = document.getElementById("authdlg");
  authForm(mode);
  if (!dlg.open) dlg.showModal();
}
function closeAuth() { const d = document.getElementById("authdlg"); if (d.open) d.close(); }

// ------------------------------------------------------------------ views
const OPTIONS = {
  style: [["cinematic", "Cinematic"], ["commercial", "Commercial"], ["documentary", "Documentary"], ["anime", "Anime"],
    ["3d-animation", "3D animation"], ["noir", "Film noir"], ["vintage", "Vintage 16mm"]],
  aspect: [["16:9", "16:9 landscape"], ["9:16", "9:16 vertical (Reels, Shorts, TikTok)"], ["1:1", "1:1 square"]],
  language: [["en-US", "English"], ["es-US", "Español (Latinoamérica)"], ["es-ES", "Español (España)"], ["pt-BR", "Português"],
    ["fr-FR", "Français"], ["de-DE", "Deutsch"], ["it-IT", "Italiano"], ["ja-JP", "日本語"], ["hi-IN", "हिन्दी"]],
  camera: ["static", "slow push in", "slow pull out", "pan left", "pan right", "tilt up", "tilt down", "orbit",
    "tracking shot", "crane up", "handheld", "aerial drone"],
};
const opts = (list, sel) => list.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${v === sel ? "selected" : ""}>${esc(l)}</option>`; }).join("");

let heroCleanup = null;
const STEPS = [
  ["Write one line", "A product launch, a short film, a vertical reel. One sentence is enough to start."],
  ["Get a storyboard", "The director plans five- and nine-second shots with shot sizes, camera moves and timed narration."],
  ["Lock the cast", "A style bible and fixed character looks go into every frame, so faces and wardrobe hold across cuts."],
  ["Paint keyframes", "Every shot gets a first frame. Repaint it, try a variation, or upload your own."],
  ["Add the voice", "Narration in nine languages, fitted to each cut, with captions."],
  ["Watch the animatic", "Preview the whole film at final timing before spending anything on renders."],
  ["Render", "Each shot animates from its keyframe. Change one shot and only that shot renders again."],
  ["Ship with credentials", "Every MP4 carries a manifest of the models and prompts used, and is labeled as AI-generated."],
];
// The featured film. Every frame was generated by Kyverin's own models.
const FILM = {
  title: "The Last Keeper", style: "Cinematic",
  blurb: "A lighthouse keeper's final night on the job, told in four shots with narration. Written, cast and painted by Kyverin from one line.",
  idea: "A short film about a lighthouse keeper's final night on the job: she climbs the stairs one last time, checks the lens, and at dawn the boats still find their way home.",
  shots: [
    { img: "shot1", secs: 5, move: "Slow push in", size: "Extreme wide", cam: "push", line: "For forty years, the light came on at seven." },
    { img: "shot2", secs: 5, move: "Tilt up", size: "Medium", cam: "tilt-u", line: "Tonight, she climbs the stairs one last time." },
    { img: "shot3", secs: 5, move: "Slow push in", size: "Close-up", cam: "push", line: "One more check of the lens." },
    { img: "shot4", secs: 9, move: "Pull out", size: "Wide", cam: "pull", line: "And the boats still find their way home." },
  ],
};
const ART = (CFG.artBase || "/art/");
const FORMATS = [
  { img: "shot1", title: "Short film", note: "A story in four to eight shots", aspect: "16:9", style: "cinematic", shots: 4, idea: FILM.idea },
  { img: "fmt-trailer", title: "Movie trailer", note: "Big reveals, fast cuts, one hook", aspect: "16:9", style: "cinematic", shots: 6, idea: "A trailer for a sci-fi film: a lone astronaut crosses a red desert toward a crashed ship, discovers it is her own, and the title hits." },
  { img: "fmt-ad", title: "Product ad", note: "Hero shots that sell one thing", aspect: "16:9", style: "commercial", shots: 4, idea: "A 20-second launch ad for matte black wireless headphones: water, light and silence, ending on the product and the line 'Hear nothing else'." },
  { img: "fmt-music", title: "Music video", note: "Performance and mood, cut to the beat", aspect: "16:9", style: "cinematic", shots: 6, idea: "A music video for a slow synth-pop song: a singer in a silver jacket performs in an empty warehouse under one red light." },
  { img: "fmt-doc", title: "Documentary", note: "Observed, natural, narrated", aspect: "16:9", style: "documentary", shots: 5, idea: "A short nature documentary about a snow leopard hunting on a Himalayan ridge at dawn." },
  { img: "fmt-reel", title: "Vertical reel", note: "9:16 for Reels, Shorts and TikTok", aspect: "9:16", style: "commercial", shots: 3, idea: "A 15-second vertical reel for a neighborhood cafe: the first pour of the morning, latte art, and the door opening to the street." },
];
const LOOKS = [["cinematic", "sty-cinematic"], ["commercial", "sty-commercial"], ["documentary", "sty-documentary"], ["anime", "sty-anime"], ["3d-animation", "sty-3d"], ["noir", "sty-noir"], ["vintage", "sty-vintage"]];
let PREFILL = null;

function startFrom(p) {
  PREFILL = p;
  if (!auth.signedIn) return openAuth("#/studio");
  location.hash = "#/studio";
}

const tile = (o, i, label) => `<button class="tile" data-i="${i}" aria-label="${esc(label)}">
  <span class="tile-media"><img src="${ART}${o.img}.jpg" alt="" loading="lazy" width="1344" height="768"/>${o.aspect === "9:16" ? '<span class="tag on-media">9:16</span>' : ""}</span>
  <span class="tile-text"><b>${esc(o.title)}</b><span>${esc(o.note)}</span></span></button>`;

const row = (id, title, body, extra = "") => `<section class="row-sec" aria-labelledby="${id}-h">
  <div class="row-head"><h2 id="${id}-h">${title}</h2>${extra}<div class="row-nav"><button class="iconbtn" data-dir="-1" aria-label="Scroll ${title} left">${icon("left")}</button><button class="iconbtn" data-dir="1" aria-label="Scroll ${title} right">${icon("right")}</button></div></div>
  <div class="rail" id="${id}">${body}</div></section>`;

async function home() {
  const S = FILM.shots, total = S.reduce((n, s) => n + s.secs, 0);
  $app.innerHTML = `
  <section class="feature" aria-labelledby="feat-h">
    <div class="frames" aria-hidden="true">${S.map((s, i) => `<img src="${ART}${s.img}.jpg" alt="" class="${i ? "" : "on"}" data-cam="${s.cam}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} width="1536" height="640"/>`).join("")}</div>
    <div class="feature-copy">
      <p class="feature-label">Featured film</p>
      <h1 id="feat-h">${esc(FILM.title)}</h1>
      <ul class="facts-inline"><li>${S.length} shots</li><li>${total} seconds</li><li>${esc(FILM.style)}</li><li>Narrated</li></ul>
      <p class="feature-blurb">${esc(FILM.blurb)}</p>
      <div class="actions"><button class="btn big" id="remix">Make a film like this</button><a class="btn ghost big on-dark" href="#formats-h">Browse formats</a></div>
    </div>
    <p class="sub" id="sub" aria-live="off">${esc(S[0].line)}</p>
    <div class="track" role="group" aria-label="Shots in ${esc(FILM.title)}">
      <button class="pp" id="pp" aria-label="Pause the featured film"><svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path class="i-pause" d="M4 3h3v10H4zM9 3h3v10H9z"/><path class="i-play" d="M4 2.5l9 5.5-9 5.5z"/></svg></button>
      ${S.map((s, i) => `<button class="seg ${i ? "" : "on"}" data-i="${i}" style="flex:${s.secs}" aria-label="Shot ${i + 1}: ${esc(s.size)}, ${esc(s.move)}"><i></i></button>`).join("")}
    </div>
  </section>
  ${auth.signedIn ? row("mine", "Your films", '<div class="rail-msg"><span class="spinner"></span></div>', '<a href="#/studio" class="row-link">See all</a>') : ""}
  ${row("formats", "Start from a format", FORMATS.map((f, i) => tile(f, i, `${f.title}: ${f.note}`)).join(""))}
  ${row("looks", "Pick a look", LOOKS.map(([k, img], i) => { const n = OPTIONS.style.find((o) => o[0] === k)[1]; return tile({ img, title: n, note: "Start a film in this style" }, i, `Start a ${n} film`); }).join(""))}
  <section class="how" aria-labelledby="how-h">
    <h2 id="how-h">How a film gets made</h2>
    <ol>${STEPS.map(([t, d]) => `<li><h3>${t}</h3><p>${d}</p></li>`).join("")}</ol>
  </section>`;
  document.getElementById("remix").onclick = () => startFrom({ idea: FILM.idea, aspect: "16:9", style: "cinematic", shots: 4 });
  $app.querySelectorAll("#formats .tile").forEach((t) => (t.onclick = () => { const f = FORMATS[+t.dataset.i]; startFrom({ idea: f.idea, aspect: f.aspect, style: f.style, shots: f.shots }); }));
  $app.querySelectorAll("#looks .tile").forEach((t) => (t.onclick = () => startFrom({ style: LOOKS[+t.dataset.i][0] })));
  bindRails($app);
  heroCleanup?.(); heroCleanup = mountReel($app.querySelector(".feature"), S);
  if (auth.signedIn) {
    try {
      if (!ME) await loadMe();
      const { projects } = await api("GET", "/projects");
      const el = document.getElementById("mine"); if (!el) return;
      el.innerHTML = `<a class="tile new-tile" href="#/studio"><span class="tile-media">${icon("plus", 28)}</span><span class="tile-text"><b>New film</b><span>Describe an idea</span></span></a>` +
        projects.map((p) => `<a class="tile" href="#/p/${p.id}"><span class="tile-media">${p.thumbnail ? `<img src="${esc(p.thumbnail)}" alt="" loading="lazy"/>` : ""}</span><span class="tile-text"><b>${esc(p.title)}</b><span>${p.shots} shots, ${esc(p.aspectRatio || "")}, ${fmtDate(p.updated)}</span></span></a>`).join("");
    } catch (e) { const el = document.getElementById("mine"); if (el) el.innerHTML = `<p class="rail-msg">${esc(e.message)}</p>`; }
  }
}

// Carousels: arrow buttons page by a screen; arrow keys move focus tile to tile.
function bindRails(root) {
  root.querySelectorAll(".row-sec").forEach((sec) => {
    const rail = sec.querySelector(".rail");
    sec.querySelectorAll("[data-dir]").forEach((b) => (b.onclick = () => rail.scrollBy({ left: +b.dataset.dir * rail.clientWidth * 0.9, behavior: "smooth" })));
    rail.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const tiles = [...rail.querySelectorAll(".tile")]; const k = tiles.indexOf(document.activeElement);
      const next = tiles[k + (e.key === "ArrowRight" ? 1 : -1)]; if (next) { e.preventDefault(); next.focus(); next.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" }); }
    });
  });
}

// Plays the featured film one shot at a time, timed like the real cut.
// Pausable; no autoplay for people who prefer reduced motion.
function mountReel(root, shots) {
  const imgs = [...root.querySelectorAll(".frames img")], segs = [...root.querySelectorAll(".seg")];
  const sub = root.querySelector("#sub"), pp = root.querySelector("#pp");
  let i = 0, t0 = 0, played = 0, raf = 0;
  let playing = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const show = (n) => {
    i = n; played = 0; t0 = performance.now();
    imgs.forEach((im, k) => { im.classList.toggle("on", k === n); if (k === n && playing) { im.style.animation = "none"; void im.offsetWidth; im.style.animation = ""; } });
    segs.forEach((s, k) => { s.classList.toggle("on", k === n); s.style.setProperty("--p", k < n ? 1 : 0); });
    sub.textContent = shots[n].line;
  };
  const tick = (now) => {
    if (playing) {
      const p = Math.min(1, (played + now - t0) / (shots[i].secs * 1000));
      segs[i].style.setProperty("--p", p);
      if (p >= 1) show((i + 1) % shots.length);
    }
    raf = requestAnimationFrame(tick);
  };
  const setPlaying = (v) => {
    if (!v) played += performance.now() - t0; else t0 = performance.now();
    playing = v; root.classList.toggle("paused", !v);
    pp.setAttribute("aria-label", v ? "Pause the featured film" : "Play the featured film");
  };
  pp.onclick = () => setPlaying(!playing);
  segs.forEach((s) => (s.onclick = () => show(+s.dataset.i)));
  root.classList.toggle("paused", !playing);
  show(0); raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

function authForm(mode, email = "") {
  const box = document.getElementById("authbox");
  const tabs = `<div class="tabs"><button data-m="signin" class="${mode === "signin" ? "on" : ""}">Sign in</button><button data-m="signup" class="${mode === "signup" ? "on" : ""}">Create account</button></div>`;
  const forms = {
    signin: `<h2>Welcome back</h2><label>Email</label><input id="em" type="email" autocomplete="email" value="${esc(email)}"/>
      <label>Password</label><input id="pw" type="password" autocomplete="current-password"/>
      <div class="row spread" style="margin-top:14px"><button class="btn" id="go">Sign in</button><a href="#" id="fg" class="small">Forgot password?</a></div>`,
    signup: `<h2>Start directing</h2><p class="small muted">New accounts get free credits for storyboards, keyframes and animatics.</p>
      <label>Email</label><input id="em" type="email" autocomplete="email" value="${esc(email)}"/>
      <label>Password <span class="muted">(10+ chars, upper, lower, number)</span></label><input id="pw" type="password" autocomplete="new-password"/>
      <div class="row" style="margin-top:14px"><button class="btn" id="go">Create account</button></div>`,
    confirm: `<h2>Check your email</h2><p class="small muted">We sent a 6-digit code to ${esc(email)}.</p>
      <label>Code</label><input id="code" inputmode="numeric" autocomplete="one-time-code"/>
      <div class="row" style="margin-top:14px"><button class="btn" id="go">Verify</button><a href="#" id="rs" class="small">Resend code</a></div>`,
    reset: `<h2>Reset password</h2><p class="small muted">Enter the code we emailed to ${esc(email)}.</p>
      <label>Code</label><input id="code"/><label>New password</label><input id="pw" type="password" autocomplete="new-password"/>
      <div class="row" style="margin-top:14px"><button class="btn" id="go">Set password</button></div>`,
  };
  box.innerHTML = (mode === "signin" || mode === "signup" ? tabs : "") + forms[mode];
  box.querySelectorAll(".tabs button").forEach((b) => (b.onclick = () => authForm(b.dataset.m, box.querySelector("#em")?.value)));
  const v = (id) => box.querySelector("#" + id)?.value.trim();
  box.querySelector("#fg")?.addEventListener("click", async (e) => {
    e.preventDefault(); const em = v("em"); if (!em) return toast("Enter your email first.", true);
    try { await auth.forgot(em); authForm("reset", em); } catch (err) { toast(err.message, true); }
  });
  box.querySelector("#rs")?.addEventListener("click", async (e) => { e.preventDefault(); await auth.resend(email); toast("Code sent."); });
  const go = box.querySelector("#go");
  const submit = () => busy(go, async () => {
    if (mode === "signin") { await auth.signIn(v("em"), box.querySelector("#pw").value); closeAuth(); ME = null; await loadMe(); location.hash = AFTER_AUTH || "#/"; route(); }
    if (mode === "signup") { await auth.signUp(v("em"), box.querySelector("#pw").value); authForm("confirm", v("em")); }
    if (mode === "confirm") { await auth.confirm(email, v("code")); toast("Verified. Sign in to continue."); authForm("signin", email); }
    if (mode === "reset") { await auth.reset(email, v("code"), box.querySelector("#pw").value); toast("Password updated."); authForm("signin", email); }
  }).catch((e) => { if (/not confirmed/i.test(e.message)) authForm("confirm", v("em")); });
  go.onclick = submit;
  box.querySelectorAll("input").forEach((i) => i.addEventListener("keydown", (e) => e.key === "Enter" && submit()));
}

async function studio() {
  $app.innerHTML = `<nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Kyverin</a><span aria-hidden="true">/</span><span>Films</span></nav>
  <div class="page-head"><h1>Films</h1><p>Describe an idea and the director writes the storyboard. You approve every shot before anything renders.</p></div>
  <div class="card" style="margin:0 0 28px">
    <h2 class="card-title">New film</h2>
    <div class="grid newform">
      <div><label>What's the video about?</label>
        <textarea id="idea" rows="5" placeholder="e.g. A 30-second launch teaser for a solar-powered kayak. Sunrise on a misty lake, a paddler glides silently, ends on the product at golden hour."></textarea>
        <label>Brand or creative notes (optional)</label><input id="brand" placeholder="Colors, product details, things to avoid"/></div>
      <div>
        <label>Shots</label><select id="shots">${opts([2, 3, 4, 5, 6, 8, 10, 12].map((n) => [String(n), `${n} shots`]), "4")}</select>
        <label>Format</label><select id="aspect">${opts(OPTIONS.aspect, "16:9")}</select>
        <label>Style</label><select id="style">${opts(OPTIONS.style, "cinematic")}</select>
        <label>Narration language</label><select id="lang">${opts(OPTIONS.language, "en-US")}</select>
        <label>Voice</label><select id="voice">${opts([["female", "Female"], ["male", "Male"]], "female")}</select>
      </div>
    </div>
    <div class="row" style="margin-top:14px"><button class="btn" id="create">Write storyboard</button>
      <span class="small muted">Costs ${ME?.pricing?.storyboard ?? 1} credit. The director plans shots, cast and narration.</span></div>
  </div>
  <div class="grid projects" id="plist"><div class="muted"><span class="spinner"></span> Loading…</div></div>`;
  if (PREFILL) {
    const f = PREFILL; PREFILL = null;
    if (f.idea) document.getElementById("idea").value = f.idea;
    if (f.aspect) document.getElementById("aspect").value = f.aspect;
    if (f.style) document.getElementById("style").value = f.style;
    if (f.shots) document.getElementById("shots").value = String(f.shots);
    document.getElementById("idea").focus();
  }
  document.getElementById("create").onclick = (e) => busy(e.currentTarget, async () => {
    const g = (id) => document.getElementById(id).value;
    if (!g("idea").trim()) throw new Error("Describe your video idea first.");
    const p = await api("POST", "/projects", { idea: g("idea"), shots: +g("shots"), aspectRatio: g("aspect"), style: g("style"),
      language: g("lang"), voiceGender: g("voice"), brandNotes: g("brand") });
    location.hash = `#/p/${p.id}`;
    await api("POST", `/projects/${p.id}/storyboard`).then(() => { loadMe(); route(); }).catch((err) => toast(err.message, true));
  });
  const { projects } = await api("GET", "/projects");
  document.getElementById("plist").innerHTML = projects.length ? projects.map((p) => `
    <a class="card proj" href="#/p/${p.id}">
      <div class="thumb" style="${p.thumbnail ? `background-image:url('${esc(p.thumbnail)}')` : ""}"></div>
      <div class="meta"><strong>${esc(p.title)}</strong><div class="small muted">${p.shots} shots · ${esc(p.aspectRatio || "")} · ${fmtDate(p.updated)}</div></div>
    </a>`).join("") : `<p class="muted">No films yet. Describe an idea above to get started.</p>`;
}

// ------------------------------------------------------------------ editor
let P = null; let dirty = false; let saveTimer = null; let pollTimer = null;

async function editor(id) {
  clearInterval(pollTimer);
  $app.innerHTML = `<p class="muted"><span class="spinner"></span> Loading project…</p>`;
  P = await api("GET", `/projects/${id}`);
  if (!P.board) {
    $app.innerHTML = `<div class="card"><h2>The director is writing your storyboard…</h2><p class="muted"><span class="spinner"></span> This takes about 20–40 seconds.</p>
      <button class="btn ghost" id="retry">Retry storyboard</button></div>`;
    document.getElementById("retry").onclick = (e) => busy(e.currentTarget, async () => { await api("POST", `/projects/${id}/storyboard`); await loadMe(); route(); });
    pollTimer = setInterval(async () => { const p = await api("GET", `/projects/${id}`).catch(() => null); if (p?.board) { clearInterval(pollTimer); route(); } }, 5000);
    return;
  }
  drawEditor();
  if (P.latestRender && ["queued", "rendering", "assembling"].includes(P.latestRender.status)) pollRender(P.latestRender.id);
}

function drawEditor() {
  const b = P.board; const rc = ratioClass(b.aspectRatio);
  const missing = b.shots.filter((s) => !s.keyframe).length;
  $app.innerHTML = `
  <div class="row spread" style="margin-bottom:16px">
    <div><nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Kyverin</a><span aria-hidden="true">/</span><a href="#/studio">Films</a><span aria-hidden="true">/</span><span>${esc(b.title)}</span></nav><h1 class="ed-title">${esc(b.title)}</h1><p class="muted" style="margin:0">${esc(b.logline)}</p></div>
    <div class="row">
      <span class="small muted" id="savestate">Saved</span>
      <button class="btn ghost" id="allkf">${missing ? `Paint ${missing} keyframe${missing > 1 ? "s" : ""}` : "Repaint all"}</button>
      <button class="btn ghost" id="allvo">Record voiceover</button>
      <button class="btn" id="play">Play animatic</button>
    </div>
  </div>
  <div class="editor">
    <aside class="side grid">
      <div class="card">
        <h3>Style bible</h3>
        <textarea data-b="styleBible" rows="4">${esc(b.styleBible)}</textarea>
        <h3 style="margin-top:14px">Cast <span class="small muted">(locked across shots)</span></h3>
        <div id="cast">${b.cast.map((c, i) => `<label>${esc(c.name)}</label><textarea data-cast="${i}" rows="3">${esc(c.look)}</textarea>`).join("") || '<p class="small muted">No recurring characters.</p>'}</div>
        <p class="small muted">${esc(b.aspectRatio)} · ${esc(b.style)} · ${esc(b.language)} · ${b.shots.reduce((a, s) => a + s.duration, 0)}s</p>
      </div>
      <div class="card renderbox" id="renderbox"></div>
      <div class="card final" id="final"></div>
    </aside>
    <section class="shots" id="shots">
      ${b.shots.map((s, i) => shotCard(s, i, rc)).join("")}
      <button class="btn ghost" id="addshot">+ Add shot</button>
    </section>
  </div>`;
  bindEditor(); drawRenderBox(); drawFinal();
}

function shotCard(s, i, rc) {
  const media = s.clip?.url ? `<video src="${esc(s.clip.url)}" muted loop playsinline preload="metadata" onmouseenter="this.play()" onmouseleave="this.pause()"></video>`
    : s.keyframe?.url ? `<img src="${esc(s.keyframe.url)}" alt="Keyframe for ${esc(s.title)}"/>` : `<span>No keyframe yet</span>`;
  return `<article class="card shot" data-i="${i}">
    <div>
      <div class="frame ${rc}">${media}<span class="badge">${i + 1} · ${s.duration}s${s.clip ? " · rendered" : ""}</span>${s.keyframeStale ? '<span class="badge warn">prompt changed</span>' : ""}</div>
      <div class="row" style="margin-top:8px">
        <button class="btn small" data-act="kf">${s.keyframe ? "Repaint" : "Paint keyframe"}</button>
        ${s.keyframe ? '<button class="btn small ghost" data-act="var">Variation</button>' : ""}
        <label class="btn small ghost" style="margin:0">Upload<input type="file" accept="image/jpeg" data-act="up" hidden/></label>
        <button class="btn small ghost" data-act="vo" title="Record narration">🎙</button>
        ${s.voiceover?.url ? `<button class="btn small ghost" data-act="listen">▶</button>` : ""}
      </div>
    </div>
    <div>
      <div class="shot-head"><input data-f="title" value="${esc(s.title)}" aria-label="Shot title"/>
        <div class="row"><button class="btn small ghost" data-act="up1" title="Move up">↑</button><button class="btn small ghost" data-act="dn1" title="Move down">↓</button><button class="btn small danger" data-act="del" title="Delete shot">✕</button></div></div>
      <div class="shot-fields">
        <div><label>Duration</label><select data-f="duration">${opts([["5", "5 seconds"], ["9", "9 seconds"]], String(s.duration))}</select></div>
        <div><label>Camera</label><select data-f="camera">${opts(OPTIONS.camera, s.camera)}</select></div>
        <div class="full"><label>First frame (keyframe)</label><textarea data-f="keyframePrompt" rows="2">${esc(s.keyframePrompt)}</textarea></div>
        <div class="full"><label>Motion</label><textarea data-f="videoPrompt" rows="2">${esc(s.videoPrompt)}</textarea></div>
        <div class="full"><label>Narration</label><textarea data-f="narration" rows="2">${esc(s.narration)}</textarea></div>
        <div><label>Cast in shot</label><input data-f="castInShot" value="${esc((s.castInShot || []).join(", "))}"/></div>
        <div><label>Transition out</label><select data-f="transition">${opts([["cut", "Cut"], ["continuous", "Continuous take"]], s.transition)}</select></div>
      </div>
    </div>
  </article>`;
}

function collect() {
  const b = P.board;
  document.querySelectorAll("[data-b]").forEach((el) => (b[el.dataset.b] = el.value));
  document.querySelectorAll("[data-cast]").forEach((el) => (b.cast[+el.dataset.cast].look = el.value));
  document.querySelectorAll(".shot").forEach((card) => {
    const s = b.shots[+card.dataset.i];
    card.querySelectorAll("[data-f]").forEach((el) => {
      const f = el.dataset.f;
      s[f] = f === "duration" ? +el.value : f === "castInShot" ? el.value.split(",").map((x) => x.trim()).filter(Boolean) : el.value;
    });
  });
}

async function save(now = false) {
  clearTimeout(saveTimer);
  const run = async () => {
    if (!dirty) return; dirty = false;
    const st = document.getElementById("savestate"); if (st) st.textContent = "Saving…";
    const b = P.board;
    const keep = P.latestRender;
    P = await api("PATCH", `/projects/${P.id}`, { board: { title: b.title, styleBible: b.styleBible, cast: b.cast, shots: b.shots } });
    P.latestRender = keep;
    if (st) st.textContent = "Saved";
    document.querySelectorAll(".shot").forEach((card) => {
      const s = P.board.shots[+card.dataset.i]; const badge = card.querySelector(".badge.warn");
      if (s?.keyframeStale && !badge) card.querySelector(".frame").insertAdjacentHTML("beforeend", '<span class="badge warn">prompt changed</span>');
      if (!s?.keyframeStale && badge) badge.remove();
    });
    drawRenderBox();
  };
  if (now) return run();
  saveTimer = setTimeout(() => run().catch((e) => toast(e.message, true)), 900);
}

function bindEditor() {
  $app.querySelectorAll("textarea, input[data-f], select[data-f]").forEach((el) =>
    el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => {
      collect(); dirty = true; document.getElementById("savestate").textContent = "Unsaved"; save();
      if (el.dataset.f === "duration") drawEditor();
    }));
  document.getElementById("play").onclick = async () => { await save(true); animatic(); };
  document.getElementById("addshot").onclick = async () => {
    collect(); P.board.shots.push({ title: "New shot", duration: 5, camera: "static", keyframePrompt: "", videoPrompt: "", narration: "", transition: "cut", castInShot: [] });
    dirty = true; await save(true); drawEditor();
  };
  document.getElementById("allkf").onclick = (e) => busy(e.currentTarget, async () => {
    await save(true);
    const todo = P.board.shots.filter((s) => !s.keyframe || s.keyframeStale);
    const list = todo.length ? todo : P.board.shots;
    for (const s of list) { P = await api("POST", `/projects/${P.id}/shots/${s.id}/keyframe`, {}); }
    await loadMe(); drawEditor();
  });
  document.getElementById("allvo").onclick = (e) => busy(e.currentTarget, async () => {
    await save(true);
    for (const s of P.board.shots.filter((x) => x.narration?.trim())) P = await api("POST", `/projects/${P.id}/shots/${s.id}/voiceover`, {});
    drawEditor(); toast("Voiceover recorded and fitted to each shot.");
  });
  $app.querySelectorAll(".shot").forEach((card) => {
    const i = +card.dataset.i;
    card.querySelectorAll("[data-act]").forEach((btn) => {
      const act = btn.dataset.act;
      const sid = () => P.board.shots[i].id;
      if (act === "up") {
        btn.onchange = () => busy(null, async () => {
          const f = btn.files[0]; if (!f) return;
          if (f.size > 6e6) throw new Error("Upload a JPEG under 6 MB.");
          const b64 = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.readAsDataURL(f); });
          await save(true); P = await api("PUT", `/projects/${P.id}/shots/${sid()}/keyframe`, { imageBase64: b64 }); drawEditor();
        });
        return;
      }
      btn.onclick = () => busy(btn, async () => {
        await save(true);
        if (act === "kf" || act === "var") { P = await api("POST", `/projects/${P.id}/shots/${sid()}/keyframe`, { variation: act === "var" }); await loadMe(); drawEditor(); }
        if (act === "vo") { P = await api("POST", `/projects/${P.id}/shots/${sid()}/voiceover`, {}); drawEditor(); }
        if (act === "listen") new Audio(P.board.shots[i].voiceover.url).play();
        if (act === "del" || act === "up1" || act === "dn1") {
          const sh = P.board.shots;
          if (act === "del") { if (sh.length === 1) throw new Error("Keep at least one shot."); if (!confirm("Delete this shot?")) return; sh.splice(i, 1); }
          else { const j = act === "up1" ? i - 1 : i + 1; if (j < 0 || j >= sh.length) return; [sh[i], sh[j]] = [sh[j], sh[i]]; }
          dirty = true; await save(true); drawEditor();
        }
      });
    });
  });
}

async function drawRenderBox() {
  const box = document.getElementById("renderbox"); if (!box) return;
  const res = P.settings?.resolution || "540p";
  box.innerHTML = `<h3>Render</h3><p class="muted small"><span class="spinner"></span> Estimating…</p>`;
  let est;
  try { est = await api("POST", `/projects/${P.id}/estimate`, { resolution: res }); } catch (e) { box.innerHTML = `<p class="muted">${esc(e.message)}</p>`; return; }
  const ready = P.board.shots.every((s) => s.keyframe);
  const enough = (est.balance ?? 0) >= est.totalCredits;
  box.innerHTML = `
    <h3>Render with Luma Ray2</h3>
    <label>Resolution</label><select id="res">${opts([["540p", "540p · 38 credits / 5s"], ["720p", "720p · 75 credits / 5s"]], res)}</select>
    <div class="row spread" style="margin-top:12px"><span class="total">${est.totalCredits}</span><span class="small muted">credits ≈ $${est.estimatedUsd}<br/>${est.seconds}s · ${est.shots.filter((x) => x.cached).length} shot(s) reused</span></div>
    <table class="small" style="margin:10px 0">${est.shots.map((l, k) => `<tr><td>Shot ${k + 1}</td><td>${l.duration}s</td><td>${l.cached ? "reused" : l.credits}</td></tr>`).join("")}<tr><td>Assembly</td><td></td><td>${est.assemblyCredits}</td></tr></table>
    ${!est.canRender ? `<p class="notice">Rendering is reserved for studio admins on this deployment. Everything else, including the animatic, is open to you.</p>`
      : !ready ? `<p class="notice">Paint a keyframe for every shot first. Ray2 animates from your keyframes, which keeps characters consistent.</p>`
      : !enough ? `<p class="notice">You need ${est.totalCredits - (est.balance ?? 0)} more credits.</p>` : ""}
    <button class="btn" id="render" style="width:100%" ${est.canRender && ready && enough ? "" : "disabled"}>Render ${est.seconds}s video</button>`;
  document.getElementById("res").onchange = async (e) => { P = { ...P, ...(await api("PATCH", `/projects/${P.id}`, { settings: { resolution: e.target.value } })), latestRender: P.latestRender }; drawRenderBox(); };
  document.getElementById("render").onclick = (e) => busy(e.currentTarget, async () => {
    if (!confirm(`Render this video for ${est.totalCredits} credits (≈ $${est.estimatedUsd} of AWS usage)?`)) return;
    await save(true);
    P.latestRender = await api("POST", `/projects/${P.id}/renders`, { resolution: document.getElementById("res").value });
    await loadMe(); drawFinal(); pollRender(P.latestRender.id);
  });
}

function drawFinal() {
  const el = document.getElementById("final"); if (!el) return;
  const r = P.latestRender;
  if (!r) { el.innerHTML = `<h3>Final video</h3><p class="small muted">Rendered films appear here with captions and content credentials.</p>`; return; }
  const live = ["queued", "rendering", "assembling"].includes(r.status);
  const done = r.shotStatus ? Object.values(r.shotStatus).filter((x) => x.status === "Completed").length : 0;
  el.innerHTML = `<h3>Final video</h3>
    <div class="status"><span class="dot ${live ? "live" : r.status === "complete" ? "ok" : "bad"}"></span>${esc(r.status)}${live && r.status !== "assembling" ? ` · ${done}/${r.estimate?.shots?.length ?? "?"} shots` : ""}</div>
    ${live ? '<p class="small muted">Each shot takes 1–3 minutes on Ray2. You can leave this page. Rendering continues on AWS.</p>' : ""}
    ${r.error ? `<p class="notice">${esc(r.error)}${r.refunded ? ` · ${r.refunded} credits refunded` : ""}</p>` : ""}
    ${r.videoUrl ? `<video controls playsinline crossorigin="anonymous" src="${esc(r.videoUrl)}" poster="${esc(P.board.shots[0]?.keyframe?.url || "")}">
        ${r.captionsUrl ? `<track default kind="captions" srclang="${esc(P.board.language.slice(0, 2))}" label="Captions" src="${esc(r.captionsUrl)}"/>` : ""}</video>
      <div class="row small" style="margin-top:8px"><a href="${esc(r.videoUrl)}" download>MP4</a>·<a href="${esc(r.srtUrl)}" download>SRT</a>·<a href="${esc(r.captionsUrl)}" download>VTT</a>·<a href="${esc(r.provenanceUrl)}" target="_blank" rel="noopener">Content credentials</a></div>
      <p class="small muted">SHA-256 ${esc((r.sha256 || "").slice(0, 16))}… · Labeled as AI-generated</p>` : ""}`;
}

function pollRender(rid) {
  clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    if (!location.hash.startsWith(`#/p/${P?.id}`)) return clearInterval(pollTimer);
    const r = await api("GET", `/projects/${P.id}/renders/${rid}`).catch(() => null);
    if (!r) return;
    P.latestRender = r; drawFinal();
    if (!["queued", "rendering", "assembling"].includes(r.status)) {
      clearInterval(pollTimer); toast(r.status === "complete" ? "Your film is ready." : "Render failed. Unused credits were refunded.", r.status !== "complete");
      const fresh = await api("GET", `/projects/${P.id}`); P = fresh; drawEditor(); loadMe();
    }
  }, 10000);
}

// ------------------------------------------------------------------ animatic
const CAM_ANIM = { "slow push in": "cam-push", "slow pull out": "cam-pull", "pan left": "cam-pan-l", "pan right": "cam-pan-r",
  "tilt up": "cam-tilt-u", "tilt down": "cam-tilt-d", orbit: "cam-orbit", "tracking shot": "cam-pan-r", "crane up": "cam-tilt-u",
  handheld: "cam-hand", "aerial drone": "cam-push", static: "" };

function animatic() {
  const b = P.board; const shots = b.shots;
  const ov = document.createElement("div"); ov.className = "overlay";
  ov.innerHTML = `<button class="btn ghost close">Close ✕</button>
    <div><div class="stage ${ratioClass(b.aspectRatio)}">${shots.map((s, i) => s.keyframe?.url ? `<img data-i="${i}" src="${esc(s.keyframe.url)}" alt=""/>` : "").join("")}
      <div class="label"></div><div class="cap"></div></div>
    <p class="small muted" style="text-align:center">Animatic preview · keyframes + camera moves + voiceover, timed exactly like the final render</p></div>`;
  document.body.appendChild(ov);
  let stopped = false; let audio = null; let timer = null;
  const stop = () => { stopped = true; clearTimeout(timer); audio?.pause(); ov.remove(); };
  ov.querySelector(".close").onclick = stop;
  document.addEventListener("keydown", function esc_(e) { if (e.key === "Escape") { stop(); document.removeEventListener("keydown", esc_); } });
  const play = (i) => {
    if (stopped) return; if (i >= shots.length) { timer = setTimeout(stop, 800); return; }
    const s = shots[i];
    ov.querySelectorAll(".stage img").forEach((im) => im.classList.remove("on"));
    const img = ov.querySelector(`.stage img[data-i="${i}"]`);
    if (img) { img.style.animation = "none"; void img.offsetWidth; const a = CAM_ANIM[s.camera]; img.style.animation = a ? `${a} ${s.duration}s linear forwards` : ""; img.classList.add("on"); }
    ov.querySelector(".label").textContent = `Shot ${i + 1}/${shots.length} · ${s.camera} · ${s.duration}s${img ? "" : " · no keyframe"}`;
    ov.querySelector(".cap").textContent = s.narration || "";
    audio?.pause(); audio = null;
    if (s.voiceover?.url) { audio = new Audio(s.voiceover.url); audio.play().catch(() => {}); }
    else if (s.narration && "speechSynthesis" in window && DEMO) { const u = new SpeechSynthesisUtterance(s.narration); u.lang = b.language; speechSynthesis.cancel(); speechSynthesis.speak(u); }
    timer = setTimeout(() => play(i + 1), s.duration * 1000);
  };
  play(0);
}

// ------------------------------------------------------------------ credits
async function credits() {
  await loadMe();
  const { entries } = await api("GET", "/me/ledger");
  const pr = ME.pricing;
  $app.innerHTML = `<nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Kyverin</a><span aria-hidden="true">/</span><span>Credits</span></nav><div class="page-head"><h1>Credits</h1></div>
  <div class="grid" style="grid-template-columns:1fr 2fr">
    <div class="card"><div class="muted small">Balance</div><div class="total">${ME.credits}</div>
      <p class="small muted">1 credit ≈ $${pr.creditUsd.toFixed(2)} of AWS usage. Credits are reserved when a render starts and refunded for any shot that fails.</p>
      <table class="small"><tr><td>Storyboard</td><td>${pr.storyboard}</td></tr><tr><td>Keyframe</td><td>${pr.keyframe}</td></tr><tr><td>Voiceover</td><td>free</td></tr>
      <tr><td>5s shot · 540p</td><td>${pr.shot540p5s}</td></tr><tr><td>5s shot · 720p</td><td>${pr.shot720p5s}</td></tr></table>
      ${ME.isAdmin ? `<p class="small">Admin · user id <code>${esc(ME.userId)}</code></p>` : ""}</div>
    <div class="card"><h3>History</h3><table><tr><th>When</th><th>What</th><th>Change</th><th>Balance</th></tr>
      ${entries.map((e) => `<tr><td>${fmtDate(e.ts)}</td><td>${esc(e.reason)}</td><td class="${e.delta < 0 ? "neg" : "pos"}">${e.delta > 0 ? "+" : ""}${e.delta}</td><td>${e.balance}</td></tr>`).join("") || '<tr><td colspan="4" class="muted">No activity yet.</td></tr>'}</table></div>
  </div>`;
}

// ------------------------------------------------------------------ router
async function route() {
  const h = location.hash || "#/";
  try {
    if (!h.startsWith("#/p/")) clearInterval(pollTimer);
    if (h === "#/" || h === "#/home") { renderNav(); return await home(); }
    heroCleanup?.(); heroCleanup = null;
    if (!auth.signedIn) { location.hash = "#/"; openAuth(h); return; }
    if (!ME) await loadMe(); else renderNav();
    if (h.startsWith("#/studio")) return await studio();
    if (h.startsWith("#/credits")) return await credits();
    const m = h.match(/^#\/p\/([a-z0-9]+)/); if (m) return await editor(m[1]);
    location.hash = "#/";
  } catch (e) { $app.innerHTML = `<div class="card"><h2>Something went wrong</h2><p class="muted">${esc(e.message)}</p><button class="btn ghost" onclick="location.reload()">Reload</button></div>`; }
  finally { window.scrollTo?.(0, 0); document.getElementById("side")?.classList.remove("open"); }
}
document.getElementById("menu")?.addEventListener("click", () => document.getElementById("side").classList.toggle("open"));
document.getElementById("authdlg")?.addEventListener("click", (e) => { if (e.target.id === "authdlg") closeAuth(); });
window.addEventListener("hashchange", () => { if (dirty) save(true).catch(() => {}); route(); });
window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); } });
route();
