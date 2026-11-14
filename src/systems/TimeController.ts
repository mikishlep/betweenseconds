interface Snapshot { sprite: Sprite; x: number; y: number; phase: number; }
export class TimeController {
    private x = 0;
    private y = 0;
    private enemies: Snapshot[] = [];
    private origins = new Map<Sprite, number>();
    constructor(private readonly runtime: IRuntime, private readonly isSineEnemy: (enemy: Sprite) => boolean = () => true) { this.runtime.timeScale = 0; }
    get previousPosition() { return { x: this.x, y: this.y }; }
    beforeTick(playing: boolean): void {
        const player = this.runtime.objects.Player.getFirstInstance()!;
        this.x = player.x; this.y = player.y;
        this.enemies = this.runtime.objects.TestEnemy.getAllInstances().map(sprite => {
            if (!this.origins.has(sprite)) this.origins.set(sprite, sprite.x);
            sprite.timeScale = playing ? 1 : 0;
            return { sprite, x: sprite.x, y: sprite.y, phase: sprite.behaviors["Синусоида"].phase };
        });
    }
    afterTick(playing: boolean, acting = false): number {
        const player = this.runtime.objects.Player.getFirstInstance()!;
        const active = playing && (acting || Math.hypot(player.x - this.x, player.y - this.y) > 0.01);
        this.runtime.timeScale = active ? 1 : 0;
        for (const e of this.enemies) {
            if (active && this.isSineEnemy(e.sprite)) e.sprite.x = this.origins.get(e.sprite)! + e.sprite.behaviors["Синусоида"].value;
            else if (!active) { e.sprite.behaviors["Синусоида"].phase = e.phase; e.sprite.x = e.x; e.sprite.y = e.y; }
        }
        // Drop references to defeated instances before the next frame.
        const alive = new Set(this.runtime.objects.TestEnemy.getAllInstances());
        for (const e of this.origins.keys()) if (!alive.has(e)) this.origins.delete(e);
        return active ? Math.min(player.dt, 1 / 30) : 0;
    }
}
