const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const esbuild=require('esbuild');
function load(path){
 const code=esbuild.buildSync({entryPoints:[path],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
 const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,require});return module.exports;
}
const {GameState}=load('src/game/GameState.ts');
const {segmentHit,relativeHit}=load('src/game/geometry.ts');
const {GameController}=load('src/game/GameController.ts');
const {CombatSystem}=load('src/game/CombatSystem.ts');
function fixture(){
 const keys=new Set(), calls=[];let drawOrder=0;
 const objects={};
 for(const name of ['Player','TestEnemy','Wall','Projectile','ProjectileGuide','TimeFragment','Exit','HowToControl','HeroVisual','TutorialText','TutorialText2','TutorialText3','TutorialText4','CombatFx','CombatMarker','ArenaFloor','ActorShadow','WallFace','WorldProp']){
  const instances=[];
  objects[name]={getFirstInstance:()=>instances[0]??null,getAllInstances:()=>[...instances],createInstance:(_,x,y)=>make(name,x,y),instances};
 }
 function make(name,x,y,width=28,height=28){
  const o={x,y,width,height,angle:0,dt:1/60,timeScale:1,opacity:1,isVisible:true,htmlContent:'',events:{},addEventListener(name,cb){this.events[name]=cb;},animationSpeed:0,animationFrame:0,setAnimation(name){this.animationName=name;},moveToTop(){this.drawOrder=++drawOrder;},moveToBottom(){this.drawOrder=-1;},behaviors:{},destroy(){const a=objects[name].instances;a.splice(a.indexOf(o),1);}};
  if(name==='TestEnemy')o.behaviors['Синусоида']={phase:0,value:0};
  objects[name].instances.push(o);return o;
 }
 const p=make('Player',140,360);
 const move=p.behaviors['8Направлений']={vectorX:0,vectorY:0,isEnabled:true,maxSpeed:220,acceleration:1800,deceleration:1800,simulateControl(c){calls.push(c);}};
 const enemy=make('TestEnemy',620,360,32,32);enemy.behaviors['Синусоида']={phase:0,value:0};
 const exit=make('Exit',1100,360,48,72);
 make('HeroVisual',140,360,64,64);make('HowToControl',16,16);
 for(const name of ['TutorialText','TutorialText2','TutorialText3','TutorialText4'])make(name,0,0);make('TimeFragment',420,180,24,24);make('TimeFragment',900,540,24,24);
 const runtime={objects,keyboard:{isKeyDown:c=>keys.has(c)},timeScale:1,dtRaw:1/60,layout:{name:'Макет 1'},goToLayout:n=>calls.push(n),addEventListener(){}};
 return {runtime,p,get enemy(){return objects.TestEnemy.getFirstInstance();},exit,keys,calls,move,make};
}
function defeatAll(f,g){
 let attempts=0;
 while(f.runtime.objects.TestEnemy.getFirstInstance() && attempts++<30){
  const enemy=f.runtime.objects.TestEnemy.getFirstInstance();f.p.x=enemy.x-65;f.p.y=enemy.y;f.keys.clear();f.keys.add('KeyD');
  g.attack();g.beforeTick();g.tick();
  for(let i=0;i<28;i++){g.beforeTick();g.tick();}
 }
 assert.equal(g.state.status,'playing');assert.equal(g.state.enemiesRemaining,0);
}
test('3 HP, world-time invulnerability, loss and terminal guard',()=>{
 const s=new GameState();s.damage();s.damage();assert.equal(s.hp,2);s.update(0);s.damage();assert.equal(s.hp,2);
 s.update(1);s.damage();s.update(1);s.damage();assert.equal(s.hp,0);assert.equal(s.status,'lost');s.collect();s.exit();assert.equal(s.status,'lost');assert.equal(s.fragments,0);
});
test('exit locked at zero and one fragment, wins only after two',()=>{
 const s=new GameState();s.exit();assert.equal(s.status,'playing');s.collect();s.exit();assert.equal(s.status,'playing');s.collect();s.exit();assert.equal(s.status,'won');s.damage();assert.equal(s.hp,3);
});
test('swept geometry catches dash crossing, stationary overlap and misses',()=>{
 const box={x:50,y:50,width:10,height:10};assert.equal(segmentHit({x:0,y:50},{x:100,y:50},box),0.45);
 assert.equal(segmentHit({x:50,y:50},{x:50,y:50},box),0);assert.equal(segmentHit({x:0,y:0},{x:100,y:0},box),null);
 assert.notEqual(relativeHit({x:100,y:0},{x:0,y:0},{x:0,y:0},{x:100,y:0,width:28,height:28},{width:12,height:12}),null);
});
test('start is frozen and speculative native Sine movement/phase rolls back',()=>{
 const f=fixture(),g=new GameController(f.runtime);g.beforeTick();f.enemy.x+=4;f.enemy.behaviors['Синусоида'].phase+=0.1;g.tick();
 assert.equal(f.runtime.timeScale,0);assert.equal(f.enemy.x,620);assert.equal(f.enemy.behaviors['Синусоида'].phase,0);
});
test('actual displacement resumes time, pushing wall without displacement freezes it',()=>{
 const f=fixture(),g=new GameController(f.runtime);f.keys.add('KeyD');g.beforeTick();assert.ok(f.calls.includes('right'));f.p.x+=2;g.tick();assert.equal(f.runtime.timeScale,1);
 g.beforeTick();f.enemy.x+=4;g.tick();assert.equal(f.runtime.timeScale,0);assert.equal(f.enemy.x,620);
});
test('diagonal dash is normalized, constant speed, cooldown uses player time',()=>{
 const f=fixture(),g=new GameController(f.runtime);f.keys.add('Space');f.keys.add('KeyW');f.keys.add('KeyD');g.beforeTick();
 assert.ok(Math.abs(Math.hypot(f.move.vectorX,f.move.vectorY)-700)<1e-8);assert.equal(f.move.deceleration,0);
 for(let i=0;i<8;i++){g.tick();g.beforeTick();}assert.equal(f.move.maxSpeed,700);
 for(let i=0;i<35;i++){g.tick();g.beforeTick();}assert.equal(f.move.maxSpeed,220); // held Space cannot retrigger
 f.keys.delete('Space');g.tick();g.beforeTick();f.keys.add('Space');g.tick();g.beforeTick();assert.equal(f.move.maxSpeed,700);
});
test('projectiles aim toward player; no shooting or bullet movement during freeze',()=>{
 const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s);
 c.update(1,{...f.p});let b=f.runtime.objects.Projectile.getFirstInstance();assert.ok(b);const oldX=b.x;
 for(let i=0;i<600;i++)c.update(0,{...f.p});assert.equal(b.x,oldX);assert.equal(f.runtime.objects.Projectile.instances.length,1);
 c.update(.1,{...f.p});assert.ok(b.x<oldX);assert.equal(b.y,360);
});
test('walking/dashing through a frozen bullet hurts and consumes it',()=>{
 const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s);c.update(1,{...f.p});
 f.p.x=700;c.update(0,{x:500,y:360});assert.equal(s.hp,2);assert.equal(f.runtime.objects.Projectile.instances.length,0);
});
test('wall intercepts a bullet before it can damage the player',()=>{
 const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s);f.make('Wall',500,360,28,140);c.update(1,{...f.p});c.update(3,{...f.p});assert.equal(s.hp,3);assert.equal(f.runtime.objects.Projectile.instances.length,0); // no damage through cover, current shot consumed
});
test('projectile segment hits moving player, not just final endpoints',()=>{
 const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s);c.update(1,{...f.p});c.update(3,{...f.p});assert.equal(s.hp,2);
});
test('standing next to a stationary enemy does not cause passive damage',()=>{
 const f=fixture(),g=new GameController(f.runtime);f.p.x=620;g.beforeTick();g.tick();assert.equal(g.state.hp,3);g.beforeTick();g.tick();assert.equal(g.state.hp,3);
});
test('exit stays locked until combat is cleared, then fragments and exit complete the room',()=>{
 const f=fixture(),g=new GameController(f.runtime);
 f.p.x=1100;f.p.y=360;g.beforeTick();g.tick();assert.equal(g.state.status,'playing');
 defeatAll(f,g);
 for(const [x,y] of [[420,180],[900,540],[1100,360]]){g.beforeTick();f.p.x=x;f.p.y=y;g.tick();}
 assert.equal(g.state.fragments,2);assert.equal(f.runtime.objects.TimeFragment.instances.length,0);assert.equal(f.exit.opacity,1);assert.equal(g.state.status,'won');assert.equal(f.move.isEnabled,false);assert.equal(f.runtime.timeScale,0);
});
test('R reloads from frozen, won and lost; holding R does not reload twice',()=>{
 for(const status of ['playing','won','lost']){const f=fixture(),g=new GameController(f.runtime);g.state.status=status;f.keys.add('KeyR');g.beforeTick();g.tick();g.beforeTick();assert.equal(f.calls.filter(c=>c==='Макет 1').length,1);}
});
test('compiled entry registers one listener pair, creates fresh game on every reload',()=>{
 const f=fixture(),listeners={};f.runtime.layout.name='Tutorial';f.runtime.addEventListener=(n,cb)=>(listeners[n]??=[]).push(cb);
 vm.runInNewContext(esbuild.transformSync(fs.readFileSync('scripts/main.js','utf8'),{format:'cjs'}).code,{module:{exports:{}},exports:{},runOnStartup:cb=>cb(f.runtime)});
 for(let i=0;i<4;i++){listeners.beforeanylayoutstart[0]();listeners.pretick[0]();listeners.tick[0]();}
 assert.equal(listeners.pretick.length,1);assert.equal(listeners.tick.length,1);assert.match(f.runtime.objects.HowToControl.getFirstInstance().htmlContent,/Здоровье 3 из 3/);
});
test('project references, assets, UID/SID, two layers and Free footprint',()=>{
 const p=JSON.parse(fs.readFileSync('project.c3proj'));
 assert.deepEqual(p.layouts.items,["Tutorial","Макет 1"]);assert.equal(p.firstLayout,"Tutorial");assert.equal(p.rootFileFolders.script.items.length,1);
 const layout=JSON.parse(fs.readFileSync('layouts/Макет 1.json'));assert.equal(layout.layers.length,2);
 const instances=layout.layers.flatMap(l=>l.instances);assert.equal(instances.filter(o=>o.type==='TimeFragment').length,2);
 assert.equal(new Set(instances.map(o=>o.uid)).size,instances.length);assert.equal(new Set(instances.map(o=>o.sid)).size,instances.length);
 for(const name of p.objectTypes.items){const t=JSON.parse(fs.readFileSync(`objectTypes/${name}.json`));for(const a of t.animations?.items??[])for(let i=0;i<a.frames.length;i++)assert.ok(fs.existsSync(`images/${name.toLowerCase()}-${a.name.toLowerCase()}-${String(i).padStart(3,'0')}.png`));}
 assert.equal(JSON.parse(fs.readFileSync('eventSheets/Список событий 1.json')).events.length,0);
 assert.ok(fs.readFileSync('scripts/main.js','utf8').split('\n').length<=250);
 assert.ok(instances.find(o=>o.type==='Player').behaviors['СледитьЗа']);assert.ok(instances.find(o=>o.type==='TestEnemy').behaviors['Синусоида']);
});
test('first prototype source: movement/dash and global time stop exist, no game loop',()=>{
 const read=p=>fs.readFileSync(`tests/fixtures/prototype1/${p}`,'utf8');
 assert.match(read('src/player/PlayerController.ts'),/simulateControl/);assert.match(read('src/player/PlayerController.ts'),/dashTime = 0.15/);
 assert.match(read('src/systems/TimeController.ts'),/isMoving \? 1 : 0/);assert.equal(JSON.parse(read('eventSheets/Список событий 1.json')).events.length,0);
 assert.doesNotMatch(read('src/main.ts'),/Combat|GameState/);
});

