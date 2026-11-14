export class HeroAnimator {
    private direction = "Down";
    private attackDirection = "Down";
    private attackElapsed = -1;
    private attackQueued = false;
    private animation = "";
    constructor(private readonly runtime: IRuntime) {}
    requestAttack(): void { this.attackQueued = true; }
    update(playing: boolean): void {
        const player = this.runtime.objects.Player.getFirstInstance()!;
        const visual = this.runtime.objects.HeroVisual.getFirstInstance()!;
        visual.x = player.x; visual.y = player.y; visual.opacity = player.opacity;
        player.isVisible = false;
        const key = (code: string) => this.runtime.keyboard.isKeyDown(code);
                if (playing) {
            const x = Number(key("KeyD")) - Number(key("KeyA"));
            const y = Number(key("KeyS")) - Number(key("KeyW"));
            if (x) this.direction = x > 0 ? "Right" : "Left";
            else if (y) this.direction = y > 0 ? "Down" : "Up";
            if (this.attackElapsed >= 0) {
                this.attackElapsed += Math.min(player.dt, 1 / 30);
                if (this.attackElapsed >= 5 / 12) this.attackElapsed = -1;
            }
            if (this.attackQueued && this.attackElapsed < 0) {
                this.attackElapsed = 0;
                this.attackDirection = this.direction;
            }
        }
        this.attackQueued = false;
        const name = this.attackElapsed < 0 ? "Idle" + this.direction : "Attack" + this.attackDirection;
        if (name !== this.animation) { visual.setAnimation(name); this.animation = name; }
        // Advance using the player's independent clock, even in a frozen world.
        visual.animationSpeed = 0;
        visual.animationFrame = this.attackElapsed < 0 ? 0 : Math.min(4, Math.floor(this.attackElapsed * 12));
    }
}
