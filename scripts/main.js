var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// src/main.ts
var require_main = __commonJS({
  "src/main.ts"() {
    var dashTime = 0;
    var dashCooldown = 0;
    var spaceWasDown = false;
    runOnStartup(async (runtime) => {
      runtime.addEventListener("beforeprojectstart", () => {
        runtime.addEventListener("tick", () => tick(runtime));
      });
    });
    function tick(runtime) {
      const player = runtime.objects.Player.getFirstInstance();
      if (!player) return;
      const keyboard = runtime.keyboard;
      const move = player.behaviors["8\u041D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0439"];
      const dt = runtime.dt;
      dashTime = Math.max(0, dashTime - dt);
      dashCooldown = Math.max(0, dashCooldown - dt);
      const up = keyboard.isKeyDown("KeyW");
      const down = keyboard.isKeyDown("KeyS");
      const left = keyboard.isKeyDown("KeyA");
      const right = keyboard.isKeyDown("KeyD");
      const space = keyboard.isKeyDown("Space");
      const x = Number(right) - Number(left);
      const y = Number(down) - Number(up);
      if (space && !spaceWasDown && dashCooldown === 0 && (x !== 0 || y !== 0)) {
        const length = Math.hypot(x, y);
        dashTime = 0.15;
        dashCooldown = 0.6;
        move.maxSpeed = 700;
        move.vectorX = x / length * 700;
        move.vectorY = y / length * 700;
      }
      spaceWasDown = space;
      if (dashTime > 0) return;
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
  }
});
export default require_main();