test('first prototype controllers execute WASD/dash and movement-based time stop',()=>{
 const read=p=>fs.readFileSync(`tests/fixtures/prototype1/${p}`,'utf8');
 const baseline=p=>{const module={exports:{}};vm.runInNewContext(esbuild.transformSync(read(p),{loader:'ts',format:'cjs'}).code,{module,exports:module.exports});return module.exports;};
 const f=fixture(),Player=baseline('src/player/PlayerController.ts').PlayerController,Time=baseline('src/systems/TimeController.ts').TimeController;
 const controller=new Player(f.runtime),time=new Time(f.runtime);f.keys.add('KeyD');controller.update();assert.ok(f.calls.includes('right'));
 f.keys.add('Space');controller.update();assert.equal(f.move.maxSpeed,700);assert.equal(f.move.vectorX,700);
 time.update();time.update();assert.equal(f.runtime.timeScale,0);assert.equal(f.p.timeScale,1);f.p.x++;time.update();assert.equal(f.runtime.timeScale,1);
});
test('native Sine offset commits while moving and stays stable across repeated freezes',()=>{
 const f=fixture(),g=new GameController(f.runtime);g.beforeTick();f.p.x++;f.enemy.behaviors['Синусоида'].value=10;g.tick();assert.ok(f.enemy.x>620 && f.enemy.x<=620+80/60);const heldX=f.enemy.x;
 for(let i=0;i<100;i++){g.beforeTick();f.enemy.behaviors['Синусоида'].value=20;f.enemy.behaviors['Синусоида'].phase+=.1;g.tick();}
 assert.equal(f.enemy.x,heldX);assert.equal(f.enemy.behaviors['Синусоида'].phase,0);
});

