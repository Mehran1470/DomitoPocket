import {
  getSavedName
} from "../js/store.js";


/* =========================================================
   تنظیمات
========================================================= */

const FUEL_PER_RESOURCE = 20;

const RESOURCE_COUNT = 4;

const CARRY_RANGE_MULT = 1.15;

const BASE_SPEED_FACTOR = 0.4;


/* =========================================================
   عناصر
========================================================= */

const canvas =
  document.getElementById(
    "astraCanvas"
  );

const ctx =
  canvas.getContext("2d");

const arenaBox =
  document.getElementById(
    "astraArenaBox"
  );

const rotateScreen =
  document.getElementById(
    "astraRotateScreen"
  );

const overlayMsg =
  document.getElementById(
    "astraOverlayMsg"
  );

const resultScreen =
  document.getElementById(
    "astraResult"
  );

const fuelP1El =
  document.getElementById(
    "fuelP1"
  );

const cargoP1El =
  document.getElementById(
    "cargoP1"
  );

const p1Label =
  document.getElementById(
    "p1Label"
  );

const othersHud =
  document.getElementById(
    "othersHud"
  );

const modeBadge =
  document.getElementById(
    "astraModeBadge"
  );

const fullscreenBtn =
  document.getElementById(
    "astraFullscreenBtn"
  );

const muteBtn =
  document.getElementById(
    "astraMuteBtn"
  );


/* =========================================================
   Canvas
========================================================= */

let W = 900;

let H = 450;

let SHIP_R = 15;

let RES_R = 12;

let DOCK_R = 30;

let BASE_SPEED = 190;

let stars = [];


/* =========================================================
   وضعیت بازی
========================================================= */

let entitiesInitialized =
  false;

let myColorIndex = 0;

let myDock = {
  x:0,
  y:0
};

let dockColor =
  "#4F7CFF";


let me = {

  x:0,
  y:0,

  angle:
    -Math.PI / 2,

  fuel:0,

  cargo:0,

  carrying:null,

  trail:[]

};


let aiShip = null;

let localResources = [];

let particles = [];

let floaters = [];


let running =
  false;

let paused =
  true;

let raceOver =
  false;


let myName =
  "";

let joyVec = {
  x:0,
  y:0
};


let orientationLocked =
  false;


/* =========================================================
   اندازه‌ها
========================================================= */

function recomputeScaledSizes(){

  const minDim =
    Math.min(
      W,
      H
    );


  SHIP_R =
    Math.max(
      10,
      minDim * 0.036
    );


  RES_R =
    Math.max(
      9,
      minDim * 0.03
    );


  DOCK_R =
    Math.max(
      20,
      minDim * 0.08
    );


  BASE_SPEED =
    minDim *
    BASE_SPEED_FACTOR;

}


/* =========================================================
   پس‌زمینه
========================================================= */

function regenerateBackground(){

  stars = [];


  const count =
    Math.round(
      (W * H) / 4500
    );


  for(
    let i = 0;
    i < count;
    i++
  ){

    stars.push({

      x:
        Math.random() * W,

      y:
        Math.random() * H,

      r:
        Math.random() * 1.4 +
        0.3,

      tw:
        Math.random() *
        Math.PI *
        2

    });

  }

}


/* =========================================================
   Resize
========================================================= */

function resizeCanvasResolution(){

  const rect =
    arenaBox.getBoundingClientRect();


  const cssW =
    Math.max(
      1,
      rect.width
    );


  const cssH =
    Math.max(
      1,
      rect.height
    );


  const dpr =
    Math.min(
      window.devicePixelRatio || 1,
      2.5
    );


  canvas.width =
    Math.round(
      cssW * dpr
    );


  canvas.height =
    Math.round(
      cssH * dpr
    );


  ctx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );


  const oldW =
    W;

  const oldH =
    H;


  W =
    cssW;

  H =
    cssH;


  recomputeScaledSizes();

  regenerateBackground();

  computeDock();


  if(
    entitiesInitialized &&
    oldW > 0 &&
    oldH > 0
  ){

    const rx =
      W / oldW;

    const ry =
      H / oldH;


    if(
      Number.isFinite(rx) &&
      Number.isFinite(ry) &&
      rx > 0 &&
      ry > 0
    ){

      [
        me,
        aiShip
      ].forEach(
        s => {

          if(!s){
            return;
          }


          s.x *= rx;

          s.y *= ry;


          if(s.trail){

            s.trail.forEach(
              p => {

                p.x *= rx;

                p.y *= ry;

              }
            );

          }

        }
      );


      if(
        aiShip &&
        aiShip.dock
      ){

        aiShip.dock.x *= rx;

        aiShip.dock.y *= ry;

      }


      localResources.forEach(
        r => {

          r.x *= rx;

          r.y *= ry;

        }
      );


      me.x =
        Math.max(
          SHIP_R,
          Math.min(
            W - SHIP_R,
            me.x
          )
        );


      me.y =
        Math.max(
          SHIP_R,
          Math.min(
            H - SHIP_R,
            me.y
          )
        );

    }

  }

}


