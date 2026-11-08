// Narrow structural contract for the Construct APIs used here, not the complete SDK.
interface Movement {
 maxSpeed: number; acceleration: number; deceleration: number;
 vectorX: number; vectorY: number; isEnabled: boolean;
 simulateControl(control: string): void;
}
interface Sine { phase: number; readonly value: number; }
interface Sprite {
 x: number; y: number; width: number; height: number; angle: number;
 dt: number; timeScale: number; opacity: number; isVisible: boolean;
 behaviors: { "8Направлений": Movement; "Синусоида": Sine };
 destroy(): void;
}
interface ObjectType<T> {
 getFirstInstance(): T | null; getAllInstances(): T[];
 createInstance(layer: string, x: number, y: number): T;
}
interface Hud { htmlContent: string; }
interface IRuntime {
 objects: { Player: ObjectType<Sprite>; TestEnemy: ObjectType<Sprite>;
 Wall: ObjectType<Sprite>; Projectile: ObjectType<Sprite>;
 ProjectileGuide: ObjectType<Sprite>; TimeFragment: ObjectType<Sprite>; Exit: ObjectType<Sprite>;
 HowToControl: ObjectType<Hud> };
 keyboard: { isKeyDown(code: string): boolean };
 dtRaw: number; timeScale: number;
 layout: { name: string };
 goToLayout(name: string): void;
 addEventListener(name: string, callback: () => void): void;
}
declare function runOnStartup(callback: (runtime: IRuntime) => void): void;
