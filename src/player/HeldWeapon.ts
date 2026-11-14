import {WEAPONS,type Weapon} from '../combat/Weapons';
/** Equipment is separate from the designer's unchanged character sheets. */
export class HeldWeapon{
 readonly sprite:Sprite|undefined;private elapsed=10;
 constructor(private readonly runtime:IRuntime){this.sprite=runtime.objects.WorldProp?.createInstance('scene',0,0);}
 attack():void{this.elapsed=0;}
 update(weapon:Weapon,aim:number,playing:boolean):void{
  const s=this.sprite;if(!s)return;const p=this.runtime.objects.Player.getFirstInstance()!,spec=WEAPONS[weapon];
  if(playing)this.elapsed+=Math.min(p.dt,1/30);
  // The authored blade animation already contains its own sword.
  s.isVisible=weapon!=='blade';s.setAnimation('Weapon'+weapon[0].toUpperCase()+weapon.slice(1));s.animationSpeed=0;
  const swing=!spec.ranged&&this.elapsed<spec.windup+.16;
  const angle=aim+(swing?this.elapsed<spec.windup?-.9:-.9+Math.min(1,(this.elapsed-spec.windup)/.16)*1.8:0);
  s.angle=angle;s.x=p.x+Math.cos(aim)*12;s.y=p.y+8+Math.sin(aim)*9;
  s.width=weapon==='maul'?38:weapon==='lance'?42:32;s.height=s.width;s.opacity=p.opacity;
 }
}
