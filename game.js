/* SWITCH RUSH — complete offline arcade prototype. No external libraries or images. */
"use strict";
const $ = id => document.getElementById(id);
const canvas = $("gameCanvas"), ctx = canvas.getContext("2d", { alpha: false });
const W = 360, H = 640, LEFT = 42, RIGHT = 318, LANE_W = (RIGHT - LEFT) / 4, PY = 519;
const laneX = n => LEFT + LANE_W * (n + .5);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const monday = d => { const x = new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate() - (x.getDay()+6)%7); return x.getTime(); };
const saveKey = "switchrush_complete_v1";
const balls = [
  { id:"basic", name:"Classic Orb", price:0, color:"#40d9ff", icon:"●", desc:"Any color, forever free" },
  { id:"inferno", name:"Inferno", price:250, color:"#ff7b29", icon:"🔥", desc:"Living flames" },
  { id:"thunder", name:"Thunder", price:400, color:"#34adff", icon:"⚡", desc:"Electric lightning" },
  { id:"galaxy", name:"Galaxy", price:600, color:"#a86cff", icon:"✦", desc:"Stars and nebulae" },
  { id:"crystal", name:"Crystal", price:800, color:"#60e4ff", icon:"◆", desc:"Prismatic gemstone" },
  { id:"toxic", name:"Toxic", price:1000, color:"#63ec53", icon:"☣", desc:"Bubbling energy" },
  { id:"cyclops", name:"Cyclops", price:1500, color:"#ffac53", icon:"👁", desc:"Animated watchful eye" },
  { id:"blackhole", name:"Black Hole", price:2500, color:"#ad57ff", icon:"◉", desc:"Spinning gravity ring" }
];
const trails = [
  { id:"basic", name:"Soft Glow", price:0, color:"#4bddff", icon:"✦", desc:"Free matching glow" },
  { id:"comet", name:"Comet", price:150, color:"#ffac52", icon:"☄", desc:"Golden sparks" },
  { id:"lightning", name:"Lightning", price:400, color:"#62d9ff", icon:"ϟ", desc:"Electric fragments" },
  { id:"rainbow", name:"Rainbow", price:750, color:"#e58aff", icon:"🌈", desc:"Changing colors" },
  { id:"stardust", name:"Galaxy Dust", price:1000, color:"#d1a4ff", icon:"✧", desc:"Twinkling stars" },
  { id:"snow", name:"Snowfall", price:550, color:"#cefcff", icon:"❄", desc:"Floating snowflakes" },
  { id:"fire", name:"Fire Sparks", price:900, color:"#ff6936", icon:"🔥", desc:"Burning embers" }
];
const roads = [
  { id:"neon", name:"Neon Night", price:0, color:"#34ceff", desc:"Electric midnight highway", sky:"#061326", base:"#182b43", line:"#4adfff" },
  { id:"coast", name:"Sunset Coast", price:300, color:"#ff9a5a", desc:"Ocean and palms", sky:"#261b38", base:"#43364c", line:"#ffbb73" },
  { id:"ice", name:"Frozen Highway", price:500, color:"#b5f4ff", desc:"Snow and frozen pavement", sky:"#13334a", base:"#29516b", line:"#c7faff" },
  { id:"cyber", name:"Cyber City", price:750, color:"#b78cff", desc:"Futuristic skyline", sky:"#150c2f", base:"#2b214f", line:"#c184ff" },
  { id:"inferno", name:"Inferno Road", price:1000, color:"#ff6939", desc:"Volcanic highway", sky:"#2b0e13", base:"#3d2526", line:"#ff813a" },
  { id:"space", name:"Galaxy Run", price:1500, color:"#ab88ff", desc:"Road between the stars", sky:"#0c102c", base:"#23264e", line:"#998cff" }
];
const powerTypes = [
  { id:"magnet", name:"Magnet", color:"#ffc34b", symbol:"M", seconds:8, weight:23 },
  { id:"double", name:"2× Coins", color:"#ffe66a", symbol:"2×", seconds:10, weight:22 },
  { id:"freeze", name:"Time Freeze", color:"#68dfff", symbol:"T", seconds:6, weight:15 },
  { id:"shield", name:"Shield", color:"#6affb5", symbol:"S", seconds:0, weight:15 },
  { id:"ghost", name:"Ghost Mode", color:"#ba8aff", symbol:"G", seconds:5, weight:9 },
  { id:"clone", name:"Clone Ball", color:"#ff69ce", symbol:"C", seconds:7, weight:8 },
  { id:"fire", name:"Fireball", color:"#ff743b", symbol:"F", seconds:4, weight:4 },
  { id:"gravity", name:"Gravity Shift", color:"#b78cff", symbol:"↕", seconds:5, weight:4 }
];
const missionData = [
  { text:"Collect 25 coins", goal:25, prize:75 },
  { text:"Survive 15 waves in one run", goal:15, prize:100 },
  { text:"Perform 4 near-misses", goal:4, prize:150 }
];
const defaultData = () => ({ best:0, wallet:0, boxes:0, color:"#40d9ff", ball:"basic", trail:"basic", road:"neon", ownedBalls:["basic"], ownedTrails:["basic"], ownedRoads:["neon"], milestones:[], runs:[], sound:true, daily:{date:today(),progress:[0,0,0],claimed:[false,false,false],bonus:false} });
let data = defaultData();
try {
  const previous = JSON.parse(localStorage.getItem(saveKey) || "null");
  if (previous && typeof previous === "object") data = { ...data, ...previous };
  else {
    data.best = Number(localStorage.getItem("switchRushBest")) || 0;
    data.wallet = Number(localStorage.getItem("switchRushTotalCoins")) || 0;
  }
} catch {}
const persist = () => { try { localStorage.setItem(saveKey, JSON.stringify(data)); } catch {} };
function resetDailyIfNeeded() {
  if (!data.daily || data.daily.date !== today()) { data.daily = defaultData().daily; persist(); }
}
resetDailyIfNeeded();
for (const type of ["Balls","Trails","Roads"]) if (!Array.isArray(data[`owned${type}`])) data[`owned${type}`] = ["basic"];
if (!Array.isArray(data.runs)) data.runs = [];
if (!Array.isArray(data.milestones)) data.milestones = [];
let activePanel = "", shopTab = "balls", recordTab = "daily";
let audioContext, soundLast = 0, toastTimeout;
const game = {
  mode:"menu", lane:1, x:laneX(1), score:0, coins:0, near:0, waves:0, t:0, speed:245,
  spawn:0, nextWave:1.1, energy:0, rush:0, powers:{}, shield:false,
  gravityCooldown:0, obstacles:[], pickups:[], particles:[], streak:0, flash:0, message:"", messageTimer:0
};
function sound(freq=500, length=.07) {
  if (!data.sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume();
    const osc = audioContext.createOscillator(), gain = audioContext.createGain();
    osc.type = "triangle"; osc.frequency.value = freq;
    gain.gain.setValueAtTime(.035, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + length);
    osc.connect(gain); gain.connect(audioContext.destination); osc.start(); osc.stop(audioContext.currentTime + length);
  } catch {}
}
function toast(text) {
  const node = $("toast"); node.textContent = text; node.classList.remove("hidden");
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => node.classList.add("hidden"), 2200);
}
function show(id) {
  for (const name of ["home","panel","pauseScreen","results"]) $(name).classList.toggle("hidden", name !== id);
  $("hud").classList.toggle("hidden", !(game.mode === "playing" || game.mode === "paused"));
}
function refreshHud() {
  $("scoreText").textContent = game.score.toLocaleString();
  $("bestText").textContent = Math.max(data.best,game.score).toLocaleString();
  $("coinText").textContent = (data.wallet + game.coins).toLocaleString();
  $("rushAmount").textContent = game.rush>0 ? `RUSH ${game.rush.toFixed(1)}s` : `${Math.floor(game.energy)}%`;
  $("rushFill").style.width = `${game.rush>0?100:game.energy}%`;
  $("rushFill").classList.toggle("active",game.rush>0);
  const active = powerTypes.filter(p => game.powers[p.id]>0 || (p.id === "shield" && game.shield));
  $("powerStatus").innerHTML = active.map(p=>`<span class="status-chip" style="border-color:${p.color}">${p.symbol} ${p.id==="shield"?"READY":game.powers[p.id].toFixed(0)+"s"}</span>`).join("");
}
function refreshHome() {
  $("homeBest").textContent = `BEST ${data.best.toLocaleString()}`;
  $("homeWallet").textContent = `◈ ${data.wallet.toLocaleString()}`;
  $("soundBtn").textContent = data.sound?"♫ ON":"♫ OFF";
  $("panelWallet").textContent = `◈ ${data.wallet.toLocaleString()}`;
  $("home").style.setProperty("--custom-ball",data.color);
  if (data.ball === "basic") $("home").querySelector(".hero-orb-inner").style.background = `radial-gradient(circle at 31% 27%,#ffffff,${data.color} 35%,#08142e 110%)`;
  else $("home").querySelector(".hero-orb-inner").style.background = `radial-gradient(circle at 31% 27%,#ffffff,${balls.find(b=>b.id===data.ball)?.color||data.color} 35%,#08142e 110%)`;
}
function start() {
  resetDailyIfNeeded();
  Object.assign(game,{ mode:"playing",lane:1,x:laneX(1),score:0,coins:0,near:0,waves:0,t:0,speed:245,spawn:0,nextWave:1.15,energy:0,rush:0,powers:{},shield:false,gravityCooldown:0,obstacles:[],pickups:[],particles:[],streak:0,flash:0,message:"",messageTimer:0 });
  show("home"); $("home").classList.add("hidden"); $("hud").classList.remove("hidden");
  refreshHud(); sound(660,.1);
}
function addScore(amount) { game.score += amount * (game.rush > 0 ? 2 : 1); }
function addEnergy(amount) {
  if (game.rush > 0) return;
  game.energy = Math.min(100,game.energy + amount);
  if (game.energy >= 100) { game.energy = 0; game.rush = 5; game.flash = .7; announce("⚡ RUSH MODE — 2× SCORE", "#ffe27d"); sound(980,.18); }
}
function announce(message,color="#ffda78") {
  game.message=message; game.messageTimer=.95;
  $("floatLayer").innerHTML = `<span class="float-text" style="color:${color}">${message}</span>`;
  setTimeout(()=>{ if(game.message===message) $("floatLayer").innerHTML=""; },800);
}
function burst(x,y,color,n=12) {
  for(let i=0;i<n;i++) {
    const angle=Math.random()*Math.PI*2, velocity=rand(60,190);
    game.particles.push({x,y,vx:Math.cos(angle)*velocity,vy:Math.sin(angle)*velocity,life:rand(.25,.68),max:.68,r:rand(2,4),color});
  }
  if(game.particles.length>160) game.particles.splice(0,game.particles.length-160);
}
function move(delta) {
  if (game.mode!=="playing") return;
  const old=game.lane, next=clamp(old+delta,0,3); if(old===next)return;
  if(!game.powers.ghost && !game.powers.fire && !game.powers.gravity) {
    for(const wave of game.obstacles) {
      if (!wave.nearCandidate && wave.blocked.includes(old) && wave.y>PY-134 && wave.y<PY-35) wave.nearCandidate=true;
    }
  }
  game.lane=next; sound(390+next*85,.045);
}
function weightedPower() { const n=Math.random()*100; let a=0; for(const p of powerTypes){a+=p.weight;if(n<a)return p;}return powerTypes[0]; }
function newWave() {
  let count=1, r=Math.random();
  if(game.score>=55 && r>.80) count=3;
  else if(game.score>=20 && r>.38) count=2;
  const pool=[0,1,2,3].sort(()=>Math.random()-.5); const blocked=pool.slice(0,count).sort();
  const kind=game.score>=75&&Math.random()<.22&&count===1?"slider":game.score>=40&&Math.random()<.22?"laser":"barrier";
  const wave={id:Math.random(),y:-43,blocked,kind,shifted:false,scored:false,nearCandidate:false,damaged:false};
  game.obstacles.push(wave);
  const safe=[0,1,2,3].filter(n=>!blocked.includes(n));
  if(Math.random()<.78) game.pickups.push({y:-43,lane:pick(safe),kind:"coin",collected:false});
  if(Math.random()<.16) game.pickups.push({y:-91,lane:pick(safe),kind:"power",power:weightedPower(),collected:false});
}
function activate(power) {
  if(power.id==="shield") game.shield=true;
  else game.powers[power.id]=power.seconds;
  burst(game.x,PY,power.color,18); announce(`${power.name.toUpperCase()}!`,power.color); sound(850,.17);
}
function collect(item) {
  item.collected=true;
  if(item.kind==="power") return activate(item.power);
  const amount = game.powers.double>0?2:1;
  game.coins+=amount; addEnergy(2); burst(laneX(item.lane),item.y,"#ffce63",8);
  data.daily.progress[0]=Math.min(missionData[0].goal, data.daily.progress[0]+amount);
  sound(790,.07);
}
function resolveCrash(wave) {
  if(game.powers.ghost>0) return;
  if(game.powers.fire>0){wave.damaged=true;addScore(wave.blocked.length*2);burst(game.x,PY,"#ff8c38",20);return;}
  if(game.shield){game.shield=false;wave.damaged=true;burst(game.x,PY,"#7cffa9",22);announce("SHIELD SAVED YOU!","#7effb5");return;}
  if(game.powers.gravity>0 && game.gravityCooldown<=0){
    const safe=[0,1,2,3].filter(i=>!wave.blocked.includes(i));
    if(safe.length){game.lane=safe.sort((a,b)=>Math.abs(a-game.lane)-Math.abs(b-game.lane))[0];game.x=laneX(game.lane);game.gravityCooldown=1.3;announce("GRAVITY SAVE!","#ba95ff");return;}
  }
  finish(false);
}
function update(dt) {
  if(game.mode!=="playing") return;
  resetDailyIfNeeded();
  game.t+=dt; game.rush=Math.max(0,game.rush-dt); game.gravityCooldown=Math.max(0,game.gravityCooldown-dt);
  for(const id of Object.keys(game.powers)) game.powers[id]=Math.max(0,game.powers[id]-dt);
  game.flash=Math.max(0,game.flash-dt);game.messageTimer=Math.max(0,game.messageTimer-dt);
  game.speed=Math.min(515,245 + game.t*2.1 + game.waves*1.9);
  const speed=game.speed*(game.powers.freeze>0?.4:1)*(game.rush>0?1.15:1);
  game.x+=(laneX(game.lane)-game.x)*Math.min(1,dt*22);
  game.spawn+=dt;
  const interval=Math.max(.57,1.18-game.waves*.004);
  if(game.spawn>=interval){game.spawn-=interval;newWave();}
  game.streak+=dt;
  if(game.streak>.035){game.streak=0;let color=trails.find(t=>t.id===data.trail)?.color||data.color;
    if(data.trail==="basic") color=balls.find(b=>b.id===data.ball)?.color||data.color;
    if(data.trail==="rainbow") color=`hsl(${(game.t*380)%360},100%,66%)`;
    game.particles.push({x:game.x+rand(-6,6),y:PY+15,vx:rand(-13,13),vy:rand(50,95),life:.33,max:.33,r:data.trail==="stardust"?3:rand(2,4),color});
  }
  for(const p of game.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}
  game.particles=game.particles.filter(p=>p.life>0).slice(-140);
  for(const wave of game.obstacles){
    wave.y+=speed*dt;
    if(wave.kind==="slider" && !wave.shifted && wave.y>210){
      wave.shifted=true;
      const dir=wave.blocked[0]<=1?1:-1;
      wave.blocked=[clamp(wave.blocked[0]+dir,0,3)];
    }
    if(!wave.damaged && Math.abs(wave.y-PY)<22 && wave.blocked.some(n=>Math.abs(game.x-laneX(n))<28)){
      resolveCrash(wave); if(game.mode!=="playing")return;
    }
    if(!wave.scored && wave.y>PY+34){
      wave.scored=true; game.waves++;addScore(1);addEnergy(4);
      data.daily.progress[1]=Math.max(data.daily.progress[1],Math.min(15,game.waves));
      if(wave.nearCandidate && !wave.damaged && !(game.powers.ghost>0 || game.powers.fire>0)){
        game.near++;addScore(3);addEnergy(16);
        data.daily.progress[2]=Math.min(4,data.daily.progress[2]+1);
        announce("CLOSE CALL +3","#ffdf6e");
      }
    }
  }
  for(const item of game.pickups){
    item.y+=speed*dt;
    const magnet=item.kind==="coin"&&(game.powers.magnet>0||game.powers.clone>0);
    if(!item.collected && Math.abs(item.y-PY)<23 && (magnet || Math.abs(game.x-laneX(item.lane))<27)) collect(item);
  }
  game.obstacles=game.obstacles.filter(w=>w.y<H+50);
  game.pickups=game.pickups.filter(p=>!p.collected&&p.y<H+50);
  refreshHud();
}
function finish(quit=false){
  if(game.mode!=="playing"&&game.mode!=="paused")return;
  game.mode="over";
  if(!quit){burst(game.x,PY,"#ff5c79",27);sound(175,.22);navigator.vibrate?.(65);}
  let bonus=0;
  if(game.score>data.best) data.best=game.score;
  for(const milestone of [100,250,500,1000]) if(data.best>=milestone&&!data.milestones.includes(milestone)){
    data.milestones.push(milestone);data.boxes++;bonus++;
  }
  data.wallet+=game.coins;
  if(game.score>0){data.runs.unshift({score:game.score,when:Date.now()});data.runs=data.runs.slice(0,100);}
  persist(); refreshHome();
  $("resultScore").textContent=game.score.toLocaleString();
  $("resultBest").textContent=data.best.toLocaleString();
  $("resultCoins").textContent=`+${game.coins}`;
  $("resultNear").textContent=game.near;
  $("resultMessage").textContent=quit?"Run ended. Your coins are saved.":game.score>=data.best?"NEW PERSONAL RECORD!":"Every run builds momentum.";
  $("earnedBox").classList.toggle("hidden",bonus===0);
  show("results");$("hud").classList.add("hidden");
}
function pause(){if(game.mode!=="playing")return;game.mode="paused";show("pauseScreen");}
function resume(){if(game.mode!=="paused")return;game.mode="playing";show("home");$("home").classList.add("hidden");$("hud").classList.remove("hidden");}

