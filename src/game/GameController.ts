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
    private restartWasDown: boolean;
    private restarting = false;
    constructor(private readonly runtime: IRuntime) {
        this.player = new PlayerController(runtime);
        this.time = new TimeController(runtime);
        this.combat = new CombatSystem(runtime, this.state);
        this.hud = new HudController(runtime);
        this.restartWasDown = runtime.keyboard.isKeyDown("KeyR");
        this.hud.update(this.state, false, true);
    }
    beforeTick(): void {
        const down = this.runtime.keyboard.isKeyDown("KeyR");
        if (down && !this.restartWasDown) {
            this.restarting = true;
            this.runtime.timeScale = 1;
            this.runtime.goToLayout(this.runtime.layout.name);
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
            this.combat.update(dt, this.time.previousPosition);
            if (this.state.status === "playing") {
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
            this.runtime.timeScale = 0;
            this.player.update(false);
            this.runtime.objects.TestEnemy.getFirstInstance()!.timeScale = 0;
        }
        player.opacity = this.state.invulnerable > 0 ? 0.55 : 1;
        this.hud.update(this.state, dt > 0 && this.state.status === "playing", this.player.ready);
    }
}
