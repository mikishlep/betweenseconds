interface Flash { sprite: Sprite; age: number; duration: number; size: number; aspect: number; pulse: boolean; world: boolean; }
export class Effects {
    private flashes: Flash[] = [];
    constructor(private readonly runtime: IRuntime) {
        for (const seed of runtime.objects.CombatFx.getAllInstances()) seed.destroy();
    }
    flash(x: number, y: number, animation: string, size: number, duration = 0.32, angle = 0, world = false): void {
        const sprite = this.runtime.objects.CombatFx.createInstance("scene", x, y);
        sprite.setAnimation(animation); sprite.angle = angle; sprite.blendMode = "additive"; sprite.animationSpeed = 0;
        const aspect = animation === "RoseSweep" || animation === "Bloom" ? 1 : animation === "Pulse" ? 0.65 : 0.8;
        sprite.width = size; sprite.height = size * aspect;
        this.flashes.push({ sprite, age: 0, duration, size, aspect, pulse: animation === "Pulse", world });
    }
    update(dt: number, worldDt = dt): void {
        this.flashes = this.flashes.filter(f => {
            f.age += f.world ? worldDt : dt;
            if (f.age >= f.duration) { f.sprite.destroy(); return false; }
            const t = f.age / f.duration;
            f.sprite.animationFrame = Math.min(5, Math.floor(t * 6));
            f.sprite.opacity = 1 - t * 0.4;
            const scale = f.pulse ? 1 : 0.95 + t * 0.1;
            f.sprite.width = f.size * scale; f.sprite.height = f.size * scale * f.aspect;
            return true;
        });
    }
}
