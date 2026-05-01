/* ═══════════════════════════════════════════════
   AnyDown — script.js (with AllMedia API + Fallback)
   ═══════════════════════════════════════════════ */

const OCI_API_BASE = "https://api.silverfoxdynamics.com";
const ALLMEDIA_API_BASE = "https://all-media-downloader.p.rapidapi.com";
const ALLMEDIA_API_KEY = "YOUR_RAPIDAPI_KEY_HERE"; // Get from rapidapi.com

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

/* ── Fallback tracking ── */
let lastUsedAPI = "primary"; // "primary" = AllMedia, "fallback" = OCI
let apiFailCount = 0;

/* ── Show fallback notification banner ── */
function showFallbackNotification(message) {
  const existingBanner = document.querySelector('.fallback-banner');
  if (existingBanner) existingBanner.remove();
  
  const banner = document.createElement('div');
  banner.className = 'fallback-banner';
  banner.textContent = message;
  document.body.appendChild(banner);
  
  setTimeout(() => banner.remove(), 3000);
}

/* ── ADSTERRA SMARTLINK ── */
const SMARTLINK_URL = 'https://walkingdrunkard.com/hmsgefqpcn?key=4d6e7561a3b59bff0fdc75b8e69f21e9';
let adTriggerInProgress = false;

async function triggerSmartlinkBeforeDownload(downloadUrl) {
  return new Promise((resolve) => {
    if (SMARTLINK_URL) {
      window.open(SMARTLINK_URL, '_blank');
      setTimeout(resolve, 500);
    } else {
      resolve();
    }
  });
}

function executeDownload(downloadUrl) {
  if (!downloadUrl) return;
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => document.body.removeChild(link), 100);
}

