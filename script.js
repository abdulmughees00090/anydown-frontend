/* ═══════════════════════════════════════════════
   AnyDown — script.js
   ═══════════════════════════════════════════════ */

/* ──────────────────────────────────────────────
   CONFIG — replace with your Oracle Cloud IP
   ────────────────────────────────────────────── */
//const API_BASE = "https://139.185.61.225:5000";
// Instead of hardcoding IP
// const API_BASE = "http://139.185.61.225:5000";

// Use relative path (works for both HTTP and HTTPS)
const API_BASE = "";

// OR use same protocol dynamically
const API_BASE = window.location.protocol + "//" + window.location.hostname + ":5000";
// Example: const API_BASE = "https://152.67.xxx.xxx:5000";

/* ──────────────────────────────────────────────
   DOM REFERENCES
   ────────────────────────────────────────────── */
const urlInput    = document.getElementById("urlInput");
const fetchBtn    = document.getElementById("fetchBtn");
const searchBar   = document.getElementById("searchBar");
const resultSec   = document.getElementById("resultSection");

const stateLoading = document.getElementById("stateLoading");
const stateError   = document.getElementById("stateError");
const errorMsg     = document.getElementById("errorMsg");
const resultCard   = document.getElementById("resultCard");

const thumbImg    = document.getElementById("thumbImg");
const videoTitle  = document.getElementById("videoTitle");
const videoMeta   = document.getElementById("videoMeta");
const formatsGrid = document.getElementById("formatsGrid");

/* ──────────────────────────────────────────────
   ANIMATED GRADIENT BACKGROUND
   ────────────────────────────────────────────── */
