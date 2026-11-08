import { PlayerController } from "./player/PlayerController";
import { TimeController } from "./systems/TimeController";

// тут корневой файл, с которого уже будем подключать всё остальное месиво,
// дабы не писалось всё в одном файле
runOnStartup(async runtime => {
	runtime.addEventListener("beforeprojectstart", () => {
		const player = new PlayerController(runtime);
		const time = new TimeController(runtime);

		runtime.addEventListener("tick", () => {
			player.update();
			time.update();
		});
	});
});