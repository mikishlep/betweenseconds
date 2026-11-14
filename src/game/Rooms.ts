export type EnemyKind = "shooter" | "hunter" | "warden";
export interface EnemySpawn { kind: EnemyKind; x: number; y: number; hp: number; }
export interface RoomSpec { title: string; subtitle: string; enemies: EnemySpawn[]; tint: [number, number, number]; par: number; }
export const ROOMS: RoomSpec[] = [
    { title: "01 / ДВОР ЦВЕТЕНИЯ", subtitle: "Стрелок и охотник. Раздели их укрытием.", tint: [1, 1, 1], par: 5,
      enemies: [{ kind: "shooter", x: 620, y: 350, hp: 2 }, { kind: "hunter", x: 960, y: 520, hp: 2 }] },
    { title: "02 / ПЕРВАЯ ТРЕЩИНА", subtitle: "Два стрелка. Ударом можно сбить заряд перед собой.", tint: [0.78, 0.84, 1], par: 8,
      enemies: [{ kind: "shooter", x: 610, y: 180, hp: 2 }, { kind: "shooter", x: 950, y: 510, hp: 2 }, { kind: "hunter", x: 650, y: 530, hp: 2 }] },
    { title: "03 / СТРАЖ РАЗЛОМА", subtitle: "На половине здоровья страж ускорит кольца зарядов.", tint: [0.85, 0.6, 0.9], par: 12,
      enemies: [{ kind: "warden", x: 780, y: 360, hp: 8 }, { kind: "shooter", x: 610, y: 160, hp: 2 }] }
];
export const TUTORIAL_ROOM: RoomSpec = { title: "ОБУЧЕНИЕ / МЕЖДУ СЕКУНДАМИ", subtitle: "Двигайся или атакуй — мир оживает.", tint: [0.9, 1, 1], par: 3,
    enemies: [{ kind: "shooter", x: 620, y: 360, hp: 2 }] };
export class Campaign {
    room = 0;
    get current(): RoomSpec { return ROOMS[this.room]; }
    get last(): boolean { return this.room === ROOMS.length - 1; }
    reset(): void { this.room = 0; }
    advance(): void { this.room = this.last ? 0 : this.room + 1; }
}