(function initBackground() {
  const canvas = document.getElementById("bgCanvas");
  const ctx    = canvas.getContext("2d");

  let W, H;
  const orbs = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  // Create soft glowing orbs in mustard / amber tones
  const COLORS = [
    "rgba(232,184,0,",
    "rgba(255,180,0,",
    "rgba(180,120,0,",
    "rgba(255,140,0,",
  ];

  for (let i = 0; i < 6; i++) {
    orbs.push({
      x:    Math.random() * 1,
      y:    Math.random() * 1,
      r:    0.18 + Math.random() * 0.22,  // radius as fraction of screen
      vx:   (Math.random() - 0.5) * 0.00012,
      vy:   (Math.random() - 0.5) * 0.00012,
      color: COLORS[i % COLORS.length],
      alpha: 0.06 + Math.random() * 0.09,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // Dark base gradient
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0,   "#0A0A0A");
    bg.addColorStop(0.5, "#0D0B08");
    bg.addColorStop(1,   "#0A0A0A");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Orbs
    for (const orb of orbs) {
      orb.x += orb.vx;
      orb.y += orb.vy;
      if (orb.x < -0.1) orb.vx =  Math.abs(orb.vx);
      if (orb.x >  1.1) orb.vx = -Math.abs(orb.vx);
      if (orb.y < -0.1) orb.vy =  Math.abs(orb.vy);
      if (orb.y >  1.1) orb.vy = -Math.abs(orb.vy);

      const cx  = orb.x * W;
      const cy  = orb.y * H;
      const rad = orb.r * Math.max(W, H);
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      grd.addColorStop(0, orb.color + orb.alpha + ")");
      grd.addColorStop(1, orb.color + "0)");

      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
    }

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

/* ──────────────────────────────────────────────
   UI STATE HELPERS
   ────────────────────────────────────────────── */
function showState(state) {
  stateLoading.hidden = state !== "loading";
  stateError.hidden   = state !== "error";
  resultCard.hidden   = state !== "result";
}

function setError(msg) {
  errorMsg.textContent = msg;
  showState("error");
}

/* ──────────────────────────────────────────────
   FORMAT HELPERS
   ────────────────────────────────────────────── */
function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return mb.toFixed(1) + " MB";
  return (mb / 1024).toFixed(2) + " GB";
}

function qualityLabel(fmt) {
  if (fmt.quality_label) return fmt.quality_label;
  if (fmt.height)        return fmt.height + "p";
  if (fmt.abr)           return fmt.abr + " kbps";
  return fmt.format_note || "Unknown";
}

/* ──────────────────────────────────────────────
   RENDER FORMATS
   ────────────────────────────────────────────── */
function renderFormats(formats) {
  formatsGrid.innerHTML = "";

  // Separate video+audio, video-only, audio-only
  const combined   = formats.filter(f => f.vcodec !== "none" && f.acodec !== "none");
  const videoOnly  = formats.filter(f => f.vcodec !== "none" && f.acodec === "none");
  const audioOnly  = formats.filter(f => f.vcodec === "none" && f.acodec !== "none");

  // Sort combined by height desc
  combined.sort((a, b) => (b.height || 0) - (a.height || 0));
  videoOnly.sort((a, b) => (b.height || 0) - (a.height || 0));
  audioOnly.sort((a, b) => (b.abr || 0) - (a.abr || 0));

  function appendGroup(label, list) {
    if (!list.length) return;
    const lbl = document.createElement("div");
    lbl.className = "format-group-label";
    lbl.textContent = label;
    formatsGrid.appendChild(lbl);

    list.forEach(fmt => {
      const item = document.createElement("div");
      item.className = "format-item";

      const info = document.createElement("div");
      info.className = "format-info";

      const ql = document.createElement("div");
      ql.className = "format-quality";
      ql.textContent = qualityLabel(fmt);

      const ext = document.createElement("div");
      ext.className = "format-ext";
      ext.textContent = (fmt.ext || "?").toUpperCase();

      info.appendChild(ql);
      info.appendChild(ext);

      if (fmt.filesize || fmt.filesize_approx) {
        const sz = document.createElement("div");
        sz.className = "format-size";
        sz.textContent = formatBytes(fmt.filesize || fmt.filesize_approx);
        info.appendChild(sz);
      }

      // Download button
      const dl = document.createElement("a");
      dl.className = "dl-btn";
      dl.title = "Download";
      dl.innerHTML = "↓";
      const dlParams = new URLSearchParams({
  url:       urlInput.value.trim(),
  format_id: fmt.format_id,
  height:    fmt.height    || "",
  vcodec:    fmt.vcodec    || "",
  acodec:    fmt.acodec    || "",
});
dl.href = `${API_BASE}/dl?${dlParams.toString()}`;
      dl.target = "_blank";
      dl.rel = "noopener noreferrer";

      item.appendChild(info);
      item.appendChild(dl);
      formatsGrid.appendChild(item);
    });
  }

  if (combined.length)  appendGroup("Video + Audio", combined);
  if (videoOnly.length) appendGroup("Video Only", videoOnly);
  if (audioOnly.length) appendGroup("Audio Only", audioOnly);

  if (!combined.length && !videoOnly.length && !audioOnly.length) {
    formatsGrid.innerHTML = `<p style="color:var(--text-secondary);font-size:.9rem;grid-column:1/-1">No downloadable formats found.</p>`;
  }
}

/* ──────────────────────────────────────────────
   FETCH VIDEO INFO
   ────────────────────────────────────────────── */
async function fetchVideo() {
  const rawUrl = urlInput.value.trim();

  if (!rawUrl) {
    urlInput.focus();
    searchBar.classList.add("shake");
    setTimeout(() => searchBar.classList.remove("shake"), 500);
    return;
  }

  // Basic URL validation
  try { new URL(rawUrl); }
  catch {
    setError("That doesn't look like a valid URL. Please paste a full video link.");
    return;
  }

  showState("loading");
  fetchBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/info?url=${encodeURIComponent(rawUrl)}`);
    const data = await res.json();

    if (!res.ok || data.error) {
      setError(data.error || `Server error (${res.status}). Try again.`);
      return;
    }

    // Populate card
    thumbImg.src = data.thumbnail || "";
    thumbImg.alt = data.title || "Video thumbnail";
    videoTitle.textContent = data.title || "Untitled video";

    const metaParts = [];
    if (data.uploader)  metaParts.push(data.uploader);
    if (data.duration)  metaParts.push(fmtDuration(data.duration));
    if (data.view_count) metaParts.push(fmtNumber(data.view_count) + " views");
    videoMeta.textContent = metaParts.join("  ·  ");

    renderFormats(data.formats || []);
    showState("result");
    resultCard.scrollIntoView({ behavior: "smooth", block: "start" });

  } catch (err) {
    console.error(err);
    setError("Could not reach the server. Check your connection or ensure the backend is running.");
  } finally {
    fetchBtn.disabled = false;
  }
}

function fmtDuration(secs) {
  if (!secs) return "";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${m}:${String(s).padStart(2,"0")}`;
}

function fmtNumber(n) {
  if (!n) return "";
  if (n >= 1_000_000) return (n/1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n/1_000).toFixed(0) + "K";
  return String(n);
}

/* ──────────────────────────────────────────────
   SHAKE ANIMATION (CSS injected via JS)
   ────────────────────────────────────────────── */
const shakeStyle = document.createElement("style");
shakeStyle.textContent = `
@keyframes shake {
  0%,100% { transform: translateX(0); }
  20%      { transform: translateX(-8px); }
  40%      { transform: translateX(8px); }
  60%      { transform: translateX(-5px); }
  80%      { transform: translateX(5px); }
}
.shake { animation: shake 0.45s ease both; }
`;
document.head.appendChild(shakeStyle);

/* ──────────────────────────────────────────────
   EVENT LISTENERS
   ────────────────────────────────────────────── */
fetchBtn.addEventListener("click", fetchVideo);

urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") fetchVideo();
});

// Paste shortcut: auto-trigger on paste if input is empty / from clipboard
urlInput.addEventListener("paste", () => {
  setTimeout(() => {
    if (urlInput.value.trim()) fetchVideo();
  }, 100);
});
