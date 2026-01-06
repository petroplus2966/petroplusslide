/* =========================================================
   SLIDESHOW (PRO CROSSFADE – CLEAN)
   - Everyday images always play
   - Day-of-week images only play on that day
   - 10s per slide
   - Uses 2 layers (A/B) for flawless crossfade
   - Midnight auto-refresh for day changes
========================================================= */

const SLIDE_SECONDS = 10;
const FADE_MS = 900;

/* Stable cache version for this session */
const CACHE_VERSION = Date.now();

/* Everyday slides */
const everydayCandidates = [
  "every1.jpg",
  "every2.jpg",
  "every3.jpg",
  "every4.jpg",
  "every5.jpg"
];

/* Day-specific slides */
const dayCandidates = {
  mon: ["mon1.jpg","mon2.jpg","mon3.jpg"],
  tue: ["tue1.jpg","tue2.jpg","tue3.jpg"],
  wed: ["wed1.jpg","wed2.jpg","wed3.jpg"],
  thu: ["thu1.jpg","thu2.jpg","thu3.jpg"],
  fri: ["fri1.jpg","fri2.jpg","fri3.jpg"],
  sat: ["sat1.jpg","sat2.jpg","sat3.jpg"],
  sun: ["sun1.jpg","sun2.jpg","sun3.jpg"]
};

/* Elements */
const slideA = document.getElementById("slideA");
const slideB = document.getElementById("slideB");

/* State */
let playlist = [];
let index = 0;
let showingA = true;
let tickTimer = null;
let midnightTimer = null;

/* Helpers */
function dayKeyToronto(){
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    weekday: "short"
  }).format(new Date()).toLowerCase();
}

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

/* Preload & decode exact URL */
function preloadAndDecode(url){
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

/* Crossfade swap */
function swapTo(url){
  const incoming = showingA ? slideB : slideA;
  const outgoing = showingA ? slideA : slideB;

  incoming.src = url;
  incoming.classList.add("isVisible");
  outgoing.classList.remove("isVisible");

  showingA = !showingA;
}

function stop(){
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = null;
}

/* Start slideshow */
async function start(){
  stop();

  if (!playlist.length) return;

  index = 0;

  /* First slide immediately */
  slideA.src = urlFor(playlist[index]);
  slideA.classList.add("isVisible");
  slideB.classList.remove("isVisible");
  showingA = true;

  if (playlist.length === 1) return;

  /* Preload next */
  let nextIndex = (index + 1) % playlist.length;
  preloadAndDecode(urlFor(playlist[nextIndex])).catch(()=>{});

  tickTimer = setInterval(async () => {
    index = (index + 1) % playlist.length;
    const url = urlFor(playlist[index]);

    try{
      await preloadAndDecode(url);
    }catch{
      return;
    }

    swapTo(url);

    nextIndex = (index + 1) % playlist.length;
    preloadAndDecode(urlFor(playlist[nextIndex])).catch(()=>{});

  }, SLIDE_SECONDS * 1000);
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