/* =========================================================
   Dock
========================================================= */

const DOCK_SPOTS_FRACTIONS = [

  {
    fx:0.12,
    fy:0.25
  },

  {
    fx:0.88,
    fy:0.25
  },

  {
    fx:0.12,
    fy:0.75
  },

  {
    fx:0.88,
    fy:0.75
  }

];


function dockForColorIndex(idx){

  const d =
    DOCK_SPOTS_FRACTIONS[
      idx %
      DOCK_SPOTS_FRACTIONS.length
    ];


  return {

    x:
      W * d.fx,

    y:
      H * d.fy

  };

}


function computeDock(){

  myDock = {

    x:
      SHIP_R * 3,

    y:
      H / 2

  };

}


/* =========================================================
   ابزار
========================================================= */

function rand(
  min,
  max
){

  return (
    Math.random() *
    (max - min)
  ) + min;

}


function dist(
  a,
  b
){

  return Math.hypot(
    a.x - b.x,
    a.y - b.y
  );

}


/* =========================================================
   رنگ‌ها
========================================================= */

const COLORS = [

  "#4F7CFF",

  "#9B5CFF",

  "#FF4F81",

  "#3ECF8E"

];


/* =========================================================
   ذرات
========================================================= */

function burstParticles(
  x,
  y,
  color,
  count = 12
){

  for(
    let i = 0;
    i < count;
    i++
  ){

    const angle =
      (
        Math.PI *
        2 *
        i
      ) /
      count +
      Math.random() *
      0.3;


    const speed =
      rand(
        50,
        140
      );


    particles.push({

      x,
      y,

      vx:
        Math.cos(angle) *
        speed,

      vy:
        Math.sin(angle) *
        speed,

      life:1,

      color

    });

  }

}


function addFloater(
  x,
  y,
  text,
  color
){

  floaters.push({

    x,
    y,

    text,

    life:1,

    color

  });

}


function updateEffects(dt){

  particles.forEach(
    p => {

      p.x +=
        p.vx * dt;

      p.y +=
        p.vy * dt;

      p.vx *=
        0.9;

      p.vy *=
        0.9;

      p.life -=
        dt * 1.4;

    }
  );


  particles =
    particles.filter(
      p =>
        p.life > 0
    );


  floaters.forEach(
    f => {

      f.y -=
        dt * 40;

      f.life -=
        dt * 0.9;

    }
  );


  floaters =
    floaters.filter(
      f =>
        f.life > 0
    );

}


/* =========================================================
   صدا
========================================================= */

let audioCtx =
  null;

let muted =
  false;


function playTone(
  freq,
  duration
){

  if(muted){
    return;
  }


  try{

    if(!audioCtx){

      audioCtx =
        new(
          window.AudioContext ||
          window.webkitAudioContext
        )();

    }


    if(
      audioCtx.state ===
      "suspended"
    ){

      audioCtx.resume();

    }


    const osc =
      audioCtx.createOscillator();


    const gain =
      audioCtx.createGain();


    osc.frequency.value =
      freq;


    osc.type =
      "sine";


    gain.gain.setValueAtTime(
      0.08,
      audioCtx.currentTime
    );


    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioCtx.currentTime +
      duration
    );


    osc.connect(gain);

    gain.connect(
      audioCtx.destination
    );


    osc.start();


    osc.stop(
      audioCtx.currentTime +
      duration
    );

  }

  catch(e){}

}


