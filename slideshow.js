/* =========================================================
   SLIDESHOW (PRO CROSSFADE)
   - Everyday images always play
   - Day-of-week images only play on that day
   - 10s per slide
   - Uses 2 layers (A/B) so there is NEVER a flash/hard switch
========================================================= */

const SLIDE_SECONDS = 10;
const FADE_MS = 900;

// Update these lists to your real filenames
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
let showingA = true; // A is visible first
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

// Avoid stale caching when you overwrite images
function cacheBust(file){
  return `${file}?v=${Date.now()}`;
}

async function exists(file){
  try{
    const r = await fetch(file, { method:"HEAD", cache:"no-store" });
    return r.ok;
  }catch{
    return false;
  }
}

/* Preload & decode the *next* image before fading */
function preloadAndDecode(file){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try{
        // decode() makes Chrome render without a flash
        if (img.decode) await img.decode();
      }catch{}
      resolve();
    };
    img.onerror = reject;
    img.src = cacheBust(file);
  });
}

function swapTo(file){
  const incoming = showingA ? slideB : slideA;
  const outgoing = showingA ? slideA : slideB;

  // Set incoming src (already preloaded, but this keeps URL consistent)
  incoming.src = cacheBust(file);

  // Fade in incoming, fade out outgoing
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

  // Show first slide instantly on A
  index = 0;
  slideA.src = cacheBust(playlist[index]);
  slideA.classList.add("isVisible");
  slideB.classList.remove("isVisible");
  showingA = true;

  if (playlist.length === 1) return;

  // Preload next slide ahead of time
  let nextIndex = (index + 1) % playlist.length;
  preloadAndDecode(playlist[nextIndex]).catch(()=>{});

  tickTimer = setInterval(async () => {
    index = (index + 1) % playlist.length;

    // Preload/decode the slide we’re about to show (guarantees no flash)
    try{
      await preloadAndDecode(playlist[index]);
    }catch{
      // If preload fails, just skip this slide gracefully
      return;
    }

    // Crossfade to it
    swapTo(playlist[index]);

    // Preload following slide for the next tick
    nextIndex = (index + 1) % playlist.length;
    preloadAndDecode(playlist[nextIndex]).catch(()=>{});

  }, SLIDE_SECONDS * 1000);
}

async function buildPlaylist(){
  const key = dayKeyToronto();
  const candidates = [...everydayCandidates, ...(dayCandidates[key] || [])];

  const next = [];
  for (const f of candidates){
    if (await exists(f)) next.push(f);
  }

  // If playlist changes mid-run, restart cleanly
  playlist = next;
  await start();
}

/* Midnight refresh so day-specific promos change automatically */
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
