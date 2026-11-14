import { Menu } from "./ui/Menu";
import { Campaign } from "./game/Rooms";
import { GameController } from "./game/GameController";
runOnStartup(runtime => {
    let game: GameController | null = null;
    let sessionStarted = false;
    const campaign = new Campaign();
    const menu = new Menu("title");
    // Register once; a layout reload replaces the controller, never its listeners.
    runtime.addEventListener("beforeanylayoutstart", () => {
        // A fresh session always starts in Tutorial, including F5 on another layout.
        if (!sessionStarted) {
            sessionStarted = true;
            if (runtime.layout.name !== "Tutorial") {
                runtime.timeScale = 1;
                runtime.goToLayout("Tutorial");
                return;
            }
        }
        const objects = runtime.objects;
        const required = [objects.Player, objects.TestEnemy, objects.Exit, objects.HowToControl, objects.HeroVisual];
        game = required.every(type => type.getFirstInstance() !== null) ? new GameController(runtime, campaign, menu) : null;
    });
    runtime.addEventListener("pretick", () => game?.beforeTick());
    runtime.addEventListener("tick", () => game?.tick());
    runtime.addEventListener("pointerdown", event => {
        if (typeof Element !== "undefined" && event.target instanceof Element && event.target.closest("button")) return;
        if (event.button === 0) {
            const layer=runtime.layout.getLayer?.("scene");
            const point=layer && event.clientX!==undefined && event.clientY!==undefined ? layer.cssPxToLayer(event.clientX,event.clientY) : null;
            game?.attack(point?{x:point[0],y:point[1]}:undefined);
        }
    });
});