muteBtn.addEventListener(
  "click",
  () => {

    muted =
      !muted;


    muteBtn.textContent =
      muted
        ? "🔇"
        : "🔊";

  }
);


/* =========================================================
   حرکت بازیکن
========================================================= */

function updateMe(dt){

  const mag =
    Math.min(
      1,
      Math.hypot(
        joyVec.x,
        joyVec.y
      )
    );


  if(
    mag > 0.02
  ){

    const len =
      Math.hypot(
        joyVec.x,
        joyVec.y
      ) || 1;


    const nx =
      joyVec.x / len;

    const ny =
      joyVec.y / len;


    me.angle =
      Math.atan2(
        ny,
        nx
      );


    me.x +=
      nx *
      mag *
      BASE_SPEED *
      dt;


    me.y +=
      ny *
      mag *
      BASE_SPEED *
      dt;


    me.x =
      Math.max(
        SHIP_R,
        Math.min(
          W - SHIP_R,
          me.x
        )
      );


    me.y =
      Math.max(
        SHIP_R,
        Math.min(
          H - SHIP_R,
          me.y
        )
      );


    me.trail.push({

      x:
        me.x,

      y:
        me.y

    });


    if(
      me.trail.length >
      12
    ){

      me.trail.shift();

    }

  }

}


/* =========================================================
   منابع
========================================================= */

function spawnLocalResource(){

  const margin =
    RES_R * 3;


  localResources.push({

    id:
      "r" +
      Math.random(),

    x:
      rand(
        W * 0.3,
        W * 0.7
      ),

    y:
      rand(
        margin,
        H - margin
      ),

    spawnT:0,

    pulse:
      Math.random() *
      Math.PI *
      2,

    takenBy:null

  });

}


/* =========================================================
   حرکت ربات
========================================================= */

function moveToward(
  entity,
  target,
  dt
){

  const d =
    dist(
      entity,
      target
    ) || 1;


  entity.x +=
    (
      target.x -
      entity.x
    ) /
    d *
    BASE_SPEED *
    dt;


  entity.y +=
    (
      target.y -
      entity.y
    ) /
    d *
    BASE_SPEED *
    dt;


  entity.angle =
    Math.atan2(
      target.y -
        entity.y,
      target.x -
        entity.x
    );

}


/* =========================================================
   منطق برداشتن منابع
========================================================= */

function handleCarryLogic(
  ship,
  resourcesArr,
  dock,
  isMe
){

  if(ship.carrying){

    if(
      dist(
        ship,
        dock
      ) <
      DOCK_R
    ){

      ship.cargo++;

      ship.fuel =
        Math.min(
          100,
          ship.fuel +
          FUEL_PER_RESOURCE
        );


      addFloater(
        dock.x,
        dock.y,
        "+سوخت",
        isMe
          ? dockColor
          : "#9B5CFF"
      );


      burstParticles(
        dock.x,
        dock.y,
        isMe
          ? dockColor
          : "#9B5CFF"
      );


      playTone(
        700,
        0.08
      );


      const rid =
        ship.carrying;


      ship.carrying =
        null;


      localResources =
        localResources.filter(
          r =>
            r.id !== rid
        );

    }

  }

  else{

    const nearby =
      resourcesArr.find(
        r =>
          !r.takenBy &&
          dist(
            ship,
            r
          ) <
          (
            SHIP_R +
            RES_R
          ) *
          CARRY_RANGE_MULT
      );


    if(nearby){

      nearby.takenBy =
        isMe
          ? "player"
          : "ai";


      ship.carrying =
        nearby.id;


      playTone(
        500,
        0.06
      );

    }

  }

}


/* =========================================================
   منطق تک‌نفره
========================================================= */

