/* ═══════════════════════════════════════════════
   AnyDown — script.js (Complete with Adsterra integration)
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

      if (msg.toLowerCase().includes("youtube download server is busy")) {
        showState("ytbusy");
        return;
      }
      
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

/* ── Events ── */
fetchBtn.addEventListener("click", fetchVideo);
urlInput.addEventListener("keydown", e => { if (e.key === "Enter") fetchVideo(); });
urlInput.addEventListener("paste", () => {
  setTimeout(() => { if (urlInput.value.trim()) fetchVideo(); }, 100);
});

/* ═══════════════════════════════════════════════
   ADSTERRA INTEGRATION - DOWNLOAD TRIGGER LOGIC
   ═══════════════════════════════════════════════ */
   
// ============================================
// IMPLEMENTATION GUIDE FOR ADSTERRA:
// ============================================
// 
// 1. SIGN UP at https://adsterra.com
// 2. CREATE THESE AD UNITS (NO POPUNDERS - use only banner formats):
//    
//    BANNER UNITS (safe for SEO):
//    - "Desktop Leaderboard" (728x90) - Zone ID for desktop top banner
//    - "Mobile Banner" (320x50 or 320x100) - Zone ID for mobile
//    - "Skyscraper" (160x600) - Zone ID for side rails
//    - "Medium Rectangle" (300x250) - Zone ID for inline ads
//    - "Full Banner" (468x60) - Zone ID for footer
//    
//    CLICK-TRIGGERED AD (opens in new tab, NOT popunder):
//    - Create "Social Bar" OR "Interstitial" OR "New Tab Banner"
//    - These formats open in a NEW TAB when user clicks download
//    - They DO NOT interfere with search engine crawling
//    - Zone ID for this goes in DOWNLOAD_TRIGGER_ZONE_ID
//
// 3. REPLACE all 'YOUR_..._ZONE_ID' placeholders in index.html with actual IDs
// 4. IMPORTANT: Disable "Popunder" and "Popup" in Adsterra campaign settings
//    to avoid SEO penalties from Google/Bing
// ============================================

// Configuration - REPLACE with your actual Adsterra Zone ID for download trigger
const ADSTERRA_DOWNLOAD_ZONE_ID = '28971613';

// Function to show ad before download (opens in new tab, not popunder)
function triggerAdBeforeDownload(downloadUrl) {
  return new Promise((resolve) => {
    // Create a modal overlay that shows the ad
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.95);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'DM Sans', sans-serif;
    `;
    
    const card = document.createElement('div');
    card.style.cssText = `
      background: #111;
      border-radius: 24px;
      padding: 32px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      border: 1px solid #E8B800;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    `;
    
    card.innerHTML = `
      <div style="color: #E8B800; font-size: 48px; margin-bottom: 16px;">📺</div>
      <h3 style="color: white; margin-bottom: 12px;">Advertisement</h3>
      <p style="color: #A0A0A0; margin-bottom: 24px;">Please support us by viewing this short ad. Your download will start automatically after.</p>
      <div id="adsterra-ad-container" style="margin: 20px 0; min-height: 250px;"></div>
      <button id="close-ad-btn" style="background: #E8B800; border: none; padding: 12px 24px; border-radius: 40px; color: #0A0A0A; font-weight: bold; cursor: pointer; width: 100%;">✓ Continue to Download</button>
      <p style="color: #666; font-size: 12px; margin-top: 16px;">Ad will open in new tab. Close this window to return.</p>
    `;
    
    modal.appendChild(card);
    document.body.appendChild(modal);
    
    // Create Adsterra ad unit in the container
    const adContainer = document.getElementById('adsterra-ad-container');
    if (adContainer && ADSTERRA_DOWNLOAD_ZONE_ID !== 'YOUR_DOWNLOAD_TRIGGER_ZONE_ID') {
      const adDiv = document.createElement('div');
      adDiv.setAttribute('data-zone', ADSTERRA_DOWNLOAD_ZONE_ID);
      adDiv.setAttribute('data-type', 'socialbar'); // Social Bar opens in new tab, SEO-friendly
      adContainer.appendChild(adDiv);
      
      // Reload Adsterra ads
      if (window.Adsterra && window.Adsterra.reload) {
        window.Adsterra.reload();
      }
    } else {
      // Fallback message if zone not configured
      adContainer.innerHTML = '<p style="color: #E8B800;">Loading sponsor message...</p>';
    }
    
    // Handle continue button
    const closeBtn = document.getElementById('close-ad-btn');
    closeBtn.onclick = () => {
      document.body.removeChild(modal);
      resolve();
    };
    
    // Auto-resolve after 8 seconds (user doesn't have to click)
    setTimeout(() => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
        resolve();
      }
    }, 8000);
  });
}

// Intercept all download buttons
function attachDownloadInterceptor(btn) {
  if (btn.getAttribute('data-ad-attached') === 'true') return;
  btn.setAttribute('data-ad-attached', 'true');
  
  const originalHref = btn.getAttribute('href');
  if (!originalHref) return;
  
  btn.removeAttribute('href');
  btn.style.cursor = 'pointer';
  
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    btn.classList.add('ad-loading');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳';
    
    try {
      await triggerAdBeforeDownload(originalHref);
      // After ad completes, trigger download
      const downloadLink = document.createElement('a');
      downloadLink.href = originalHref;
      downloadLink.target = '_blank';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error('Ad trigger error:', err);
      // Fallback
      const downloadLink = document.createElement('a');
      downloadLink.href = originalHref;
      downloadLink.target = '_blank';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } finally {
      btn.classList.remove('ad-loading');
      btn.innerHTML = originalText;
    }
  });
}

// Watch for dynamically added download buttons
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1 && node.classList && node.classList.contains('dl-btn')) {
        attachDownloadInterceptor(node);
      } else if (node.nodeType === 1 && node.querySelectorAll) {
        node.querySelectorAll('.dl-btn:not([data-ad-attached])').forEach(attachDownloadInterceptor);
      }
    });
  });
});

observer.observe(document.body, { childList: true, subtree: true });
document.querySelectorAll('.dl-btn:not([data-ad-attached])').forEach(attachDownloadInterceptor);

/* ── PWA Service Worker Registration ── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js')
      .then(function(registration) {
        console.log('AnyDown Service Worker registered:', registration.scope);
      })
      .catch(function(error) {
        console.log('AnyDown Service Worker registration failed:', error);
      });
  });
}

/* ── PWA Install Prompt ── */
let deferredPrompt;
const installBtn = document.getElementById('installPWA-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) {
    installBtn.style.display = 'flex';
  }
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.style.display = 'none';
  });
}

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  if (installBtn) installBtn.style.display = 'none';
});
