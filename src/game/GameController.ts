import { TutorialController } from "./TutorialController";
import { HeroAnimator } from "../player/HeroAnimator";
import { PlayerController } from "../player/PlayerController";
import { TimeController } from "../systems/TimeController";
import { HudController } from "../ui/Hud";
import { GameState } from "./GameState";
import { CombatSystem } from "./CombatSystem";
import { segmentHit } from "./geometry";
export class GameController {
    readonly state = new GameState();
    private readonly player: PlayerController;
    private readonly time: TimeController;
    private readonly combat: CombatSystem;
    private readonly hud: HudController;
    private readonly tutorial: TutorialController | null;
    private readonly hero: HeroAnimator;
    private enterWasDown: boolean;
    private restartWasDown: boolean;
    private restarting = false;
    constructor(private readonly runtime: IRuntime) {
        this.tutorial = runtime.layout.name === "Tutorial" ? new TutorialController(runtime) : null;
        this.hero = new HeroAnimator(runtime);
        this.player = new PlayerController(runtime);
        this.time = new TimeController(runtime);
        this.combat = new CombatSystem(runtime, this.state);
        this.hud = new HudController(runtime);
        this.enterWasDown = runtime.keyboard.isKeyDown("Enter");
        this.restartWasDown = runtime.keyboard.isKeyDown("KeyR");
        runtime.objects.Exit.getFirstInstance()!.opacity = 0.32;
        this.hud.update(this.state, false, true);
        this.hero.update(true);
    }
    attack(): void {
        if (this.state.status === "playing" && !this.restarting) this.hero.requestAttack();
    }
    beforeTick(): void {
        const down = this.runtime.keyboard.isKeyDown("KeyR");
        const enter = this.runtime.keyboard.isKeyDown("Enter");
        const advance = this.tutorial && this.state.status === "won" && enter && !this.enterWasDown;
        this.enterWasDown = enter;
        if ((down && !this.restartWasDown) || advance) {
            this.restarting = true;
            this.runtime.timeScale = 1;
            this.runtime.goToLayout(advance ? "Макет 1" : this.runtime.layout.name);
        }
        this.restartWasDown = down;
        this.time.beforeTick(this.state.status === "playing" && !this.restarting);
        this.player.update(this.state.status === "playing" && !this.restarting);
    }
    tick(): void {
        if (this.restarting) return;
        const dt = this.time.afterTick(this.state.status === "playing");
        const player = this.runtime.objects.Player.getFirstInstance()!;
        if (this.state.status === "playing") {
            const previous = this.time.previousPosition;
            this.tutorial?.update(Math.hypot(player.x - previous.x, player.y - previous.y), Math.min(player.dt, 1 / 30), this.player.isDashing, true);
            if (!this.tutorial || this.tutorial.readyForObjective) this.combat.update(dt, previous);
            if (this.state.status === "playing" && (!this.tutorial || this.tutorial.readyForObjective)) {
                for (const fragment of this.runtime.objects.TimeFragment.getAllInstances()) {
                    if (segmentHit(this.time.previousPosition, player, fragment, player.width / 2) !== null) {
                        fragment.destroy(); this.state.collect();
                    }
                }
                const exit = this.runtime.objects.Exit.getFirstInstance()!;
                exit.opacity = this.state.exitOpen ? 1 : 0.32;
                if (segmentHit(this.time.previousPosition, player, exit, player.width / 2) !== null) this.state.exit();
            }
        }
        if (this.state.status !== "playing") {
            this.tutorial?.update(0, 0, false, false);
            this.runtime.timeScale = 0;
            this.player.update(false);
            this.runtime.objects.TestEnemy.getFirstInstance()!.timeScale = 0;
        }
        player.opacity = this.state.invulnerable > 0 ? 0.55 : 1;
        this.hero.update(this.state.status === "playing");
        this.hud.update(this.state, dt > 0 && this.state.status === "playing", this.player.ready);
    }
}
