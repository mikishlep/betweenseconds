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
 const keys=new Set(), calls=[];
 const objects={};
 for(const name of ['Player','TestEnemy','Wall','Projectile','ProjectileGuide','TimeFragment','Exit','HowToControl']){
  const instances=[];
  objects[name]={getFirstInstance:()=>instances[0]??null,getAllInstances:()=>[...instances],createInstance:(_,x,y)=>make(name,x,y),instances};
 }
 function make(name,x,y,width=28,height=28){
  const o={x,y,width,height,angle:0,dt:1/60,timeScale:1,opacity:1,isVisible:true,htmlContent:'',behaviors:{},destroy(){const a=objects[name].instances;a.splice(a.indexOf(o),1);}};
  objects[name].instances.push(o);return o;
 }
 const p=make('Player',140,360);
 const move=p.behaviors['8Направлений']={vectorX:0,vectorY:0,isEnabled:true,maxSpeed:220,acceleration:1800,deceleration:1800,simulateControl(c){calls.push(c);}};
 const enemy=make('TestEnemy',620,360,32,32);enemy.behaviors['Синусоида']={phase:0,value:0};
 const exit=make('Exit',1100,360,48,72);
 make('HowToControl',16,16);make('TimeFragment',420,180,24,24);make('TimeFragment',900,540,24,24);
 const runtime={objects,keyboard:{isKeyDown:c=>keys.has(c)},timeScale:1,dtRaw:1/60,layout:{name:'Макет 1'},goToLayout:n=>calls.push(n),addEventListener(){}};
 return {runtime,p,enemy,exit,keys,calls,move,make};
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
 const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s);f.make('Wall',500,360,28,140);c.update(1,{...f.p});c.update(3,{...f.p});assert.equal(s.hp,3);assert.equal(f.runtime.objects.Projectile.instances.length,1); // new shot after old hits wall
});
test('projectile segment hits moving player, not just final endpoints',()=>{
 const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s);c.update(1,{...f.p});c.update(3,{...f.p});assert.equal(s.hp,2);
});
test('contact with frozen enemy costs HP',()=>{
 const f=fixture(),g=new GameController(f.runtime);f.p.x=620;g.beforeTick();g.tick();assert.equal(g.state.hp,2);g.beforeTick();g.tick();assert.equal(g.state.hp,2);
});
test('collect both fragments via swept paths then win and lock movement',()=>{
 const f=fixture(),g=new GameController(f.runtime);
 for(const [x,y] of [[420,180],[900,540],[1100,360]]){g.beforeTick();f.p.x=x;f.p.y=y;g.tick();}
 assert.equal(g.state.fragments,2);assert.equal(f.runtime.objects.TimeFragment.instances.length,0);assert.equal(f.exit.opacity,1);assert.equal(g.state.status,'won');assert.equal(f.move.isEnabled,false);assert.equal(f.runtime.timeScale,0);
});
test('R reloads from frozen, won and lost; holding R does not reload twice',()=>{
 for(const status of ['playing','won','lost']){const f=fixture(),g=new GameController(f.runtime);g.state.status=status;f.keys.add('KeyR');g.beforeTick();g.tick();g.beforeTick();assert.equal(f.calls.filter(c=>c==='Макет 1').length,1);}
});
test('compiled entry registers one listener pair, creates fresh game on every reload',()=>{
 const f=fixture(),listeners={};f.runtime.addEventListener=(n,cb)=>(listeners[n]??=[]).push(cb);
 vm.runInNewContext(esbuild.transformSync(fs.readFileSync('scripts/main.js','utf8'),{format:'cjs'}).code,{module:{exports:{}},exports:{},runOnStartup:cb=>cb(f.runtime)});
 for(let i=0;i<4;i++){listeners.beforeanylayoutstart[0]();listeners.pretick[0]();listeners.tick[0]();}
 assert.equal(listeners.pretick.length,1);assert.equal(listeners.tick.length,1);assert.match(f.runtime.objects.HowToControl.getFirstInstance().htmlContent,/Здоровье 3 из 3/);
});
test('project references, assets, UID/SID, two layers and Free footprint',()=>{
 const p=JSON.parse(fs.readFileSync('project.c3proj'));
 assert.equal(p.layouts.items.length,1);assert.equal(p.rootFileFolders.script.items.length,1);
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
 const f=fixture(),g=new GameController(f.runtime);g.beforeTick();f.p.x++;f.enemy.behaviors['Синусоида'].value=10;g.tick();assert.equal(f.enemy.x,630);
 for(let i=0;i<100;i++){g.beforeTick();f.enemy.behaviors['Синусоида'].value=20;f.enemy.behaviors['Синусоида'].phase+=.1;g.tick();}
 assert.equal(f.enemy.x,630);assert.equal(f.enemy.behaviors['Синусоида'].phase,0);
});

test('direction arrow and guide retain direction while frozen and clean up together',()=>{
 const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s);c.update(1,{...f.p});
 const b=f.runtime.objects.Projectile.getFirstInstance(),guide=f.runtime.objects.ProjectileGuide.getFirstInstance();
 assert.equal(b.angle,Math.PI);assert.ok(guide.x<b.x);assert.ok(guide.width>0);assert.ok(guide.width<=110);
 const x=guide.x;c.update(0,{...f.p});assert.equal(guide.x,x);assert.equal(guide.angle,Math.PI);
 f.p.x=700;c.update(0,{x:500,y:360});assert.equal(f.runtime.objects.ProjectileGuide.instances.length,0);
});
test('direction guide is clipped at a wall ahead',()=>{
 const f=fixture(),s=new GameState(),c=new CombatSystem(f.runtime,s);f.make('Wall',570,360,20,140);c.update(1,{...f.p});
 const guide=f.runtime.objects.ProjectileGuide.getFirstInstance();assert.ok(guide.width<50);assert.ok(guide.x-guide.width/2>=580-1e-8);
});
