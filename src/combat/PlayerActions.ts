export class PlayerActions {
    private queued = false;
    private cooldown = 0;
    private active = 0;
    private pulseWasDown = false;
    private direction = { x: 0, y: 1 };
    constructor(private readonly runtime: IRuntime) { this.pulseWasDown = runtime.keyboard.isKeyDown("KeyE"); }
    get acting(): boolean { return this.active > 0; }
    get angle(): number { return Math.atan2(this.direction.y, this.direction.x); }
    requestAttack(): void { this.queued = true; }
    update(dt: number, playing: boolean, pulseAvailable: boolean): { strike: boolean; pulse: boolean } {
        this.cooldown = Math.max(0, this.cooldown - dt);
        this.active = Math.max(0, this.active - dt);
        const key = (code: string) => this.runtime.keyboard.isKeyDown(code);
        const x = Number(key("KeyD")) - Number(key("KeyA"));
        const y = Number(key("KeyS")) - Number(key("KeyW"));
        if (x) this.direction = { x: Math.sign(x), y: 0 };
        else if (y) this.direction = { x: 0, y: Math.sign(y) };
        const down = key("KeyE");
        const strike = playing && this.queued && this.cooldown === 0;
        const pulse = playing && pulseAvailable && down && !this.pulseWasDown;
        this.pulseWasDown = down;
        this.queued = false;
        if (strike) { this.cooldown = 5 / 12; this.active = 5 / 12; }
        if (pulse) this.active = Math.max(this.active, 0.3);
        return { strike, pulse };
    }
}
