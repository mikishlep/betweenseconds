export class GameState {
    status: "playing" | "won" | "lost" = "playing";
    hp = 3;
    fragments = 0;
    invulnerable = 0;
    get exitOpen(): boolean { return this.fragments === 2; }
    update(dt: number): void { this.invulnerable = Math.max(0, this.invulnerable - dt); }
    damage(): void {
        if (this.status !== "playing" || this.invulnerable > 0) return;
        this.hp = Math.max(0, this.hp - 1);
        this.invulnerable = 1;
        if (!this.hp) this.status = "lost";
    }
    collect(): void { if (this.status === "playing") this.fragments = Math.min(2, this.fragments + 1); }
    exit(): void { if (this.status === "playing" && this.exitOpen) this.status = "won"; }
}
