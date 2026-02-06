/* =========================================================
   SLIDESHOW (PRO CROSSFADE – IMAGES + MP4)
   - Images: fixed SLIDE_SECONDS per slide
   - Videos (.mp4): play through, then advance on ended
   - Day-of-week slides only play on that day (Toronto time)
   - Uses 2 layers (A/B) for flawless crossfade
   - Midnight auto-refresh for day changes
========================================================= */

const SLIDE_SECONDS = 10;   // images only
const FADE_MS = 900;
const VIDEO_FAILSAFE_MS = 60000; // if a video hangs, skip after 60s

/* Stable cache version for this session */
const CACHE_VERSION = Date.now();

/* Everyday slides (you can add .mp4 here too) */
const everydayCandidates = [
  "every1.jpg",
  "every2.mp4",
  "every3.jpg",
  "every4.mp4",
  "every5.jpg"
];

/* Day-specific slides (you can add .mp4 here too) */
const dayCandidates = {
  mon: ["mon1.jpg","mon2.jpg","mon3.jpg"],
  tue: ["tue1.jpg","tue2.jpg","tue3.jpg"],
  wed: ["wed1.jpg","wed2.jpg","wed3.jpg"],
  thu: ["thu1.jpg","thu2.jpg","thu3.jpg"],
  fri: ["fri1.jpg","fri2.jpg","fri3.jpg"],
  sat: ["sat1.jpg","sat2.jpg","sat3.jpg"],
  sun: ["sun1.jpg","sun2.jpg","sun3.jpg"]
};

/* Elements (must exist in slideshow.html) */
const slideA = document.getElementById("slideA");
const slideB = document.getElementById("slideB");
const videoA = document.getElementById("videoA");
const videoB = document.getElementById("videoB");

/* State */
let playlist = [];
let index = 0;
let showingLayer = "A";          // "A" or "B" (which layer is currently visible)
let currentKind = "img";         // "img" or "video"
let timer = null;
let videoFailsafe = null;
let midnightTimer = null;

/* Helpers */
function dayKeyToronto(){
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    weekday: "short"
  }).format(new Date()).toLowerCase();
}

function isVideo(file){
  return /\.mp4(\?.*)?$/i.test(file);
}

function urlFor(file){
  // cache busting helps signage devices update reliably
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

/* Preload & decode image URL */
function preloadAndDecodeImage(url){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try{ if (img.decode) await img.decode(); } catch {}
      resolve();
    };
    img.onerror = reject;
    img.src = url;
  });
}

/* Preload video enough to start quickly */
function preloadVideo(url){
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.onloadeddata = () => resolve();
    v.onerror = () => reject(new Error("video preload failed"));
    v.src = url;
    // Some browsers need load() to kick off buffering
    try { v.load(); } catch {}
  });
}

function clearTimers(){
  if (timer) clearTimeout(timer);
  timer = null;
  if (videoFailsafe) clearTimeout(videoFailsafe);
  videoFailsafe = null;
}

/* Get element handles for a given layer */
function layerEls(layer){
  return layer === "A"
    ? { img: slideA, video: videoA }
    : { img: slideB, video: videoB };
}

/* Hide and stop everything on a layer */
function resetLayer(layer){
  const { img, video } = layerEls(layer);

  img.classList.remove("isVisible");
  img.removeAttribute("src");

  video.classList.remove("isVisible");
  video.pause();
  video.removeAttribute("src");
  // Ensures the browser releases the video resource
  try { video.load(); } catch {}
  video.onended = null;
  video.onerror = null;
}

/* Crossfade to a specific slide (image or video) on the incoming layer */
async function swapTo(file){
  clearTimers();

  const incomingLayer = (showingLayer === "A") ? "B" : "A";
  const outgoingLayer = showingLayer;

  const incoming = layerEls(incomingLayer);
  const outgoing = layerEls(outgoingLayer);

  // reset incoming layer to a clean state
  resetLayer(incomingLayer);

  const url = urlFor(file);

  if (!isVideo(file)){
    // IMAGE
    incoming.img.src = url;
    incoming.img.classList.add("isVisible");

    // Hide outgoing
    outgoing.img.classList.remove("isVisible");
    outgoing.video.classList.remove("isVisible");
    outgoing.video.pause();

    // Commit state
    showingLayer = incomingLayer;
    currentKind = "img";

    // Next slide after fixed duration
    timer = setTimeout(nextSlide, SLIDE_SECONDS * 1000);
    return;
  }

  // VIDEO
  incoming.video.src = url;
  incoming.video.muted = true;       // required for autoplay
  incoming.video.playsInline = true;
  incoming.video.preload = "auto";

  // Advance when it ends; if it errors, skip
  incoming.video.onended = nextSlide;
  incoming.video.onerror = nextSlide;

  // Show video layer and start playback
  incoming.video.classList.add("isVisible");

  // Hide outgoing
  outgoing.img.classList.remove("isVisible");
  outgoing.video.classList.remove("isVisible");
  outgoing.video.pause();

  // Commit state
  showingLayer = incomingLayer;
  currentKind = "video";

  // Try to play; if blocked for any reason, skip
  try{
    const p = incoming.video.play();
    if (p && typeof p.then === "function") {
      p.catch(() => nextSlide());
    }
  }catch{
    nextSlide();
    return;
  }

  // Failsafe in case video never fires ended (corrupt file, stuck buffering)
  videoFailsafe = setTimeout(nextSlide, VIDEO_FAILSAFE_MS);
}

/* Preload the next slide (best effort) */
function preloadNext(){
  if (!playlist.length) return;
  const nextIndex = (index + 1) % playlist.length;
  const nextFile = playlist[nextIndex];
  const nextUrl = urlFor(nextFile);

  if (isVideo(nextFile)){
    preloadVideo(nextUrl).catch(()=>{});
  }else{
    preloadAndDecodeImage(nextUrl).catch(()=>{});
  }
}

async function showCurrent(){
  if (!playlist.length) return;

  const file = playlist[index];
  const url = urlFor(file);

  // Try to preload the current slide (so the fade is clean)
  try{
    if (isVideo(file)) await preloadVideo(url);
    else await preloadAndDecodeImage(url);
  }catch{
    // If preload fails, skip to next
    nextSlide();
    return;
  }

  await swapTo(file);
  preloadNext();
}

function nextSlide(){
  if (!playlist.length) return;
  index = (index + 1) % playlist.length;
  showCurrent();
}

/* Start slideshow */
async function start(){
  clearTimers();

  if (!playlist.length) return;

  // Hard reset both layers so we start clean
  resetLayer("A");
  resetLayer("B");

  // Start on A layer visible with first slide
  showingLayer = "B"; // so first swap goes to A
  index = 0;

  await showCurrent();
}

/* Build playlist */
async function buildPlaylist(){
  const key = dayKeyToronto();
  const candidates = [
    ...everydayCandidates,
    ...(dayCandidates[key] || [])
  ];

  const next = [];
  for (const f of candidates){
    if (await exists(f)) next.push(f);
  }

  playlist = next;
  await start();
}

/* Midnight auto-refresh */
function msUntilMidnight(){
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
  }, msUntilMidnight());
}

/* Boot */
buildPlaylist();
scheduleMidnight();
