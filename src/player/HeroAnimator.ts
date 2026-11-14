export class HeroAnimator {
    private direction = "Down";
    private attackDirection = "Down";
    private attackElapsed = -1;
    private motionElapsed = 0;
    private attackQueued = false;
    private queuedDirection: string | null = null;
    private animation = "";
    constructor(private readonly runtime: IRuntime) {}
    requestAttack(angle?: number): void { this.attackQueued = true; this.queuedDirection = angle === undefined ? null : Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle)) ? (Math.cos(angle)>0?"Right":"Left") : (Math.sin(angle)>0?"Down":"Up"); }
    update(playing: boolean, moving = false): void {
        const player = this.runtime.objects.Player.getFirstInstance()!;
        const visual = this.runtime.objects.HeroVisual.getFirstInstance()!;
        visual.x = player.x; visual.y = player.y; visual.opacity = player.opacity;
        player.isVisible = false;
        if (!playing) { this.attackQueued = false; return; }
        const dt = Math.min(player.dt, 1 / 30);
        const key = (code: string) => this.runtime.keyboard.isKeyDown(code);
        const x = Number(key("KeyD")) - Number(key("KeyA"));
        const y = Number(key("KeyS")) - Number(key("KeyW"));
        if (x) this.direction = x > 0 ? "Right" : "Left";
        else if (y) this.direction = y > 0 ? "Down" : "Up";
        if (this.attackElapsed >= 0) {
            this.attackElapsed += dt;
            if (this.attackElapsed >= 5 / 12) this.attackElapsed = -1;
        }
        if (this.attackQueued && this.attackElapsed < 0) {
            this.attackElapsed = 0;
            this.attackDirection = this.queuedDirection ?? this.direction;
            this.queuedDirection = null;
        }
        this.attackQueued = false;
        const attacking = this.attackElapsed >= 0;
        const name = attacking ? "Attack" + this.attackDirection : (moving ? "Walk" : "Idle") + this.direction;
        if (name !== this.animation) {
            visual.setAnimation(name);
            this.animation = name;
            this.motionElapsed = 0;
        } else {
            this.motionElapsed += dt;
        }
        // These animations follow the independent player clock, not frozen world time.
        visual.animationSpeed = 0;
        visual.animationFrame = attacking ? Math.min(4, Math.floor(this.attackElapsed * 12))
            : moving ? Math.floor(this.motionElapsed * 8) % 4 : 0;
    }
}