function soloTick(
  dt
){

  handleCarryLogic(
    me,
    localResources,
    myDock,
    true
  );


  /* -------------------------
     ربات
  ------------------------- */

  if(
    aiShip &&
    !aiShip.launched
  ){

    if(
      aiShip.carrying
    ){

      moveToward(
        aiShip,
        aiShip.dock,
        dt
      );


      if(
        dist(
          aiShip,
          aiShip.dock
        ) <
        DOCK_R
      ){

        aiShip.cargo++;


        aiShip.fuel =
          Math.min(
            100,
            aiShip.fuel +
            FUEL_PER_RESOURCE
          );


        aiShip.carrying =
          null;

      }

    }

    else{

      const target =
        localResources
          .filter(
            r =>
              !r.takenBy
          )
          .sort(
            (a,b) =>
              dist(
                aiShip,
                a
              ) -
              dist(
                aiShip,
                b
              )
          )[0];


      if(target){

        moveToward(
          aiShip,
          target,
          dt
        );


        if(
          dist(
            aiShip,
            target
          ) <
          (
            SHIP_R +
            RES_R
          ) *
          CARRY_RANGE_MULT
        ){

          target.takenBy =
            "ai";


          aiShip.carrying =
            target.id;

        }

      }

    }


    aiShip.x =
      Math.max(
        SHIP_R,
        Math.min(
          W - SHIP_R,
          aiShip.x
        )
      );


    aiShip.y =
      Math.max(
        SHIP_R,
        Math.min(
          H - SHIP_R,
          aiShip.y
        )
      );

  }


  /* منابع مصرف‌شده */

  localResources =
    localResources.filter(
      r =>
        !r.takenBy ||
        r.takenBy === "player" ||
        r.takenBy === "ai"
    );


  /*
   * اگر منابع کم شدند،
   * دوباره تولید کن.
   */

  while(
    localResources.length <
    RESOURCE_COUNT
  ){

    spawnLocalResource();

  }


  /* برد بازیکن */

  if(
    me.fuel >= 100 &&
    dist(
      me,
      myDock
    ) <
    DOCK_R &&
    !raceOver
  ){

    finishRace(
      true
    );

  }


  /* برد ربات */

  if(
    aiShip.fuel >= 100 &&
    dist(
      aiShip,
      aiShip.dock
    ) <
    DOCK_R &&
    !raceOver
  ){

    finishRace(
      false
    );

  }


  updateHudSolo();

}


/* =========================================================
   پس‌زمینه Canvas
========================================================= */

function drawBackground(t){

  ctx.fillStyle =
    "#05060f";


  ctx.fillRect(
    0,
    0,
    W,
    H
  );


  const neb =
    ctx.createRadialGradient(
      W * 0.25,
      H * 0.2,
      0,
      W * 0.25,
      H * 0.2,
      Math.max(
        W,
        H
      ) * 0.5
    );


  neb.addColorStop(
    0,
    "rgba(124,77,255,.14)"
  );


  neb.addColorStop(
    1,
    "rgba(124,77,255,0)"
  );


  ctx.fillStyle =
    neb;


  ctx.fillRect(
    0,
    0,
    W,
    H
  );


  const neb2 =
    ctx.createRadialGradient(
      W * 0.8,
      H * 0.85,
      0,
      W * 0.8,
      H * 0.85,
      Math.max(
        W,
        H
      ) * 0.45
    );


  neb2.addColorStop(
    0,
    "rgba(79,124,255,.12)"
  );


  neb2.addColorStop(
    1,
    "rgba(79,124,255,0)"
  );


  ctx.fillStyle =
    neb2;


  ctx.fillRect(
    0,
    0,
    W,
    H
  );


  /* شبکه */

  ctx.strokeStyle =
    "rgba(255,255,255,.03)";


  ctx.lineWidth =
    1;


  const gap =
    Math.max(
      30,
      Math.min(
        W,
        H
      ) / 12
    );


  for(
    let x = 0;
    x < W;
    x += gap
  ){

    ctx.beginPath();

    ctx.moveTo(
      x,
      0
    );

    ctx.lineTo(
      x,
      H
    );

    ctx.stroke();

  }


  for(
    let y = 0;
    y < H;
    y += gap
  ){

    ctx.beginPath();

    ctx.moveTo(
      0,
      y
    );

    ctx.lineTo(
      W,
      y
    );

    ctx.stroke();

  }


  /* ستاره‌ها */

  stars.forEach(
    s => {

      const alpha =
        0.4 +
        Math.sin(
          t * 2 +
          s.tw
        ) *
        0.3;


      ctx.beginPath();


      ctx.arc(
        s.x,
        s.y,
        s.r,
        0,
        Math.PI * 2
      );


      ctx.fillStyle =
        `rgba(
          255,
          255,
          255,
          ${Math.max(
            0.1,
            alpha
          )}
        )`;


      ctx.fill();

    }
  );

}