test('shot direction and animated frame freeze with no post-launch trajectory lines',()=>{
 const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s);c.update(1,{...f.p});
 const b=f.runtime.objects.Projectile.getFirstInstance();assert.equal(b.angle,Math.PI);assert.equal(b.animationName,'Arrow');
 assert.equal(f.runtime.objects.ProjectileGuide.instances.length,0);const old=[b.x,b.y,b.animationFrame];c.update(0,{...f.p});assert.deepEqual([b.x,b.y,b.animationFrame],old);
 c.update(.1,{...f.p});assert.notEqual(b.animationFrame,old[2]);assert.ok(b.x<old[0]);
});
test('filled pre-shot warning disappears at release instead of following the projectile',()=>{
 const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s);c.update(.45,{...f.p});const m=c.enemies[0].marker;
 assert.equal(m.isVisible,true);assert.equal(m.animationName,'Lane');assert.ok(m.height>=20);assert.ok(m.width>300);
 const old=[m.x,m.y,m.width,m.opacity];c.update(0,{...f.p});assert.deepEqual([m.x,m.y,m.width,m.opacity],old);
 c.update(.55,{...f.p});assert.equal(m.isVisible,false);assert.equal(f.runtime.objects.Projectile.instances.length,1);
});

const {TutorialController}=load('src/game/TutorialController.ts');
const {HeroAnimator}=load('src/player/HeroAnimator.ts');
test('tutorial needs movement, real stop and moving dash; Space cannot skip steps',()=>{
 const f=fixture(),t=new TutorialController(f.runtime),visible=()=>['TutorialText','TutorialText2','TutorialText3','TutorialText4'].map(n=>f.runtime.objects[n].getFirstInstance().isVisible);
 f.keys.add('Space');t.update(0,1,true,true);assert.deepEqual(visible(),[true,false,false,false]);
 t.update(40,1/60,false,true);assert.deepEqual(visible(),[false,true,false,false]);
 t.update(0,.19,false,true);assert.equal(t.readyForObjective,false);t.update(0,.02,false,true);assert.deepEqual(visible(),[false,false,true,false]);
 t.update(0,1,true,true);assert.equal(t.readyForObjective,false);t.update(10,1/60,true,true);assert.equal(t.readyForObjective,true);assert.deepEqual(visible(),[false,false,false,true]);
 t.update(0,0,false,false);assert.deepEqual(visible(),[false,false,false,false]);
});
test('tutorial guards pickups and damage before training; win -> Enter -> arena, R stays on current layout',()=>{
 const f=fixture();f.runtime.layout.name='Tutorial';const g=new GameController(f.runtime);
 g.beforeTick();f.p.x=420;f.p.y=180;g.tick();assert.equal(g.state.fragments,0);
 for(let i=0;i<14;i++){g.beforeTick();g.tick();}
 f.keys.add('Space');f.keys.add('KeyD');g.beforeTick();f.p.x+=10;g.tick();
 assert.equal(f.runtime.objects.TutorialText4.getFirstInstance().isVisible,true);
 assert.equal(g.state.fragments,1); // dash ended within the first fragment's pickup area
 g.beforeTick();f.p.x=900;f.p.y=540;g.tick();assert.equal(g.state.fragments,2);
 g.beforeTick();f.p.x=420;f.p.y=180;g.tick();assert.equal(g.state.fragments,2);
 defeatAll(f,g);
 g.beforeTick();f.p.x=1100;f.p.y=360;g.tick();assert.equal(g.state.status,'won');
 assert.match(f.runtime.objects.HowToControl.getFirstInstance().htmlContent,/ENTER/);
 f.keys.add('Enter');g.beforeTick();assert.ok(f.calls.includes('Макет 1'));
});
test('Enter cannot skip an unfinished tutorial and R creates a fresh tutorial',()=>{
 const f=fixture();f.runtime.layout.name='Tutorial';let g=new GameController(f.runtime);f.keys.add('Enter');g.beforeTick();assert.equal(f.calls.includes('Макет 1'),false);
 f.keys.add('KeyR');g.beforeTick();assert.ok(f.calls.includes('Tutorial'));
 g=new GameController(f.runtime);assert.equal(g.state.hp,3);assert.equal(g.state.fragments,0);assert.equal(f.runtime.objects.TutorialText.getFirstInstance().isVisible,true);
});
test('hero faces four directions, plays five attack frames and keeps collider size',()=>{
 const f=fixture(),h=new HeroAnimator(f.runtime),visual=f.runtime.objects.HeroVisual.getFirstInstance();
 for(const [key,dir] of [['KeyW','Up'],['KeyD','Right'],['KeyA','Left'],['KeyS','Down']]){f.keys.clear();f.keys.add(key);h.update(true);assert.equal(visual.animationName,'Idle'+dir);}
 h.requestAttack();h.update(true);assert.equal(visual.animationName,'AttackDown');assert.equal(visual.animationFrame,0);
 const frames=new Set([0]);for(let i=0;i<32;i++){h.update(true);frames.add(visual.animationFrame);}assert.deepEqual([...frames].sort(),[0,1,2,3,4]);
 h.update(true);assert.equal(visual.animationName,'IdleDown');assert.equal(f.p.width,28);assert.equal(f.p.height,28);assert.equal(f.p.isVisible,false);
});
test('hero attack preview runs during world pause but freezes on terminal screen',()=>{
 const f=fixture(),h=new HeroAnimator(f.runtime),v=f.runtime.objects.HeroVisual.getFirstInstance();f.runtime.timeScale=0;h.requestAttack();h.update(true);
 for(let i=0;i<7;i++)h.update(true);assert.ok(v.animationFrame>0);const frame=v.animationFrame;for(let i=0;i<60;i++)h.update(false);assert.equal(v.animationFrame,frame);
});
test('compiled entry safely ignores a layout without gameplay instances',()=>{
 const listeners={},empty={getFirstInstance:()=>null,getAllInstances:()=>[]};const runtime={layout:{name:'Tutorial'},objects:new Proxy({},{get:()=>empty}),addEventListener:(n,cb)=>listeners[n]=cb};
 vm.runInNewContext(esbuild.transformSync(fs.readFileSync('scripts/main.js','utf8'),{format:'cjs'}).code,{module:{exports:{}},exports:{},runOnStartup:cb=>cb(runtime)});
 assert.doesNotThrow(()=>{listeners.beforeanylayoutstart();listeners.pretick();listeners.tick();});
});
test('both playable layouts have consistent hero/logic instances, unique IDs and no legacy tutorial events',()=>{
 const uids=new Set(),sids=new Set();for(const name of ['Tutorial','Макет 1']){
 const l=JSON.parse(fs.readFileSync(`layouts/${name}.json`));assert.equal(l.layers.length,2);const instances=l.layers.flatMap(l=>l.instances);
 for(const type of ['HeroVisual','Player','TestEnemy','Exit','HowToControl'])assert.equal(instances.filter(i=>i.type===type).length,1);
 const player=instances.find(i=>i.type==='Player');assert.equal(player.properties['initially-visible'],false);assert.equal(player.world.width,28);
 for(const i of instances){assert.ok(!uids.has(i.uid));uids.add(i.uid);assert.ok(!sids.has(i.sid));sids.add(i.sid);}
 }assert.equal(JSON.parse(fs.readFileSync('eventSheets/TutorialEvents.json')).events.length,0);
});

