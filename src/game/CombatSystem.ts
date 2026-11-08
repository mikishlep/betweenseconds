import { relativeHit, segmentHit, type Point } from "./geometry";
import { GameState } from "./GameState";
interface Bullet { sprite: Sprite; guide: Sprite; vx: number; vy: number; age: number; }
export class CombatSystem {
    private bullets: Bullet[] = [];
    private cooldown = 0.8;
    constructor(private readonly runtime: IRuntime, private readonly state: GameState) {
        for (const type of [runtime.objects.Projectile, runtime.objects.ProjectileGuide])
            for (const seed of type.getAllInstances()) seed.destroy();
    }
    update(dt: number, previousPlayer: Point): void {
        const player = this.runtime.objects.Player.getFirstInstance()!;
        const enemy = this.runtime.objects.TestEnemy.getFirstInstance()!;
        const walls = this.runtime.objects.Wall.getAllInstances();
        this.state.update(dt);
        // Existing bullets move first: a newly spawned shot starts at the muzzle.
        this.bullets = this.bullets.filter(bullet => {
            const s = bullet.sprite, from = { x: s.x, y: s.y };
            const to = { x: s.x + bullet.vx * dt, y: s.y + bullet.vy * dt };
            const wallHit = Math.min(...walls.map(w => segmentHit(from, to, w, 4) ?? Infinity));
            const playerHit = relativeHit(from, to, previousPlayer, player, { x: s.x, y: s.y, width: 8, height: 8 });
            bullet.age += dt;
            if (playerHit !== null && playerHit < wallHit) this.state.damage();
            if (wallHit !== Infinity || playerHit !== null || bullet.age > 8) { s.destroy(); bullet.guide.destroy(); return false; }
            s.x = to.x; s.y = to.y;
            this.updateGuide(bullet);
            return true;
        });
        // Contact hurts even when walking into a frozen enemy or projectile.
        if (segmentHit(previousPlayer, player, enemy, player.width / 2) !== null) this.state.damage();
        this.cooldown -= dt;
        if (dt > 0 && this.cooldown <= 0 && this.state.status === "playing") {
            this.cooldown = 1.15;
            if (this.bullets.length >= 20) return;
            const dx = player.x - enemy.x, dy = player.y - enemy.y;
            const distance = Math.hypot(dx, dy) || 1;
            const sprite = this.runtime.objects.Projectile.createInstance("scene", enemy.x, enemy.y);
            sprite.width = 26; sprite.height = 8;
            sprite.angle = Math.atan2(dy, dx);
            const guide = this.runtime.objects.ProjectileGuide.createInstance("scene", enemy.x, enemy.y);
            guide.angle = sprite.angle; guide.height = 2; guide.opacity = 0.24;
            const bullet = { sprite, guide, vx: dx / distance * 185, vy: dy / distance * 185, age: 0 };
            this.bullets.push(bullet);
            this.updateGuide(bullet);
        }
    }
    private updateGuide(bullet: Bullet): void {
        const s = bullet.sprite, guide = bullet.guide;
        const nx = Math.cos(s.angle), ny = Math.sin(s.angle);
        const range = 110;
        const end = { x: s.x + nx * range, y: s.y + ny * range };
        const hit = Math.min(1, ...this.runtime.objects.Wall.getAllInstances()
            .map(w => segmentHit(s, end, w) ?? 1));
        const head = s.width / 2;
        const length = Math.max(0, range * hit - head);
        guide.isVisible = length > 3;
        guide.width = Math.max(1, length);
        guide.x = s.x + nx * (head + length / 2);
        guide.y = s.y + ny * (head + length / 2);
    }
}
