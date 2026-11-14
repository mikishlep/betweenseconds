import { relativeHit, segmentHit, type Point } from "./geometry";
import { GameState } from "./GameState";
import type { EnemyKind, RoomSpec, Weapon } from "./Rooms";
import { Effects } from "../world/Effects";
import { EnemyAnimator } from "../combat/EnemyAnimator";
import { Telegraphs } from "../combat/Telegraphs";
interface Bullet { sprite: Sprite; vx: number; vy: number; age: number; style: "Arrow" | "Petal"; }
interface Hazard { origin: Point; angle: number; radius: number; kind: "sweep" | "bloom" | "rift"; age: number; shown: boolean; marker?: Sprite; }
export interface EnemyUnit {
    sprite: Sprite; kind: EnemyKind; hp: number; maxHp: number; timer: number; angle: number; locked: boolean;
    marker: Sprite; marks: Sprite[]; targets: Point[]; origin: Point; attackIndex: number; recovery: number; animator: EnemyAnimator; phase:number; aura?:Sprite;
}
export class CombatSystem {
    private bullets: Bullet[] = [];
    private playerBolts: Bullet[] = [];
    weapon: Weapon = "blade";
    private hazards: Hazard[] = [];
    private readonly telegraphs: Telegraphs;
    readonly enemies: EnemyUnit[] = [];
    constructor(private readonly runtime: IRuntime, private readonly state: GameState, room?: RoomSpec, private readonly effects?: Effects) {
        this.telegraphs = new Telegraphs(runtime);
        for (const type of [runtime.objects.Projectile, runtime.objects.ProjectileGuide, runtime.objects.CombatMarker])
            for (const seed of type.getAllInstances()) seed.destroy();
        if (room) {
            for (const seed of runtime.objects.TestEnemy.getAllInstances()) seed.destroy();
            for (const spawn of room.enemies) {
                const sprite = runtime.objects.TestEnemy.createInstance("scene", spawn.x, spawn.y);
                sprite.setAnimation(spawn.kind === "bulwark" ? "BulwarkIdle" : spawn.kind === "viper" ? "ViperIdle" : spawn.kind === "shade" ? "ShadeIdle" : spawn.kind === "shooter" ? "ShooterIdle" : spawn.kind === "hunter" ? "HunterIdle" : spawn.kind === "echo" ? "EchoIdle" : spawn.kind === "regent" ? "RegentIdle" : "WardenIdle");
                sprite.width = spawn.kind === "viper" ? 72 : this.isBoss(spawn.kind) ? 112 : spawn.kind === "hunter" ? 64 : 46; sprite.height = spawn.kind === "viper" ? 96 : this.isBoss(spawn.kind) ? 144 : spawn.kind === "hunter" ? 64 : 46;
                this.addEnemy(sprite, spawn.kind, spawn.hp);
            }
        } else for (const sprite of runtime.objects.TestEnemy.getAllInstances()) this.addEnemy(sprite, "shooter", 2);
        this.state.enemiesRemaining = this.enemies.length;
    }
    private makeMarker(): Sprite {
        const marker = this.runtime.objects.CombatMarker.createInstance("scene", 0, 0);
        marker.isVisible = false; marker.animationSpeed = 0; return marker;
    }
    private addEnemy(sprite: Sprite, kind: EnemyKind, hp: number): void {
        this.enemies.push({ sprite, kind, hp, maxHp: hp, timer: kind === "shooter" ? .35 : 0, angle: Math.PI, locked: false,
            marker: this.makeMarker(), marks: [], targets: [], origin: { x: sprite.x, y: sprite.y }, attackIndex: 0, recovery: 0, animator: new EnemyAnimator(), phase:1, aura:this.isBoss(kind)?this.makeMarker():undefined });
    }
    private isBoss(kind: EnemyKind): boolean { return kind !== "shooter" && kind !== "hunter"; }
    isShooter(sprite: Sprite): boolean { return this.enemies.some(e => e.sprite === sprite && e.kind === "shooter" && !e.locked && e.recovery <= 0); }
    get boss(): { hp: number; maxHp: number; phase: number; name: string } | null {
        const e = this.enemies.find(e => this.isBoss(e.kind));
        return e ? { hp: e.hp, maxHp: e.maxHp, phase: e.hp <= e.maxHp * .3 ? 3 : e.hp <= e.maxHp * .65 ? 2 : 1, name: e.kind === "bulwark" ? "Каменный Бастион" : e.kind === "viper" ? "Багровый Стремник" : e.kind === "shade" ? "Безликий Осколок" : e.kind === "echo" ? "Эхо" : e.kind === "regent" ? "Последний Регент" : "Хранитель Цветения" } : null;
    }
    private unobstructed(a: Point, b: Point): boolean { return this.runtime.objects.Wall.getAllInstances().every(w => segmentHit(a, b, w) === null); }
    private inCone(origin: Point, target: Point, angle: number, range: number, cosine = .4): boolean {
        const dx = target.x - origin.x, dy = target.y - origin.y, length = Math.hypot(dx, dy);
        return length <= range && (length < 1 || (dx * Math.cos(angle) + dy * Math.sin(angle)) / length >= cosine) && this.unobstructed(origin, target);
    }
    strike(origin: Point, angle: number): void {
        if (this.state.status !== "playing") return;
        this.state.attacks++;
        this.effects?.flash(origin.x + Math.cos(angle) * 35, origin.y + Math.sin(angle) * 35, "Slash", 125, .34, angle);
        if (this.weapon === "lance") this.launchPlayer(origin, angle);
        else for (const e of [...this.enemies]) if (this.inCone(origin, e.sprite, angle, this.weapon === "rose" ? 125 : 90) && !this.guarded(e,origin)) this.hit(e, 1);
        this.bullets = this.bullets.filter(b => {
            if (!this.inCone(origin, b.sprite, angle, 95)) return true;
            b.sprite.destroy(); this.state.deflected++; return false;
        });
    }
    pulse(origin: Point): void {
        if (!this.state.pulseCharge || this.state.status !== "playing") return;
        this.state.pulseCharge = 0; this.state.pulses++;
        this.state.invulnerable = Math.max(this.state.invulnerable, .3);
        this.effects?.flash(origin.x, origin.y, "Pulse", 330, .5);
        this.bullets = this.bullets.filter(b => {
            if (Math.hypot(b.sprite.x - origin.x, b.sprite.y - origin.y) > 165) return true;
            b.sprite.destroy(); this.state.deflected++; return false;
        });
        this.hazards = this.hazards.filter(h => {
            if (Math.hypot(h.origin.x - origin.x, h.origin.y - origin.y) > 165) return true;
            h.marker?.destroy(); return false;
        });
        for (const e of [...this.enemies]) if (Math.hypot(e.sprite.x - origin.x, e.sprite.y - origin.y) <= 165 && this.unobstructed(origin, e.sprite)) {
            this.cancel(e); this.hit(e, 1);
        }
    }
    private cancel(e: EnemyUnit): void {
        e.timer = 0; e.locked = false; e.recovery = .25; e.marker.isVisible = false;
        e.marks.forEach(m => m.destroy()); e.marks = []; e.targets = [];
    }
    private guarded(e:EnemyUnit,origin:Point):boolean {
        if(e.kind === "shade" && e.recovery>.3)return true;
        return e.kind === "bulwark" && e.recovery<=0 && this.inCone(e.sprite,origin,e.angle,200,.1);
    }
    private hit(e: EnemyUnit, damage: number): void {
        e.hp -= damage;
        this.effects?.flash(e.sprite.x, e.sprite.y, "Hit", this.isBoss(e.kind) ? 100 : 45, .2);
        if (e.hp > 0) { e.sprite.opacity = .55; return; }
        this.effects?.flash(e.sprite.x, e.sprite.y, "Hit", this.isBoss(e.kind) ? 160 : 76, .35);
        this.cancel(e); e.marker.destroy(); e.aura?.destroy(); e.sprite.destroy();
        if (this.isBoss(e.kind)) {
            this.hazards.forEach(h => h.marker?.destroy()); this.hazards = [];
            this.bullets = this.bullets.filter(b => { if (b.style !== "Petal") return true; b.sprite.destroy(); return false; });
        }
        this.enemies.splice(this.enemies.indexOf(e), 1);
        this.state.kills++; this.state.enemiesRemaining = this.enemies.length; this.state.pulseCharge = 1;
    }
    private shoot(e: EnemyUnit, angle: number, speed = 205, style: "Arrow" | "Petal" = "Arrow"): void {
        if (this.bullets.length >= 64) return;
        const sprite = this.runtime.objects.Projectile.createInstance("scene", e.sprite.x, e.sprite.y);
        sprite.setAnimation(style); sprite.blendMode = "additive"; sprite.animationSpeed = 0;
        sprite.width = style === "Petal" ? 48 : 58; sprite.height = style === "Petal" ? 32 : 24; sprite.angle = angle;
        this.bullets.push({ sprite, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, style });
    }
    private launchPlayer(origin:Point,angle:number):void {
        if(this.playerBolts.length>=8)return;
        const sprite=this.runtime.objects.Projectile.createInstance("scene",origin.x,origin.y);
        sprite.setAnimation("Arrow");sprite.width=60;sprite.height=26;sprite.angle=angle;sprite.animationSpeed=0;sprite.blendMode="additive";sprite.colorRgb=[.25,1,1];
        this.playerBolts.push({sprite,vx:Math.cos(angle)*390,vy:Math.sin(angle)*390,age:0,style:"Arrow"});
    }
    private move(e: EnemyUnit, dt: number, charging: boolean): void {
        const p = this.runtime.objects.Player.getFirstInstance()!, s = e.sprite;
        const stop = e.kind === "viper" ? 105 : this.isBoss(e.kind) ? 90 : 48;
        if (!charging && Math.hypot(p.x - s.x, p.y - s.y) <= stop) return;
        const angle = charging ? e.angle : Math.atan2(p.y - s.y, p.x - s.x);
        const speed = charging ? (e.kind === "viper" ? 510 : 370) : e.kind === "viper" ? 130 : this.isBoss(e.kind) ? 38 : 72;
        const dx = Math.cos(angle) * speed * dt, dy = Math.sin(angle) * speed * dt;
        const walls = this.runtime.objects.Wall.getAllInstances();
        const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8));
        for (let i = 0; i < steps; i++) {
            const to = { x: s.x + dx / steps, y: s.y + dy / steps };
            const clear = (target: Point) => target.x >= 40 && target.x <= 1160 && target.y >= 50 && target.y <= 670 && walls.every(w => segmentHit(s, target, w, 18) === null);
            if (clear(to)) { s.x = to.x; s.y = to.y; }
            else { if (clear({ x: to.x, y: s.y })) s.x = to.x; if (clear({ x: s.x, y: to.y })) s.y = to.y; }
        }
    }
    private lock(e: EnemyUnit, player: Point, frenzy: boolean): void {
        e.locked = true; e.angle = Math.atan2(player.y - e.sprite.y, player.x - e.sprite.x);
        e.origin = { x: e.sprite.x, y: e.sprite.y };
        if(e.kind === "shade"){e.targets=[{x:e.attackIndex%2?660:980,y:e.attackIndex%2?260:500}];e.marks=[this.makeMarker()];}
        if ((e.kind === "warden" && e.attackIndex % 3 === 2) || ((e.kind === "echo" || e.kind === "regent") && e.attackIndex % 3 === 1) || (e.kind === "regent" && e.phase === 3 && e.attackIndex % 3 === 0)) {
            const count = e.phase===3 ? 7 : frenzy ? 5 : 3;
            // Target the position at wind-up, never track the player after commitment.
            for (let i = 0; i < count; i++) {
                const a = (i - 1) * Math.PI * 2 / (count - 1);
                const target = i === 0 ? { x: player.x, y: player.y } : { x: Math.max(65, Math.min(1135, player.x + Math.cos(a) * 88)), y: Math.max(65, Math.min(655, player.y + Math.sin(a) * 88)) };
                if (!this.unobstructed(e.origin, target)) continue;
                e.targets.push(target); e.marks.push(this.makeMarker());
            }
        }
    }
    private release(e: EnemyUnit, frenzy: boolean): void {
        const pattern = e.attackIndex % 3;
        if (e.kind === "shooter") this.shoot(e, e.angle);
        if(e.kind === "bulwark")this.hazards.push({origin:e.origin,angle:e.angle,radius:120,kind:"sweep",age:0,shown:false});
        if(e.kind === "shade"){
            for(const a of [-.22,0,.22])this.shoot(e,e.angle+a,180,"Arrow");
            const target=e.targets[0]??{x:980,y:500};
            this.effects?.flash(e.sprite.x,e.sprite.y,"Rift",90,.35,0,true);
            if(this.unobstructed(e.sprite,target)){e.sprite.x=target.x;e.sprite.y=target.y;}
            e.sprite.opacity=.2;e.marks.forEach(m=>m.destroy());e.marks=[];e.targets=[];
        }
        if (e.kind === "warden") {
            if (pattern === 0) this.hazards.push({ origin: e.origin, angle: e.angle, radius: 150, kind: "sweep", age: 0, shown: false });
            else if (pattern === 1) {
                const count = e.phase===3 ? 11 : frenzy ? 9 : 7;
                for (let i = 0; i < count; i++) this.shoot(e, e.angle + (i / (count - 1) - .5) * 1.65, frenzy ? 175 : 145, "Petal");
                this.effects?.flash(e.sprite.x, e.sprite.y, "Bloom", 96, .45, 0, true);
            } else {
                e.targets.forEach((origin, i) => this.hazards.push({ origin, angle: 0, radius: 34, kind: "bloom", age: -i * .14, shown: false, marker: e.marks[i] }));
                e.marks = []; e.targets = [];
            }
        }
        if (e.kind === "echo" || e.kind === "regent") {
            if (pattern === 1) {
                e.targets.forEach((origin,i)=>this.hazards.push({origin,angle:0,radius:38,kind:"rift",age:-i*.12,shown:false,marker:e.marks[i]}));e.marks=[];e.targets=[];
            } else if (e.kind === "regent" && pattern === 2) this.hazards.push({origin:e.origin,angle:e.angle,radius:190,kind:"sweep",age:0,shown:false});
            else {
                const count=e.kind === "echo" ? (e.phase===3?18:frenzy?14:10) : (frenzy?13:9);
                for(let i=0;i<count;i++) {
                    const a=e.kind === "echo" ? e.angle+.5+(i/count)*Math.PI*2 : e.angle+(i/(count-1)-.5)*2.6;
                    if(e.kind === "echo" && Math.cos(a-e.angle)>.93)continue;
                    this.shoot(e,a,e.kind === "echo"?130:170,pattern===2?"Arrow":"Petal");
                }
                if(e.kind === "echo" && pattern === 2){
                    const target={x:e.sprite.x>750?620:940,y:e.sprite.y>360?240:480};
                    if(this.unobstructed(e.sprite,target)){this.effects?.flash(e.sprite.x,e.sprite.y,"Rift",90,.35,0,true);e.sprite.x=target.x;e.sprite.y=target.y;this.effects?.flash(target.x,target.y,"Rift",90,.35,0,true);}
                }
            }
        }
        if(e.kind === "regent" && e.phase === 3 && pattern === 0){
            e.targets.forEach((origin,i)=>this.hazards.push({origin,angle:0,radius:38,kind:"rift",age:-i*.12,shown:false,marker:e.marks[i]}));e.marks=[];e.targets=[];
        }
        e.timer = 0; e.locked = false; e.recovery = (pattern === 2 && e.kind === "warden") || (pattern === 1 && (e.kind === "echo" || e.kind === "regent")) ? .95 : .45;
        if(e.kind === "viper")e.recovery=.4;if(e.kind === "shade")e.recovery=.8;
        e.attackIndex++; e.marker.isVisible = false;
    }
    private updateHazards(dt: number, previous: Point, player: Point): void {
        this.hazards = this.hazards.filter(h => {
            h.age += dt;
            if (h.age < 0) return true;
            if (!h.shown && dt > 0) {
                h.shown = true; h.marker?.destroy(); h.marker = undefined;
                this.effects?.flash(h.origin.x, h.origin.y, h.kind === "bloom" ? "Bloom" : h.kind === "rift" ? "Rift" : "RoseSweep", h.radius * 2, .42, h.angle, true);
            }
            if (h.age > .24) return false;
            if (dt <= 0 || !h.shown) return true;
            const steps = Math.max(1, Math.ceil(Math.hypot(player.x - previous.x, player.y - previous.y) / 8));
            for (let i = 0; i <= steps; i++) {
                const point = { x: previous.x + (player.x - previous.x) * i / steps, y: previous.y + (player.y - previous.y) * i / steps };
                if (this.inCone(h.origin, point, h.angle, h.radius, h.kind !== "sweep" ? -1 : .35)) { this.state.damage(); break; }
            }
            return true;
        });
    }
    update(dt: number, previousPlayer: Point): void {
        const player = this.runtime.objects.Player.getFirstInstance()!;
        const walls = this.runtime.objects.Wall.getAllInstances();
        this.state.update(dt);
        this.bullets = this.bullets.filter(b => {
            const s = b.sprite, from = { x: s.x, y: s.y }, to = { x: s.x + b.vx * dt, y: s.y + b.vy * dt };
            const wallHit = Math.min(...walls.map(w => segmentHit(from, to, w, 4) ?? Infinity));
            const playerHit = relativeHit(from, to, previousPlayer, player, { x: 0, y: 0, width: 10, height: 10 });
            b.age += dt; s.animationFrame = Math.floor(b.age * 12) % 6;
            if (playerHit !== null && playerHit < wallHit) this.state.damage();
            if (wallHit !== Infinity || playerHit !== null || b.age > 8) { s.destroy(); return false; }
            s.x = to.x; s.y = to.y; return true;
        });
        this.playerBolts = this.playerBolts.filter(b=>{
            const from={x:b.sprite.x,y:b.sprite.y},to={x:from.x+b.vx*dt,y:from.y+b.vy*dt};b.age+=dt;
            const wallHit=Math.min(...walls.map(w=>segmentHit(from,to,w,4)??Infinity));
            const hits=this.enemies.map(e=>({e,t:segmentHit(from,to,{x:e.sprite.x,y:e.sprite.y,width:24,height:24},5)??Infinity})).sort((a,b)=>a.t-b.t);
            if(hits[0] && hits[0].t<wallHit){if(!this.guarded(hits[0].e,from))this.hit(hits[0].e,1);b.sprite.destroy();return false;}
            if(wallHit!==Infinity||b.age>.95){b.sprite.destroy();return false;}
            b.sprite.x=to.x;b.sprite.y=to.y;b.sprite.animationFrame=Math.floor(b.age*12)%6;return true;
        });
        this.updateHazards(dt, previousPlayer, player);
        for (const e of this.enemies) {
            const old = { x: e.sprite.x, y: e.sprite.y };
            const phase=this.isBoss(e.kind)?(e.hp<=e.maxHp*.3?3:e.hp<=e.maxHp*.65?2:1):1;
            if(phase!==e.phase && dt>0){this.cancel(e);e.phase=phase;this.effects?.flash(e.sprite.x,e.sprite.y,"Rift",180,.6,0,true);}
            const frenzy = phase>=2;
            const interval = e.kind === "viper" ? (frenzy?1.1:1.5) : e.kind === "hunter" ? 2.2 : this.isBoss(e.kind) ? (phase===3?1.35:frenzy ? 1.6 : 2.1) : 1.35;
            const warning = e.kind === "viper" ? .45 : this.isBoss(e.kind) ? .9 : e.kind === "hunter" ? .65 : .6;
            let lunging = false;
            if (dt > 0) {
                if (e.recovery > 0) e.recovery = Math.max(0, e.recovery - dt);
                else {
                    e.timer += dt;
                    if (!e.locked && e.timer >= interval - warning){this.lock(e, player, frenzy);e.timer=Math.min(e.timer,interval-warning+dt);}
                    lunging = (e.kind === "hunter" || e.kind === "viper") && e.locked && e.timer >= interval - .22;
                    if (((e.kind === "hunter" || e.kind === "viper" || e.kind === "bulwark") && (!e.locked || lunging)) || (e.kind === "warden" && !e.locked && e.attackIndex % 3 === 0)) this.move(e, dt, lunging);
                    if (lunging && this.unobstructed(player, e.sprite) && relativeHit(previousPlayer, player, old,
                        { x: e.sprite.x, y: e.sprite.y, width: 24, height: 20 }, { x: 0, y: 0, width: 22, height: 20 }) !== null) this.state.damage();
                    if (e.timer >= interval) {
                        if (lunging) this.effects?.flash(e.sprite.x, e.sprite.y, "HunterCut", 92, .26, e.angle, true);
                        this.release(e, frenzy);
                    }
                }
                e.sprite.opacity = e.kind === "shade" && e.recovery>.3 ? .2 : Math.min(1, e.sprite.opacity + dt * 4);
            }
            e.marker.isVisible = false;
            if (e.locked && !lunging) {
                const t = Math.max(0, Math.min(1, (e.timer - (interval - warning)) / warning));
                e.marker.opacity = .45 + t * .4;
                if(e.kind === "viper")this.telegraphs.lane(e.marker,e.origin,e.angle,150,32);
                else if(e.kind === "bulwark")this.telegraphs.sector(e.marker,e.origin,e.angle,120);
                else if(e.kind === "shade"){this.telegraphs.lane(e.marker,e.origin,e.angle,360,34);e.marks.forEach((m,i)=>this.telegraphs.flower(m,e.targets[i],22));}
                else if (e.kind === "warden" && e.attackIndex % 3 === 0) this.telegraphs.sector(e.marker, e.origin, e.angle, 150);
                else if (e.kind === "warden" && e.attackIndex % 3 === 2) e.marks.forEach((m, i) => { this.telegraphs.flower(m, e.targets[i], 34); m.opacity = .45 + t * .4; });
                else if (this.isBoss(e.kind) && e.kind !== "warden" && e.attackIndex % 3 === 1) e.marks.forEach((m,i)=>{this.telegraphs.flower(m,e.targets[i],38);m.opacity=.45+t*.4;});
                else if (this.isBoss(e.kind)) this.telegraphs.sector(e.marker, e.origin, e.angle, 230);
                else this.telegraphs.lane(e.marker, e.origin, e.angle, e.kind === "hunter" ? 125 : 440, e.kind === "hunter" ? 30 : 22);
            }
            if(this.isBoss(e.kind)){
                if(e.aura){e.aura.setAnimation("Ring");e.aura.isVisible=phase>1;e.aura.x=e.sprite.x;e.aura.y=e.sprite.y+8;e.aura.width=phase===3?190:145;e.aura.height=phase===3?110:85;e.aura.opacity=.65;}
                e.sprite.colorRgb=phase===3?[1,.55,.8]:phase===2?[1,.8,.93]:[1,1,1];
                if(e.kind === "bulwark" && !e.locked)e.angle=Math.atan2(player.y-e.sprite.y,player.x-e.sprite.x);
            }
            if(e.locked && e.kind === "regent" && e.phase === 3 && e.attackIndex%3 === 0)e.marks.forEach((m,i)=>this.telegraphs.flower(m,e.targets[i],38));
            const moved = Math.hypot(e.sprite.x - old.x, e.sprite.y - old.y) > .01;
            e.animator.update(e.sprite, e.kind, dt, moved, e.locked && !lunging, lunging ? .4 : e.recovery, e.angle);
        }
    }
}
