export class PlayerController {
    private dashTime = 0;
    private dashCooldown = 0;
    private spaceWasDown = false;
    private dashX = 0;
    private dashY = 0;
    constructor(private readonly runtime: IRuntime) {}
    get isDashing(): boolean { return this.dashTime > 0; }
    get ready(): boolean { return this.dashCooldown === 0; }

    // Input must be supplied before Construct ticks EightDir and ScrollTo.
    update(playing: boolean): void {
        const player = this.runtime.objects.Player.getFirstInstance();
        if (!player) return;
        player.timeScale = 1;
        const move = player.behaviors["8Направлений"];
        const key = (code: string) => this.runtime.keyboard.isKeyDown(code);
        const dt = Math.min(player.dt, 1 / 30);
        this.dashTime = Math.max(0, this.dashTime - dt);
        this.dashCooldown = Math.max(0, this.dashCooldown - dt);
        const x = Number(key("KeyD")) - Number(key("KeyA"));
        const y = Number(key("KeyS")) - Number(key("KeyW"));
        const space = key("Space");
        move.isEnabled = playing;
        if (!playing) { move.vectorX = move.vectorY = 0; return; }
        if (space && !this.spaceWasDown && this.ready && (x || y)) {
            const length = Math.hypot(x, y);
            this.dashX = x / length; this.dashY = y / length;
            this.dashTime = 0.15; this.dashCooldown = 0.6;
        }
        this.spaceWasDown = space;
        // Constant dash velocity; no EightDir deceleration during a dash.
        move.maxSpeed = this.dashTime > 0 ? 700 : 220;
        move.deceleration = this.dashTime > 0 ? 0 : 1800;
        if (this.dashTime > 0) {
            move.vectorX = this.dashX * 700; move.vectorY = this.dashY * 700;
            return;
        }
        const speed = Math.hypot(move.vectorX, move.vectorY);
        if (speed > 220) { move.vectorX *= 220 / speed; move.vectorY *= 220 / speed; }
        if (y < 0) move.simulateControl("up");
        if (y > 0) move.simulateControl("down");
        if (x < 0) move.simulateControl("left");
        if (x > 0) move.simulateControl("right");
    }
}
