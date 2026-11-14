import type { RoomSpec } from "../game/Rooms";
export class Presentation {
    private active: boolean | null = null;
    constructor(private readonly runtime: IRuntime, private readonly room: RoomSpec) {}
    update(active: boolean): void {
        if (active === this.active) return;
        this.active = active;
        const floor = this.runtime.objects.ArenaFloor.getFirstInstance();
        if (floor) {
            floor.setAnimation((this.room.zone ?? "Garden") + (active ? "Color" : "Frozen"));
            floor.colorRgb = active ? this.room.tint : [0.85, 0.87, 0.94];
        }
        for (const type of [this.runtime.objects.Wall, this.runtime.objects.WallFace])
            for (const wall of type.getAllInstances()) wall.colorRgb = active ? this.room.tint : [0.65, 0.7, 0.78];
    }
}
