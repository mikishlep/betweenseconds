export class TimeController {
    private lastX: number | null = null;
    private lastY: number | null = null;

    constructor(private readonly runtime: IRuntime) {}

    update(): void {
        const player = this.runtime.objects.Player.getFirstInstance();

        if (!player) {
            this.runtime.timeScale = 1;
            this.lastX = null;
            this.lastY = null;
            return;
        }

        // устанавливаем независимость игрока от таймстопа
        player.timeScale = 1;

        // запоминание стартовой позиции
        if (this.lastX === null || this.lastY === null) {
            this.lastX = player.x;
            this.lastY = player.y;
            return;
        }

        // проверка перемещения
        const dx = player.x - this.lastX;
        const dy = player.y - this.lastY;
        const isMoving = Math.hypot(dx, dy) > 0.01;

        // движение мира ТОЛЬКО вместе с игроком
        this.runtime.timeScale = isMoving ? 1 : 0;

        this.lastX = player.x;
        this.lastY = player.y;
    }
}