/* ═══════════════════════════════════════════════
   AnyDown — script.js
   ═══════════════════════════════════════════════ */

const API_BASE = "https://api.silverfoxdynamics.com";

/* ── DOM ── */
const urlInput     = document.getElementById("urlInput");
const fetchBtn     = document.getElementById("fetchBtn");
const searchBar    = document.getElementById("searchBar");

const stateLoading = document.getElementById("stateLoading");
const stateError   = document.getElementById("stateError");
const stateYtBusy  = document.getElementById("stateYtBusy");
const stateIgBusy  = document.getElementById("stateIgBusy");
const errorMsg     = document.getElementById("errorMsg");
const resultCard   = document.getElementById("resultCard");

const thumbImg     = document.getElementById("thumbImg");
const videoTitle   = document.getElementById("videoTitle");
const videoMeta    = document.getElementById("videoMeta");
const formatsGrid  = document.getElementById("formatsGrid");

/* ── Animated background ── */
(function initBackground() {
  const canvas = document.getElementById("bgCanvas");
  const ctx    = canvas.getContext("2d");
  let W, H;
  const orbs   = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  const COLORS = ["rgba(232,184,0,","rgba(255,180,0,","rgba(180,120,0,","rgba(255,140,0,"];
  for (let i = 0; i < 6; i++) {
    orbs.push({
      x: Math.random(), y: Math.random(),
      r: 0.18 + Math.random() * 0.22,
      vx: (Math.random() - 0.5) * 0.00012,
      vy: (Math.random() - 0.5) * 0.00012,
      color: COLORS[i % COLORS.length],
      alpha: 0.06 + Math.random() * 0.09,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0A0A0A"); bg.addColorStop(0.5, "#0D0B08"); bg.addColorStop(1, "#0A0A0A");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    for (const orb of orbs) {
      orb.x += orb.vx; orb.y += orb.vy;
      if (orb.x < -0.1) orb.vx =  Math.abs(orb.vx);
      if (orb.x >  1.1) orb.vx = -Math.abs(orb.vx);
      if (orb.y < -0.1) orb.vy =  Math.abs(orb.vy);
      if (orb.y >  1.1) orb.vy = -Math.abs(orb.vy);
      const cx = orb.x * W, cy = orb.y * H, rad = orb.r * Math.max(W, H);
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

/* ── State management ── */
function showState(state) {
  stateLoading.hidden = state !== "loading";
  stateError.hidden   = state !== "error";
  stateYtBusy.hidden  = state !== "ytbusy";
  stateIgBusy.hidden  = state !== "igbusy";
  resultCard.hidden   = state !== "result";
}

function setError(msg) {
  errorMsg.textContent = msg;
  showState("error");
}

/* ── Helpers ── */
function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  return mb < 1024 ? mb.toFixed(1) + " MB" : (mb / 1024).toFixed(2) + " GB";
}

function qualityLabel(fmt) {
  if (fmt.quality_label) return fmt.quality_label;
  if (fmt.height)        return fmt.height + "p";
  if (fmt.abr)           return fmt.abr + " kbps";
  return fmt.format_note || "Unknown";
}

function fmtDuration(secs) {
  if (!secs) return "";
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
    : `${m}:${String(s).padStart(2,"0")}`;
}

function fmtNumber(n) {
  if (!n) return "";
  if (n >= 1_000_000) return (n/1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n/1_000).toFixed(0) + "K";
  return String(n);
}

/* ── Render formats ── */
function renderFormats(formats) {
  formatsGrid.innerHTML = "";
  const combined  = formats.filter(f => f.vcodec !== "none" && f.acodec !== "none");
  const videoOnly = formats.filter(f => f.vcodec !== "none" && f.acodec === "none");
  const audioOnly = formats.filter(f => f.vcodec === "none" && f.acodec !== "none");
  combined.sort((a,b)  => (b.height||0) - (a.height||0));
  videoOnly.sort((a,b) => (b.height||0) - (a.height||0));
  audioOnly.sort((a,b) => (b.abr||0)    - (a.abr||0));

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

      const dl = document.createElement("a");
      dl.className = "dl-btn";
      dl.title = "Download";
      dl.innerHTML = "↓";
      dl.href = `${API_BASE}/dl?url=${encodeURIComponent(urlInput.value.trim())}&format_id=${encodeURIComponent(fmt.format_id)}`;
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

/* ── Fetch video ── */
async function fetchVideo() {
  const rawUrl = urlInput.value.trim();

  if (!rawUrl) {
    urlInput.focus();
    searchBar.classList.add("shake");
    setTimeout(() => searchBar.classList.remove("shake"), 500);
    return;
  }

  try { new URL(rawUrl); }
  catch {
    setError("That doesn't look like a valid URL. Please paste a full video link.");
    return;
  }

  showState("loading");
  fetchBtn.disabled = true;

  try {
    const res  = await fetch(`${API_BASE}/info?url=${encodeURIComponent(rawUrl)}`);
    const data = await res.json();

    if (!res.ok || data.error) {
      const msg = data.error || `Server error (${res.status}). Try again.`;

      // YouTube busy detection
      if (msg.toLowerCase().includes("youtube download server is busy")) {
        showState("ytbusy");
        return;
      }
      
      // Instagram busy detection
      if (msg.toLowerCase().includes("instagram download server is busy")) {
        showState("igbusy");
        return;
      }

      setError(msg);
      return;
    }

    thumbImg.src         = data.thumbnail || "";
    thumbImg.alt         = data.title     || "Video thumbnail";
    videoTitle.textContent = data.title   || "Untitled video";

    const metaParts = [];
    if (data.uploader)   metaParts.push(data.uploader);
    if (data.duration)   metaParts.push(fmtDuration(data.duration));
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

/* ── Shake animation ── */
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

/* ── Events ── */
fetchBtn.addEventListener("click", fetchVideo);
urlInput.addEventListener("keydown", e => { if (e.key === "Enter") fetchVideo(); });
urlInput.addEventListener("paste", () => {
  setTimeout(() => { if (urlInput.value.trim()) fetchVideo(); }, 100);
});