async function handleDownloadWithAd(event, downloadUrl) {
  event.preventDefault();
  event.stopPropagation();
  if (adTriggerInProgress) return;
  if (!downloadUrl) return;
  try {
    adTriggerInProgress = true;
    await triggerSmartlinkBeforeDownload(downloadUrl);
    executeDownload(downloadUrl);
  } catch (error) {
    executeDownload(downloadUrl);
  } finally {
    adTriggerInProgress = false;
  }
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
   FORMAT CONVERTERS - AllMedia API → Our format structure
   ══════════════════════════════════════════════════════ */

// Convert AllMedia API response to our format structure
function convertAllMediaToOurFormat(allmediaData, videoUrl) {
  const formats = [];
  
  // AllMedia returns different structure based on platform
  // YouTube structure
  if (allmediaData.formats && Array.isArray(allmediaData.formats)) {
    // Direct format array
    for (const f of allmediaData.formats) {
      formats.push({
        format_id: f.format_id || f.itag,
        height: f.height,
        ext: f.ext,
        filesize: f.filesize,
        vcodec: f.vcodec,
        acodec: f.acodec,
        tbr: f.tbr
      });
    }
  } else if (allmediaData.video_url) {
    // Simple response with direct URLs
    formats.push({
      format_id: "direct",
      height: 1080,
      ext: "mp4",
      filesize: null,
      vcodec: "avc1",
      acodec: "mp4a"
    });
  } else if (allmediaData.download_url) {
    formats.push({
      format_id: "direct",
      height: 1080,
      ext: "mp4",
      filesize: null,
      vcodec: "avc1",
      acodec: "mp4a"
    });
  }
  
  // If still no formats, try to extract from any URLs in response
  if (formats.length === 0) {
    for (const key in allmediaData) {
      if (typeof allmediaData[key] === 'string' && 
          (allmediaData[key].startsWith('http') && 
           (allmediaData[key].includes('.mp4') || allmediaData[key].includes('video')))) {
        formats.push({
          format_id: key,
          height: 720,
          ext: "mp4",
          filesize: null,
          vcodec: "avc1",
          acodec: "mp4a"
        });
      }
    }
  }
  
  return formats;
}

// Convert OCI API response (keeping original structure)
function convertOCIToOurFormat(ociData) {
  return ociData.formats || [];
}

/* ── Smart format builder (SAME AS ORIGINAL) ── */
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

/* ── Render formats (SAME AS ORIGINAL) ── */
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

    // Build download URL based on which API we used
    let downloadUrl;
    if (lastUsedAPI === "primary") {
      // For AllMedia, we need to construct download URL
      downloadUrl = `${ALLMEDIA_API_BASE}/download?url=${encodeURIComponent(videoUrl)}&format_id=${encodeURIComponent(fmt.format_id)}`;
    } else {
      downloadUrl = `${OCI_API_BASE}/dl?url=${encodeURIComponent(videoUrl)}&format_id=${encodeURIComponent(fmt.format_id)}`;
    }

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

/* ── Fetch with timeout ── */
function fetchWithTimeout(url, options, timeout = 10000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
}

/* ══════════════════════════════════════════════════════
   PRIMARY API: AllMedia Downloader
   ══════════════════════════════════════════════════════ */
async function fetchFromAllMedia(rawUrl) {
  try {
    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-key': ALLMEDIA_API_KEY,
        'x-rapidapi-host': 'all-media-downloader.p.rapidapi.com'
      }
    };
    
    // First, get video info
    const infoUrl = `${ALLMEDIA_API_BASE}/info?url=${encodeURIComponent(rawUrl)}`;
    const response = await fetchWithTimeout(infoUrl, options, 15000);
    
    if (!response.ok) {
      throw new Error(`AllMedia API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    // Extract title and metadata
    const title = data.title || data.video_title || "Untitled video";
    const thumbnail = data.thumbnail || data.thumb || "";
    
    // Get uploader info
    let uploader = data.uploader || data.channel || data.author || "";
    
    // Get duration
    let duration = data.duration || 0;
    if (typeof duration === 'string') {
      // Parse duration string like "PT1H2M3S" if needed
      const match = duration.match(/(\d+)/g);
      if (match) duration = parseInt(match.slice(-3).reduce((a,b,i) => a + (i === 0 ? b*3600 : i === 1 ? b*60 : b), 0));
    }
    
    // Get view count
    let viewCount = data.view_count || data.views || 0;
    
    // Convert formats to our structure
    const formats = convertAllMediaToOurFormat(data, rawUrl);
    
    return {
      success: true,
      title: title,
      thumbnail: thumbnail,
      uploader: uploader,
      duration: duration,
      view_count: viewCount,
      formats: formats,
      rawData: data
    };
    
  } catch (error) {
    console.error("AllMedia API error:", error);
    return { success: false, error: error.message };
  }
}

/* ══════════════════════════════════════════════════════
   FALLBACK API: OCI Backend (original)
   ══════════════════════════════════════════════════════ */
async function fetchFromOCI(rawUrl) {
  try {
    const response = await fetchWithTimeout(`${OCI_API_BASE}/info?url=${encodeURIComponent(rawUrl)}`, {}, 20000);
    const data = await response.json();
    
    if (!response.ok || data.error) {
      throw new Error(data.error || `Server error (${response.status})`);
    }
    
    return {
      success: true,
      title: data.title,
      thumbnail: data.thumbnail,
      uploader: data.uploader,
      duration: data.duration,
      view_count: data.view_count,
      formats: data.formats || [],
      rawData: data
    };
    
  } catch (error) {
    console.error("OCI API error:", error);
    return { success: false, error: error.message };
  }
}

/* ── Main fetch with fallback logic ── */
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
    let result;
    
    // Try AllMedia API first (primary)
    result = await fetchFromAllMedia(rawUrl);
    
    if (result.success && result.formats && result.formats.length > 0) {
      // Success with AllMedia
      lastUsedAPI = "primary";
      apiFailCount = 0;
      
      // Populate UI
      thumbImg.src = result.thumbnail || "";
      thumbImg.alt = result.title || "Video thumbnail";
      videoTitle.textContent = result.title || "Untitled video";
      
      const metaParts = [];
      if (result.uploader) metaParts.push(result.uploader);
      if (result.duration) metaParts.push(fmtDuration(result.duration));
      if (result.view_count) metaParts.push(fmtNumber(result.view_count) + " views");
      videoMeta.textContent = metaParts.join("  ·  ");
      
      renderFormats(result.formats, rawUrl);
      showState("result");
      resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
      
      // Optional: show success notification (no notification for primary)
      return;
    }
    
    // If AllMedia failed or returned no formats, try fallback
    if (!result.success || !result.formats || result.formats.length === 0) {
      apiFailCount++;
      console.log(`AllMedia API returned no formats, trying OCI fallback (fail count: ${apiFailCount})`);
      
      // Show notification that we're falling back
      showFallbackNotification("⚠️ Using fallback server - downloads may be slower");
      
      // Try OCI fallback
      result = await fetchFromOCI(rawUrl);
      
      if (result.success && result.formats && result.formats.length > 0) {
        lastUsedAPI = "fallback";
        
        thumbImg.src = result.thumbnail || "";
        thumbImg.alt = result.title || "Video thumbnail";
        videoTitle.textContent = result.title || "Untitled video";
        
        const metaParts = [];
        if (result.uploader) metaParts.push(result.uploader);
        if (result.duration) metaParts.push(fmtDuration(result.duration));
        if (result.view_count) metaParts.push(fmtNumber(result.view_count) + " views");
        videoMeta.textContent = metaParts.join("  ·  ");
        
        renderFormats(result.formats, rawUrl);
        showState("result");
        resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    
    // Both APIs failed
    const errorMessage = result.error || "No video formats found. The platform might be temporarily unavailable.";
    
    if (errorMessage.toLowerCase().includes("youtube") || errorMessage.toLowerCase().includes("yt")) {
      showState("ytbusy");
    } else if (errorMessage.toLowerCase().includes("instagram") || errorMessage.toLowerCase().includes("ig")) {
      showState("igbusy");
    } else {
      setError(errorMessage);
    }
    
  } catch (err) {
    console.error("Fetch error:", err);
    
    // Last resort: try OCI directly if AllMedia crashed
    try {
      showFallbackNotification("⚠️ Primary server failed, using backup...");
      const fallbackResult = await fetchFromOCI(rawUrl);
      
      if (fallbackResult.success && fallbackResult.formats && fallbackResult.formats.length > 0) {
        lastUsedAPI = "fallback";
        
        thumbImg.src = fallbackResult.thumbnail || "";
        thumbImg.alt = fallbackResult.title || "Video thumbnail";
        videoTitle.textContent = fallbackResult.title || "Untitled video";
        
        const metaParts = [];
        if (fallbackResult.uploader) metaParts.push(fallbackResult.uploader);
        if (fallbackResult.duration) metaParts.push(fmtDuration(fallbackResult.duration));
        if (fallbackResult.view_count) metaParts.push(fmtNumber(fallbackResult.view_count) + " views");
        videoMeta.textContent = metaParts.join("  ·  ");
        
        renderFormats(fallbackResult.formats, rawUrl);
        showState("result");
        resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    } catch (finalErr) {
      console.error("Fallback also failed:", finalErr);
    }
    
    setError("Could not reach download servers. Please check your connection or try again later.");
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