// --- SELF-CONTAINED CANVAS GRAPHICS: FAST TO LOAD, NO IMAGE REQUESTS ---
function rounded(x,y,w,h,r=8){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function background(){
  const road=roads.find(r=>r.id===data.road)||roads[0];
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,road.sky);sky.addColorStop(1,"#040814");ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  const scroll=(game.t*game.speed*(game.mode==="playing"?1:.3))%70;
  for(let j=-1;j<12;j++){
    const y=j*69+scroll;
    if(road.id==="coast"){
      ctx.fillStyle="#167c98";ctx.fillRect(0,y,34,65);ctx.fillRect(326,y,34,65);
      ctx.strokeStyle="#1eae8d";ctx.lineWidth=4;for(const x of [22,341]){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+4,y+30);ctx.stroke();}
    }else if(road.id==="ice"){
      ctx.fillStyle="#b8eefe";ctx.beginPath();ctx.moveTo(8,y+32);ctx.lineTo(26,y+2);ctx.lineTo(40,y+32);ctx.fill();ctx.beginPath();ctx.moveTo(330,y+40);ctx.lineTo(347,y+9);ctx.lineTo(357,y+40);ctx.fill();
    }else if(road.id==="cyber"){
      ctx.fillStyle=j%2?"#582ea1":"#22347d";ctx.fillRect(7,y,24,57);ctx.fillRect(329,y,22,52);ctx.fillStyle="#bd9bff";ctx.fillRect(12,y+10,6,11);ctx.fillRect(333,y+15,6,9);
    }else if(road.id==="inferno"){
      ctx.fillStyle=j%2?"#ec6423":"#ac2e14";ctx.beginPath();ctx.arc(16,y+20,12,0,Math.PI*2);ctx.arc(345,y+40,16,0,Math.PI*2);ctx.fill();
    }else if(road.id==="space"){
      ctx.fillStyle=j%2?"#c5b7ff":"#74d5ff";ctx.fillRect(19+(j*7)%16,y+18,2,2);ctx.fillRect(327+(j*9)%20,y+30,3,3);
    }else{
      ctx.fillStyle="#19436b";ctx.fillRect(12,y+13,18,32);ctx.fillRect(331,y+28,17,30);
      ctx.fillStyle="#36e2ff";ctx.fillRect(14,y+17,4,11);ctx.fillRect(337,y+32,4,12);
    }
  }
  ctx.fillStyle=road.base;ctx.fillRect(LEFT,0,RIGHT-LEFT,H);
  ctx.fillStyle="#06101a33";ctx.fillRect(LEFT+8,0,RIGHT-LEFT-16,H);
  ctx.save();ctx.shadowBlur=12;ctx.shadowColor=road.line;ctx.fillStyle=road.line;ctx.fillRect(LEFT,0,3,H);ctx.fillRect(RIGHT-3,0,3,H);ctx.restore();
  for(let x=1;x<4;x++) for(let y=scroll-70;y<H;y+=70){ctx.fillStyle=road.line+"88";rounded(LEFT+x*LANE_W-2,y,4,28,2);ctx.fill();}
}
function drawWaves(){
  for(const w of game.obstacles){
    if(w.damaged)continue;
    for(const n of w.blocked){const x=laneX(n);
      ctx.save();ctx.shadowBlur=10;ctx.shadowColor=w.kind==="laser"?"#ffc16c":"#ff4f69";
      ctx.fillStyle=w.kind==="laser"?"#ff9d40":"#fe3b67";
      rounded(x-27,w.y-14,54,28,6);ctx.fill();ctx.shadowBlur=0;
      ctx.fillStyle="#ffffff8a";rounded(x-21,w.y-9,42,4,2);ctx.fill();
      if(w.kind==="laser"){ctx.strokeStyle="#fff3a0";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-22,w.y+6);ctx.lineTo(x+22,w.y-6);ctx.stroke();}
      if(w.kind==="slider"){ctx.fillStyle="white";ctx.font="bold 17px system-ui";ctx.textAlign="center";ctx.fillText(n<=1?"→":"←",x,w.y+6);}
      ctx.restore();
    }
  }
}
function drawPickups(){
  for(const it of game.pickups){const x=laneX(it.lane),y=it.y,t=game.t;
    ctx.save();ctx.shadowBlur=17;
    const color=it.kind==="coin"?"#ffd34b":it.power.color;ctx.shadowColor=color;
    ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,13+Math.sin(t*6)*1.5,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;ctx.fillStyle=it.kind==="coin"?"#9d6b15":"#0c1630";
    ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="900 12px system-ui";
    ctx.fillText(it.kind==="coin"?"✦":it.power.symbol,x,y+1);ctx.restore();
  }
}
function drawParticles(){for(const p of game.particles){ctx.save();ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.restore();}}
function drawOrb(x,y,skin,alpha=1,scale=1){
  const now=game.t, color=skin.id==="basic"?data.color:skin.color;
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.globalAlpha=alpha;
  ctx.shadowColor=color;ctx.shadowBlur=22;
  const gradient=ctx.createRadialGradient(-6,-7,2,0,0,19);
  gradient.addColorStop(0,"#f6ffff");gradient.addColorStop(.32,color);gradient.addColorStop(1,skin.id==="blackhole"?"#03010b":"#0b1839");
  ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(0,0,16,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  if(skin.id==="inferno"){
    for(let k=0;k<5;k++){ctx.fillStyle=k%2?"#ffcc55":"#ff6a18";ctx.beginPath();const a=k*1.26+now*2;ctx.arc(Math.cos(a)*17,Math.sin(a)*17,rand(2.5,4),0,Math.PI*2);ctx.fill();}
    ctx.fillStyle="#ffdf80";ctx.beginPath();ctx.arc(-3,-4,6,0,Math.PI*2);ctx.fill();
  }else if(skin.id==="thunder"){
    ctx.strokeStyle="#d7faff";ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-4,-12);ctx.lineTo(3,-4);ctx.lineTo(-5,4);ctx.lineTo(5,12);ctx.stroke();
  }else if(skin.id==="galaxy"){
    ctx.fillStyle="#f9d4ff";for(let k=0;k<6;k++){const a=k*2.35+now*.5;ctx.fillRect(Math.cos(a)*10,Math.sin(a)*10,2,2);}
  }else if(skin.id==="crystal"){
    ctx.strokeStyle="#b3f6ff";ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(12,-5);ctx.lineTo(3,15);ctx.lineTo(-12,2);ctx.closePath();ctx.moveTo(0,-15);ctx.lineTo(3,15);ctx.moveTo(-12,2);ctx.lineTo(12,-5);ctx.stroke();
  }else if(skin.id==="toxic"){
    ctx.fillStyle="#d4ffba";for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(Math.sin(now*2+i)*9,Math.cos(now+i*2)*9,2+i%2,0,Math.PI*2);ctx.fill();}
  }else if(skin.id==="cyclops"){
    ctx.fillStyle="#dad6dc";ctx.beginPath();ctx.ellipse(0,0,12,8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#f69c28";ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fill();ctx.fillStyle="#2d1120";ctx.fillRect(-2,-6,4,12);
  }else if(skin.id==="blackhole"){
    ctx.fillStyle="#00020a";ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.fill();ctx.save();ctx.rotate(now*2);ctx.scale(1,.35);ctx.strokeStyle="#b887ff";ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,22,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  if(game.powers.ghost>0 && x===game.x){ctx.strokeStyle="#d8b9ff";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,21,0,Math.PI*2);ctx.stroke();}
  if(game.shield && x===game.x){ctx.strokeStyle="#70ffad";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,24,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
}
function render(){
  background();drawPickups();drawWaves();drawParticles();
  if(game.mode==="playing"||game.mode==="paused"){
    const ball=balls.find(b=>b.id===data.ball)||balls[0];
    if(game.powers.clone>0) for(let n=0;n<4;n++) if(n!==game.lane) drawOrb(laneX(n),PY,ball,.3,.75);
    drawOrb(game.x,PY,ball,game.powers.ghost>0?.45:1);
    if(game.rush>0){ctx.fillStyle="#fff0ab";ctx.textAlign="center";ctx.font="1000 20px system-ui";ctx.fillText("RUSH ×2",180,183);}
  }else{
    drawOrb(180,335,balls.find(b=>b.id===data.ball)||balls[0],.48,1.5);
  }
}
let last=performance.now();function frame(now){const dt=Math.min((now-last)/1000,.045);last=now;update(dt);render();requestAnimationFrame(frame);}
function resizeCanvas(){const ratio=Math.min(window.devicePixelRatio||1,2);canvas.width=W*ratio;canvas.height=H*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);}
resizeCanvas();requestAnimationFrame(frame);

