import { relativeHit, segmentHit, type Point } from "./geometry";
import { GameState } from "./GameState";
import type { EnemyKind, RoomSpec } from "./Rooms";
import { Effects } from "../world/Effects";
interface Bullet { sprite: Sprite; guide: Sprite; vx: number; vy: number; age: number; }
export interface EnemyUnit { sprite: Sprite; kind: EnemyKind; hp: number; maxHp: number; timer: number; angle: number; locked: boolean; marker: Sprite; }
export class CombatSystem {
    private bullets: Bullet[] = [];
    readonly enemies: EnemyUnit[] = [];
    constructor(private readonly runtime: IRuntime, private readonly state: GameState, room?: RoomSpec, private readonly effects?: Effects) {
        for (const type of [runtime.objects.Projectile, runtime.objects.ProjectileGuide, runtime.objects.CombatMarker])
            for (const seed of type.getAllInstances()) seed.destroy();
        if (room) {
            for (const seed of runtime.objects.TestEnemy.getAllInstances()) seed.destroy();
            for (const spawn of room.enemies) {
                const sprite = runtime.objects.TestEnemy.createInstance("scene", spawn.x, spawn.y);
                sprite.setAnimation(spawn.kind === "shooter" ? "Shooter" : spawn.kind === "hunter" ? "Hunter" : "Warden");
                sprite.width = sprite.height = spawn.kind === "warden" ? 76 : 36;
                this.addEnemy(sprite, spawn.kind, spawn.hp);
            }
        } else {
            for (const sprite of runtime.objects.TestEnemy.getAllInstances()) this.addEnemy(sprite, "shooter", 2);
        }
        this.state.enemiesRemaining = this.enemies.length;
    }
    private addEnemy(sprite: Sprite, kind: EnemyKind, hp: number): void {
        const marker = this.runtime.objects.CombatMarker.createInstance("scene", sprite.x, sprite.y);
        marker.setAnimation("Ring"); marker.isVisible = false; marker.colorRgb = [1, 0.15, 0.55];
        this.enemies.push({ sprite, kind, hp, maxHp: hp, timer: kind === "shooter" ? 0.35 : 0, angle: 0, locked: false, marker });
    }
    isShooter(sprite: Sprite): boolean { return this.enemies.some(e => e.sprite === sprite && e.kind === "shooter"); }
    get boss(): { hp: number; maxHp: number; phase: number } | null {
        const e = this.enemies.find(e => e.kind === "warden");
        return e ? { hp: e.hp, maxHp: e.maxHp, phase: e.hp <= e.maxHp / 2 ? 2 : 1 } : null;
    }
    private unobstructed(a: Point, b: Point): boolean {
        return this.runtime.objects.Wall.getAllInstances().every(w => segmentHit(a, b, w) === null);
    }
    private inCone(origin: Point, target: Point, angle: number, range: number): boolean {
        const dx = target.x - origin.x, dy = target.y - origin.y, length = Math.hypot(dx, dy);
        return length <= range && (length < 1 || (dx * Math.cos(angle) + dy * Math.sin(angle)) / length >= 0.4) && this.unobstructed(origin, target);
    }
    strike(origin: Point, angle: number): void {
        if (this.state.status !== "playing") return;
        this.state.attacks++;
        this.effects?.flash(origin.x + Math.cos(angle) * 35, origin.y + Math.sin(angle) * 35, "Slash", 125, 0.34, angle);
        for (const e of [...this.enemies]) if (this.inCone(origin, e.sprite, angle, 90)) this.hit(e, 1);
        this.bullets = this.bullets.filter(b => {
            if (!this.inCone(origin, b.sprite, angle, 95)) return true;
            this.removeBullet(b); this.state.deflected++; return false;
        });
    }
    pulse(origin: Point): void {
        if (!this.state.pulseCharge || this.state.status !== "playing") return;
        this.state.pulseCharge = 0; this.state.pulses++;
        this.state.invulnerable = Math.max(this.state.invulnerable, 0.3);
        this.effects?.flash(origin.x, origin.y, "Pulse", 330, 0.5);
        this.bullets = this.bullets.filter(b => {
            if (Math.hypot(b.sprite.x - origin.x, b.sprite.y - origin.y) > 165) return true;
            this.removeBullet(b); this.state.deflected++; return false;
        });
        for (const e of [...this.enemies]) if (Math.hypot(e.sprite.x - origin.x, e.sprite.y - origin.y) <= 165 && this.unobstructed(origin, e.sprite)) {
            e.timer = 0; e.locked = false; this.hit(e, 1);
        }
    }
    private hit(e: EnemyUnit, damage: number): void {
        e.hp -= damage;
        this.effects?.flash(e.sprite.x, e.sprite.y, "Hit", e.kind === "warden" ? 110 : 52, 0.2);
        if (e.hp > 0) { e.sprite.opacity = 0.55; return; }
        this.effects?.flash(e.sprite.x, e.sprite.y, "Pulse", e.kind === "warden" ? 160 : 76, 0.35);
        e.marker.destroy(); e.sprite.destroy();
        this.enemies.splice(this.enemies.indexOf(e), 1);
        this.state.kills++; this.state.enemiesRemaining = this.enemies.length;
        // Each defeat restores the single pulse charge, never more than one.
        this.state.pulseCharge = 1;
    }
    private removeBullet(b: Bullet): void { b.sprite.destroy(); b.guide.destroy(); }
    private shoot(e: EnemyUnit, angle: number, speed = 185): void {
        if (this.bullets.length >= 64) return;
        const sprite = this.runtime.objects.Projectile.createInstance("scene", e.sprite.x, e.sprite.y);
        sprite.setAnimation("Core"); sprite.blendMode = "additive"; sprite.width = 38; sprite.height = 20; sprite.angle = angle;
        const guide = this.runtime.objects.ProjectileGuide.createInstance("scene", sprite.x, sprite.y);
        guide.setAnimation("Core"); guide.angle = angle; guide.height = 2; guide.opacity = 0.35;
        guide.colorRgb = [0.35, 0.8, 1];
        const bullet = { sprite, guide, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0 };
        this.bullets.push(bullet); this.updateGuide(bullet);
    }
    private moveHunter(e: EnemyUnit, dt: number, charging: boolean): void {
        const p = this.runtime.objects.Player.getFirstInstance()!, s = e.sprite;
        const angle = charging ? e.angle : Math.atan2(p.y - s.y, p.x - s.x);
        const speed = charging ? 370 : 85;
        const dx = Math.cos(angle) * speed * dt, dy = Math.sin(angle) * speed * dt;
        const walls = this.runtime.objects.Wall.getAllInstances();
        // Small steps and sliding checks prevent dashes tunnelling through Solid cover.
        const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8));
        for (let i = 0; i < steps; i++) {
            const to = { x: s.x + dx / steps, y: s.y + dy / steps };
            const clear = (target: Point) => walls.every(w => segmentHit(s, target, w, 18) === null);
            if (clear(to)) { s.x = to.x; s.y = to.y; }
            else { if (clear({ x: to.x, y: s.y })) s.x = to.x; if (clear({ x: s.x, y: to.y })) s.y = to.y; }
        }
    }
    update(dt: number, previousPlayer: Point): void {
        const player = this.runtime.objects.Player.getFirstInstance()!;
        const walls = this.runtime.objects.Wall.getAllInstances();
        this.state.update(dt);
        this.bullets = this.bullets.filter(b => {
            const s = b.sprite, from = { x: s.x, y: s.y }, to = { x: s.x + b.vx * dt, y: s.y + b.vy * dt };
            const wallHit = Math.min(...walls.map(w => segmentHit(from, to, w, 4) ?? Infinity));
            const playerHit = relativeHit(from, to, previousPlayer, player, { x: 0, y: 0, width: 8, height: 8 });
            b.age += dt; s.animationSpeed = 0; s.animationFrame = Math.floor(b.age * 12) % 6;
            if (playerHit !== null && playerHit < wallHit) this.state.damage();
            if (wallHit !== Infinity || playerHit !== null || b.age > 8) { this.removeBullet(b); return false; }
            s.x = to.x; s.y = to.y; this.updateGuide(b); return true;
        });
        for (const e of this.enemies) {
            const old = { x: e.sprite.x, y: e.sprite.y };
            const frenzy = e.kind === "warden" && e.hp <= e.maxHp / 2;
            const interval = e.kind === "hunter" ? 2.2 : e.kind === "warden" ? (frenzy ? 1.15 : 1.8) : 1.15;
            const limit = interval;
            // Charge-up and intent markers consume world time and stay still in a pause.
            if (dt > 0) {
                e.timer += dt;
                if (!e.locked && e.timer >= limit - 0.4) { e.angle = Math.atan2(player.y - e.sprite.y, player.x - e.sprite.x); e.locked = true; }
                if (e.kind === "hunter") this.moveHunter(e, dt, e.locked && e.timer >= interval - 0.25);
                if (e.timer >= limit) {
                    if (e.kind === "shooter") this.shoot(e, e.locked ? e.angle : Math.atan2(player.y - e.sprite.y, player.x - e.sprite.x));
                    if (e.kind === "warden") {
                        const count = frenzy ? 12 : 8;
                        for (let i = 0; i < count; i++) this.shoot(e, i / count * Math.PI * 2 + (frenzy ? 0.14 : 0), frenzy ? 175 : 145);
                        this.shoot(e, Math.atan2(player.y - e.sprite.y, player.x - e.sprite.x), 210);
                    }
                    e.timer = 0; e.locked = false;
                }
                e.sprite.opacity = Math.min(1, e.sprite.opacity + dt * 4);
            }
            e.marker.isVisible = e.locked;
            e.marker.x = e.sprite.x; e.marker.y = e.sprite.y; e.marker.angle = e.angle;
            e.marker.width = e.kind === "warden" ? 150 : 70;
            e.marker.height = e.kind === "warden" ? 90 : 45;
            e.marker.y += e.kind === "warden" ? e.sprite.height * 0.3 : 0;
            e.marker.opacity = frenzy ? 0.95 : 0.6;
            if (e.kind !== "warden") {
                e.marker.setAnimation("Aim"); e.marker.height = 4;
                const nx = Math.cos(e.angle), ny = Math.sin(e.angle), range = 150;
                const end = { x: e.sprite.x + nx * range, y: e.sprite.y + ny * range };
                const fraction = Math.min(1, ...walls.map(w => segmentHit(e.sprite, end, w) ?? 1));
                const length = Math.max(0, fraction * range - 18);
                e.marker.width = Math.max(1, length);
                e.marker.isVisible = e.locked && length > 3;
                e.marker.x += nx * (18 + length / 2); e.marker.y += ny * (18 + length / 2);
            }
            if (relativeHit(previousPlayer, player, old, e.sprite, player) !== null) this.state.damage();
        }
    }
    private updateGuide(b: Bullet): void {
        const s = b.sprite, guide = b.guide, nx = Math.cos(s.angle), ny = Math.sin(s.angle), range = 110;
        const end = { x: s.x + nx * range, y: s.y + ny * range };
        const hit = Math.min(1, ...this.runtime.objects.Wall.getAllInstances().map(w => segmentHit(s, end, w) ?? 1));
        const length = Math.max(0, range * hit - s.width / 2);
        guide.isVisible = length > 3; guide.width = Math.max(1, length);
        guide.x = s.x + nx * (s.width / 2 + length / 2); guide.y = s.y + ny * (s.width / 2 + length / 2);
    }
}
