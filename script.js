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

/* ── ADSTERRA SMARTLINK ── */
const SMARTLINK_URL = 'https://walkingdrunkard.com/hmsgefqpcn?key=4d6e7561a3b59bff0fdc75b8e69f21e9';

/* ══════════════════════════════════════════════════════
   WAITING MODAL
   Shown over the page while download is being prepared.
   User sees a spinner — ad opens in new tab silently.
══════════════════════════════════════════════════════ */

// Inject modal HTML + styles once
(function injectModal() {
  const style = document.createElement("style");
  style.textContent = `
    #adWaitOverlay {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(10, 10, 10, 0.82);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      align-items: center;
      justify-content: center;
    }
    #adWaitOverlay.visible {
      display: flex;
    }
    #adWaitBox {
      background: linear-gradient(145deg, #161410, #1a1710);
      border: 1px solid rgba(232, 184, 0, 0.25);
      border-radius: 20px;
      padding: 40px 36px 32px;
      text-align: center;
      max-width: 340px;
      width: 90%;
      box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);
      animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    @keyframes modalPop {
      from { opacity: 0; transform: scale(0.88) translateY(16px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    #adWaitSpinner {
      width: 52px;
      height: 52px;
      margin: 0 auto 20px;
      position: relative;
    }
    #adWaitSpinner::before,
    #adWaitSpinner::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 3px solid transparent;
    }
    #adWaitSpinner::before {
      border-top-color: #E8B800;
      animation: spin 0.9s linear infinite;
    }
    #adWaitSpinner::after {
      border-bottom-color: rgba(232,184,0,0.25);
      animation: spin 0.9s linear infinite reverse;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    #adWaitTitle {
      font-family: 'DM Sans', sans-serif;
      font-size: 1.05rem;
      font-weight: 600;
      color: #f0e8cc;
      margin: 0 0 8px;
      letter-spacing: -0.01em;
    }
    #adWaitSub {
      font-family: 'DM Sans', sans-serif;
      font-size: 0.82rem;
      color: rgba(240,232,204,0.45);
      margin: 0;
      line-height: 1.5;
    }
    #adWaitDots span {
      animation: blink 1.2s infinite;
      opacity: 0;
    }
    #adWaitDots span:nth-child(2) { animation-delay: 0.2s; }
    #adWaitDots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes blink {
      0%, 80%, 100% { opacity: 0; }
      40% { opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = "adWaitOverlay";
  overlay.innerHTML = `
    <div id="adWaitBox">
      <div id="adWaitSpinner"></div>
      <p id="adWaitTitle">Preparing your download<span id="adWaitDots"><span>.</span><span>.</span><span>.</span></span></p>
      <p id="adWaitSub">This will only take a moment</p>
    </div>
  `;
  document.body.appendChild(overlay);
})();

function showWaitModal() {
  document.getElementById("adWaitOverlay").classList.add("visible");
}

function hideWaitModal() {
  document.getElementById("adWaitOverlay").classList.remove("visible");
}

/* ── Download logic ── */
function executeDownload(downloadUrl) {
  if (!downloadUrl) return;
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => document.body.removeChild(link), 100);
}

async function handleDownloadWithAd(event, downloadUrl) {
  event.preventDefault();
  event.stopPropagation();
  if (!downloadUrl) return;

  // 1. Open ad in new tab
  if (SMARTLINK_URL) {
    window.open(SMARTLINK_URL, "_blank");
  }

  // 2. Show waiting modal on this page
  showWaitModal();

  // 3. Wait 3 seconds (user sees modal, ad loads in background tab)
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 4. Trigger the actual download silently
  executeDownload(downloadUrl);

  // 5. Hide modal after a short delay
  await new Promise(resolve => setTimeout(resolve, 600));
  hideWaitModal();
}

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

/* ══════════════════════════════════════════════════════
   SMART FORMAT BUILDER
══════════════════════════════════════════════════════ */
function buildSmartFormats(formats) {
  const combined  = formats.filter(f => f.vcodec !== "none" && f.acodec !== "none");
  const videoOnly = formats.filter(f => f.vcodec !== "none" && f.acodec === "none");
  const audioOnly = formats.filter(f => f.vcodec === "none" && f.acodec !== "none");

  audioOnly.sort((a, b) => (b.tbr || 0) - (a.tbr || 0));
  const bestAudio = audioOnly[0];

  const results = [];

  const videoByHeight = {};
  for (const f of videoOnly) {
    const h = f.height;
    if (!h) continue;
    if (!videoByHeight[h]) {
      videoByHeight[h] = f;
    } else {
      const existing = videoByHeight[h];
      if ((f.filesize || 0) < (existing.filesize || Infinity) && (f.filesize || 0) > 0) {
        videoByHeight[h] = f;
      }
    }
  }

  for (const height of Object.keys(videoByHeight).map(Number).sort((a,b) => b - a)) {
    const vf = videoByHeight[height];
    const formatId = bestAudio
      ? `${vf.format_id}+${bestAudio.format_id}`
      : vf.format_id;
    const combinedSize = (vf.filesize || 0) + (bestAudio?.filesize || 0);

    results.push({
      format_id: formatId,
      label: `${height}p`,
      ext: "mp4",
      filesize: combinedSize || null,
      badge: height >= 2160 ? "4K" : height >= 1440 ? "2K" : height >= 1080 ? "HD" : height >= 720 ? "HD" : null,
      isAudio: false,
    });
  }

  combined.sort((a, b) => (b.height || 0) - (a.height || 0));
  const addedHeights = new Set(results.map(r => parseInt(r.label)));

  for (const f of combined) {
    if (f.height && addedHeights.has(f.height)) continue;
    results.push({
      format_id: f.format_id,
      label: f.height ? `${f.height}p` : "Auto",
      ext: f.ext || "mp4",
      filesize: f.filesize || null,
      badge: null,
      isAudio: false,
    });
  }

  for (const f of audioOnly.slice(0, 2)) {
    results.push({
      format_id: f.format_id,
      label: `Audio ${(f.ext || "m4a").toUpperCase()}`,
      ext: f.ext || "m4a",
      filesize: f.filesize || null,
      badge: "MP3",
      isAudio: true,
    });
  }

  return results;
}

/* ── Render formats ── */
function renderFormats(formats, videoUrl) {
  formatsGrid.innerHTML = "";

  const smart = buildSmartFormats(formats);

  if (!smart.length) {
    formatsGrid.innerHTML = `<p style="color:var(--text-secondary);font-size:.9rem;grid-column:1/-1">No downloadable formats found.</p>`;
    return;
  }

  smart.forEach(fmt => {
    const item = document.createElement("div");
    item.className = "format-item";

    const info = document.createElement("div");
    info.className = "format-info";

    const ql = document.createElement("div");
    ql.className = "format-quality";
    ql.textContent = fmt.label;

    const extEl = document.createElement("div");
    extEl.className = "format-ext";
    extEl.textContent = fmt.ext.toUpperCase();

    info.appendChild(ql);
    info.appendChild(extEl);

    if (fmt.filesize) {
      const sz = document.createElement("div");
      sz.className = "format-size";
      sz.textContent = formatBytes(fmt.filesize);
      info.appendChild(sz);
    }

    if (fmt.badge) {
      const badge = document.createElement("span");
      badge.className = "format-badge";
      badge.textContent = fmt.badge;
      badge.style.cssText = "font-size:0.6rem;padding:2px 5px;border-radius:4px;background:rgba(232,184,0,0.2);color:#E8B800;margin-left:4px;font-weight:600;";
      ql.appendChild(badge);
    }

    const downloadUrl = `${API_BASE}/dl?url=${encodeURIComponent(videoUrl)}&format_id=${encodeURIComponent(fmt.format_id)}`;

    const dl = document.createElement("div");
    dl.className = "dl-btn";
    dl.title = "Download";
    dl.innerHTML = "↓";
    dl.style.cursor = "pointer";
    dl.addEventListener("click", (e) => handleDownloadWithAd(e, downloadUrl));

    item.appendChild(info);
    item.appendChild(dl);
    formatsGrid.appendChild(item);
  });
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

  try {
    new URL(rawUrl);
  } catch {
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
      if (msg.toLowerCase().includes("youtube download server is busy")) { showState("ytbusy"); return; }
      if (msg.toLowerCase().includes("instagram download server is busy")) { showState("igbusy"); return; }
      setError(msg);
      return;
    }

    thumbImg.src           = data.thumbnail || "";
    thumbImg.alt           = data.title     || "Video thumbnail";
    videoTitle.textContent = data.title     || "Untitled video";

    const metaParts = [];
    if (data.uploader)   metaParts.push(data.uploader);
    if (data.duration)   metaParts.push(fmtDuration(data.duration));
    if (data.view_count) metaParts.push(fmtNumber(data.view_count) + " views");
    videoMeta.textContent = metaParts.join("  ·  ");

    renderFormats(data.formats || [], rawUrl);
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
