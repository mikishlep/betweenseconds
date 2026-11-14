import {Campaign,type RoomSpec,type Zone} from '../game/Rooms';
import type {GameState} from '../game/GameState';
import {segmentHit,type Point} from '../game/geometry';
const COVER=[[[430,360,136,36],[810,440,152,36]],[[400,220,136,36],[400,520,136,36]],[[440,250,120,36],[770,470,160,36]]];
export const DOOR_ANCHORS:Record<Zone,{x:number;y:number}>={Garden:{x:1115,y:255},City:{x:1118,y:360},Archive:{x:1118,y:340},Citadel:{x:1118,y:365},Source:{x:1105,y:390}};
export class RoomWorld{
 private chest:Sprite|null=null;private gateWall:Sprite|null=null;private door:Point;private memories=new Map<Sprite,string>();private age=0;notice='';
 constructor(private readonly runtime:IRuntime,room:RoomSpec,private readonly campaign:Campaign){
  for(const w of runtime.objects.Wall.getAllInstances())if(w.isVisible)w.destroy();
  for(const[x,y,width,height]of COVER[room.cover??0]){const w=runtime.objects.Wall.createInstance('scene',x,y);w.width=width;w.height=height;w.isVisible=true;}
  const door=this.door=DOOR_ANCHORS[room.zone??'Garden'],exit=runtime.objects.Exit.getFirstInstance()!;exit.x=door.x;exit.y=door.y;exit.width=80;exit.height=95;exit.isVisible=false;exit.opacity=0;
  if(runtime.objects.WorldProp){for(const p of runtime.objects.WorldProp.getAllInstances())p.destroy();
   if(room.optional){this.chest=runtime.objects.WorldProp.createInstance('scene',600,360);this.chest.setAnimation(campaign.opened.has(campaign.room)?'ChestOpen':'Chest');this.chest.width=64;this.chest.height=56;}
  }
  this.gateWall=runtime.objects.Wall.createInstance('scene',door.x+25,door.y);this.gateWall.width=18;this.gateWall.height=90;this.gateWall.isVisible=false;
  runtime.objects.TimeFragment.getAllInstances().forEach((s,i)=>{
   const key=(runtime.layout.name==='Tutorial'?'tutorial':String(campaign.room))+':'+i;
   if(room.optional||campaign.memories.has(key)){s.destroy();return;}
   s.setAnimation('Memory');s.width=18;s.height=24;s.animationSpeed=0;this.memories.set(s,key);
  });
 }
 unlock():void{this.gateWall?.destroy();this.gateWall=null;}
 update(dt:number,previous:Point,player:Sprite,state:GameState):void{
  this.age+=dt;
  for(const[s,key]of this.memories){s.animationFrame=Math.floor(this.age*8)%6;if(segmentHit(previous,player,s,10)!==null){if(this.campaign.collectMemory(key))state.collect();s.destroy();this.memories.delete(s);}}
 }
 interact(player:Sprite,state:GameState):void{
  if(!this.chest||state.enemiesRemaining||Math.hypot(player.x-this.chest.x,player.y-this.chest.y)>70)return;
  if(this.campaign.loot()){state.hp=Math.min(state.maxHp,state.hp+1);this.chest.setAnimation('ChestOpen');this.notice='3 осколка памяти · +1 здоровье';}
  else if(state.hp<state.maxHp&&this.campaign.coins>=3){this.campaign.coins-=3;state.hp++;this.notice='Восстановлено 1 здоровье · −3 осколка';}
  else this.notice='Сундук пуст · лечение стоит 3 осколка';
 }
 hint(player?:Point,cleared=false,remaining=0):string{
  if(this.notice)return this.notice;
  if(this.chest&&player&&Math.hypot(player.x-this.chest.x,player.y-this.chest.y)<90)return'F · сундук / лечение за 3 осколка';
  if(!cleared&&player&&Math.hypot(player.x-this.door.x,player.y-this.door.y)<170)return `Проход пока закрыт · осталось угроз: ${remaining}`;
  return cleared?'Путь открыт · пройдите через арку справа →':'';
 }
}
