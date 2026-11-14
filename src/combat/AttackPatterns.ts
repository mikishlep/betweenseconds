import type {EnemyKind} from '../game/Rooms';
export type ProjectileStyle='Arrow'|'Petal'|'EchoOrb'|'RegentLance'|'ShadowNeedle'|'VoidOrb';
export interface AttackPlan{type:'none'|'thrust'|'sweep'|'fan'|'ring'|'bloom'|'prison'|'cross'|'stamp'|'slam'|'orbital'|'well'|'wave';count:number;range:number;width:number;speed:number;style:ProjectileStyle;fx:string;}
const p=(type:AttackPlan['type'],count:number,range:number,fx:string,style:ProjectileStyle='Arrow',speed=160,width=24):AttackPlan=>({type,count,range,fx,style,speed,width});
export function attackPlan(kind:EnemyKind,phase:number,index:number):AttackPlan{
 const i=index%3;
 if(kind==='warden'){
  if(phase===1)return[p('thrust',1,160,'RoseThrust','Petal'),p('sweep',1,140,'RoseSweep','Petal'),p('fan',5,300,'Bloom','Petal',140)][i];
  if(phase===2)return[p('sweep',1,170,'RoseSweep','Petal'),p('bloom',3,36,'Bloom','Petal'),p('fan',7,330,'Bloom','Petal',155)][i];
  return[p('bloom',5,42,'Bloom','Petal'),p('fan',11,360,'Bloom','Petal',175),p('sweep',1,200,'RoseSweep','Petal')][i];
 }
 if(kind==='echo'){
  if(phase===1)return[p('ring',10,300,'EchoBurst','EchoOrb',110),p('cross',2,360,'EchoBeam','EchoOrb'),p('prison',4,95,'EchoBurst','EchoOrb',125)][i];
  if(phase===2)return[p('orbital',12,85,'EchoBurst','EchoOrb',135),p('prison',6,110,'EchoBurst','EchoOrb',125),p('cross',3,400,'EchoBeam','EchoOrb',160,28)][i];
  return[p('cross',4,470,'EchoBeam','EchoOrb',160,28),p('orbital',18,95,'EchoBurst','EchoOrb',155),p('prison',8,125,'EchoBurst','EchoOrb',145)][i];
 }
 if(kind==='regent'){
  if(phase===1)return[p('fan',3,430,'RoyalCut','RegentLance',220),p('sweep',1,165,'RoyalCut','RegentLance'),p('stamp',1,46,'VoidBurst','VoidOrb')][i];
  if(phase===2)return[p('orbital',8,100,'VoidBurst','VoidOrb',120),p('cross',3,440,'RegentBeam','RegentLance',180,32),p('well',2,40,'VoidWell','VoidOrb')][i];
  return[p('cross',4,510,'RegentBeam','RegentLance',180,36),p('orbital',14,115,'VoidBurst','VoidOrb',150),p('well',3,46,'VoidWell','VoidOrb')][i];
 }
 if(kind==='acolyte')return index%2?p('prison',3,75,'EchoBurst','EchoOrb',110):p('ring',7,240,'EchoBurst','EchoOrb',100);
 if(kind==='sentinel')return p('wave',1,170,'StoneWave','Arrow',160,18);
 if(kind==='bulwark')return phase===1?p('slam',1,110,'StoneImpact'):p('wave',1,210,'StoneWave','Arrow',160,22);
 if(kind==='shade')return p('fan',3,350,'ShadowCut','ShadowNeedle',195);
 if(kind==='shooter')return p('fan',1,440,'SteelCut','Arrow',205);
 return p('none',0,140,'SteelCut');
}
