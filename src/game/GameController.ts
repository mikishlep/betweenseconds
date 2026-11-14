import {RoomWorld} from '../world/RoomWorld';
import {SceneTransition} from '../world/SceneTransition';
import {Menu} from '../ui/Menu';
import {toggleFullscreen} from '../ui/Display';
import {TutorialController} from './TutorialController';
import {HeroAnimator} from '../player/HeroAnimator';
import {HeldWeapon} from '../player/HeldWeapon';
import {PlayerController} from '../player/PlayerController';
import {PlayerActions} from '../combat/PlayerActions';
import {WEAPONS,STARTING_WEAPONS,type Weapon} from '../combat/Weapons';
import {TimeController} from '../systems/TimeController';
import {HudController} from '../ui/Hud';
import {GameState} from './GameState';
import {CombatSystem} from './CombatSystem';
import {segmentHit} from './geometry';
import {Campaign,TUTORIAL_ROOM,type RoomSpec,type RewardChoice} from './Rooms';
import {Effects} from '../world/Effects';
import {Depth} from '../world/Depth';
import {Presentation} from '../world/Presentation';
export class GameController{
 readonly state=new GameState();private readonly player:PlayerController;private readonly actions:PlayerActions;private readonly time:TimeController;private readonly combat:CombatSystem;private readonly hud:HudController;
 private readonly tutorial:TutorialController|null;private readonly hero:HeroAnimator;private readonly effects:Effects;private readonly presentation:Presentation;private readonly depth:Depth;private readonly room:RoomSpec;private readonly world:RoomWorld;private readonly transition:SceneTransition;
 private pending={strike:false,pulse:false,windup:false};private was=new Set<string>();private restarting=false;private cleared=false;private arrival=3;private damageFlash=0;private lastHp=3;
 private readonly held:HeldWeapon;
 constructor(private readonly runtime:IRuntime,private readonly campaign=new Campaign(),private readonly menu=new Menu()){
  this.tutorial=runtime.layout.name==='Tutorial'?new TutorialController(runtime):null;this.room=this.tutorial?TUTORIAL_ROOM:campaign.current;
  this.transition=new SceneTransition(campaign.arrivalFade);campaign.arrivalFade=false;
  this.effects=new Effects(runtime);this.world=new RoomWorld(runtime,this.room,campaign);
  this.state.maxHp=campaign.maxHp;this.state.maxPulseCharge=campaign.pulseCap;this.state.pulseCharge=campaign.pulseCap;this.state.hp=this.tutorial?campaign.maxHp:campaign.hp;this.lastHp=this.state.hp;
  this.combat=new CombatSystem(runtime,this.state,this.room,this.effects);this.combat.weapon=campaign.weapon;
  this.hero=new HeroAnimator(runtime);this.held=new HeldWeapon(runtime);this.player=new PlayerController(runtime);this.actions=new PlayerActions(runtime);this.time=new TimeController(runtime,s=>this.combat.isShooter(s));this.hud=new HudController(runtime);this.depth=new Depth(runtime);this.presentation=new Presentation(runtime,this.room);
  for(const k of ['KeyF','KeyQ','KeyM','KeyR','KeyH','Enter','Escape'])if(runtime.keyboard.isKeyDown(k))this.was.add(k);
  runtime.objects.HowToControl.getFirstInstance()!.addEventListener('click',e=>this.click(e.targetId));
  this.presentation.update(false);this.hero.update(this.menu.playing);this.held.update(campaign.weapon,this.actions.angle,false);this.depth.update(this.held.sprite);this.updateHud(false);
 }
 private click(id:string):void{
  if(this.transition.active||this.restarting)return;
  if(id==='fullscreen'){void toggleFullscreen().then(ok=>{this.menu.notice=ok?'':'Полный экран недоступен. Разверните окно браузера.';});return;}
  if(id.startsWith('loadout-')&&this.menu.page==='loadout'){
   const w=id.slice(8)as Weapon;if(!STARTING_WEAPONS.includes(w))return;this.campaign.reset(w);this.campaign.arrivalFade=true;this.menu.page='playing';this.restarting=true;this.runtime.timeScale=1;this.runtime.goToLayout('Tutorial');return;
  }
  if(id.startsWith('equip-')&&this.menu.page==='arsenal'){
   if(this.campaign.equip(id.slice(6)as Weapon)){this.combat.weapon=this.campaign.weapon;this.actions.cancel();this.menu.page='playing';}return;
  }
  if(id.startsWith('reward-')&&this.menu.page==='reward'){
   if(this.campaign.chooseReward(id.slice(7)as RewardChoice)){this.state.maxHp=this.campaign.maxHp;this.state.hp=this.campaign.hp;this.state.maxPulseCharge=this.campaign.pulseCap;this.state.pulseCharge=this.campaign.pulseCap;this.combat.weapon=this.campaign.weapon;this.actions.cancel();this.menu.page='playing';}return;
  }
  if(id==='retry'&&this.state.status==='lost'){this.travel(undefined,true);return;}
  if(id==='menu-title'){this.menu.page='title';return;}
  if(id==='next'&&this.state.status==='won'){this.travel();return;}
  if(/^travel-\d+$/.test(id)&&this.state.status==='won'){this.travel(Number(id.slice(7)));return;}
  if(!this.menu.playing)this.menu.handle(id);
 }
 attack(target?:{x:number;y:number}):void{if(this.state.status==='playing'&&!this.restarting&&this.menu.playing&&!this.transition.active)this.actions.requestAttack(target?Math.atan2(target.y-this.runtime.objects.Player.getFirstInstance()!.y,target.x-this.runtime.objects.Player.getFirstInstance()!.x):undefined);}
 beforeTick():void{
  const key=(k:string)=>this.runtime.keyboard.isKeyDown(k),edge=(k:string)=>key(k)&&!this.was.has(k);
  if(!this.transition.active){
   if(edge('KeyM')&&(this.menu.playing||this.menu.page==='map'))this.menu.page=this.menu.page==='map'?'playing':'map';
   if(edge('KeyQ')&&(this.menu.playing||this.menu.page==='arsenal')){this.actions.cancel();this.menu.page=this.menu.page==='arsenal'?'playing':'arsenal';}
   if(edge('Escape'))this.menu.escape();
   if(this.menu.playing){
    if(edge('KeyF')&&this.state.status==='playing')this.world.interact(this.runtime.objects.Player.getFirstInstance()!,this.state);
    if(edge('KeyR'))this.travel(undefined,true);
    else if(edge('KeyH')&&!this.tutorial)this.transition.start(()=>{this.campaign.reset();this.campaign.arrivalFade=true;this.restarting=true;this.runtime.timeScale=1;this.runtime.goToLayout('Tutorial');});
    else if(edge('Enter')&&this.state.status==='won')this.travel();
   }
  }
  for(const k of ['KeyF','KeyQ','KeyM','KeyR','KeyH','Enter','Escape']){if(key(k))this.was.add(k);else this.was.delete(k);}
  const playing=this.state.status==='playing'&&this.menu.playing&&!this.transition.active&&!this.restarting;
  this.player.update(playing);const p=this.runtime.objects.Player.getFirstInstance()!;
  this.pending=this.actions.update(Math.min(p.dt,1/30),playing,this.state.pulseCharge>0,this.campaign.weapon);
  if(this.pending.windup){this.held.attack();if(this.campaign.weapon==='blade')this.hero.requestAttack(this.actions.angle);}
  this.time.beforeTick(playing);
 }
 tick():void{
  if(this.restarting)return;const player=this.runtime.objects.Player.getFirstInstance()!,realDt=Math.min(player.dt,1/30);
  this.transition.update(realDt);if(this.restarting)return;
  const playing=this.state.status==='playing'&&this.menu.playing&&!this.transition.active;
  const dt=this.time.afterTick(playing,this.actions.acting),previous=this.time.previousPosition;
  if(this.menu.playing)this.arrival=Math.max(0,this.arrival-realDt);
  if(playing){
   this.tutorial?.update(Math.hypot(player.x-previous.x,player.y-previous.y),realDt,this.player.isDashing,true);
   if(this.pending.strike)this.combat.strike(player,this.actions.angle);if(this.pending.pulse)this.combat.pulse(player);this.pending={strike:false,pulse:false,windup:false};
   const ready=!this.tutorial||this.tutorial.readyForObjective;
   this.combat.update(dt,previous,ready,realDt);
   if(ready){
    this.world.update(dt,previous,player,this.state);
    if(this.state.status==='playing'&&this.state.enemiesRemaining===0){
     if(!this.cleared){this.cleared=true;this.world.unlock();if(!this.tutorial)this.campaign.complete(this.state.hp);}
     if(!this.tutorial&&this.campaign.offer.length){this.menu.page='reward';this.actions.cancel();}
     else if(segmentHit(previous,player,this.runtime.objects.Exit.getFirstInstance()!,0)!==null)this.state.exit();
    }
   }
  }
  if(this.state.status==='won'&&!this.transition.active&&this.menu.playing){
   if(!this.tutorial&&this.campaign.last){}
   else if(!this.tutorial&&(this.room.next?.length??0)>1)this.menu.page='route';
   else this.travel();
  }
  if(this.state.status!=='playing'||!this.menu.playing||this.transition.active){this.runtime.timeScale=0;this.player.update(false);for(const e of this.runtime.objects.TestEnemy.getAllInstances())e.timeScale=0;}
  if(this.state.status!=='playing')this.tutorial?.update(0,0,false,false);
  if(this.state.hp<this.lastHp)this.damageFlash=.38;this.lastHp=this.state.hp;this.damageFlash=Math.max(0,this.damageFlash-realDt);
  player.opacity=this.state.invulnerable>0?(this.menu.flashes?(Math.floor(this.state.invulnerable*14)%2?.35:1):.65):1;
  this.hero.update(playing,Math.hypot(player.x-previous.x,player.y-previous.y)>.01);this.runtime.objects.HeroVisual.getFirstInstance()!.colorRgb=this.damageFlash>0&&this.menu.flashes?[1,.25,.4]:[1,1,1];
  this.held.update(this.campaign.weapon,this.actions.angle,playing);this.effects.update(this.menu.playing?realDt:0,dt);this.presentation.update(dt>0&&this.state.status==='playing');this.depth.update(this.held.sprite);this.tutorial?.combatHint(this.state.attacks,this.state.pulses,this.state.enemiesRemaining,this.state.fragments);this.updateHud(dt>0);
 }
 private travel(target?:number,retry=false):void{
  if(this.restarting||this.transition.active)return;
  if(!retry&&!this.tutorial&&(!this.campaign.last&&!this.room.next?.includes(target??this.room.next[0])||this.campaign.offer.length))return;
  this.menu.page='playing';this.actions.cancel();this.transition.start(()=>{
   if(retry){if(!this.room.optional)this.campaign.hp=this.campaign.maxHp;}
   else if(this.tutorial){this.campaign.room=0;this.campaign.hp=this.state.hp;}
   else{this.campaign.hp=this.state.hp;if(!this.campaign.advance(target))return;}
   this.campaign.arrivalFade=true;this.restarting=true;this.runtime.timeScale=1;this.runtime.goToLayout(retry?this.runtime.layout.name:'Макет 1');
  });
 }
 private updateHud(active:boolean):void{
  this.hud.update(this.state,active&&this.state.status==='playing',this.player.ready,{room:this.room,tutorial:!!this.tutorial,last:!this.tutorial&&this.campaign.last,boss:this.combat.boss,campaign:this.campaign,arrival:this.arrival,hint:this.combat.feedback||this.world.hint(this.runtime.objects.Player.getFirstInstance()!,this.cleared,this.state.enemiesRemaining),menu:this.menu,damage:this.menu.flashes?this.damageFlash:0,fade:this.transition.alpha});
 }
}
