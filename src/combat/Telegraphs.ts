import { segmentHit, type Point } from "../game/geometry";
/** Filled ground silhouettes predict attacks; no lines travel ahead of live shots. */
export class Telegraphs {
    constructor(private readonly runtime: IRuntime) {}
    lane(marker: Sprite, origin: Point, angle: number, range: number, width: number): void {
        const nx = Math.cos(angle), ny = Math.sin(angle);
        const end = { x: origin.x + nx * range, y: origin.y + ny * range };
        const fraction = Math.min(1, ...this.runtime.objects.Wall.getAllInstances().map(w => segmentHit(origin, end, w, 4) ?? 1));
        const length = Math.max(0, fraction * range - 12);
        marker.setAnimation("Lane"); marker.width = Math.max(1, length); marker.height = width;
        marker.x = origin.x + nx * (12 + length / 2); marker.y = origin.y + ny * (12 + length / 2);
        marker.angle = angle; marker.isVisible = length > 3;
    }
    sector(marker: Sprite, origin: Point, angle: number, range: number): void {
        marker.setAnimation("Sweep"); marker.x = origin.x; marker.y = origin.y;
        marker.width = range * 2; marker.height = range * 2; marker.angle = angle; marker.isVisible = true;
    }
    sigil(marker:Sprite,origin:Point,radius:number,style='Sigil'):void {
        marker.setAnimation(style);marker.x=origin.x;marker.y=origin.y;marker.width=radius*2;marker.height=radius*2;marker.angle=0;marker.isVisible=true;
    }
    flower(marker: Sprite, origin: Point, radius: number): void {
        marker.setAnimation("Bloom"); marker.x = origin.x; marker.y = origin.y;
        marker.width = radius * 2; marker.height = radius * 2; marker.angle = 0; marker.isVisible = true;
    }
}
