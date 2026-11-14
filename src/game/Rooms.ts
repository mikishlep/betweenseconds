export type EnemyKind = "shooter" | "hunter" | "warden" | "echo" | "regent" | "bulwark" | "viper" | "shade";
export type Zone = "Garden" | "City" | "Archive" | "Citadel" | "Source";
import { STARTING_WEAPONS, type Weapon } from '../combat/Weapons';
export { WEAPONS, type Weapon } from '../combat/Weapons';
export interface EnemySpawn { kind: EnemyKind; x: number; y: number; hp: number; }
export interface RoomSpec { title: string; subtitle: string; enemies: EnemySpawn[]; tint: [number, number, number]; par: number; zone?: Zone; next?: number[]; optional?: boolean; reward?: Weapon; cover?: number; }
const archer = (x:number,y:number):EnemySpawn => ({kind:"shooter",x,y:Math.max(240,y),hp:2});
const hunter = (x:number,y:number,hp=2):EnemySpawn => ({kind:"hunter",x,y:Math.max(240,y),hp});
const room=(title:string,subtitle:string,zone:Zone,enemies:EnemySpawn[],next:number[],cover:number,extra:Partial<RoomSpec>={}):RoomSpec=>({title,subtitle,zone,enemies,next,cover,tint:[1,1,1],par:enemies.reduce((n,e)=>n+e.hp,0)+3,...extra});
export const ROOMS: RoomSpec[] = [
 room("01 / ЖИВОЙ САД","Знамёна ещё целы. Стражи охраняют пустой сад.","Garden",[archer(620,360),hunter(960,510)],[12],0),
 room("02 / ХРАНИТЕЛЬ ЦВЕТЕНИЯ","Светлая броня проросла розовыми трещинами.","Garden",[{kind:"warden",x:780,y:360,hp:8}],[3,2],1,{reward:"rose"}),
 room("ТАЙНИК / САДОВАЯ ЧАСОВНЯ","Здесь оставили припасы для тех, кто ещё вернётся.","Garden",[],[3],2,{optional:true}),
 room("03 / ОПУСТЕВШИЙ ГОРОД","Лампы горят. Все ставни закрыты изнутри.","City",[archer(650,180),archer(970,530),hunter(900,330)],[4],2),
 room("04 / СЛОМАННЫЕ ЗНАМЁНА","Герб садовых стражей лежит под ногами.","City",[hunter(700,220),hunter(950,500),archer(1020,180)],[6,5],0),
 room("ТАЙНИК / СТАРЫЙ СКЛАД","Внутри уцелел запечатанный дорожный сундук.","City",[],[6],1,{optional:true}),
 room("05 / РАСКОЛОТЫЙ АРХИВ","Записи обрываются у схем временного разлома.","Archive",[archer(700,240),hunter(940,480,3),archer(980,250)],[13],2),
 room("06 / ЭХО","Исследователь остался сразу в нескольких мгновениях.","Archive",[{kind:"echo",x:820,y:360,hp:10}],[8],1,{reward:"lance"}),
 room("07 / ЗАРАЖЁННАЯ ЦИТАДЕЛЬ","Те же гербы. Теперь они удерживают заражение внутри.","Citadel",[archer(640,200),hunter(920,520,3),archer(1020,260)],[9],0),
 room("08 / ПОСЛЕДНИЙ ДОЗОР","Усиленные стражи не дают подойти к печати.","Citadel",[hunter(780,250,4),hunter(950,500,4),archer(1000,180)],[10],2),
 room("09 / У ГРАНИЦЫ ВРЕМЕНИ","Каменная кладка висит над провалом. Печати смотрят внутрь.","Source",[archer(720,240),archer(990,500),hunter(940,260,3)],[14],1),
 room("10 / ПОСЛЕДНИЙ РЕГЕНТ","Чёрное солнце удерживается трещинами в его теле.","Source",[{kind:"regent",x:820,y:360,hp:14}],[],1),
 room("СТРАЖ / КАМЕННЫЙ БАСТИОН","Молот пробивает щит. Иначе дождись замаха, обойди или используй E.","Garden",[{kind:"bulwark",x:820,y:360,hp:7}],[1],1),
 room("СТРАЖ / БАГРОВЫЙ СТРЕМНИК","Рывок выдаёт полоса. Перехвати его в конце выпада.","Archive",[{kind:"viper",x:820,y:360,hp:6}],[7],2),
 room("СТРАЖ / БЕЗЛИКИЙ ОСКОЛОК","Призрак проявляется после атаки. Импульс срывает маскировку.","Source",[{kind:"shade",x:820,y:360,hp:6}],[11],1)
];
export const TUTORIAL_ROOM: RoomSpec = { title: "ОБУЧЕНИЕ / МЕЖДУ СЕКУНДАМИ", subtitle: "Двигайся или атакуй — мир оживает.", zone:"Garden", tint:[1,1,1],cover:0,par:3,enemies:[archer(620,360)] };
export type RewardChoice=Weapon|'aegis'|'focus';
export class Campaign {
 arrivalFade=false;
 room=0;hp=3;maxHp=3;pulseCap=1;coins=0;weapon:Weapon="blade";visited=new Set<number>([0]);cleared=new Set<number>();opened=new Set<number>();memories=new Set<string>();claimed=new Set<number>();
 private unlocked=new Set<Weapon>(STARTING_WEAPONS);
 get current():RoomSpec{return ROOMS[this.room];}
 get last():boolean{return this.current.next?.length===0;}
 get available():Weapon[]{return [...this.unlocked];}
 get offer():RewardChoice[]{return this.cleared.has(this.room)&&!this.claimed.has(this.room)&&this.current.reward ? [this.current.reward,this.current.reward==='rose'?'aegis':'focus']:[];}
 reset(weapon:Weapon='blade'):void{this.room=0;this.hp=3;this.maxHp=3;this.pulseCap=1;this.coins=0;this.weapon=STARTING_WEAPONS.includes(weapon)?weapon:'blade';this.visited=new Set([0]);this.cleared.clear();this.opened.clear();this.memories.clear();this.claimed.clear();this.unlocked=new Set(STARTING_WEAPONS);}
 complete(hp:number):void{
  this.hp=hp;if(this.cleared.has(this.room))return;
  this.cleared.add(this.room);this.coins+=this.current.reward?3:this.current.optional?0:1;
 }
 chooseReward(choice:RewardChoice):boolean{
  if(!this.offer.includes(choice))return false;
  this.claimed.add(this.room);
  if(choice==='aegis'){this.maxHp=4;this.hp=Math.min(this.maxHp,this.hp+1);}
  else if(choice==='focus')this.pulseCap=2;
  else{this.unlocked.add(choice);this.weapon=choice;}
  return true;
 }
 equip(weapon:Weapon):boolean{if(!this.unlocked.has(weapon))return false;this.weapon=weapon;return true;}
 advance(target=this.current.next?.[0]):boolean{
  if(this.offer.length)return false;
  if(this.last){this.reset();return true;}
  if(target===undefined||!this.current.next?.includes(target))return false;
  this.room=target;this.visited.add(target);return true;
 }
 loot():boolean{if(this.opened.has(this.room))return false;this.opened.add(this.room);this.coins+=3;return true;}
 collectMemory(key:string):boolean{if(this.memories.has(key))return false;this.memories.add(key);this.coins++;return true;}
 cycleWeapon():void{const list=this.available;this.weapon=list[(list.indexOf(this.weapon)+1)%list.length];}
}
