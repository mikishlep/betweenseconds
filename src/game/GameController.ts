import { RoomWorld } from "../world/RoomWorld";
import { Menu } from "../ui/Menu";
import { toggleFullscreen } from "../ui/Display";
import { TutorialController } from "./TutorialController";
import { HeroAnimator } from "../player/HeroAnimator";
import { PlayerController } from "../player/PlayerController";
import { PlayerActions } from "../combat/PlayerActions";
import { TimeController } from "../systems/TimeController";
import { HudController } from "../ui/Hud";
import { GameState } from "./GameState";
import { CombatSystem } from "./CombatSystem";
import { segmentHit } from "./geometry";
import { Campaign, TUTORIAL_ROOM, type RoomSpec } from "./Rooms";
import { Effects } from "../world/Effects";
import { Depth } from "../world/Depth";
import { Presentation } from "../world/Presentation";
export class GameController {
    readonly state = new GameState();
    private readonly player: PlayerController;
    private readonly actions: PlayerActions;
    private readonly time: TimeController;
    private readonly combat: CombatSystem;
    private readonly hud: HudController;
    private readonly tutorial: TutorialController | null;
    private readonly hero: HeroAnimator;
    private readonly effects: Effects;
    private readonly presentation: Presentation;
    private readonly depth: Depth;
    private readonly room: RoomSpec;
    private pending = { strike: false, pulse: false };
    private enterWasDown: boolean;
    private helpWasDown: boolean;
    private restartWasDown: boolean;
    private restarting = false;
    private escapeWasDown = false;
    private damageFlash = 0;
    private readonly world: RoomWorld;
    private fWasDown=false; private qWasDown=false; private mWasDown=false; private settled=false; private arrival=3;
    private lastHp = 3;
    constructor(private readonly runtime: IRuntime, private readonly campaign = new Campaign(), private readonly menu = new Menu()) {
        this.tutorial = runtime.layout.name === "Tutorial" ? new TutorialController(runtime) : null;
        this.room = this.tutorial ? TUTORIAL_ROOM : campaign.current;
        this.effects = new Effects(runtime);
        this.world = new RoomWorld(runtime,this.room,campaign);
        this.state.hp=this.tutorial?3:campaign.hp;
        if(this.room.optional)this.state.fragments=2;
        this.lastHp=this.state.hp;
        this.combat = new CombatSystem(runtime, this.state, this.room, this.effects);
        this.combat.weapon=campaign.weapon;
        this.hero = new HeroAnimator(runtime);
        this.player = new PlayerController(runtime);
        this.actions = new PlayerActions(runtime);
        this.time = new TimeController(runtime, sprite => this.combat.isShooter(sprite));
        this.hud = new HudController(runtime);
        this.depth = new Depth(runtime);
        this.presentation = new Presentation(runtime, this.room);
        this.fWasDown=runtime.keyboard.isKeyDown("KeyF");this.qWasDown=runtime.keyboard.isKeyDown("KeyQ");this.mWasDown=runtime.keyboard.isKeyDown("KeyM");
        this.escapeWasDown = runtime.keyboard.isKeyDown("Escape");
        this.helpWasDown = runtime.keyboard.isKeyDown("KeyH");
        this.enterWasDown = runtime.keyboard.isKeyDown("Enter");
        this.restartWasDown = runtime.keyboard.isKeyDown("KeyR");
        runtime.objects.Exit.getFirstInstance()!.opacity = 0.25;
        this.presentation.update(false);
        this.updateHud(false);
        runtime.objects.HowToControl.getFirstInstance()!.addEventListener("click", event => {
            if (event.targetId === "fullscreen") { void toggleFullscreen().then(ok => { this.menu.notice = ok ? "" : "Браузер запретил полноэкранный режим. Разверните окно вручную."; }); return; }
            const action=event.targetId;
            if(action === "retry" && this.state.status === "lost"){this.travel(undefined,true);return;}
            if(action === "menu-title"){this.menu.page="title";return;}
            if(action === "next" && this.state.status === "won"){this.travel();return;}
            if(/^travel-\d+$/.test(action) && this.state.status === "won"){this.travel(Number(action.slice(7)));return;}
            if (this.menu.playing) return;
            const id = event.targetId;
            this.menu.handle(id);
            if (id === "start") { this.campaign.reset(); this.restarting = true; runtime.timeScale = 1; runtime.goToLayout("Tutorial"); }
        });
        this.hero.update(this.menu.playing);
        this.depth.update();
    }
    attack(): void { if (this.state.status === "playing" && !this.restarting && this.menu.playing) this.actions.requestAttack(); }
    beforeTick(): void {
        const key = (code: string) => this.runtime.keyboard.isKeyDown(code);
        const map=key("KeyM"),interact=key("KeyF"),cycle=key("KeyQ");
        if(map&&!this.mWasDown && (this.menu.playing||this.menu.page==="map"))this.menu.page=this.menu.page==="map"?"playing":"map";
        this.mWasDown=map;
        if(this.menu.playing && this.state.status === "playing"){
            if(interact&&!this.fWasDown)this.world.interact(this.runtime.objects.Player.getFirstInstance()!,this.state);
            if(cycle&&!this.qWasDown){this.campaign.cycleWeapon();this.combat.weapon=this.campaign.weapon;}
        }
        this.fWasDown=interact;this.qWasDown=cycle;
        const escape = key("Escape");
        if (escape && !this.escapeWasDown) this.menu.escape();
        this.escapeWasDown = escape;
        if (!this.menu.playing) { this.player.update(false); this.time.beforeTick(false); return; }
        const down = key("KeyR"), help = key("KeyH"), enter = key("Enter");
        const openTutorial = !this.tutorial && help && !this.helpWasDown;
        const advance = this.state.status === "won" && enter && !this.enterWasDown;
        this.helpWasDown = help; this.enterWasDown = enter;
        if(openTutorial){this.campaign.reset();this.restarting=true;this.runtime.timeScale=1;this.runtime.goToLayout("Tutorial");}
        else if(down&&!this.restartWasDown)this.travel(undefined,true);
        else if(advance)this.travel();
        this.restartWasDown = down;
        const playing = this.state.status === "playing" && !this.restarting;
        this.player.update(playing);
        const p = this.runtime.objects.Player.getFirstInstance()!;
        this.pending = this.actions.update(Math.min(p.dt, 1 / 30), playing, this.state.pulseCharge > 0);
        if (this.pending.strike) this.hero.requestAttack();
        this.time.beforeTick(playing);
    }
    tick(): void {
        if (this.restarting) return;
        const dt = this.time.afterTick(this.state.status === "playing" && this.menu.playing, this.actions.acting);
        const player = this.runtime.objects.Player.getFirstInstance()!;
        const realDt = Math.min(player.dt, 1 / 30);
        if(this.menu.playing)this.arrival=Math.max(0,this.arrival-realDt);
        if (this.state.status === "playing" && this.menu.playing) {
            const previous = this.time.previousPosition;
            this.tutorial?.update(Math.hypot(player.x - previous.x, player.y - previous.y), realDt, this.player.isDashing, true);
            if (this.pending.strike) this.combat.strike(player, this.actions.angle);
            if (this.pending.pulse) this.combat.pulse(player);
            this.pending = { strike: false, pulse: false };
            if (!this.tutorial || this.tutorial.readyForObjective) this.combat.update(dt, previous);
            if (this.state.status === "playing" && (!this.tutorial || this.tutorial.readyForObjective)) {
                for (const fragment of this.runtime.objects.TimeFragment.getAllInstances()) {
                    if (segmentHit(previous, player, fragment, player.width / 2) !== null) { fragment.destroy(); this.state.collect(); }
                }
                const exit = this.runtime.objects.Exit.getFirstInstance()!;
                exit.opacity = this.state.exitOpen ? 1 : 0.25;
                if (segmentHit(previous, player, exit, player.width / 2) !== null) this.state.exit();
            }
        }
        if(this.state.status === "won" && !this.settled){if(!this.tutorial)this.campaign.complete(this.state.hp);this.settled=true;}
        if (this.state.status !== "playing") {
            this.tutorial?.update(0, 0, false, false);
            this.runtime.timeScale = 0;
            this.player.update(false);
            for (const enemy of this.runtime.objects.TestEnemy.getAllInstances()) enemy.timeScale = 0;
        }
        if (this.state.hp < this.lastHp) this.damageFlash = 0.38;
        this.lastHp = this.state.hp;
        this.damageFlash = Math.max(0, this.damageFlash - realDt);
        player.opacity = this.state.invulnerable > 0 ? (this.menu.flashes ? (Math.floor(this.state.invulnerable * 14) % 2 ? 0.35 : 1) : 0.65) : 1;
        const previous = this.time.previousPosition;
        this.hero.update(this.state.status === "playing" && this.menu.playing, Math.hypot(player.x - previous.x, player.y - previous.y) > 0.01);
        const hero = this.runtime.objects.HeroVisual.getFirstInstance()!;
        hero.colorRgb = this.damageFlash > 0 && this.menu.flashes ? [1, 0.25, 0.4] : [1, 1, 1];
        this.effects.update(this.menu.playing ? realDt : 0, dt);
        this.presentation.update(dt > 0 && this.state.status === "playing");
        this.depth.update();
        this.tutorial?.combatHint(this.state.attacks, this.state.pulses, this.state.enemiesRemaining, this.state.fragments);
        this.updateHud(dt > 0);
    }
    private travel(target?:number,retry=false):void {
        if(this.restarting)return;
        if(retry&&!this.room.optional)this.campaign.hp=3;
        else if(this.tutorial)this.campaign.reset();
        else if(!this.campaign.advance(target))return;
        this.restarting=true;this.runtime.timeScale=1;
        this.runtime.goToLayout(retry?this.runtime.layout.name:"Макет 1");
    }
    private updateHud(active: boolean): void {
        this.hud.update(this.state, active && this.state.status === "playing", this.player.ready, {
            room: this.room, tutorial: !!this.tutorial, last: !this.tutorial && this.campaign.last, boss: this.combat.boss, campaign:this.campaign,arrival:this.arrival,hint:this.world.notice||this.world.hint,menu: this.menu, damage: this.menu.flashes ? this.damageFlash : 0
        });
    }
}
