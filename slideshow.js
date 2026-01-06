/* =========================================================
   SLIDESHOW ONLY
   - Everyday images always play
   - Day-of-week images only play that day
   - Auto-detects which files exist (no broken slides)
   - 10s per slide
   - Cache-busting so updates appear fast
========================================================= */

const SLIDE_SECONDS = 10;           // <- 10 seconds per slide
const FADE_MS = 900;               // matches CSS transition

// Put your images in the same folder as slideshow.html
// (or change these to "slides/every1.jpg" etc.)
const everydayCandidates = [
  "every1.jpg",
  "every2.jpg",
  "every3.jpg",
  "every4.jpg",
  "every5.jpg",
  "every6.jpg",
];

const dayCandidates = {
  mon: ["mon1.jpg","mon2.jpg","mon3.jpg","mon4.jpg"],
  tue: ["tue1.jpg","tue2.jpg","tue3.jpg","tue4.jpg"],
  wed: ["wed1.jpg","wed2.jpg","wed3.jpg","wed4.jpg"],
  thu: ["thu1.jpg","thu2.jpg","thu3.jpg","thu4.jpg"],
  fri: ["fri1.jpg","fri2.jpg","fri3.jpg","fri4.jpg"],
  sat: ["sat1.jpg","sat2.jpg","sat3.jpg","sat4.jpg"],
  sun: ["sun1.jpg","sun2.jpg","sun3.jpg","sun4.jpg"],
};

const slideEl = document.getElementById("slide");
const statusEl = document.getElementById("status");

function setStatus(msg){
  if (!statusEl) return;
  statusEl.textContent = msg;
}

async function exists(file){
  try{
    const r = await fetch(file, { method:"HEAD", cache:"no-store" });
    return r.ok;
  }catch{
    return false;
  }
}

function getDayKeyToronto(){
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    weekday: "short"
  }).format(new Date()).toLowerCase(); // mon/tue/...
}

function cacheBust(file){
  return file + "?v=" + Date.now();
}

let playlist = [];
let index = 0;
let timer = null;
let midnightTimer = null;

function stop(){
  if (timer) clearInterval(timer);
  timer = null;
}

function showSlide(file){
  if (!slideEl) return;

  slideEl.classList.add("fadeOut");

  // swap mid-fade
  setTimeout(() => {
    slideEl.src = cacheBust(file);
  }, Math.floor(FADE_MS * 0.5));

  // fade in
  setTimeout(() => {
    slideEl.classList.remove("fadeOut");
  }, FADE_MS);
}

function start(){
  stop();

  if (!playlist.length){
    setStatus("No slideshow images found.");
    return;
  }

  setStatus(`Slides: ${playlist.length} (10s) • Today: ${getDayKeyToronto().toUpperCase()}`);

  index = index % playlist.length;
  showSlide(playlist[index]);

  if (playlist.length === 1) return;

  timer = setInterval(() => {
    index = (index + 1) % playlist.length;
    showSlide(playlist[index]);
  }, SLIDE_SECONDS * 1000);
}

async function buildPlaylist(){
  const dayKey = getDayKeyToronto();

  const candidates = [
    ...everydayCandidates,
    ...(dayCandidates[dayKey] || [])
  ];

  const next = [];
  for (const f of candidates){
    if (await exists(f)) next.push(f);
  }

  playlist = next;
  index = 0;
  start();
}

function msUntilLocalMidnight(){
  const now = new Date();
  const next = new Date(now);
  next.setHours(24,0,0,0);
  return Math.max(5_000, next - now);
}

function scheduleMidnightRebuild(){
  if (midnightTimer) clearTimeout(midnightTimer);

  midnightTimer = setTimeout(async () => {
    await buildPlaylist();         // swap day promos automatically at midnight
    scheduleMidnightRebuild();
  }, msUntilLocalMidnight());
}

// Boot
setStatus("Loading slideshow…");
buildPlaylist();
scheduleMidnightRebuild();
