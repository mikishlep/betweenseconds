import { WEAPONS, type Weapon } from './Weapons';
export class PlayerActions {
 private queued=false;private queuedAim:number|null=null;private cooldown=0;private active=0;private pending=-1;private pulseWasDown=false;private direction={x:0,y:1};
 constructor(private readonly runtime:IRuntime){this.pulseWasDown=runtime.keyboard.isKeyDown('KeyE');}
 get acting():boolean{return this.active>0;}
 get angle():number{return Math.atan2(this.direction.y,this.direction.x);}
 cancel():void{this.pending=-1;this.active=0;this.queued=false;}
 requestAttack(angle?:number):void{this.queued=true;this.queuedAim=angle??null;}
 update(dt:number,playing:boolean,pulseAvailable:boolean,weapon:Weapon='blade'):{strike:boolean;pulse:boolean;windup:boolean}{
  if(!playing){this.queued=false;return{strike:false,pulse:false,windup:false};}
  this.cooldown=Math.max(0,this.cooldown-dt);if(this.cooldown<1e-6)this.cooldown=0;this.active=Math.max(0,this.active-dt);
  const key=(c:string)=>this.runtime.keyboard.isKeyDown(c),x=Number(key('KeyD'))-Number(key('KeyA')),y=Number(key('KeyS'))-Number(key('KeyW'));
  if(this.pending<0){if(x)this.direction={x:Math.sign(x),y:0};else if(y)this.direction={x:0,y:Math.sign(y)};}
  let strike=false,windup=false;
  if(this.pending>=0){this.pending-=dt;if(this.pending<=0){strike=true;this.pending=-1;}}
  if(this.queued&&this.cooldown===0&&this.pending<0){const spec=WEAPONS[weapon];if(this.queuedAim!==null)this.direction={x:Math.cos(this.queuedAim),y:Math.sin(this.queuedAim)};this.cooldown=spec.cooldown;this.pending=spec.windup;this.active=spec.windup+.22;windup=true;}
  const down=key('KeyE'),pulse=pulseAvailable&&down&&!this.pulseWasDown;this.pulseWasDown=down;this.queued=false;this.queuedAim=null;
  if(pulse)this.active=Math.max(this.active,.3);
  return{strike,pulse,windup};
 }
}
