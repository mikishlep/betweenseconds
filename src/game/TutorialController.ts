const TEXTS = ["TutorialText", "TutorialText2", "TutorialText3", "TutorialText4"] as const;
export class TutorialController {
    private step = 0;
    private distance = 0;
    private stoppedFor = 0;
    constructor(private readonly runtime: IRuntime) { this.show(); }
    get readyForObjective(): boolean { return this.step === 3; }
    update(distance: number, dt: number, dashing: boolean, playing: boolean): void {
        if (!playing) { this.show(false); return; }
        if (this.step === 0) {
            this.distance += distance;
            if (this.distance >= 40) this.step = 1;
        } else if (this.step === 1) {
            this.stoppedFor = distance <= 0.01 ? this.stoppedFor + dt : 0;
            if (this.stoppedFor >= 0.2) this.step = 2;
        } else if (this.step === 2 && dashing && distance > 0.01) {
            this.step = 3;
        }
        this.show();
    }
    combatHint(attacks: number, pulses: number, enemies: number, fragments: number): void {
        if (this.step !== 3) return;
        const text = this.runtime.objects.TutorialText4.getFirstInstance();
        if (text) text.text = attacks === 0 ? "ЛКМ — удар в сторону взгляда\nАтака запускает время. Подойди и ударь врага."
            : pulses === 0 ? "E — временной импульс\nСбивает пули вокруг тебя. Победа вернёт заряд."
            : enemies > 0 ? "Победи оставшихся врагов\nОстановись, оцени угрозу и выбери момент."
            : fragments < 2 ? "Собери два голубых фрагмента\nЗатем войди в светящуюся арку справа."
            : "Выход открыт\nДойди до светящейся арки справа.";
    }
    private show(playing = true): void {
        TEXTS.forEach((name, index) => {
            const text = this.runtime.objects[name].getFirstInstance();
            if (text) text.isVisible = playing && this.step === index;
        });
    }
}
