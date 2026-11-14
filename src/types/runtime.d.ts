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
 colorRgb: [number, number, number]; blendMode: string;
 text: string; animationSpeed: number; animationFrame: number; isMirrored: boolean;
 setAnimation(name: string): void;
 moveToTop(): void; moveToBottom(): void;
 destroy(): void;
}
interface ObjectType<T> {
 getFirstInstance(): T | null; getAllInstances(): T[];
 createInstance(layer: string, x: number, y: number): T;
}
interface Hud { htmlContent: string; addEventListener(name: "click", callback: (event: { targetId: string }) => void): void; }
interface IRuntime {
 objects: { WorldProp?: ObjectType<Sprite>; Player: ObjectType<Sprite>; TestEnemy: ObjectType<Sprite>;
 Wall: ObjectType<Sprite>; Projectile: ObjectType<Sprite>;
 ProjectileGuide: ObjectType<Sprite>; TimeFragment: ObjectType<Sprite>; Exit: ObjectType<Sprite>;
 ActorShadow: ObjectType<Sprite>; WallFace: ObjectType<Sprite>; ArenaFloor: ObjectType<Sprite>; CombatFx: ObjectType<Sprite>; CombatMarker: ObjectType<Sprite>; HeroVisual: ObjectType<Sprite>; TutorialText: ObjectType<Sprite>; TutorialText2: ObjectType<Sprite>; TutorialText3: ObjectType<Sprite>; TutorialText4: ObjectType<Sprite>;
 HowToControl: ObjectType<Hud> };
 keyboard: { isKeyDown(code: string): boolean };
 dtRaw: number; timeScale: number;
 layout: { name: string };
 goToLayout(name: string): void;
 addEventListener(name: "pointerdown", callback: (event: { button: number; target?: EventTarget | null }) => void): void;
 addEventListener(name: string, callback: () => void): void;
}
declare function runOnStartup(callback: (runtime: IRuntime) => void): void;
