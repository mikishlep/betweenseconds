import {WEAPONS,type Weapon} from '../combat/Weapons';
/** Equipment is separate from the designer's unchanged character sheets. */
export class HeldWeapon{
 readonly sprite:Sprite|undefined;private elapsed=10;private weapon:Weapon|null=null;
 constructor(private readonly runtime:IRuntime){this.sprite=runtime.objects.WorldProp?.createInstance('scene',0,0);}
 attack():void{this.elapsed=0;}
 update(weapon:Weapon,aim:number,playing:boolean):void{
  const s=this.sprite;if(!s)return;const p=this.runtime.objects.Player.getFirstInstance()!,spec=WEAPONS[weapon];
  if(playing)this.elapsed+=Math.min(p.dt,1/30);
  // The authored blade animation already contains its own sword.
  s.isVisible=weapon!=='blade';if(this.weapon!==weapon){s.setAnimation('Weapon'+weapon[0].toUpperCase()+weapon.slice(1));this.weapon=weapon;}s.animationSpeed=0;
  const attacking=this.elapsed<spec.windup+.18,side=Math.cos(aim)<0?-1:1;
  const rest=side>0?.7:Math.PI-.7;
  const swing=attacking&&!spec.ranged;
  const angle=spec.ranged?aim:swing?aim+(this.elapsed<spec.windup?-.95:-.95+Math.min(1,(this.elapsed-spec.windup)/.18)*1.9):rest;
  // Rotate about the grip at the hand, not about an offset point in front.
  s.angle=angle;s.x=p.x+side*6;s.y=p.y+6;
  s.width=weapon==='maul'?27:weapon==='lance'?34:28;s.height=s.width;s.opacity=p.opacity;
 }
}
