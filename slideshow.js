/* =========================================================
   SLIDESHOW (PRO CROSSFADE) — FIXED
   - Uses 2 layers (A/B) with real crossfade
   - 10s per slide
   - Preloads/decodes the EXACT URL it will display (no hard pop)
========================================================= */

const SLIDE_SECONDS = 10;
const FADE_MS = 900;

// ✅ Stable cache-bust value (same for the whole session)
const CACHE_VERSION = Date.now(); // changes when you reload page

const everydayCandidates = [
  "every1.jpg",
  "every2.jpg",
  "every3.jpg",
  "every4.jpg",
  "every5.jpg"
];

const dayCandidates = {
  mon: ["mon1.jpg","mon2.jpg","mon3.jpg"],
  tue: ["tue1.jpg","tue2.jpg","tue3.jpg"],
  wed: ["wed1.jpg","wed2.jpg","wed3.jpg"],
  thu: ["thu1.jpg","thu2.jpg","thu3.jpg"],
  fri: ["fri1.jpg","fri2.jpg","fri3.jpg"],
  sat: ["sat1.jpg","sat2.jpg","sat3.jpg"],
  sun: ["sun1.jpg","sun2.jpg","sun3.jpg"]
};

const slideA = document.getElementById("slideA");
const slideB = document.getElementById("slideB");
const status = document.getElementById("status");

let playlist = [];
let index = 0;
let showingA = true;
let tickTimer = null;
let midnightTimer = null;

function setStatus(msg){
  if (status) status.textContent = msg;
}

function dayKeyToronto(){
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    weekday: "short"
  }).format(new Date()).toLowerCase();
}

// ✅ stable URL per file (no Date.now per call)
function urlFor(file){
  return `${file}?v=${CACHE_VERSION}`;
}

async function exists(file){
  try{
    const r = await fetch(file, { method:"HEAD", cache:"no-store" });
    return r.ok;
  }catch{
    return false;
  }
}

/* Preload & decode the EXACT url */
function preloadAndDecodeUrl(url){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try{
        if (img.decode) await img.decode();
      }catch{}
      resolve();
    };
    img.onerror = reject;
    img.src = url;
  });
}

function swapToUrl(url){
  const incoming = showingA ? slideB : slideA;
  const outgoing = showingA ? slideA : slideB;

  // Put incoming underneath, then fade it in
  incoming.src = url;

  incoming.classList.add("isVisible");
  outgoing.classList.remove("isVisible");

  showingA = !showingA;
}

function stop(){
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = null;
}

async function start(){
  stop();

  if (!playlist.length){
    setStatus("No slideshow images found.");
    return;
  }

  setStatus(`Slides: ${playlist.length} • ${SLIDE_SECONDS}s • Today: ${dayKeyToronto().toUpperCase()}`);

  index = 0;

  // Show first slide immediately
  slideA.src = urlFor(playlist[index]);
  slideA.classList.add("isVisible");
  slideB.classList.remove("isVisible");
  showingA = true;

  if (playlist.length === 1) return;

  // Preload next slide URL ahead of time
  let nextIndex = (index + 1) % playlist.length;
  preloadAndDecodeUrl(urlFor(playlist[nextIndex])).catch(()=>{});

  tickTimer = setInterval(async () => {
    index = (index + 1) % playlist.length;
    const url = urlFor(playlist[index]);

    try{
      await preloadAndDecodeUrl(url); // ✅ decode the SAME url we will show
    }catch{
      return; // skip if an image is missing/bad
    }

    swapToUrl(url);

    // Preload following slide
    nextIndex = (index + 1) % playlist.length;
    preloadAndDecodeUrl(urlFor(playlist[nextIndex])).catch(()=>{});

  }, SLIDE_SECONDS * 1000);
}

async function buildPlaylist(){
  const key = dayKeyToronto();
  const candidates = [...everydayCandidates, ...(dayCandidates[key] || [])];

  const next = [];
  for (const f of candidates){
    if (await exists(f)) next.push(f);
  }

  playlist = next;
  await start();
}

function msUntilLocalMidnight(){
  const now = new Date();
  const next = new Date(now);
  next.setHours(24,0,0,0);
  return Math.max(5000, next - now);
}

function scheduleMidnight(){
  if (midnightTimer) clearTimeout(midnightTimer);
  midnightTimer = setTimeout(async () => {
    await buildPlaylist();
    scheduleMidnight();
  }, msUntilLocalMidnight());
}

/* Boot */
setStatus("Loading slideshow…");
buildPlaylist();
scheduleMidnight();
