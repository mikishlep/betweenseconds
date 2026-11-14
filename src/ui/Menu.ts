export class Menu {
    page: "playing" | "title" | "pause" | "settings" | "exit" | "map";
    private back: "title" | "pause" = "title";
    notice = "";
    flashes = true;
    guides = true;
    constructor(page: "playing" | "title" = "playing") { this.page = page; }
    get playing(): boolean { return this.page === "playing"; }
    escape(): void { if (this.page === "playing") this.page = "pause"; else if (this.page === "pause") this.page = "playing"; else if (this.page === "settings") this.page = this.back; else if(this.page === "map")this.page="playing"; }
    handle(id: string): void {
        if (id === "start" || id === "resume" || id === "close-map") this.page = "playing";
        else if (id === "settings") { this.back = this.page === "pause" ? "pause" : "title"; this.page = "settings"; }
        else if (id === "back") this.page = this.back;
        else if (id === "quit") this.page = "exit";
        else if (id === "title") this.page = "title";
        else if (id === "flashes") this.flashes = !this.flashes;
        else if (id === "guides") this.guides = !this.guides;
    }
    html(): string {
        const button = (id: string, label: string) => `<button id="${id}" class="menu-button">${label}</button>`;
        const title = this.page === "settings" ? "Настройки" : this.page === "pause" ? "Пауза" : this.page === "exit" ? "До встречи" : "Between<br>Seconds";
        const controls = this.page === "settings" ? button("flashes", `Вспышки при уроне: ${this.flashes ? 'вкл' : 'выкл'}`) + button("guides", `Подписи клавиш: ${this.guides ? 'вкл' : 'выкл'}`) + button("fullscreen", "Полный экран") + button("back", "Назад")
            : this.page === "exit" ? `<p style="font:14px/1.8 Georgia;color:#b5aeb8">Сессия остановлена.<br>В браузере можно закрыть вкладку игры.</p>` + button("title", "В главное меню")
            : button(this.page === "pause" ? "resume" : "start", this.page === "pause" ? "Продолжить" : "Начать") + button("settings", "Настройки") + button("quit", "Выход");
        return `<style>
        .menu-button{display:block;position:relative;width:270px;padding:10px 20px;margin:6px auto;background:#0c101bcc;border:0;border-top:1px solid #65535c;border-bottom:1px solid #302633;color:#c4b8b9;text-align:center;font:16px Georgia;cursor:pointer;pointer-events:auto;box-shadow:0 2px #06080e}.menu-button:before,.menu-button:after{content:'◆';position:absolute;top:12px;font-size:9px;color:#68515e}.menu-button:before{left:6px}.menu-button:after{right:6px}.menu-button:hover,.menu-button:focus{color:#f0ded4;border-color:#bc7894;outline:1px solid #312332}.menu-button:hover:before,.menu-button:hover:after{color:#e4a0ba}
        </style><div style="position:absolute;inset:0;pointer-events:auto;background:#080b16e8;display:flex;align-items:center;justify-content:center;text-align:center;box-sizing:border-box">
        <div style="position:absolute;inset:18px;border:1px solid #6e536533;pointer-events:none"></div><div style="position:absolute;top:23px;left:50%;transform:translateX(-50%);color:#936479;font-size:17px">✥</div>
        <div><div style="color:#b38599;font:10px 'Courier New';letter-spacing:3px">МЕЖДУ СЕКУНДАМИ</div><h1 style="font:38px/1.03 Georgia;color:#dfd0ce;letter-spacing:3px;font-weight:normal;margin:14px 0 16px;text-shadow:0 3px #05070d">${title}</h1>
        <div style="color:#7b536b;margin-bottom:14px;font-size:16px">──── ✥ ────</div>${controls}<div style="color:#b58897;font:11px 'Courier New';margin-top:9px">${this.notice}</div><div style="margin-top:18px;color:#8f8595;font:10px/1.8 'Courier New'">WASD · движение　 ЛКМ · удар<br>SPACE · рывок　 E · способность　 ESC · пауза</div></div></div>`;
    }
}
