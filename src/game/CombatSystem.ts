import { relativeHit,segmentHit,type Point } from './geometry';
import { GameState } from './GameState';
import type {EnemyKind,RoomSpec,Weapon} from './Rooms';
import {WEAPONS} from '../combat/Weapons';
import {attackPlan,type AttackPlan,type ProjectileStyle} from '../combat/AttackPatterns';
import {Effects} from '../world/Effects';
import {EnemyAnimator} from '../combat/EnemyAnimator';
import {Telegraphs} from '../combat/Telegraphs';
interface Bullet{sprite:Sprite;vx:number;vy:number;age:number;style:ProjectileStyle;owner?:Sprite;damage?:number;pierce?:number;hit?:Set<Sprite>;curve?:number;lifetime?:number;knock?:number;orbit?:{center:Point;radius:number;angle:number;left:number;speed:number;};}
interface Hazard{origin:Point;angle:number;radius:number;width:number;kind:'sweep'|'circle'|'line'|'ring'|'well';fx:string;owner:Sprite;age:number;shown:boolean;marker?:Sprite;visual?:Sprite;burst?:boolean;}
interface QueuedShot{origin:Point;angle:number;style:ProjectileStyle;speed:number;delay:number;owner:Sprite;marker:Sprite;}
export interface EnemyUnit{sprite:Sprite;kind:EnemyKind;hp:number;maxHp:number;timer:number;angle:number;locked:boolean;marker:Sprite;marks:Sprite[];targets:Point[];origin:Point;attackIndex:number;recovery:number;animator:EnemyAnimator;phase:number;aura?:Sprite;plan:AttackPlan;lunged:boolean;aim:Point;hurt:number;knock:{x:number;y:number;left:number};}
export class CombatSystem{
 private bullets:Bullet[]=[];private playerBolts:Bullet[]=[];private hazards:Hazard[]=[];private queuedShots:QueuedShot[]=[];
 private readonly telegraphs:Telegraphs;readonly enemies:EnemyUnit[]=[];weapon:Weapon='blade';feedback='';private feedbackTime=0;
 constructor(private readonly runtime:IRuntime,private readonly state:GameState,room?:RoomSpec,private readonly effects?:Effects){
  this.telegraphs=new Telegraphs(runtime);
  for(const type of [runtime.objects.Projectile,runtime.objects.ProjectileGuide,runtime.objects.CombatMarker])for(const s of type.getAllInstances())s.destroy();
  if(room){for(const s of runtime.objects.TestEnemy.getAllInstances())s.destroy();for(const spawn of room.enemies){
   const s=runtime.objects.TestEnemy.createInstance('scene',spawn.x,spawn.y);
   s.width=spawn.kind==='viper'?72:this.isBoss(spawn.kind)?112:spawn.kind==='sentinel'?64:spawn.kind==='hunter'?64:52;s.height=spawn.kind==='viper'?96:this.isBoss(spawn.kind)?144:64;
   this.addEnemy(s,spawn.kind,spawn.hp);
  }}else for(const s of runtime.objects.TestEnemy.getAllInstances())this.addEnemy(s,'shooter',2);
  this.state.enemiesRemaining=this.enemies.length;
 }
 private isBoss(kind:EnemyKind):boolean{return ['warden','echo','regent','bulwark','viper','shade'].includes(kind);}
 private makeMarker():Sprite{const m=this.runtime.objects.CombatMarker.createInstance('scene',0,0);m.isVisible=false;m.animationSpeed=0;return m;}
 private addEnemy(sprite:Sprite,kind:EnemyKind,hp:number):void{
  const e:EnemyUnit={sprite,kind,hp,maxHp:hp,timer:kind==='shooter'?.35:0,angle:Math.PI,locked:false,marker:this.makeMarker(),marks:[],targets:[],origin:{x:sprite.x,y:sprite.y},attackIndex:0,recovery:0,animator:new EnemyAnimator(),phase:1,aura:this.isBoss(kind)?this.makeMarker():undefined,plan:attackPlan(kind,1,0),lunged:false,aim:{x:0,y:0},hurt:0,knock:{x:0,y:0,left:0}};
  e.animator.update(sprite,kind,1/60,false,false,0,e.angle,1);this.enemies.push(e);
 }
 isShooter(sprite:Sprite):boolean{return this.enemies.some(e=>e.sprite===sprite&&e.kind==='shooter'&&!e.locked&&e.recovery<=0&&e.knock.left<=0);}
 get boss():{hp:number;maxHp:number;phase:number;name:string}|null{
  const e=this.enemies.find(e=>this.isBoss(e.kind)),names:Record<string,string>={warden:'Хранитель Цветения',echo:'Эхо',regent:'Последний Регент',bulwark:'Каменный Бастион',viper:'Багровый Стремник',shade:'Безликий Осколок'};
  return e?{hp:e.hp,maxHp:e.maxHp,phase:e.hp<=e.maxHp*.3?3:e.hp<=e.maxHp*.65?2:1,name:names[e.kind]}:null;
 }
 private unobstructed(a:Point,b:Point):boolean{return this.runtime.objects.Wall.getAllInstances().every(w=>segmentHit(a,b,w)===null);}
 private inCone(a:Point,b:Point,angle:number,range:number,cosine=.4):boolean{const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);return len<=range&&(len<1||(dx*Math.cos(angle)+dy*Math.sin(angle))/len>=cosine)&&this.unobstructed(a,b);}
 private guarded(e:EnemyUnit,origin:Point):boolean{return e.kind==='shade'&&e.recovery>.3||(e.kind==='bulwark'||e.kind==='sentinel')&&e.recovery<=0&&this.inCone(e.sprite,origin,e.angle,200,.1);}
 private meleeTarget(origin:Point,e:EnemyUnit,angle:number,range:number,cone:number):boolean{
  // Upright sprites are anchored near their feet. Include the lower body edge.
  const radius=Math.min(28,e.sprite.width*.24),center={x:e.sprite.x,y:e.sprite.y-(this.isBoss(e.kind)?22:4)},dx=center.x-origin.x,dy=center.y-origin.y,len=Math.hypot(dx,dy);
  const near={x:center.x-dx/Math.max(1,len)*Math.min(radius,len),y:center.y-dy/Math.max(1,len)*Math.min(radius,len)};
  return this.inCone(origin,near,angle,range,cone)&&this.unobstructed(origin,e.sprite);
 }
 private blocked(e:EnemyUnit,origin:Point):void{this.feedback=e.kind==='shade'?'Фантом скрыт · дождитесь проявления или E':'Щит · молот, E или удар после замаха';this.feedbackTime=1.2;this.effects?.flash((origin.x+e.sprite.x)/2,(origin.y+e.sprite.y)/2,'SteelCut',38,.18);}
 strike(origin:Point,angle:number):void{
  if(this.state.status!=='playing')return;this.state.attacks++;const w=WEAPONS[this.weapon];
  if(w.ranged)this.launchPlayer(origin,angle);
  else{
   this.effects?.flash(origin.x+Math.cos(angle)*35,origin.y+Math.sin(angle)*35,w.fx,w.range*1.5,.3,angle);
   for(const e of [...this.enemies])if(this.meleeTarget(origin,e,angle,w.range,w.cone)){
    if(this.guarded(e,origin)){
     if(this.weapon==='maul'&&(e.kind==='bulwark'||e.kind==='sentinel')){this.cancel(e);e.recovery=.55;this.feedback='Щит пробит';this.feedbackTime=1;this.hit(e,w.damage,origin,this.weapon==='maul'?40:this.weapon==='rose'?25:16);}
     else this.blocked(e,origin);
    }else this.hit(e,w.damage,origin,this.weapon==='maul'?40:this.weapon==='rose'?25:16);
   }
   this.bullets=this.bullets.filter(b=>{if(!this.inCone(origin,b.sprite,angle,w.range+8,w.cone))return true;this.removeBullet(b);this.state.deflected++;return false;});
  }
 }
 pulse(origin:Point):void{
  if(!this.state.pulseCharge||this.state.status!=='playing')return;this.state.pulseCharge--;this.state.pulses++;this.state.invulnerable=Math.max(this.state.invulnerable,.3);
  const radius=this.state.maxPulseCharge>1?200:165;this.effects?.flash(origin.x,origin.y,'Pulse',radius*2,.5);
  this.bullets=this.bullets.filter(b=>{if(Math.hypot(b.sprite.x-origin.x,b.sprite.y-origin.y)>radius)return true;this.removeBullet(b);this.state.deflected++;return false;});
  this.hazards=this.hazards.filter(h=>{if(Math.hypot(h.origin.x-origin.x,h.origin.y-origin.y)>radius)return true;this.removeArea(h);return false;});
  this.queuedShots=this.queuedShots.filter(q=>{if(Math.hypot(q.origin.x-origin.x,q.origin.y-origin.y)>radius)return true;q.marker.destroy();return false;});
  for(const e of [...this.enemies])if(Math.hypot(e.sprite.x-origin.x,e.sprite.y-origin.y)<=radius&&this.unobstructed(origin,e.sprite)){this.cancel(e);this.hit(e,1);}
 }
 private cancel(e:EnemyUnit):void{e.timer=0;e.locked=false;e.recovery=.3;e.marker.isVisible=false;e.marks.forEach(m=>m.destroy());e.marks=[];e.targets=[];e.lunged=false;}
 private clearThreats(owner:Sprite):void{
  this.hazards=this.hazards.filter(h=>{if(h.owner!==owner)return true;this.removeArea(h);return false;});
  this.queuedShots=this.queuedShots.filter(q=>{if(q.owner!==owner)return true;q.marker.destroy();return false;});
  this.bullets=this.bullets.filter(b=>{if(b.owner!==owner)return true;this.removeBullet(b);return false;});
 }
 private hit(e:EnemyUnit,damage:number,origin?:Point,force=0):void{
  e.hurt=.18;e.sprite.colorRgb=[1,.2,.3];
  if(origin&&force>0&&['shooter','hunter','acolyte'].includes(e.kind)){const a=Math.atan2(e.sprite.y-origin.y,e.sprite.x-origin.x);e.knock={x:Math.cos(a)*force/.14,y:Math.sin(a)*force/.14,left:.14};}
  e.hp-=damage;this.effects?.flash(e.sprite.x,e.sprite.y,'Hit',this.isBoss(e.kind)?90:40,.18);
  if(e.hp>0)return;
  this.clearThreats(e.sprite);this.cancel(e);e.marker.destroy();e.aura?.destroy();e.sprite.destroy();this.enemies.splice(this.enemies.indexOf(e),1);
  this.state.kills++;this.state.enemiesRemaining=this.enemies.length;this.state.pulseCharge=Math.min(this.state.maxPulseCharge,this.state.pulseCharge+1);
 }
 private removeArea(h:Hazard):void{h.marker?.destroy();if(h.visual){this.effects?.releaseLight?.(h.visual);h.visual.destroy();}}
 private removeBullet(b:Bullet):void{this.effects?.releaseLight?.(b.sprite);b.sprite.destroy();}
 private spawnBullet(origin:Point,angle:number,speed:number,style:ProjectileStyle,owner?:Sprite,curve=0):Bullet|undefined{
  if(this.bullets.length>=64)return;const s=this.runtime.objects.Projectile.createInstance('scene',origin.x,origin.y);s.setAnimation(style);s.animationSpeed=0;s.blendMode='additive';
  const sizes:Record<ProjectileStyle,[number,number]>={Arrow:[46,12],Petal:[34,34],EchoOrb:[28,28],RegentLance:[54,54],ShadowNeedle:[36,36],VoidOrb:[42,42]};[s.width,s.height]=sizes[style];s.angle=style==='EchoOrb'||style==='VoidOrb'?0:angle;s.blendMode='normal';
  this.effects?.light?.(s,style==='EchoOrb'?'Echo':style==='VoidOrb'?'Void':style==='Petal'?'Rose':'Regent',Math.max(s.width*1.8,54));
  const b:Bullet={sprite:s,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,age:0,style,owner,curve};this.bullets.push(b);return b;
 }
 private launchPlayer(origin:Point,angle:number):void{
  if(this.playerBolts.length>=8)return;const w=WEAPONS[this.weapon],s=this.runtime.objects.Projectile.createInstance('scene',origin.x,origin.y);
  s.setAnimation(w.fx);s.width=this.weapon==='lance'?54:46;s.height=this.weapon==='lance'?54:12;s.angle=angle;s.animationSpeed=0;s.blendMode='normal';
  this.effects?.light?.(s,'Player',58);
  this.playerBolts.push({sprite:s,vx:Math.cos(angle)*430,vy:Math.sin(angle)*430,age:0,style:'Arrow',damage:w.damage,knock:this.weapon==='lance'?20:10,pierce:this.weapon==='lance'?2:1,hit:new Set(),lifetime:w.range/430});
 }
 private move(e:EnemyUnit,dt:number,charging:boolean):void{
  const p=this.runtime.objects.Player.getFirstInstance()!,s=e.sprite,stop=e.kind==='viper'?110:this.isBoss(e.kind)?100:48;
  if(!charging&&Math.hypot(p.x-s.x,p.y-s.y)<=stop)return;
  const a=charging?e.angle:Math.atan2(p.y-s.y,p.x-s.x),speed=charging?(e.kind==='viper'?510:370):e.kind==='viper'?130:this.isBoss(e.kind)?38:72;
  const dx=Math.cos(a)*speed*dt,dy=Math.sin(a)*speed*dt,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/8)),walls=this.runtime.objects.Wall.getAllInstances();
  for(let i=0;i<steps;i++){const to={x:s.x+dx/steps,y:s.y+dy/steps},clear=(v:Point)=>v.x>=60&&v.x<=1140&&v.y>=225&&v.y<=605&&walls.every(w=>segmentHit(s,v,w,18)===null);
   if(clear(to)){s.x=to.x;s.y=to.y;}else{if(clear({x:to.x,y:s.y}))s.x=to.x;if(clear({x:s.x,y:to.y}))s.y=to.y;}
  }
 }
 private lock(e:EnemyUnit,player:Point):void{
  e.locked=true;e.angle=Math.atan2(player.y-e.sprite.y,player.x-e.sprite.x);e.origin={x:e.sprite.x,y:e.sprite.y};e.aim={x:player.x,y:player.y};e.plan=attackPlan(e.kind,e.phase,e.attackIndex);e.lunged=false;
  const p=e.plan;
  if(['bloom','stamp','prison','well'].includes(p.type))for(let i=0;i<p.count;i++){
   const a=i/p.count*Math.PI*2,ring=p.type==='prison'?p.range:i===0?0:90;
   const t={x:Math.max(100,Math.min(1100,player.x+Math.cos(a)*ring)),y:Math.max(240,Math.min(590,player.y+Math.sin(a)*ring))};
   if(!this.unobstructed(e.origin,t))continue;e.targets.push(t);e.marks.push(this.makeMarker());
  }
  if(p.type==='cross')for(let i=0;i<p.count;i++)e.marks.push(this.makeMarker());
  if(e.kind==='shade'){e.targets=[{x:e.attackIndex%2?660:980,y:e.attackIndex%2?260:500}];e.marks=[this.makeMarker()];}
 }
 private addArea(e:EnemyUnit,origin:Point,angle:number,kind:Hazard['kind'],radius:number,width:number,fx:string,delay=0,marker?:Sprite):void{
  this.hazards.push({origin:{...origin},angle,kind,radius,width,fx,age:-delay,shown:false,owner:e.sprite,marker});
 }
 private release(e:EnemyUnit):void{
  const p=e.plan,dir=e.angle,phase=e.phase;
  if(p.type==='fan')for(let i=0;i<p.count;i++)this.spawnBullet(e.sprite,dir+(p.count===1?0:(i/(p.count-1)-.5)*(e.kind==='regent'?1.1:e.kind==='shade'?.45:1.65)),p.speed,p.style,e.sprite,e.kind==='warden'&&phase===3?(i%2?.35:-.35):0);
  if(p.type==='orbital')for(let i=0;i<p.count;i++){const a=dir+.35+i/p.count*Math.PI*2;if(Math.cos(a-dir)>.97)continue;const origin={x:e.sprite.x+Math.cos(a)*p.range,y:e.sprite.y+Math.sin(a)*p.range},b=this.spawnBullet(origin,a,0,p.style,e.sprite);if(b)b.orbit={center:{x:e.sprite.x,y:e.sprite.y},radius:p.range,angle:a,left:.8,speed:p.speed};}
  if(p.type==='ring')for(let i=0;i<p.count;i++){const a=dir+.45+i/p.count*Math.PI*2;if(Math.cos(a-dir)>.94)continue;this.spawnBullet(e.sprite,a,p.speed,p.style,e.sprite);}
  if(p.type==='thrust')this.addArea(e,e.origin,dir,'line',p.range,34,p.fx);
  if(p.type==='sweep')this.addArea(e,e.origin,dir,'sweep',p.range,p.width,p.fx);
  if(p.type==='slam')this.addArea(e,e.origin,0,'circle',p.range,p.width,p.fx);
  if(p.type==='wave')this.addArea(e,e.origin,0,'ring',p.range,p.width,p.fx);
  if(p.type==='well')e.targets.forEach((t,i)=>this.addArea(e,t,0,'well',p.range,p.width,p.fx,i*.2,e.marks[i]));
  if(p.type==='cross')e.marks.forEach((m,i)=>this.addArea(e,e.origin,dir+i*Math.PI*2/Math.max(4,p.count),'line',p.range,p.width,p.fx,i*.09,m));
  if(p.type==='bloom'||p.type==='stamp')e.targets.forEach((t,i)=>this.addArea(e,t,0,'circle',p.range,p.width,p.fx,i*(p.type==='bloom'?.18:.25),e.marks[i]));
  if(p.type==='prison')e.targets.forEach((t,i)=>this.queuedShots.push({origin:t,angle:Math.atan2(e.aim.y-t.y,e.aim.x-t.x),style:'EchoOrb',speed:p.speed,delay:.2+i*.08,owner:e.sprite,marker:e.marks[i]}));
  if(e.kind==='shade'){const t=e.targets[0];this.effects?.flash(e.sprite.x,e.sprite.y,'ShadowCut',75,.35,0,true);if(t&&this.unobstructed(e.sprite,t)){e.sprite.x=t.x;e.sprite.y=t.y;}e.marks.forEach(m=>m.destroy());e.sprite.opacity=.2;}
  if(e.kind==='echo'&&e.attackIndex%3===2&&phase>=2){const t={x:e.sprite.x>750?620:960,y:e.sprite.y>360?250:500};if(this.unobstructed(e.sprite,t)){this.effects?.flash(e.sprite.x,e.sprite.y,'EchoBurst',100,.4,0,true);e.sprite.x=t.x;e.sprite.y=t.y;}}
  e.targets=[];e.marks=[];e.marker.isVisible=false;e.timer=0;e.locked=false;e.attackIndex++;e.recovery=e.kind==='shade'?.8:p.type==='prison'||p.type==='stamp'||p.type==='bloom'?.8:e.kind==='viper'?.4:.55;
 }
 private showIntent(e:EnemyUnit):void{
  const p=e.plan;e.marker.isVisible=false;if(!e.locked||e.lunged)return;
  const opacity=.65;e.marker.opacity=opacity;
  if(e.kind==='hunter'||e.kind==='viper'||p.type==='thrust'||e.kind==='shooter'||e.kind==='shade')this.telegraphs.lane(e.marker,e.origin,e.angle,e.kind==='hunter'||e.kind==='viper'?150:p.range,e.kind==='hunter'||e.kind==='viper'?30:p.width);
  else if(p.type==='sweep'||p.type==='fan')this.telegraphs.sector(e.marker,e.origin,e.angle,p.type==='fan'?220:p.range);
  else if(p.type==='ring'||p.type==='slam'||p.type==='wave'||p.type==='orbital')this.telegraphs.sigil(e.marker,e.origin,p.type==='ring'||p.type==='orbital'?105:p.range,e.kind==='bulwark'||e.kind==='sentinel'?'Stone':e.kind==='regent'?'RegentSeal':'EchoSeal');
  else if(p.type==='cross')e.marks.forEach((m,i)=>this.telegraphs.lane(m,e.origin,e.angle+i*Math.PI*2/Math.max(4,p.count),p.range,p.width));
  else e.marks.forEach((m,i)=>{if(p.type==='bloom')this.telegraphs.flower(m,e.targets[i],p.range);else this.telegraphs.sigil(m,e.targets[i],p.type==='prison'?22:p.range,e.kind==='regent'?'RegentSeal':'EchoSeal');m.opacity=opacity;});
  if(e.kind==='shade')e.marks.forEach((m,i)=>this.telegraphs.sigil(m,e.targets[i],22,'EchoSeal'));
  const frame=Math.floor(this.state.worldSeconds*8)%6;e.marker.animationFrame=['ring','orbital'].includes(p.type)?frame:0;for(const m of e.marks)m.animationFrame=p.type==='cross'?0:frame;
 }
 private updateAreas(dt:number,previous:Point,player:Point):void{
  this.queuedShots=this.queuedShots.filter(q=>{q.delay-=dt;if(q.delay>0||dt<=0)return true;q.marker.destroy();this.spawnBullet(q.origin,q.angle,q.speed,q.style,q.owner);return false;});
  this.hazards=this.hazards.filter(h=>{
   h.age+=dt;if(h.age<0)return true;
   if(!h.shown&&dt>0){h.shown=true;h.marker?.destroy();h.marker=undefined;
    if(h.kind==='line'){
     const end={x:h.origin.x+Math.cos(h.angle)*h.radius,y:h.origin.y+Math.sin(h.angle)*h.radius},fraction=Math.min(1,...this.runtime.objects.Wall.getAllInstances().map(w=>segmentHit(h.origin,end,w,4)??1));
     const length=h.radius*fraction;
     if(h.fx==='EchoBeam'||h.fx==='RegentBeam')this.effects?.beam?.(h.origin,h.angle,length,h.width,h.fx,.4);
     else this.effects?.flash(h.origin.x+Math.cos(h.angle)*length/2,h.origin.y+Math.sin(h.angle)*length/2,h.fx,length,.3,h.angle,true);
    }else if(h.kind==='ring'||h.kind==='well'){
     h.visual=this.runtime.objects.CombatFx.createInstance('scene',h.origin.x,h.origin.y);h.visual.setAnimation(h.fx);h.visual.animationSpeed=0;h.visual.blendMode='normal';
     if(h.kind==='well')this.effects?.light?.(h.visual,'Void',h.radius*3);
    }else this.effects?.flash(h.origin.x,h.origin.y,h.fx,h.radius*2,.4,h.angle,true);
   }
   const duration=h.kind==='ring'?.72:h.kind==='well'?.95:.24;
   if(h.age>duration){this.removeArea(h);return false;}
   const radius=h.kind==='ring'?24+(h.radius-24)*h.age/duration:h.radius;
   if(h.visual){h.visual.width=radius*2;h.visual.height=radius*2;h.visual.animationFrame=Math.min(5,Math.floor(h.age/duration*6));h.visual.opacity=.92;}
   if(h.kind==='well'&&!h.burst&&h.age>=.7){h.burst=true;for(let i=0;i<8;i++)this.spawnBullet(h.origin,i*Math.PI/4,130,'VoidOrb',h.owner);}
   if(dt<=0||!h.shown)return true;
   const steps=Math.max(1,Math.ceil(Math.hypot(player.x-previous.x,player.y-previous.y)/8));
   for(let i=0;i<=steps;i++){const t={x:previous.x+(player.x-previous.x)*i/steps,y:previous.y+(player.y-previous.y)*i/steps};
    const dx=t.x-h.origin.x,dy=t.y-h.origin.y,along=dx*Math.cos(h.angle)+dy*Math.sin(h.angle),across=-dx*Math.sin(h.angle)+dy*Math.cos(h.angle),distance=Math.hypot(dx,dy);
    const hit=h.kind==='ring'?Math.abs(distance-radius)<=h.width/2&&this.unobstructed(h.origin,t):h.kind==='line'?along>=0&&along<=h.radius&&Math.abs(across)<=h.width/2&&this.unobstructed(h.origin,t):this.inCone(h.origin,t,h.angle,h.radius,h.kind==='circle'||h.kind==='well'?-1:.35);
    if(hit){this.state.damage(h.fx==='StoneImpact'||h.fx==='StoneWave'?'Ударная волна':h.fx==='Bloom'?'Цветение':h.fx==='EchoBeam'?'Разлом Эха':h.fx==='RegentBeam'?'Луч Регента':h.kind==='well'?'Чёрное солнце':'Взмах');break;}
   }return true;
  });
 }
 private knockback(e:EnemyUnit,dt:number):void{
  const step=Math.min(dt,e.knock.left);if(step<=0)return;e.knock.left-=step;
  const n=Math.max(1,Math.ceil(Math.hypot(e.knock.x,e.knock.y)*step/5)),walls=this.runtime.objects.Wall.getAllInstances();
  for(let i=0;i<n;i++){const to={x:e.sprite.x+e.knock.x*step/n,y:e.sprite.y+e.knock.y*step/n};if(to.x<60||to.x>1140||to.y<225||to.y>605||walls.some(w=>segmentHit(e.sprite,to,w,14)!==null))break;e.sprite.x=to.x;e.sprite.y=to.y;}
 }

 update(dt:number,previousPlayer:Point,enemiesActive=true,realDt=dt):void{
  this.feedbackTime=Math.max(0,this.feedbackTime-realDt);if(!this.feedbackTime)this.feedback='';
  const player=this.runtime.objects.Player.getFirstInstance()!,walls=this.runtime.objects.Wall.getAllInstances();this.state.update(dt);
  this.bullets=this.bullets.filter(b=>{
   const s=b.sprite,from={x:s.x,y:s.y};if(b.orbit&&dt>0){const o=b.orbit;o.left-=dt;o.angle+=dt*1.7;s.x=o.center.x+Math.cos(o.angle)*o.radius;s.y=o.center.y+Math.sin(o.angle)*o.radius;if(o.left<=0){b.vx=Math.cos(o.angle)*o.speed;b.vy=Math.sin(o.angle)*o.speed;b.orbit=undefined;}}if(b.curve&&dt>0){const a=Math.atan2(b.vy,b.vx)+b.curve*dt,speed=Math.hypot(b.vx,b.vy);b.vx=Math.cos(a)*speed;b.vy=Math.sin(a)*speed;s.angle=a;}
   const to={x:s.x+b.vx*dt,y:s.y+b.vy*dt},wallHit=Math.min(...walls.map(w=>segmentHit(from,to,w,4)??Infinity)),hit=relativeHit(from,to,previousPlayer,player,{x:0,y:0,width:10,height:10});b.age+=dt;s.animationFrame=Math.floor(b.age*12)%6;
   if(hit!==null&&hit<wallHit)this.state.damage(b.style==='Arrow'?'Стрела':b.style==='EchoOrb'?'Призма Эха':b.style==='RegentLance'?'Копьё Регента':b.style==='ShadowNeedle'?'Зеркальная игла':b.style==='VoidOrb'?'Сфера затмения':'Лепесток Цветения');if(wallHit!==Infinity||hit!==null||b.age>7){this.removeBullet(b);return false;}s.x=to.x;s.y=to.y;return true;
  });
  this.playerBolts=this.playerBolts.filter(b=>{
   const from={x:b.sprite.x,y:b.sprite.y},to={x:from.x+b.vx*dt,y:from.y+b.vy*dt};b.age+=dt;const wall=Math.min(...walls.map(w=>segmentHit(from,to,w,4)??Infinity));
   const hits=this.enemies.filter(e=>!b.hit!.has(e.sprite)).map(e=>({e,t:segmentHit(from,to,{x:e.sprite.x,y:e.sprite.y-(this.isBoss(e.kind)?22:4),width:this.isBoss(e.kind)?50:24,height:this.isBoss(e.kind)?76:28},5)??Infinity})).filter(h=>h.t<wall).sort((a,b)=>a.t-b.t);
   for(const h of hits){b.hit!.add(h.e.sprite);if(!this.guarded(h.e,from))this.hit(h.e,b.damage!,from,b.knock??0);else this.blocked(h.e,from);b.pierce!--;if(b.pierce!<=0)break;}
   if(wall!==Infinity||b.pierce!<=0||b.age>b.lifetime!){this.removeBullet(b);return false;}b.sprite.x=to.x;b.sprite.y=to.y;b.sprite.animationFrame=Math.floor(b.age*12)%6;return true;
  });
  if(enemiesActive)this.updateAreas(dt,previousPlayer,player);
  for(const e of this.enemies){
   e.hurt=Math.max(0,e.hurt-realDt);e.sprite.colorRgb=e.hurt>0?[1,.2,.3]:[1,1,1];
   if(!enemiesActive)continue;this.knockback(e,dt);
   const old={x:e.sprite.x,y:e.sprite.y},phase=this.isBoss(e.kind)?e.hp<=e.maxHp*.3?3:e.hp<=e.maxHp*.65?2:1:1;
   if(phase!==e.phase&&dt>0){this.clearThreats(e.sprite);this.cancel(e);e.phase=phase;this.effects?.flash(e.sprite.x,e.sprite.y,e.kind==='warden'?'Bloom':e.kind==='regent'?'VoidBurst':'EchoBurst',160,.6,0,true);}
   const interval=e.kind==='viper'?(phase>1?1.1:1.5):e.kind==='hunter'?2.2:this.isBoss(e.kind)?(phase===3?1.7:phase===2?2:2.4):1.35;
   const warning=e.kind==='viper'?.45:e.kind==='hunter'?.65:this.isBoss(e.kind)?1:.6;let lunging=false;
   if(dt>0){
    if(e.knock.left>0){}
    else if(e.recovery>0)e.recovery=Math.max(0,e.recovery-dt);
    else{
     e.timer+=dt;if(!e.locked&&e.timer>=interval-warning){this.lock(e,player);e.timer=Math.min(e.timer,interval-warning+dt);}
     lunging=(e.kind==='hunter'||e.kind==='viper')&&e.locked&&e.timer>=interval-.22;
     if((['hunter','viper','bulwark'].includes(e.kind)&&(!e.locked||lunging))||(e.kind==='warden'&&!e.locked&&e.attackIndex%3===0))this.move(e,dt,lunging);
     if(lunging){if(!e.lunged){e.lunged=true;this.effects?.flash(e.sprite.x,e.sprite.y,'SteelCut',e.kind==='viper'?110:85,.25,e.angle,true);}if(this.unobstructed(player,e.sprite)&&relativeHit(previousPlayer,player,old,{x:e.sprite.x,y:e.sprite.y,width:24,height:20},{x:0,y:0,width:22,height:20})!==null)this.state.damage(e.kind==='viper'?'Рывок Стремника':'Выпад охотника');}
     if(e.timer>=interval)this.release(e);
    }
    e.sprite.opacity=e.kind==='shade'&&e.recovery>.3?.2:Math.min(1,e.sprite.opacity+dt*4);
   }
   this.showIntent(e);
   if(e.aura){e.aura.setAnimation(e.kind==='warden'?'BloomSeal':e.kind==='regent'?'RegentSeal':'EchoSeal');e.aura.animationFrame=Math.floor(this.state.worldSeconds*8)%6;e.aura.isVisible=['warden','echo','regent'].includes(e.kind)&&e.phase>1;e.aura.x=e.sprite.x;e.aura.y=e.sprite.y+8;e.aura.width=e.phase===3?190:145;e.aura.height=e.aura.width;e.aura.opacity=.45;}
   if(e.kind==='bulwark'&&!e.locked)e.angle=Math.atan2(player.y-e.sprite.y,player.x-e.sprite.x);
   e.animator.update(e.sprite,e.kind,dt,Math.hypot(e.sprite.x-old.x,e.sprite.y-old.y)>.01,e.locked&&!lunging,lunging?.4:e.recovery,e.angle,e.phase);
  }
 }
}