// --- MENU, STORE, REWARDS AND LOCAL LEADERBOARDS ---
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt",">":"&gt",'"':"&quot;","'":"&#39;"})[c]);
function productCard(p,kind){
  const owned = data[`owned${kind}`].includes(p.id), selected = data[kind==="Balls"?"ball":kind==="Trails"?"trail":"road"]===p.id;
  let preview = kind==="Balls"?`<div class="orb-preview ${p.id}" style="--orb:${p.color}">${p.id==="basic"?"":p.icon}</div>`:kind==="Trails"?`<div class="orb-preview trail" style="--orb:${p.color}">${p.icon}</div>`:`<div class="orb-preview road" style="--orb:${p.color}">════</div>`;
  return `<article class="product ${selected?"equipped":""}">${preview}<div class="product-name">${p.name}</div><div class="detail">${p.desc}</div><button data-action="${owned?"equip":"buy"}" data-kind="${kind}" data-id="${p.id}" class="${owned?"owned":"buy"}" ${selected?"disabled":""}>${selected?"✓ EQUIPPED":owned?"EQUIP":`◈ ${p.price.toLocaleString()}`}</button></article>`;
}
function openPanel(name){
  resetDailyIfNeeded();activePanel=name;
  $("panelTitle").textContent=({garage:"GARAGE",shop:"NEON SHOP",missions:"DAILY MISSIONS",leaderboard:"RECORDS",boxes:"MYSTERY BOXES"})[name];
  game.mode="menu";refreshHome();drawPanel();show("panel");
}
function drawPanel(){
  const root=$("panelContent");$("panelWallet").textContent=`◈ ${data.wallet.toLocaleString()}`;
  if(activePanel==="garage"){
    const swatchColors=["#40d9ff","#ff509e","#ff5151","#ff9639","#ffdf54","#4eea6c","#bc7aff","#f6ffff","#191d29"];
    root.innerHTML=`<h3 class="section-title">FREE CLASSIC BALL COLORS</h3><p class="help">Your starting ball is blue. Every color is FREE — only specially designed ball skins cost coins.</p>
    <div class="swatches">${swatchColors.map(c=>`<button class="swatch ${data.color===c?"active":""}" data-action="color" data-color="${c}" style="background:${c}" aria-label="Choose ${c}"></button>`).join("")}</div>
    <div class="color-picker-line"><input id="freeColor" aria-label="Any ball color" type="color" value="${/^#[0-9a-fA-F]{6}$/.test(data.color)?data.color:"#40d9ff"}"><div><strong>Choose ANY color</strong><div class="muted">Free unlimited recoloring</div></div></div>
    <h3 class="section-title">YOUR BALLS</h3><div class="product-grid">${balls.filter(b=>data.ownedBalls.includes(b.id)).map(b=>productCard(b,"Balls")).join("")}</div>
    <h3 class="section-title">YOUR TRAILS</h3><div class="product-grid">${trails.filter(t=>data.ownedTrails.includes(t.id)).map(t=>productCard(t,"Trails")).join("")}</div>
    <h3 class="section-title">YOUR ROADS</h3><div class="product-grid">${roads.filter(r=>data.ownedRoads.includes(r.id)).map(r=>productCard(r,"Roads")).join("")}</div>`;
    $("freeColor").addEventListener("input",e=>{data.color=e.target.value;data.ball="basic";persist();refreshHome();});
  }else if(activePanel==="shop"){
    const tabs=[{id:"balls",label:"BALLS"},{id:"trails",label:"TRAILS"},{id:"roads",label:"ROADS"}];
    const items=shopTab==="balls"?balls:shopTab==="trails"?trails:roads;
    const kind=shopTab==="balls"?"Balls":shopTab==="trails"?"Trails":"Roads";
    root.innerHTML=`<p class="help">Earn coins in runs. Purchases unlock permanently; cosmetics never affect your score.</p><div class="tabs">${tabs.map(t=>`<button class="tab ${shopTab===t.id?"active":""}" data-action="shop-tab" data-id="${t.id}">${t.label}</button>`).join("")}</div><div class="product-grid">${items.map(item=>productCard(item,kind)).join("")}</div>`;
  }else if(activePanel==="missions"){
    const d=data.daily;
    root.innerHTML=`<p class="help">Three fresh missions per local calendar day. Claim rewards after finishing each task.</p>${missionData.map((m,i)=>{
      const value=clamp(d.progress[i]||0,0,m.goal),claimed=d.claimed[i];
      return `<div class="mission"><div class="mission-head"><strong>${m.text}</strong><span>◈ ${m.prize}</span></div><div class="bar"><div style="width:${value/m.goal*100}%"></div></div><div class="muted">${value} / ${m.goal}</div><button class="small-btn" data-action="claim" data-index="${i}" ${value<m.goal||claimed?"disabled":""}>${claimed?"✓ CLAIMED":value>=m.goal?"CLAIM REWARD":"IN PROGRESS"}</button></div>`;
    }).join("")}<div class="bonus-card"><strong>✦ DAILY COMPLETION BONUS</strong><p class="help">Claim all three mission rewards to unlock one free Mystery Box.</p><button class="small-btn" data-action="bonus" ${d.bonus||!d.claimed.every(Boolean)?"disabled":""}>${d.bonus?"✓ BONUS CLAIMED":"CLAIM MYSTERY BOX"}</button></div>`;
  }else if(activePanel==="leaderboard"){
    const tabs=["daily","weekly","alltime"];
    const now=new Date(),start=monday(now);
    const runs=(data.runs||[]).filter(r=>Number.isFinite(r.score)&&Number.isFinite(r.when) && (recordTab==="daily"?today()===(()=>{const date=new Date(r.when);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;})():recordTab==="weekly"?r.when>=start:true)).sort((a,b)=>b.score-a.score).slice(0,10);
    root.innerHTML=`<p class="help">These are REAL scores saved on this device. Worldwide leaderboards require a server and player accounts, which we'll add after the offline game is polished.</p><div class="tabs">${tabs.map(t=>`<button data-action="record-tab" data-id="${t}" class="tab ${recordTab===t?"active":""}">${t==="alltime"?"ALL-TIME":t.toUpperCase()}</button>`).join("")}</div><h3 class="section-title">YOUR TOP RUNS</h3>${runs.length?runs.map((r,i)=>`<div class="leader-row"><span>${i===0?"♛":`#${i+1}`} &nbsp; YOUR RUN <span class="muted">${new Date(r.when).toLocaleDateString()}</span></span><strong>${r.score.toLocaleString()}</strong></div>`).join(""):`<div class="note-card">No runs in this period yet. Play to set a record!</div>`}<div class="note-card">🏆 Personal best: <b>${data.best.toLocaleString()}</b><br>Online global rankings are not simulated or fabricated.</div>`;
  }else if(activePanel==="boxes"){
    root.innerHTML=`<div class="chest-card"><div class="chest">🎁</div><h3>MYSTERY BOX</h3><div class="help">AVAILABLE: <strong>${data.boxes}</strong></div><button class="cta" data-action="open-box" ${data.boxes<1?"disabled":""}>OPEN ONE BOX ✦</button><p class="muted">Earn one for completing all daily missions, or reach personal-best milestones of 100, 250, 500, and 1,000.</p></div><h3 class="section-title">TRANSPARENT DROP ODDS</h3><div class="note-card odds">🟡 55% — 50–125 coins<br>🔵 30% — Common trail cosmetic<br>🟣 12% — Rare ball cosmetic<br>🌟 3% — Legendary Black Hole ball<br><br>Duplicate cosmetics convert into coins. No real-money box purchases.</div>`;
  }
}
function getCollection(kind){return kind==="Balls"?balls:kind==="Trails"?trails:roads;}
function buyOrEquip(kind,id,action){
  if(!["Balls","Trails","Roads"].includes(kind))return;
  const item=getCollection(kind).find(p=>p.id===id);if(!item)return;
  const key=`owned${kind}`,slot=kind==="Balls"?"ball":kind==="Trails"?"trail":"road";
  if(action==="buy"){
    if(data[key].includes(id))return;
    if(data.wallet<item.price){toast("Not enough coins — play another run!");return;}
    data.wallet-=item.price;data[key].push(id);sound(740,.16);toast(`UNLOCKED: ${item.name}!`);
  }
  if(!data[key].includes(id))return;
  data[slot]=id;persist();refreshHome();drawPanel();
}
function getBox(){
  if(data.boxes<1)return;
  data.boxes--;
  const r=Math.random()*100;
  if(r<55){const coins=50+Math.floor(Math.random()*76);data.wallet+=coins;toast(`BOX REWARD: +${coins} COINS!`);}
  else {
    let chosen,kind,refund;
    if(r<85){kind="Trails";chosen=pick(trails.filter(t=>t.id!=="basic"));refund=75;}
    else if(r<97){kind="Balls";chosen=pick(balls.filter(b=>["inferno","thunder","galaxy","crystal","toxic","cyclops"].includes(b.id)));refund=180;}
    else{kind="Balls";chosen=balls.find(b=>b.id==="blackhole");refund=600;}
    if(data[`owned${kind}`].includes(chosen.id)){data.wallet+=refund;toast(`DUPLICATE → +${refund} COINS`);}
    else{data[`owned${kind}`].push(chosen.id);toast(`NEW ${kind.toUpperCase()}: ${chosen.name}!`);}
  }
  sound(940,.2);persist();drawPanel();
}
$("panelContent").addEventListener("click",e=>{
  const btn=e.target.closest("[data-action]");if(!btn)return;
  const a=btn.dataset.action;
  if(a==="shop-tab"){shopTab=btn.dataset.id;drawPanel();}
  if(a==="record-tab"){recordTab=btn.dataset.id;drawPanel();}
  if(a==="buy"||a==="equip")buyOrEquip(btn.dataset.kind,btn.dataset.id,a);
  if(a==="color"){data.color=btn.dataset.color;data.ball="basic";persist();refreshHome();drawPanel();}
  if(a==="claim"){
    const i=Number(btn.dataset.index),mission=missionData[i];
    if(!mission||data.daily.claimed[i]||data.daily.progress[i]<mission.goal)return;
    data.daily.claimed[i]=true;data.wallet+=mission.prize;persist();toast(`+${mission.prize} COINS CLAIMED!`);drawPanel();
  }
  if(a==="bonus"){
    if(data.daily.bonus||!data.daily.claimed.every(Boolean))return;
    data.daily.bonus=true;data.boxes++;persist();toast("YOU EARNED A MYSTERY BOX!");drawPanel();
  }
  if(a==="open-box")getBox();
});
$("playBtn").addEventListener("click",start);$("againBtn").addEventListener("click",start);
$("pauseBtn").addEventListener("click",pause);$("resumeBtn").addEventListener("click",resume);
$("quitBtn").addEventListener("click",()=>finish(true));
$("homeBtn").addEventListener("click",()=>{game.mode="menu";refreshHome();show("home");});
$("backBtn").addEventListener("click",()=>{game.mode="menu";refreshHome();show("home");});
$("soundBtn").addEventListener("click",()=>{data.sound=!data.sound;persist();refreshHome();if(data.sound)sound(600);});
document.querySelectorAll("[data-screen]").forEach(b=>b.addEventListener("click",()=>openPanel(b.dataset.screen)));
canvas.addEventListener("pointerdown",e=>{
  if(game.mode!=="playing")return;e.preventDefault();
  const rect=canvas.getBoundingClientRect();const x=(e.clientX-rect.left)/rect.width;
  move(x<.5?-1:1);
});
window.addEventListener("keydown",e=>{
  if(["Space","ArrowLeft","ArrowRight","KeyA","KeyD","Escape"].includes(e.code)) e.preventDefault();
  if(e.repeat)return;
  if(e.code==="ArrowLeft"||e.code==="KeyA")move(-1);
  if(e.code==="ArrowRight"||e.code==="KeyD"||e.code==="Space")move(1);
  if(e.code==="Escape")game.mode==="playing"?pause():game.mode==="paused"?resume():null;
});
document.addEventListener("visibilitychange",()=>{if(document.hidden && game.mode==="playing")pause();});
refreshHome();show("home");
