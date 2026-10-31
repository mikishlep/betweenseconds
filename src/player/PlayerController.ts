export class PlayerController {
    private dashTime = 0;
    private dashCooldown = 0;
    private spaceWasDown = false;

    constructor(private readonly runtime: IRuntime) {}

    update(): void {
        const runtime = this.runtime;

        const player = runtime.objects.Player.getFirstInstance();
        if (!player) return;

        const keyboard = runtime.keyboard;
        const move = player.behaviors["8Направлений"];
        const dt = player.dt;

        this.dashTime = Math.max(0, this.dashTime - dt);
        this.dashCooldown = Math.max(0, this.dashCooldown - dt);

        const up = keyboard.isKeyDown("KeyW");
        const down = keyboard.isKeyDown("KeyS");
        const left = keyboard.isKeyDown("KeyA");
        const right = keyboard.isKeyDown("KeyD");
        const space = keyboard.isKeyDown("Space");

        const x = Number(right) - Number(left);
        const y = Number(down) - Number(up);

        // запуск рывка (на пробел)
        if (
            space &&
            !this.spaceWasDown &&
            this.dashCooldown === 0 &&
            (x !== 0 || y !== 0)
        ) {
            const length = Math.hypot(x, y);

            this.dashTime = 0.15;
            this.dashCooldown = 0.6;

            move.maxSpeed = 700;
            move.vectorX = (x / length) * 700;
            move.vectorY = (y / length) * 700;
        }

        this.spaceWasDown = space;

        if (this.dashTime > 0) return;

        // обычное движение
        move.maxSpeed = 220;

        const speed = Math.hypot(move.vectorX, move.vectorY);

        if (speed > 220) {
            move.vectorX *= 220 / speed;
            move.vectorY *= 220 / speed;
        }

        if (up) move.simulateControl("up");
        if (down) move.simulateControl("down");
        if (left) move.simulateControl("left");
        if (right) move.simulateControl("right");
    }
}