import type {Point} from '../game/geometry';
interface Flash {sprite:Sprite;age:number;duration:number;size:number;aspect:number;world:boolean;opacity:number;frames:number;}
const groundLights=new WeakSet<Sprite>();
export const isGroundLight=(s:Sprite):boolean=>groundLights.has(s);
const palettes:Record<string,[number,number,number]>={Echo:[.35,.3,1],Regent:[1,.12,.65],Rose:[1,.12,.5],Player:[.1,.8,1],Stone:[1,.5,.16],Steel:[1,.15,.35],Hit:[1,.08,.18],Void:[.6,.15,1]};
function color(name:string):[number,number,number]{return palettes[Object.keys(palettes).find(k=>name.includes(k))??'Player'];}
/** Crisp animated cores, separate restrained light pools, and complete animated energy beams. */
export class Effects{
 private flashes:Flash[]=[];private lights=new Map<Sprite,{sprite:Sprite;size:number;age:number}>();
 constructor(private readonly runtime:IRuntime){for(const s of runtime.objects.CombatFx.getAllInstances())s.destroy();}
 private glow(x:number,y:number,size:number,tint:[number,number,number],opacity:number):Sprite{
  const s=this.runtime.objects.CombatFx.createInstance('scene',x,y);s.setAnimation('Glow');s.animationSpeed=0;s.width=size;s.height=size*.58;s.colorRgb=tint;s.blendMode='additive';s.opacity=opacity;groundLights.add(s);return s;
 }
 light(target:Sprite,name:string,size:number):void{
  if(this.lights.has(target)||this.lights.size>=72)return;
  this.lights.set(target,{sprite:this.glow(target.x,target.y+5,size,color(name),.25),size,age:0});
 }
 releaseLight(target:Sprite):void{this.lights.get(target)?.sprite.destroy();this.lights.delete(target);}
 flash(x:number,y:number,animation:string,size:number,duration=.32,angle=0,world=false,_aspectOverride?:number):void{
  if(this.flashes.length>=180)return;
  const s=this.runtime.objects.CombatFx.createInstance('scene',x,y);s.setAnimation(animation);s.animationSpeed=0;s.angle=angle;s.blendMode='normal';
  const aspect=animation.endsWith('Ray')?.25:animation==='Pulse'?.65:1;
  const stone=animation==='StoneImpact'||animation==='PlayerImpact'||animation==='StoneWave';
  const opacity=stone?.8:.96;s.opacity=opacity;s.width=size;s.height=size*aspect;
  this.flashes.push({sprite:s,age:0,duration,size,aspect,world,opacity,frames:6});
  if(animation.endsWith('Ray')){
   const glow=this.runtime.objects.CombatFx.createInstance('scene',x,y+3);glow.setAnimation(animation);glow.animationSpeed=0;glow.angle=angle;glow.width=size;glow.height=size*aspect;glow.blendMode='additive';glow.opacity=.2;groundLights.add(glow);
   this.flashes.push({sprite:glow,age:0,duration,size,aspect,world,opacity:.2,frames:6});
  }else{
   const glowSize=stone?size*.9:size*1.25,glow=this.glow(x,y+4,glowSize,color(animation),stone?.1:.24);
   this.flashes.push({sprite:glow,age:0,duration,size:glowSize,aspect:.58,world,opacity:stone?.1:.24,frames:1});
  }
 }
 beam(origin:Point,angle:number,length:number,width:number,style:string,duration=.4):void{
  // A complete 512x128 authored animation, uniformly scaled. No tiles, seams,
  // projectile copies or independent rectangular pieces along the attack.
  this.flash(origin.x+Math.cos(angle)*length/2,origin.y+Math.sin(angle)*length/2,style==='RegentBeam'?'RegentRay':'EchoRay',length,duration,angle,true);
 }

 update(dt:number,worldDt=dt):void{
  this.flashes=this.flashes.filter(f=>{f.age+=f.world?worldDt:dt;if(f.age>=f.duration){f.sprite.destroy();return false;}
   const t=f.age/f.duration;f.sprite.animationFrame=Math.min(f.frames-1,Math.floor(t*f.frames));f.sprite.opacity=f.opacity*(1-t*.75);return true;
  });
  for(const[target,l]of this.lights){l.age+=worldDt;l.sprite.x=target.x;l.sprite.y=target.y+5;l.sprite.opacity=.21+Math.sin(l.age*9)*.035;}
 }
}
