/* =========================================================
   SLIDESHOW ONLY (FIXED FADE LOGIC)
   - Everyday images always play
   - Day-of-week images only play that day
   - 10s per slide (true)
   - Proper fade to NEXT image (no double-fade bug)
========================================================= */

const SLIDE_SECONDS = 10;
const FADE_MS = 900;

// Everyday images
const everydayCandidates = [
  "every1.jpg",
  "every2.jpg",
  "every3.jpg",
  "every4.jpg"
];

// Day-specific images
const dayCandidates = {
  mon: ["mon1.jpg","mon2.jpg"],
  tue: ["tue1.jpg","tue2.jpg"],
  wed: ["wed1.jpg","wed2.jpg"],
  thu: ["thu1.jpg","thu2.jpg"],
  fri: ["fri1.jpg","fri2.jpg"],
  sat: ["sat1.jpg","sat2.jpg"],
  sun: ["sun1.jpg","sun2.jpg"]
};

const slide = document.getElementById("slide");
const status = document.getElementById("status");

let playlist = [];
let index = 0;
let timer = null;
let midnightTimer = null;

/* ---------- helpers ---------- */
function setStatus(msg){
  if (status) status.textContent = msg;
}

async function exists(file){
  try{
    const r = await fetch(file, { method:"HEAD", cache:"no-store" });
    return r.ok;
  }catch{
    return false;
  }
}

function dayKeyToronto(){
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    weekday: "short"
  }).format(new Date()).toLowerCase();
}

function cacheBust(file){
  return file + "?v=" + Date.now();
}

/* ---------- core slideshow ---------- */
function showInstant(file){
  slide.src = cacheBust(file);
  slide.classList.remove("fadeOut");
}

function fadeTo(file){
  slide.classList.add("fadeOut");

  setTimeout(() => {
    slide.src = cacheBust(file);
  }, FADE_MS / 2);

  setTimeout(() => {
    slide.classList.remove("fadeOut");
  }, FADE_MS);
}

function stop(){
  if (timer) clearInterval(timer);
  timer = null;
}

function start(){
  stop();

  if (playlist.length === 0){
    setStatus("No slideshow images found");
    return;
  }

  setStatus(`Slides: ${playlist.length} • ${SLIDE_SECONDS}s`);

  // Show first image instantly
  index = 0;
  showInstant(playlist[index]);

  if (playlist.length === 1) return;

  timer = setInterval(() => {
    index = (index + 1) % playlist.length;
    fadeTo(playlist[index]);
  }, SLIDE_SECONDS * 1000);
}

/* ---------- playlist builder ---------- */
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
  start();
}

/* ---------- midnight auto-switch ---------- */
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

/* ---------- boot ---------- */
setStatus("Loading slideshow…");
buildPlaylist();
scheduleMidnight();
