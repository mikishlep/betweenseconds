export class TimeController {
    private x = 0;
    private y = 0;
    private enemyX = 0;
    private enemyY = 0;
    private phase = 0;
    private readonly enemyOriginX: number;
    constructor(private readonly runtime: IRuntime) {
        this.runtime.timeScale = 0;
        this.enemyOriginX = runtime.objects.TestEnemy.getFirstInstance()!.x;
    }
    get previousPosition() { return { x: this.x, y: this.y }; }
    beforeTick(playing: boolean): void {
        const player = this.runtime.objects.Player.getFirstInstance()!;
        const enemy = this.runtime.objects.TestEnemy.getFirstInstance()!;
        this.x = player.x; this.y = player.y;
        this.enemyX = enemy.x; this.enemyY = enemy.y;
        this.phase = enemy.behaviors["Синусоида"].phase;
        // Native Sine uses value-only mode: commit its offset only on actual movement.
        // This avoids a trailing frame and also handles pushing against a Solid.
        enemy.timeScale = playing ? 1 : 0;
    }
    afterTick(playing: boolean): number {
        const player = this.runtime.objects.Player.getFirstInstance()!;
        const moving = playing && Math.hypot(player.x - this.x, player.y - this.y) > 0.01;
        this.runtime.timeScale = moving ? 1 : 0;
        const enemy = this.runtime.objects.TestEnemy.getFirstInstance()!;
        if (moving) {
            enemy.x = this.enemyOriginX + enemy.behaviors["Синусоида"].value;
        } else {
            enemy.behaviors["Синусоида"].phase = this.phase;
            enemy.x = this.enemyX; enemy.y = this.enemyY;
        }
        return moving ? Math.min(player.dt, 1 / 30) : 0;
    }
}