test('left click triggers one attack, right click does not, handlers stay single across restarts',()=>{
 const f=fixture(),listeners={};f.runtime.layout.name='Tutorial';f.runtime.addEventListener=(n,cb)=>(listeners[n]??=[]).push(cb);
 vm.runInNewContext(esbuild.transformSync(fs.readFileSync('scripts/main.js','utf8'),{format:'cjs'}).code,{module:{exports:{}},exports:{},runOnStartup:cb=>cb(f.runtime)});
 for(let i=0;i<5;i++)listeners.beforeanylayoutstart[0]();assert.equal(listeners.pointerdown.length,1);
 f.runtime.objects.HowToControl.getFirstInstance().events.click({targetId:'start'});listeners.beforeanylayoutstart[0]();
 const v=f.runtime.objects.HeroVisual.getFirstInstance();listeners.pointerdown[0]({button:2});listeners.pretick[0]();listeners.tick[0]();assert.equal(v.animationName,'IdleDown');
 listeners.pointerdown[0]({button:0});listeners.pretick[0]();listeners.tick[0]();assert.equal(v.animationName,'AttackDown');
 for(let i=0;i<35;i++){listeners.pretick[0]();listeners.tick[0]();}assert.equal(v.animationName,'IdleDown');
});

test('fresh preview of the arena always routes to Tutorial once, then allows the arena',()=>{
 const f=fixture(),listeners={};f.runtime.addEventListener=(n,cb)=>listeners[n]=cb;
 vm.runInNewContext(esbuild.transformSync(fs.readFileSync('scripts/main.js','utf8'),{format:'cjs'}).code,{module:{exports:{}},exports:{},runOnStartup:cb=>cb(f.runtime)});
 listeners.beforeanylayoutstart();assert.deepEqual(f.calls,['Tutorial']);listeners.pretick();listeners.tick();
 f.runtime.layout.name='Tutorial';listeners.beforeanylayoutstart();listeners.pretick();listeners.tick();
 f.runtime.layout.name='Макет 1';listeners.beforeanylayoutstart();listeners.pretick();listeners.tick();
 assert.equal(f.calls.filter(x=>x==='Tutorial').length,1);
});
test('H opens Tutorial from playing, won or lost arena, once per press',()=>{
 for(const status of ['playing','won','lost']){const f=fixture(),g=new GameController(f.runtime);g.state.status=status;f.keys.add('KeyH');g.beforeTick();g.beforeTick();assert.equal(f.calls.filter(x=>x==='Tutorial').length,1);}
});
test('hero switches Idle/Walk on actual motion, cycles all frames, and freezes the current pose at terminal',()=>{
 const f=fixture(),h=new HeroAnimator(f.runtime),v=f.runtime.objects.HeroVisual.getFirstInstance();
 for(const [key,dir] of [['KeyW','Up'],['KeyD','Right'],['KeyA','Left'],['KeyS','Down']]){
  f.keys.clear();f.keys.add(key);h.update(true,true);assert.equal(v.animationName,'Walk'+dir);
  const frames=new Set();for(let i=0;i<35;i++){h.update(true,true);frames.add(v.animationFrame);}assert.deepEqual([...frames].sort(),[0,1,2,3]);
  h.update(true,false);assert.equal(v.animationName,'Idle'+dir);
 }
 const frames=new Set();for(let i=0;i<75;i++){h.update(true,false);frames.add(v.animationFrame);}assert.deepEqual([...frames],[0]);
 const pose=[v.animationName,v.animationFrame];for(let i=0;i<60;i++)h.update(false);assert.deepEqual([v.animationName,v.animationFrame],pose);
});

test('generated locomotion is separate from original art, with complete four-frame loops and valid origins',()=>{
 const object=JSON.parse(fs.readFileSync('objectTypes/HeroVisual.json'));
 for(const direction of ['Up','Down','Left','Right']){
  assert.equal(object.animations.items.find(a=>a.name==='Attack'+direction).frames.length,5);
  assert.equal(object.animations.items.find(a=>a.name==='Idle'+direction).frames.length,1);
  for(const kind of ['Breathe','Walk']){
   const anim=object.animations.items.find(a=>a.name===kind+direction);assert.equal(anim.frames.length,4);assert.equal(anim.isLooping,true);
   for(const f of anim.frames){assert.equal(f.width,64);assert.equal(f.height,64);assert.ok(f.originX>0&&f.originX<1);assert.ok(f.originY>0&&f.originY<1);}
  }
 }
});

