/** Shallow 2.5D rendering over an unchanged 2D collision plane. */
export class Depth {
    private readonly heroShadow: Sprite;
    private readonly enemyShadows = new Map<Sprite, Sprite>();
    private readonly faces: { wall: Sprite; face: Sprite }[] = [];
    constructor(private readonly runtime: IRuntime) {
        for (const type of [runtime.objects.ActorShadow, runtime.objects.WallFace]) for (const seed of type.getAllInstances()) seed.destroy();
        this.heroShadow = this.makeShadow(30, 12);
        for (const wall of runtime.objects.Wall.getAllInstances()) {
            if (!wall.isVisible) continue;
            const face = runtime.objects.WallFace.createInstance("scene", wall.x, wall.y + wall.height / 2 + 6);
            face.width = wall.width; face.height = 12;
            this.faces.push({ wall, face });
        }
    }
    private makeShadow(width: number, height: number): Sprite {
        const sprite = this.runtime.objects.ActorShadow.createInstance("scene", 0, 0);
        sprite.width = width; sprite.height = height; sprite.opacity = 0.5;
        return sprite;
    }
    update(): void {
        const player = this.runtime.objects.Player.getFirstInstance()!;
        const hero = this.runtime.objects.HeroVisual.getFirstInstance()!;
        const enemies = this.runtime.objects.TestEnemy.getAllInstances(), alive = new Set(enemies);
        for (const [enemy, shadow] of this.enemyShadows) if (!alive.has(enemy)) { shadow.destroy(); this.enemyShadows.delete(enemy); }
        this.runtime.objects.ArenaFloor.getFirstInstance()?.moveToBottom();
        this.heroShadow.x = player.x; this.heroShadow.y = player.y + 13; this.heroShadow.moveToTop();
        for (const enemy of enemies) {
            let shadow = this.enemyShadows.get(enemy);
            if (!shadow) { shadow = this.makeShadow(enemy.width * 0.9, enemy.width * 0.3); this.enemyShadows.set(enemy, shadow); }
            shadow.x = enemy.x; shadow.y = enemy.y + enemy.height / 2 - 2; shadow.moveToTop();
        }
        const ordered = [{ sprite: hero, foot: player.y + 14 },
            ...enemies.map(sprite => ({ sprite, foot: sprite.y + sprite.height / 2 })),
            ...this.runtime.objects.Wall.getAllInstances().map(sprite => ({ sprite, foot: sprite.y + sprite.height / 2 })),
            ...this.faces.map(({ wall, face }) => ({ sprite: face, foot: wall.y + wall.height / 2 + 12 })),
            ...this.runtime.objects.Exit.getAllInstances().map(sprite => ({ sprite, foot: sprite.y + sprite.height / 2 })),
            ...this.runtime.objects.TimeFragment.getAllInstances().map(sprite => ({ sprite, foot: sprite.y + sprite.height / 2 })),
            ...this.runtime.objects.CombatFx.getAllInstances().map(sprite => ({ sprite, foot: sprite.y + sprite.height * 0.2 }))];
        ordered.sort((a, b) => a.foot - b.foot).forEach(entry => entry.sprite.moveToTop());
        for (const type of [this.runtime.objects.CombatMarker, this.runtime.objects.ProjectileGuide, this.runtime.objects.Projectile])
            for (const sprite of type.getAllInstances()) sprite.moveToTop();
    }
}