/* =========================================================
   Dock
========================================================= */

function drawDock(
  dock,
  color,
  active
){

  ctx.beginPath();


  ctx.arc(
    dock.x,
    dock.y,
    DOCK_R,
    0,
    Math.PI * 2
  );


  ctx.strokeStyle =
    color;


  ctx.globalAlpha =
    active
      ? 0.9
      : 0.3;


  ctx.lineWidth =
    active
      ? 3
      : 1.5;


  if(active){

    ctx.shadowColor =
      color;

    ctx.shadowBlur =
      16;

  }


  ctx.stroke();


  ctx.shadowBlur =
    0;


  ctx.globalAlpha =
    1;

}


/* =========================================================
   Trail
========================================================= */

function drawTrail(
  trail,
  color
){

  trail.forEach(
    (p,i) => {

      const a =
        (
          i /
          trail.length
        ) *
        0.3;


      ctx.beginPath();


      ctx.arc(
        p.x,
        p.y,
        SHIP_R *
          (
            0.25 +
            (
              i /
              trail.length
            ) *
            0.4
          ),
        0,
        Math.PI * 2
      );


      ctx.fillStyle =
        color;


      ctx.globalAlpha =
        a;


      ctx.fill();


      ctx.globalAlpha =
        1;

    }
  );

}


/* =========================================================
   سفینه
========================================================= */

function drawRocket(
  x,
  y,
  angle,
  color,
  label,
  carrying,
  boosted
){

  ctx.save();


  ctx.translate(
    x,
    y
  );


  ctx.rotate(
    angle
  );


  /* شعله */

  ctx.beginPath();


  ctx.moveTo(
    -SHIP_R * 1.1,
    -SHIP_R * .4
  );


  ctx.lineTo(
    -SHIP_R *
      (
        1.8 +
        Math.random() *
        .4
      ),
    0
  );


  ctx.lineTo(
    -SHIP_R * 1.1,
    SHIP_R * .4
  );


  ctx.closePath();


  ctx.fillStyle =
    "#FFC845";


  ctx.globalAlpha =
    .85;


  ctx.fill();


  ctx.globalAlpha =
    1;


  /* بدنه */

  ctx.beginPath();


  ctx.moveTo(
    SHIP_R * 1.3,
    0
  );


  ctx.lineTo(
    -SHIP_R * .8,
    -SHIP_R * .75
  );


  ctx.lineTo(
    -SHIP_R * .4,
    0
  );


  ctx.lineTo(
    -SHIP_R * .8,
    SHIP_R * .75
  );


  ctx.closePath();


  ctx.fillStyle =
    color;


  ctx.shadowColor =
    color;


  ctx.shadowBlur =
    boosted
      ? Math.min(
          22,
          SHIP_R * 1.5
        )
      : Math.min(
          10,
          SHIP_R * .8
        );


  ctx.fill();


  ctx.shadowBlur =
    0;


  ctx.restore();


  /* محموله */

  if(carrying){

    ctx.beginPath();


    ctx.arc(
      x -
        Math.cos(angle) *
        SHIP_R *
        1.6,

      y -
        Math.sin(angle) *
        SHIP_R *
        1.6,

      RES_R * .5,

      0,
      Math.PI * 2
    );


    ctx.fillStyle =
      "#FFC845";


    ctx.shadowColor =
      "#FFC845";


    ctx.shadowBlur =
      8;


    ctx.fill();


    ctx.shadowBlur =
      0;

  }


  /* اسم */

  ctx.fillStyle =
    "#EAF0FF";


  ctx.font =
    `${Math.max(
      9,
      SHIP_R * .65
    )}px system-ui, Tahoma, sans-serif`;


  ctx.textAlign =
    "center";


  ctx.fillText(
    label,
    x,
    y -
      SHIP_R -
      8
  );

}


/* =========================================================
   منابع
========================================================= */