const {PlayerActions}=load('src/combat/PlayerActions.ts');
const {Campaign,ROOMS}=load('src/game/Rooms.ts');
test('attacking while standing advances world time, rate-limits clicks, and returns to freeze',()=>{
 const f=fixture(),g=new GameController(f.runtime);g.attack();g.beforeTick();g.tick();assert.equal(f.runtime.timeScale,1);assert.equal(g.state.attacks,1);
 for(let i=0;i<3;i++){g.attack();g.beforeTick();g.tick();}assert.equal(g.state.attacks,1);
 for(let i=0;i<25;i++){g.beforeTick();g.tick();}assert.equal(f.runtime.timeScale,0);
});
test('melee applies cone/range and wall occlusion; kills remove enemies and unlock the combat gate',()=>{
 const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s);
 c.strike({x:560,y:360},Math.PI);assert.equal(c.enemies[0].hp,2);
 const wall=f.make('Wall',590,360,10,100);c.strike({x:560,y:360},0);assert.equal(c.enemies[0].hp,2);wall.destroy();
 c.strike({x:560,y:360},0);assert.equal(c.enemies[0].hp,1);c.strike({x:560,y:360},0);assert.equal(s.kills,1);assert.equal(s.enemiesRemaining,0);assert.equal(f.runtime.objects.TestEnemy.getAllInstances().length,0);
 assert.doesNotThrow(()=>c.update(.1,{...f.p}));
});
test('melee deflects a frozen projectile before it reaches the player',()=>{
 const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s);c.update(1,{...f.p});assert.equal(f.runtime.objects.Projectile.instances.length,1);
 c.strike({x:560,y:360},0);assert.equal(f.runtime.objects.Projectile.instances.length,0);assert.equal(f.runtime.objects.ProjectileGuide.instances.length,0);assert.equal(s.deflected,1);
});
test('pulse has one charge, clears local bullets, cannot repeat empty, and a kill restores one charge',()=>{
 const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s);c.update(1,{...f.p});c.pulse({x:560,y:360});assert.equal(s.pulses,1);assert.equal(s.pulseCharge,0);assert.equal(f.runtime.objects.Projectile.instances.length,0);assert.equal(c.enemies[0].hp,1);
 c.pulse({x:560,y:360});assert.equal(s.pulses,1);c.strike({x:560,y:360},0);assert.equal(s.pulseCharge,1);
});
test('E is edge-triggered and resumes time, holding does not spend another restored charge',()=>{
 const f=fixture(),g=new GameController(f.runtime);f.keys.add('KeyE');g.beforeTick();g.tick();assert.equal(g.state.pulses,1);assert.equal(f.runtime.timeScale,1);
 g.state.pulseCharge=1;for(let i=0;i<30;i++){g.beforeTick();g.tick();}assert.equal(g.state.pulses,1);assert.equal(g.state.pulseCharge,1);
});
test('hunter is blocked by cover even on a large step and freezes when world dt is zero',()=>{
 const f=fixture(),s=new GameState(),room={...ROOMS[0],enemies:[{kind:'hunter',x:140,y:360,hp:2}]},c=new CombatSystem(f.runtime,s,room);f.p.x=400;f.make('Wall',200,360,20,200);
 c.update(1,{...f.p});const e=c.enemies[0],x=e.sprite.x,t=e.timer;assert.ok(x<172);
 for(let i=0;i<300;i++)c.update(0,{...f.p});assert.equal(e.sprite.x,x);assert.equal(e.timer,t);
});
test('Bloom Warden cycles sweep, petal fan, and targeted blooms; phase two expands the bloom pattern',()=>{
 const f=fixture(),s=new GameState(),room={...ROOMS[2],enemies:[{kind:'warden',x:620,y:360,hp:8}]},c=new CombatSystem(f.runtime,s,room);
 c.update(1.5,{...f.p});assert.equal(c.enemies[0].marker.animationName,'Sweep');assert.equal(c.enemies[0].marker.isVisible,true);
 const time=c.enemies[0].timer;c.update(0,{...f.p});assert.equal(c.enemies[0].timer,time);
 c.update(.61,{...f.p});assert.equal(f.runtime.objects.Projectile.instances.length,0);assert.equal(c.hazards[0].kind,'sweep');
 c.update(.46,{...f.p});c.update(2.11,{...f.p});assert.equal(f.runtime.objects.Projectile.instances.length,7);assert.equal(c.boss.phase,1);
 assert.ok(f.runtime.objects.Projectile.instances.every(b=>b.animationName==='Petal'));
 for(let i=0;i<4;i++)c.strike({x:560,y:360},0);assert.equal(c.boss.phase,2);
 c.update(.46,{...f.p});c.update(.8,{...f.p});assert.equal(c.enemies[0].marks.length,5);
 const points=c.enemies[0].targets.map(p=>({...p}));f.p.y+=80;c.update(0,{...f.p});assert.equal(JSON.stringify(c.enemies[0].targets),JSON.stringify(points));
 c.update(.81,{...f.p});assert.equal(c.hazards.filter(h=>h.kind==='bloom').length,5);
});
test('campaign main route reaches both minibosses and the final boss, with optional branches',()=>{
 const c=new Campaign(),seen=[];
 for(let n=0;n<20;n++){seen.push(c.room);c.complete(3);if(c.last)break;assert.equal(c.advance(),true);}
 assert.equal(c.last,true);assert.equal(seen.length,13);assert.ok(seen.includes(1));assert.ok(seen.includes(7));assert.ok(seen.includes(11));
 assert.ok(seen.includes(12));assert.ok(seen.includes(13));assert.ok(seen.includes(14));assert.equal(c.weapon,'lance');
 c.advance();assert.equal(c.room,0);assert.equal(c.weapon,'blade');
 c.room=1;c.complete(2);assert.equal(c.advance(2),true);assert.equal(c.current.optional,true);assert.equal(c.advance(3),true);
});
test('R restarts the current campaign room and H resets the run before Tutorial',()=>{
 const campaign=new Campaign();campaign.advance();let f=fixture(),g=new GameController(f.runtime,campaign);f.keys.add('KeyR');g.beforeTick();assert.equal(campaign.room,12);
 f=fixture();g=new GameController(f.runtime,campaign);f.keys.add('KeyH');g.beforeTick();assert.equal(campaign.room,0);assert.ok(f.calls.includes('Tutorial'));
});
test('color/frozen floor switches with movement and attacks, while hero and threats retain their own art',()=>{
 const f=fixture();const floor=f.make('ArenaFloor',600,360,1200,720);const g=new GameController(f.runtime);
 assert.equal(floor.animationName,'GardenFrozen');g.attack();g.beforeTick();g.tick();assert.equal(floor.animationName,'GardenColor');
 for(let i=0;i<30;i++){g.beforeTick();g.tick();}assert.equal(floor.animationName,'GardenFrozen');assert.ok(f.runtime.objects.HeroVisual.getFirstInstance().animationName);
});

test('holding E across a room load does not immediately consume the new charge',()=>{
 const f=fixture();f.keys.add('KeyE');const g=new GameController(f.runtime);g.beforeTick();g.tick();assert.equal(g.state.pulses,0);assert.equal(g.state.pulseCharge,1);
 f.keys.delete('KeyE');g.beforeTick();g.tick();f.keys.add('KeyE');g.beforeTick();g.tick();assert.equal(g.state.pulses,1);
});
test('enemy aim telegraph is clipped by cover and remains unchanged while time is stopped',()=>{
 const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s);f.make('Wall',570,360,20,120);c.update(.45,{...f.p});
 const marker=c.enemies[0].marker;assert.equal(marker.isVisible,true);assert.ok(marker.width<=40);assert.ok(marker.height>=20);assert.ok(marker.x-marker.width/2>=584-1e-8);
 const before=[marker.x,marker.y,marker.width,marker.angle];for(let i=0;i<100;i++)c.update(0,{...f.p});assert.deepEqual([marker.x,marker.y,marker.width,marker.angle],before);
});

