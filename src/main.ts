import { GameController } from "./game/GameController";
runOnStartup(runtime => {
    let game: GameController;
    // One pair of listeners for the entire runtime; layout reload resets everything.
    runtime.addEventListener("beforeanylayoutstart", () => { game = new GameController(runtime); });
    runtime.addEventListener("pretick", () => game?.beforeTick());
    runtime.addEventListener("tick", () => game?.tick());
});