function drawResources(
  t,
  list
){

  list.forEach(
    r => {

      if(r.takenBy){
        return;
      }


      r.spawnT =
        Math.min(
          1,
          (
            r.spawnT ||
            0
          ) +
          0.06
        );


      const pulse =
        1 +
        Math.sin(
          t * 3 +
          (
            r.pulse ||
            0
          )
        ) *
        0.1;


      const rad =
        RES_R *
        r.spawnT *
        pulse;


      ctx.beginPath();


      ctx.arc(
        r.x,
        r.y,
        rad,
        0,
        Math.PI * 2
      );


      ctx.fillStyle =
        "#FFC845";


      ctx.shadowColor =
        "#FFC845";


      ctx.shadowBlur =
        Math.min(
          16,
          rad
        );


      ctx.fill();


      ctx.shadowBlur =
        0;


      ctx.fillStyle =
        "#05060f";


      ctx.font =
        `${Math.max(
          8,
          rad * .8
        )}px sans-serif`;


      ctx.textAlign =
        "center";


      ctx.fillText(
        "⚡",
        r.x,
        r.y +
          rad *
          .3
      );

    }
  );

}


/* =========================================================
   افکت‌ها
========================================================= */

function drawEffects(){

  particles.forEach(
    p => {

      ctx.beginPath();


      ctx.arc(
        p.x,
        p.y,
        2.4,
        0,
        Math.PI * 2
      );


      ctx.fillStyle =
        p.color;


      ctx.globalAlpha =
        Math.max(
          0,
          p.life
        );


      ctx.fill();


      ctx.globalAlpha =
        1;

    }
  );


  floaters.forEach(
    f => {

      ctx.font =
        "bold 12px system-ui, Tahoma, sans-serif";


      ctx.textAlign =
        "center";


      ctx.fillStyle =
        f.color;


      ctx.globalAlpha =
        Math.max(
          0,
          f.life
        );


      ctx.fillText(
        f.text,
        f.x,
        f.y
      );


      ctx.globalAlpha =
        1;

    }
  );

}


/* =========================================================
   رسم کل بازی
========================================================= */

function draw(t){

  drawBackground(t);


  drawDock(
    myDock,
    dockColor,
    me.fuel >= 100
  );


  if(isSolo){

    drawResources(
      t,
      localResources
    );


    if(aiShip){

      drawDock(
        aiShip.dock,
        "#9B5CFF",
        aiShip.fuel >= 100
      );


      drawTrail(
        aiShip.trail || [],
        "#9B5CFF"
      );


      drawRocket(
        aiShip.x,
        aiShip.y,
        aiShip.angle,
        "#9B5CFF",
        "ربات",
        aiShip.carrying,
        false
      );

    }

  }


  drawTrail(
    me.trail,
    dockColor
  );


  drawRocket(
    me.x,
    me.y,
    me.angle,
    dockColor,
    myName ||
      "تو",
    me.carrying,
    false
  );


  drawEffects();

}


/* =========================================================
   HUD
========================================================= */

function updateHudSolo(){

  fuelP1El.style.width =
    `${me.fuel}%`;


  cargoP1El.textContent =
    me.cargo;


  othersHud.innerHTML = `

    <div class="astra-hud-chip">

      <div
        class="name"
        style="color:#9B5CFF;"
      >
        🤖 ربات
      </div>

      <div class="mini-bar">

        <div
          class="mini-fill"
          style="
            width:${aiShip.fuel}%;
            background:#9B5CFF;
          "
        ></div>

      </div>

    </div>

  `;

}


/* =========================================================
   پایان
========================================================= */

function finishRace(
  iWon
){

  if(raceOver){
    return;
  }


  raceOver =
    true;

  running =
    false;


  playTone(
    iWon
      ? 1300
      : 300,
    .3
  );


  showResult(
    iWon
  );

}


/* =========================================================
   نتیجه
========================================================= */

function showResult(
  iWon
){

  resultScreen.style.display =
    "flex";


  resultScreen.innerHTML = `

    <div
      class="headline ${
        iWon
          ? "p1"
          : "p2"
      }"
    >

      ${
        iWon
          ? "🏆 پیروزی!"
          : "😅 این‌بار نشد"
      }

    </div>


    <div
      style="
        color:#8B93B8;
        font-size:13px;
        margin-bottom:16px;
      "
    >

      🌍 پایان مسابقه

    </div>


    <button
      id="rematchBtn"
    >

      🔄 دوباره بازی کن

    </button>


    <button
      id="homeBtn"
      class="ghost"
    >

      🏠 بازگشت به خانه

    </button>

  `;


  document
    .getElementById(
      "rematchBtn"
    )
    .addEventListener(
      "click",
      () => {

        window.location.reload();

      }
    );


  document
    .getElementById(
      "homeBtn"
    )
    .addEventListener(
      "click",
      () => {

        window.location.href =
          "../index.html";

      }
    );

}


