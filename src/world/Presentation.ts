import type { RoomSpec } from "../game/Rooms";
export class Presentation {
    private active: boolean | null = null;
    constructor(private readonly runtime: IRuntime, private readonly room: RoomSpec) {}
    update(active: boolean): void {
        if (active === this.active) return;
        this.active = active;
        const floor = this.runtime.objects.ArenaFloor.getFirstInstance();
        if (floor) {
            floor.setAnimation(active ? "Color" : "Frozen");
            floor.colorRgb = active ? [this.room.tint[0] * 0.68, this.room.tint[1] * 0.73, this.room.tint[2] * 0.86] : [0.48, 0.52, 0.64];
        }
        for (const type of [this.runtime.objects.Wall, this.runtime.objects.WallFace])
            for (const wall of type.getAllInstances()) wall.colorRgb = active ? this.room.tint : [0.65, 0.7, 0.78];
    }
}
