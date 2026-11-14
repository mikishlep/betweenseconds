import { GameController } from "./game/GameController";
runOnStartup(runtime => {
    let game: GameController | null = null;
    // Register once; a layout reload replaces the controller, never its listeners.
    runtime.addEventListener("beforeanylayoutstart", () => {
        const objects = runtime.objects;
        const required = [objects.Player, objects.TestEnemy, objects.Exit, objects.HowToControl, objects.HeroVisual];
        game = required.every(type => type.getFirstInstance() !== null) ? new GameController(runtime) : null;
    });
    runtime.addEventListener("pretick", () => game?.beforeTick());
    runtime.addEventListener("tick", () => game?.tick());
    runtime.addEventListener("pointerdown", event => {
        if (event.button === 0) game?.attack();
    });
});