/* =========================================================
   شمارش معکوس
========================================================= */

async function countdown(){

  paused =
    true;


  for(
    const step of [
      "۳",
      "۲",
      "۱",
      "برو!"
    ]
  ){

    overlayMsg.innerHTML = `

      <div class="big">
        ${step}
      </div>

    `;


    overlayMsg.style.display =
      "flex";


    playTone(
      step === "برو!"
        ? 900
        : 500,
      .08
    );


    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          550
        )
    );

  }


  overlayMsg.style.display =
    "none";


  paused =
    orientationLocked;

}


/* =========================================================
   Loop
========================================================= */

let lastTime =
  null;


function loop(ts){

  if(!running){
    return;
  }


  if(
    lastTime === null
  ){

    lastTime =
      ts;

  }


  const dt =
    Math.min(
      .05,
      (
        ts -
        lastTime
      ) /
      1000
    );


  lastTime =
    ts;


  const now =
    ts /
    1000;


  if(
    !paused &&
    !raceOver
  ){

    updateMe(dt);

    updateEffects(dt);

    soloTick(dt);

  }


  draw(now);


  requestAnimationFrame(
    loop
  );

}


/* =========================================================
   شروع Solo
========================================================= */

async function startSolo(){

  modeBadge.textContent =
    "تک‌نفره در برابر ربات";


  resizeCanvasResolution();

  computeDock();


  me = {

    x:
      myDock.x,

    y:
      myDock.y,

    angle:0,

    fuel:0,

    cargo:0,

    carrying:null,

    trail:[]

  };


  aiShip = {

    x:
      W -
      SHIP_R * 3,

    y:
      H / 2,

    angle:
      Math.PI,

    fuel:0,

    cargo:0,

    carrying:null,

    trail:[],

    dock:{

      x:
        W -
        SHIP_R * 3,

      y:
        H / 2

    },

    launched:false

  };


  localResources = [];


  for(
    let i = 0;
    i < RESOURCE_COUNT;
    i++
  ){

    spawnLocalResource();

  }


  particles = [];

  floaters = [];


  entitiesInitialized =
    true;


  raceOver =
    false;


  running =
    true;


  paused =
    true;


  lastTime =
    null;


  requestAnimationFrame(
    loop
  );


  await countdown();

}


/* =========================================================
   جوی‌استیک
========================================================= */

function setupJoystick(
  baseEl,
  knobEl
){

  let active =
    false;

  let origin = {
    x:0,
    y:0
  };

  let pointerId =
    null;


  function start(
    clientX,
    clientY
  ){

    active =
      true;


    baseEl.classList.add(
      "pressed"
    );


    const rect =
      baseEl.getBoundingClientRect();


    origin = {

      x:
        rect.left +
        rect.width / 2,

      y:
        rect.top +
        rect.height / 2

    };

  }


  function move(
    clientX,
    clientY
  ){

    if(!active){
      return;
    }


    let dx =
      clientX -
      origin.x;


    let dy =
      clientY -
      origin.y;


    const max =
      baseEl.getBoundingClientRect()
        .width *
      .38;


    const deadZone =
      max *
      .14;


    const d =
      Math.hypot(
        dx,
        dy
      );


    if(
      d < deadZone
    ){

      joyVec = {
        x:0,
        y:0
      };


      knobEl.style.transform =
        "translate(0,0)";


      return;

    }


    if(
      d > max
    ){

      dx =
        dx /
        d *
        max;


      dy =
        dy /
        d *
        max;

    }


    knobEl.style.transform =
      `translate(
        ${dx}px,
        ${dy}px
      )`;


    joyVec = {

      x:
        dx / max,

      y:
        dy / max

    };

  }


  function end(){

    active =
      false;


    pointerId =
      null;


    baseEl.classList.remove(
      "pressed"
    );


    knobEl.style.transform =
      "translate(0,0)";


    joyVec = {
      x:0,
      y:0
    };

  }


  baseEl.addEventListener(
    "pointerdown",
    e => {

      e.preventDefault();


      if(
        pointerId !==
        null
      ){

        return;

      }


      pointerId =
        e.pointerId;


      try{

        baseEl.setPointerCapture(
          e.pointerId
        );

      }

      catch(_){}


      start(
        e.clientX,
        e.clientY
      );


      move(
        e.clientX,
        e.clientY
      );

    }
  );


  baseEl.addEventListener(
    "pointermove",
    e => {

      if(
        e.pointerId ===
        pointerId
      ){

        e.preventDefault();


        move(
          e.clientX,
          e.clientY
        );

      }

    }
  );


  baseEl.addEventListener(
    "pointerup",
    e => {

      if(
        e.pointerId ===
        pointerId
      ){

        end();

      }

    }
  );


  baseEl.addEventListener(
    "pointercancel",
    e => {

      if(
        e.pointerId ===
        pointerId
      ){

        end();

      }

    }
  );


  baseEl.style.touchAction =
    "none";

}


