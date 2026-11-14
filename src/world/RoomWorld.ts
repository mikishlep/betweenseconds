import { Campaign, type RoomSpec } from "../game/Rooms";
import type { GameState } from "../game/GameState";
const COVER=[[[430,360,136,36],[810,440,152,36]],[[400,220,136,36],[400,520,136,36]],[[440,250,120,36],[770,470,160,36]]];
/** Dynamic room geometry shares the existing layout; art has no hidden collisions. */
export class RoomWorld {
 private chest:Sprite|null=null;
 notice="";
 constructor(private readonly runtime:IRuntime,room:RoomSpec,private readonly campaign:Campaign){
  for(const w of runtime.objects.Wall.getAllInstances())if(w.isVisible)w.destroy();
  for(const [x,y,width,height] of COVER[room.cover??0]){const w=runtime.objects.Wall.createInstance('scene',x,y);w.width=width;w.height=height;w.isVisible=true;}
  if(runtime.objects.WorldProp){
   for(const p of runtime.objects.WorldProp.getAllInstances())p.destroy();
   if(room.optional){this.chest=runtime.objects.WorldProp.createInstance('scene',600,360);this.chest.setAnimation(campaign.opened.has(campaign.room)?'ChestOpen':'Chest');this.chest.width=64;this.chest.height=56;}
  }
  if(room.optional)for(const f of runtime.objects.TimeFragment.getAllInstances())f.destroy();
 }
 interact(player:Sprite,state:GameState):void{
  if(!this.chest||state.enemiesRemaining||Math.hypot(player.x-this.chest.x,player.y-this.chest.y)>70)return;
  if(this.campaign.loot()){state.hp=Math.min(3,state.hp+1);this.chest.setAnimation('ChestOpen');this.notice='Найдено: 3 осколка памяти · +1 здоровье';}
  else if(state.hp<3&&this.campaign.coins>=3){this.campaign.coins-=3;state.hp++;this.notice='Восстановлено 1 здоровье · потрачено 3 осколка';}
  else this.notice='Сундук пуст · лечение стоит 3 осколка, максимум 3 HP';
 }
 get hint():string{return this.chest?'F · сундук / восстановление за 3 осколка':'';}
}
