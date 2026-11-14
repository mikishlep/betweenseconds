export class GameState {
    status: "playing" | "won" | "lost" = "playing";
    hp = 3;
    fragments = 0;
    invulnerable = 0;
    enemiesRemaining = 0;
    kills = 0;
    attacks = 0;
    damageTaken = 0;
    deflected = 0;
    pulses = 0;
    pulseCharge = 1;
    worldSeconds = 0;
    get exitOpen(): boolean { return this.fragments === 2 && this.enemiesRemaining === 0; }
    rating(par: number): string { return this.damageTaken === 0 && this.attacks <= par ? "S" : this.damageTaken <= 1 ? "A" : "B"; }
    update(dt: number): void { this.invulnerable = Math.max(0, this.invulnerable - dt); this.worldSeconds += dt; }
    damage(): void {
        if (this.status !== "playing" || this.invulnerable > 0) return;
        this.hp = Math.max(0, this.hp - 1);
        this.damageTaken++;
        this.invulnerable = 1;
        if (!this.hp) this.status = "lost";
    }
    collect(): void { if (this.status === "playing") this.fragments = Math.min(2, this.fragments + 1); }
    exit(): void { if (this.status === "playing" && this.exitOpen) this.status = "won"; }
}