setupJoystick(
  document.getElementById(
    "astraJoyBaseP1"
  ),
  document.getElementById(
    "astraJoyKnobP1"
  )
);


/* =========================================================
   کیبورد
========================================================= */

const keys = {};


window.addEventListener(
  "keydown",
  e => {

    keys[e.key] =
      true;


    updateKeyVec();

  }
);


window.addEventListener(
  "keyup",
  e => {

    keys[e.key] =
      false;


    updateKeyVec();

  }
);


function updateKeyVec(){

  let x = 0;

  let y = 0;


  if(
    keys["ArrowLeft"] ||
    keys["a"] ||
    keys["A"]
  ){

    x -= 1;

  }


  if(
    keys["ArrowRight"] ||
    keys["d"] ||
    keys["D"]
  ){

    x += 1;

  }


  if(
    keys["ArrowUp"] ||
    keys["w"] ||
    keys["W"]
  ){

    y -= 1;

  }


  if(
    keys["ArrowDown"] ||
    keys["s"] ||
    keys["S"]
  ){

    y += 1;

  }


  joyVec = {
    x,
    y
  };

}


/* =========================================================
   تمام صفحه
========================================================= */

fullscreenBtn.addEventListener(
  "click",
  async () => {

    try{

      if(
        !document.fullscreenElement
      ){

        await document
          .documentElement
          .requestFullscreen();


        fullscreenBtn.textContent =
          "⛶ خروج";

      }

      else{

        await document
          .exitFullscreen();


        fullscreenBtn.textContent =
          "⛶ تمام‌صفحه";

      }

    }

    catch(e){}

  }
);


/* =========================================================
   Orientation
========================================================= */

function checkOrientation(){

  const w =
    window.innerWidth;

  const h =
    window.innerHeight;


  orientationLocked =
    Math.min(
      w,
      h
    ) < 700 &&
    h > w;


  rotateScreen.classList.toggle(
    "show",
    orientationLocked
  );


  if(
    running &&
    !raceOver
  ){

    paused =
      orientationLocked;

  }

}


function handleViewportChange(){

  checkOrientation();


  if(
    !orientationLocked
  ){

    requestAnimationFrame(
      () =>
        requestAnimationFrame(
          resizeCanvasResolution
        )
    );

  }

}


window.addEventListener(
  "resize",
  handleViewportChange
);


window.addEventListener(
  "orientationchange",
  handleViewportChange
);


if(
  window.visualViewport
){

  window.visualViewport.addEventListener(
    "resize",
    handleViewportChange
  );

}


/* =========================================================
   جلوگیری از منوی نگه‌داشتن
========================================================= */

document.addEventListener(
  "contextmenu",
  e => {

    e.preventDefault();

  }
);


/* =========================================================
   INIT
========================================================= */

async function init(){

  myName =
    getSavedName() ||
    "بازیکن";


  p1Label.textContent =
    myName;


  checkOrientation();


  resizeCanvasResolution();


  /*
   * اگر صفحه عمودی باشد،
   * بازی آماده است ولی تا چرخاندن گوشی
   * شروع نمی‌شود.
   */


  await startSolo();

}


init();


/* =========================================================
   خروج
========================================================= */

window.addEventListener(
  "beforeunload",
  () => {

    running =
      false;

  }
);
