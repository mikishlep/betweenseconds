var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// src/player/PlayerController.ts
var PlayerController;
var init_PlayerController = __esm({
  "src/player/PlayerController.ts"() {
    PlayerController = class {
      constructor(runtime) {
        this.runtime = runtime;
      }
      runtime;
      dashTime = 0;
      dashCooldown = 0;
      spaceWasDown = false;
      update() {
        const runtime = this.runtime;
        const player = runtime.objects.Player.getFirstInstance();
        if (!player) return;
        const keyboard = runtime.keyboard;
        const move = player.behaviors["8\u041D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0439"];
        const dt = player.dt;
        this.dashTime = Math.max(0, this.dashTime - dt);
        this.dashCooldown = Math.max(0, this.dashCooldown - dt);
        const up = keyboard.isKeyDown("KeyW");
        const down = keyboard.isKeyDown("KeyS");
        const left = keyboard.isKeyDown("KeyA");
        const right = keyboard.isKeyDown("KeyD");
        const space = keyboard.isKeyDown("Space");
        const x = Number(right) - Number(left);
        const y = Number(down) - Number(up);
        if (space && !this.spaceWasDown && this.dashCooldown === 0 && (x !== 0 || y !== 0)) {
          const length = Math.hypot(x, y);
          this.dashTime = 0.15;
          this.dashCooldown = 0.6;
          move.maxSpeed = 700;
          move.vectorX = x / length * 700;
          move.vectorY = y / length * 700;
        }
        this.spaceWasDown = space;
        if (this.dashTime > 0) return;
        move.maxSpeed = 220;
        const speed = Math.hypot(move.vectorX, move.vectorY);
        if (speed > 220) {
          move.vectorX *= 220 / speed;
          move.vectorY *= 220 / speed;
        }
        if (up) move.simulateControl("up");
        if (down) move.simulateControl("down");
        if (left) move.simulateControl("left");
        if (right) move.simulateControl("right");
      }
    };
  }
});

// src/systems/TimeController.ts
var TimeController;
var init_TimeController = __esm({
  "src/systems/TimeController.ts"() {
    TimeController = class {
      constructor(runtime) {
        this.runtime = runtime;
      }
      runtime;
      lastX = null;
      lastY = null;
      update() {
        const player = this.runtime.objects.Player.getFirstInstance();
        if (!player) {
          this.runtime.timeScale = 1;
          this.lastX = null;
          this.lastY = null;
          return;
        }
        player.timeScale = 1;
        if (this.lastX === null || this.lastY === null) {
          this.lastX = player.x;
          this.lastY = player.y;
          return;
        }
        const dx = player.x - this.lastX;
        const dy = player.y - this.lastY;
        const isMoving = Math.hypot(dx, dy) > 0.01;
        this.runtime.timeScale = isMoving ? 1 : 0;
        this.lastX = player.x;
        this.lastY = player.y;
      }
    };
  }
});

// src/main.ts
var require_main = __commonJS({
  "src/main.ts"() {
    init_PlayerController();
    init_TimeController();
    runOnStartup(async (runtime) => {
      runtime.addEventListener("beforeprojectstart", () => {
        const player = new PlayerController(runtime);
        const time = new TimeController(runtime);
        runtime.addEventListener("tick", () => {
          player.update();
          time.update();
        });
      });
    });
  }
});
export default require_main();