const {Depth}=load('src/world/Depth.ts');
const {Effects}=load('src/world/Effects.ts');
test('2.5D: floor stays behind shadows, actors sort behind/in front of raised cover, shadows clean up',()=>{
 const f=fixture(),floor=f.make('ArenaFloor',600,360,1200,720),wall=f.make('Wall',140,400,28,140),depth=new Depth(f.runtime);
 f.p.y=300;depth.update();const hero=f.runtime.objects.HeroVisual.getFirstInstance(),face=f.runtime.objects.WallFace.getFirstInstance();
 assert.equal(floor.drawOrder,-1);assert.ok(hero.drawOrder<face.drawOrder);assert.equal(face.width,wall.width+8);assert.equal(face.height,64);
 assert.equal(f.runtime.objects.ActorShadow.instances.length,2);f.p.y=600;depth.update();assert.ok(hero.drawOrder>face.drawOrder);
 f.enemy.destroy();depth.update();assert.equal(f.runtime.objects.ActorShadow.instances.length,1);
});
test('neon effects run six frames with additive blend and oblique aspect, then destroy themselves',()=>{
 const f=fixture(),effects=new Effects(f.runtime);effects.flash(140,360,'Slash',125,.6,0);const s=f.runtime.objects.CombatFx.getFirstInstance();
 const frames=new Set([0]);for(let i=0;i<35;i++){effects.update(1/60);frames.add(s.animationFrame);}assert.deepEqual([...frames].sort(),[0,1,2,3,4,5]);
 assert.equal(s.blendMode,'additive');assert.ok(s.height<s.width);effects.update(.1);assert.equal(f.runtime.objects.CombatFx.instances.length,0);
 const obj=JSON.parse(fs.readFileSync('objectTypes/CombatFx.json'));for(const anim of obj.animations.items)assert.equal(anim.frames.length,6);
 assert.equal(JSON.parse(fs.readFileSync('objectTypes/Projectile.json')).animations.items.find(a=>a.name==='Core').frames.length,6);
});

const {Menu}=load('src/ui/Menu.ts');
test('title/settings/quit are functional states, settings survive pause and resume',()=>{
 const m=new Menu('title');assert.equal(m.playing,false);assert.match(m.html(),/Начать/);assert.match(m.html(),/Настройки/);assert.match(m.html(),/Выход/);
 m.handle('settings');m.handle('flashes');m.handle('guides');assert.equal(m.flashes,false);assert.equal(m.guides,false);m.handle('back');assert.equal(m.page,'title');
 m.handle('start');m.escape();assert.equal(m.page,'pause');m.handle('settings');m.handle('back');assert.equal(m.page,'pause');m.handle('resume');assert.equal(m.playing,true);
 m.handle('quit');assert.equal(m.page,'exit');assert.equal(m.playing,false);assert.match(m.html(),/Сессия остановлена/);
});
test('menu freezes combat and Escape resumes without attacking',()=>{
 const f=fixture(),m=new Menu('title'),g=new GameController(f.runtime,new Campaign(),m);g.attack();
 for(let i=0;i<100;i++){g.beforeTick();g.tick();}assert.equal(g.state.attacks,0);assert.equal(g.state.worldSeconds,0);assert.equal(f.runtime.timeScale,0);
 m.handle('start');f.keys.add('Escape');g.beforeTick();g.tick();assert.equal(m.page,'pause');f.keys.delete('Escape');g.beforeTick();g.tick();f.keys.add('Escape');g.beforeTick();g.tick();assert.equal(m.playing,true);
});
test('large idle enemy bodies never cause proximity damage, but a telegraphed hunter lunge does',()=>{
 const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s);f.p.x=600;f.p.y=360;
 for(let i=0;i<100;i++)c.update(0,{...f.p});assert.equal(s.hp,3);
 const room={...ROOMS[0],enemies:[{kind:'hunter',x:140,y:360,hp:2}]},h=new CombatSystem(f.runtime,s,room);f.p.x=180;h.update(1.8,{...f.p});assert.equal(s.hp,3);h.update(.2,{...f.p});assert.equal(s.hp,2);
});
test('real damage changes hearts, tints the hero and displays a short edge vignette',()=>{
 const f=fixture(),g=new GameController(f.runtime);g.state.damage();g.beforeTick();g.tick();
 assert.equal(g.state.hp,2);assert.deepEqual(Array.from(f.runtime.objects.HeroVisual.getFirstInstance().colorRgb),[1,.25,.4]);assert.match(f.runtime.objects.HowToControl.getFirstInstance().htmlContent,/inset 0 0 90px/);
 for(let i=0;i<30;i++){g.beforeTick();g.tick();}assert.deepEqual(Array.from(f.runtime.objects.HeroVisual.getFirstInstance().colorRgb),[1,1,1]);
});
test('designer running sheets are now used without changing their frame size or anchor',()=>{
 const obj=JSON.parse(fs.readFileSync('objectTypes/HeroVisual.json'));
 for(const dir of ['Up','Down','Left','Right'])for(const f of obj.animations.items.find(a=>a.name==='Walk'+dir).frames){assert.equal(f.width,64);assert.equal(f.height,64);assert.equal(f.originX,.5);assert.equal(f.originY,.5);}
 const enemies=JSON.parse(fs.readFileSync('objectTypes/TestEnemy.json'));for(const name of ['Shooter','Hunter','Warden','Echo','Regent'])assert.ok(enemies.animations.items.find(a=>a.name===name));
});

