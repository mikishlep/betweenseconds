/** Poses are driven by world time, including wind-up and recovery. */
export class EnemyAnimator {
    private name = "";
    private elapsed = 0;
    private x: number | null = null;
    private y = 0;
    update(sprite: Sprite, kind: string, dt: number, moving: boolean, windup: boolean, recovery: number, angle: number): void {
        if (dt <= 0 && this.name) return;
        moving ||= dt > 0 && this.x !== null && Math.hypot(sprite.x - this.x, sprite.y - this.y) > .01;
        this.x = sprite.x; this.y = sprite.y;
        const base = kind === "bulwark" ? "Bulwark" : kind === "viper" ? "Viper" : kind === "shade" ? "Shade" : kind === "warden" ? "Warden" : kind === "echo" ? "Echo" : kind === "regent" ? "Regent" : kind === "hunter" ? "Hunter" : "Shooter";
        const pose = recovery > 0 ? "Attack" : windup ? "Windup" : moving ? "Walk" : "Idle";
        const name = base + pose;
        if (name !== this.name) { sprite.setAnimation(name); this.name = name; this.elapsed = 0; }
        else this.elapsed += dt;
        sprite.animationSpeed = 0;
        sprite.animationFrame = pose === "Walk" ? Math.floor(this.elapsed * 9) % 3 : pose === "Idle" ? Math.floor(this.elapsed * 3) % 2 : pose === "Attack" ? (recovery > .2 ? 0 : 1) : 0;
        // Reflect the complete authored pose rather than rotating an upright actor.
        sprite.isMirrored = Math.cos(angle) < 0;
    }
}
