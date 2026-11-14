import { segmentHit } from "../game/geometry";
interface Snapshot { sprite: Sprite; x: number; y: number; phase: number; eligible: boolean; }
export class TimeController {
 private x=0;private y=0;private enemies:Snapshot[]=[];private origins=new Map<Sprite,number>();private applied=new Map<Sprite,number>();
 constructor(private readonly runtime:IRuntime,private readonly isSineEnemy:(enemy:Sprite)=>boolean=()=>true){runtime.timeScale=0;}
 get previousPosition(){return{x:this.x,y:this.y};}
 beforeTick(playing:boolean):void{
  const p=this.runtime.objects.Player.getFirstInstance()!;this.x=p.x;this.y=p.y;
  this.enemies=this.runtime.objects.TestEnemy.getAllInstances().map(sprite=>{
   if(!this.origins.has(sprite))this.origins.set(sprite,sprite.x);
   else if(this.applied.has(sprite))this.origins.set(sprite,this.origins.get(sprite)!+sprite.x-this.applied.get(sprite)!);
   const eligible=playing&&this.isSineEnemy(sprite);sprite.timeScale=eligible?1:0;
   return{sprite,x:sprite.x,y:sprite.y,phase:sprite.behaviors['Синусоида'].phase,eligible};
  });
 }
 afterTick(playing:boolean,acting=false):number{
  const p=this.runtime.objects.Player.getFirstInstance()!,dt=Math.min(p.dt,1/30),active=playing&&(acting||Math.hypot(p.x-this.x,p.y-this.y)>.01);
  this.runtime.timeScale=active?1:0;
  for(const e of this.enemies){
   if(active&&e.eligible){
    const desired=this.origins.get(e.sprite)!+e.sprite.behaviors['Синусоида'].value;
    const x=e.x+Math.max(-80*dt,Math.min(80*dt,desired-e.x));
    if(this.runtime.objects.Wall.getAllInstances().every(w=>segmentHit({x:e.x,y:e.y},{x,y:e.y},w,14)===null))e.sprite.x=x;
   }else{e.sprite.behaviors['Синусоида'].phase=e.phase;e.sprite.x=e.x;e.sprite.y=e.y;}
   this.applied.set(e.sprite,e.sprite.x);
  }
  const alive=new Set(this.runtime.objects.TestEnemy.getAllInstances());for(const e of this.origins.keys())if(!alive.has(e)){this.origins.delete(e);this.applied.delete(e);}
  return active?dt:0;
 }
}