test('enemy motion, wind-up and release use distinct poses, frozen world preserves the exact pose',()=>{
 const {EnemyAnimator}=load('src/combat/EnemyAnimator.ts'),f=fixture(),a=new EnemyAnimator(),e=f.enemy;
 a.update(e,'hunter',.1,true,false,0,Math.PI);assert.equal(e.animationName,'HunterWalk');assert.equal(e.isMirrored,true);assert.equal(e.angle,0);
 a.update(e,'hunter',.2,true,false,0,Math.PI);assert.equal(e.animationFrame,1);
 const pose=[e.animationName,e.animationFrame];a.update(e,'hunter',0,false,false,0,0);assert.deepEqual([e.animationName,e.animationFrame],pose);
 a.update(e,'hunter',.1,false,true,0,0);assert.equal(e.animationName,'HunterWindup');
 a.update(e,'hunter',.1,false,false,.4,0);assert.equal(e.animationName,'HunterAttack');assert.equal(e.animationFrame,0);
 a.update(e,'hunter',.1,false,false,.1,0);assert.equal(e.animationFrame,1);
});
test('a shooter commits its aim before release and the attack no longer tracks the player',()=>{
 const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s);c.update(.45,{...f.p});const e=c.enemies[0],angle=e.angle;
 f.p.y=100;c.update(.3,{...f.p});assert.equal(e.angle,angle);assert.equal(e.sprite.animationName,'ShooterWindup');
 c.update(.25,{...f.p});assert.equal(f.runtime.objects.Projectile.getFirstInstance().angle,angle);assert.equal(e.sprite.animationName,'ShooterAttack');
});
test('Bloom sweep hurts only the warned front sector, respects cover and never damages during dt zero',()=>{
 for(const mode of ['front','behind','cover','frozen']){
  const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s,{...ROOMS[2],enemies:[{kind:'warden',x:620,y:360,hp:8}]});
  c.update(2.11,{...f.p});f.p.x=mode==='behind'?690:550;if(mode==='cover')f.make('Wall',580,360,20,100);
  c.update(mode==='frozen'?0:.01,{...f.p});assert.equal(s.hp,mode==='front'?2:3,mode);
 }
});
test('enemy flower VFX freeze exactly while player VFX can finish on the independent clock',()=>{
 const f=fixture(),fx=new Effects(f.runtime);fx.flash(0,0,'Bloom',68,.6,0,true);const bloom=f.runtime.objects.CombatFx.getFirstInstance();
 fx.flash(0,0,'Slash',100,.2);fx.update(.1,.1);const pose=[bloom.animationFrame,bloom.width,bloom.opacity];
 for(let i=0;i<30;i++)fx.update(.1,0);assert.deepEqual([bloom.animationFrame,bloom.width,bloom.opacity],pose);assert.equal(f.runtime.objects.CombatFx.instances.length,1);
 fx.update(.6,.6);assert.equal(f.runtime.objects.CombatFx.instances.length,0);
});
test('all five enemy/boss animation sets contain authored walk, anticipation and attack poses',()=>{
 const obj=JSON.parse(fs.readFileSync('objectTypes/TestEnemy.json'));
 for(const name of ['Shooter','Hunter','Warden','Echo','Regent']){
  for(const [state,count] of [['Idle',2],['Walk',3],['Windup',1],['Attack',2]]){
   const a=obj.animations.items.find(a=>a.name===name+state);assert.ok(a,name+state);assert.equal(a.frames.length,count);
   for(const f of a.frames)assert.equal(f.useCollisionPoly,false);
  }
  const walk=fs.readFileSync(`images/testenemy-${name.toLowerCase()}walk-000.png`),attack=fs.readFileSync(`images/testenemy-${name.toLowerCase()}attack-000.png`);
  assert.equal(walk.equals(attack),false,name+' poses must differ');
 }
 for(const name of ['Arrow','Petal'])assert.equal(JSON.parse(fs.readFileSync('objectTypes/Projectile.json')).animations.items.find(a=>a.name===name).frames.length,6);
 const project=JSON.parse(fs.readFileSync('project.c3proj'));assert.equal(project.properties.fullscreenMode,'letterbox-scale');assert.equal(project.properties.fullscreenQuality,'high');
});

