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
    constructor(private readonly runtime: IRuntime, private readonly campaign = new Campaign()) {
        this.tutorial = runtime.layout.name === "Tutorial" ? new TutorialController(runtime) : null;
        this.room = this.tutorial ? TUTORIAL_ROOM : campaign.current;
        this.effects = new Effects(runtime);
        this.combat = new CombatSystem(runtime, this.state, this.room, this.effects);
        this.hero = new HeroAnimator(runtime);
        this.player = new PlayerController(runtime);
        this.actions = new PlayerActions(runtime);
        this.time = new TimeController(runtime, sprite => this.combat.isShooter(sprite));
        this.hud = new HudController(runtime);
        this.depth = new Depth(runtime);
        this.presentation = new Presentation(runtime, this.room);
        this.helpWasDown = runtime.keyboard.isKeyDown("KeyH");
        this.enterWasDown = runtime.keyboard.isKeyDown("Enter");
        this.restartWasDown = runtime.keyboard.isKeyDown("KeyR");
        runtime.objects.Exit.getFirstInstance()!.opacity = 0.25;
        this.presentation.update(false);
        this.updateHud(false);
        this.hero.update(true);
        this.depth.update();
    }
    attack(): void { if (this.state.status === "playing" && !this.restarting) this.actions.requestAttack(); }
    beforeTick(): void {
        const key = (code: string) => this.runtime.keyboard.isKeyDown(code);
        const down = key("KeyR"), help = key("KeyH"), enter = key("Enter");
        const openTutorial = !this.tutorial && help && !this.helpWasDown;
        const advance = this.state.status === "won" && enter && !this.enterWasDown;
        this.helpWasDown = help; this.enterWasDown = enter;
        if ((down && !this.restartWasDown) || advance || openTutorial) {
            this.restarting = true;
            if (openTutorial || (advance && this.tutorial)) this.campaign.reset();
            else if (advance) this.campaign.advance();
            this.runtime.timeScale = 1;
            this.runtime.goToLayout(openTutorial ? "Tutorial" : advance ? "Макет 1" : this.runtime.layout.name);
        }
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
        const dt = this.time.afterTick(this.state.status === "playing", this.actions.acting);
        const player = this.runtime.objects.Player.getFirstInstance()!;
        const realDt = Math.min(player.dt, 1 / 30);
        if (this.state.status === "playing") {
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
        if (this.state.status !== "playing") {
            this.tutorial?.update(0, 0, false, false);
            this.runtime.timeScale = 0;
            this.player.update(false);
            for (const enemy of this.runtime.objects.TestEnemy.getAllInstances()) enemy.timeScale = 0;
        }
        player.opacity = this.state.invulnerable > 0 ? 0.55 : 1;
        const previous = this.time.previousPosition;
        this.hero.update(this.state.status === "playing", Math.hypot(player.x - previous.x, player.y - previous.y) > 0.01);
        this.effects.update(realDt);
        this.presentation.update(dt > 0 && this.state.status === "playing");
        this.depth.update();
        this.updateHud(dt > 0);
    }
    private updateHud(active: boolean): void {
        this.hud.update(this.state, active && this.state.status === "playing", this.player.ready, {
            room: this.room, tutorial: !!this.tutorial, last: !this.tutorial && this.campaign.last, boss: this.combat.boss
        });
    }
}