test('Sine phase stops during windup; resuming cannot teleport through cover',()=>{
 const {TimeController}=load('src/systems/TimeController.ts'),f=fixture();let allowed=true;const t=new TimeController(f.runtime,()=>allowed);
 t.beforeTick(true);f.p.x++;f.enemy.behaviors['Синусоида'].value=120;t.afterTick(true);const x=f.enemy.x;assert.ok(x-620<=80/60+1e-8);
 allowed=false;t.beforeTick(true);assert.equal(f.enemy.timeScale,0);f.p.x++;f.enemy.behaviors['Синусоида'].phase=20;t.afterTick(true);assert.equal(f.enemy.x,x);assert.equal(f.enemy.behaviors['Синусоида'].phase,0);
 allowed=true;f.make('Wall',x+16,360,4,100);t.beforeTick(true);f.p.x++;t.afterTick(true);assert.equal(f.enemy.x,x);
});
test('journey graph has 15 reachable rooms, 5 zones, 2 optional rooms and 6 distinct boss encounters',()=>{
 assert.equal(ROOMS.length,15);assert.equal(new Set(ROOMS.map(r=>r.zone)).size,5);assert.equal(ROOMS.filter(r=>r.optional).length,2);
 const seen=new Set(),visit=i=>{if(seen.has(i))return;seen.add(i);for(const j of ROOMS[i].next){assert.ok(j>=0&&j<ROOMS.length);visit(j);}};visit(0);assert.equal(seen.size,15);
 assert.deepEqual([...new Set(ROOMS.flatMap(r=>r.enemies.map(e=>e.kind)).filter(k=>!['hunter','shooter'].includes(k)))].sort(),['bulwark','echo','regent','shade','viper','warden']);
});
test('rewards cannot be farmed by replay, invalid branches are rejected, Q cycles unlocked weapons',()=>{
 const c=new Campaign();c.room=1;c.complete(2);assert.equal(c.weapon,'rose');assert.equal(c.hp,3);const money=c.coins;c.complete(2);assert.equal(c.coins,money);
 assert.equal(c.advance(11),false);assert.equal(c.room,1);c.cycleWeapon();assert.equal(c.weapon,'blade');c.cycleWeapon();assert.equal(c.weapon,'rose');
 c.room=7;c.complete(2);assert.equal(c.weapon,'lance');c.reset();assert.equal(c.weapon,'blade');assert.equal(c.coins,0);assert.equal(c.opened.size,0);
});
test('optional room chest needs proximity, grants loot once, and recovery spends currency',()=>{
 const {RoomWorld}=load('src/world/RoomWorld.ts'),f=fixture(),c=new Campaign();c.room=2;const s=new GameState();s.hp=1;
 const world=new RoomWorld(f.runtime,c.current,c);world.interact(f.p,s);assert.equal(c.coins,0);
 f.p.x=600;world.interact(f.p,s);assert.equal(c.coins,3);assert.equal(s.hp,2);assert.equal(f.runtime.objects.WorldProp.getFirstInstance().animationName,'ChestOpen');
 world.interact(f.p,s);assert.equal(c.coins,0);assert.equal(s.hp,3);world.interact(f.p,s);assert.equal(c.coins,0);
 const reloaded=new RoomWorld(f.runtime,c.current,c);assert.equal(f.runtime.objects.WorldProp.getFirstInstance().animationName,'ChestOpen');assert.equal(c.loot(),false);
});
test('result buttons advance to a selected optional room; retry and title are actionable',()=>{
 const f=fixture(),c=new Campaign();c.room=1;const g=new GameController(f.runtime,c);g.state.status='won';g.tick();
 const hud=f.runtime.objects.HowToControl.getFirstInstance();assert.match(hud.htmlContent,/travel-2/);hud.events.click({targetId:'travel-2'});assert.equal(c.room,2);assert.ok(f.calls.includes('Макет 1'));
 const h=fixture(),retry=new GameController(h.runtime);retry.state.status='lost';retry.tick();const el=h.runtime.objects.HowToControl.getFirstInstance();assert.match(el.htmlContent,/id="retry"/);el.events.click({targetId:'retry'});assert.ok(h.calls.includes('Макет 1'));
});
test('map M pauses the world and closes without changing the room',()=>{
 const f=fixture(),g=new GameController(f.runtime);f.keys.add('KeyM');g.beforeTick();g.tick();assert.equal(f.runtime.timeScale,0);assert.match(f.runtime.objects.HowToControl.getFirstInstance().htmlContent,/Карта пути/);
 f.keys.delete('KeyM');g.beforeTick();f.keys.add('KeyM');g.beforeTick();g.tick();assert.doesNotMatch(f.runtime.objects.HowToControl.getFirstInstance().htmlContent,/Карта пути/);
});
test('Echo lance is a frozen projectile, damages at range, and is blocked by stone cover',()=>{
 for(const blocked of [false,true]){
 const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s);c.weapon='lance';f.p.x=300;if(blocked)f.make('Wall',450,360,30,100);
 c.strike(f.p,0);assert.equal(c.enemies[0].hp,2);const b=c.playerBolts[0].sprite;c.update(0,{...f.p});assert.equal(b.x,300);
 c.update(.8,{...f.p});assert.equal(c.enemies[0].hp,blocked?2:1);assert.equal(c.playerBolts.length,0);
 }
});
test('Bulwark blocks the front, exposes its back, and pulse disrupts guard',()=>{
 const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s,{...ROOMS[12],enemies:[{kind:'bulwark',x:620,y:360,hp:7}]});
 c.strike({x:560,y:360},0);assert.equal(c.enemies[0].hp,7);c.strike({x:680,y:360},Math.PI);assert.equal(c.enemies[0].hp,6);
 c.pulse({x:560,y:360});assert.equal(c.enemies[0].hp,5);
});
test('Viper damage exists only during the warned fast lunge',()=>{
 const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s,{...ROOMS[13],enemies:[{kind:'viper',x:140,y:360,hp:6}]});f.p.x=180;
 c.update(1.1,{...f.p});assert.equal(s.hp,3);assert.equal(c.enemies[0].locked,true);c.update(.2,{...f.p});assert.equal(s.hp,2);assert.ok(c.enemies[0].sprite.x>220);
});
test('Shade cannot be stabbed while faded, but pulse reveals and damages it',()=>{
 const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s,{...ROOMS[14],enemies:[{kind:'shade',x:620,y:360,hp:6}]});c.enemies[0].recovery=.7;
 c.strike({x:560,y:360},0);assert.equal(c.enemies[0].hp,6);c.pulse({x:560,y:360});assert.equal(c.enemies[0].hp,5);assert.ok(c.enemies[0].recovery<=.3);
});
test('major bosses have three signalled phases; phase transitions cancel old windups',()=>{
 for(const kind of ['warden','echo','regent']){
 const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s,{...ROOMS[1],enemies:[{kind,x:620,y:360,hp:10}]});const e=c.enemies[0];c.update(1.3,{...f.p});assert.equal(e.locked,true);
 e.hp=6;c.update(.01,{...f.p});assert.equal(c.boss.phase,2);assert.equal(e.locked,false);assert.equal(e.aura.isVisible,true);
 e.hp=2;c.update(.01,{...f.p});assert.equal(c.boss.phase,3);assert.equal(e.aura.width,190);assert.ok(e.sprite.colorRgb[1]<1);
 }
});
test('every room spawns enemies on the visible walkable floor; dynamic barriers are low and wide',()=>{
 const {RoomWorld}=load('src/world/RoomWorld.ts');for(const room of ROOMS){const f=fixture(),c=new Campaign();new RoomWorld(f.runtime,room,c);
 for(const e of room.enemies){assert.ok(e.y>=230&&e.y<=600);for(const w of f.runtime.objects.Wall.getAllInstances())assert.equal(segmentHit(e,e,w,14),null,room.title);}
 for(const w of f.runtime.objects.Wall.getAllInstances())assert.ok(w.width>w.height*3);
 }
});

test('Regent final phase warns about combined rifts before releasing them with the fan',()=>{
 const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s,{...ROOMS[11],enemies:[{kind:'regent',x:620,y:360,hp:14}]});const e=c.enemies[0];e.hp=2;c.update(.01,{...f.p});e.recovery=0;
 c.update(.5,{...f.p});assert.equal(e.locked,true);assert.equal(e.marks.length,7);assert.ok(e.marks.every(m=>m.isVisible));assert.equal(f.runtime.objects.Projectile.instances.length,0);
 const targets=JSON.stringify(e.targets);c.update(0,{...f.p});assert.equal(JSON.stringify(e.targets),targets);
 c.update(.86,{...f.p});assert.equal(f.runtime.objects.Projectile.instances.length,13);assert.equal(c.hazards.filter(h=>h.kind==='rift').length,7);
});
test('every boss uses imported poses, cleans warning markers on death, and freezes its pose',()=>{
 const imported=JSON.parse(fs.readFileSync('objectTypes/TestEnemy.json')).animations.items.map(a=>a.name);
 for(const kind of ['warden','echo','regent','bulwark','viper','shade']){
 const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s,{...ROOMS[1],enemies:[{kind,x:620,y:360,hp:8}]});
 for(let i=0;i<100;i++)c.update(1/60,{...f.p});const e=c.enemies[0];assert.ok(imported.includes(e.sprite.animationName));
 const held=[e.sprite.x,e.sprite.y,e.sprite.animationName,e.sprite.animationFrame,e.timer];for(let i=0;i<30;i++)c.update(0,{...f.p});assert.deepEqual([e.sprite.x,e.sprite.y,e.sprite.animationName,e.sprite.animationFrame,e.timer],held);
 c.hit(e,100);assert.equal(c.enemies.length,0);assert.equal(f.runtime.objects.CombatMarker.instances.length,0);
 }
});
