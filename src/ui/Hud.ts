import { GameState } from "../game/GameState";
export class HudController {
    private previous = "";
    constructor(private readonly runtime: IRuntime) {}
    update(state: GameState, moving: boolean, dashReady: boolean): void {
        const terminal = state.status !== "playing";
        const title = state.status === "won" ? "ВЫХОД НАЙДЕН" : "ВРЕМЯ ИСТЕКЛО";
        const html = `<div style="height:100%;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;color:#dce9ef;font:12px/1.5 Arial,sans-serif;pointer-events:none;text-shadow:0 1px 3px #0a1019">
        <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;gap:20px;align-items:center"><span style="color:#ed9892;font-size:16px;letter-spacing:3px" aria-label="Здоровье ${state.hp} из 3">${"♥".repeat(state.hp)}<span style="opacity:.25">${"♥".repeat(3-state.hp)}</span></span><span style="color:#81d8df">◇ ${state.fragments}/2</span>${state.exitOpen && !terminal ? '<span style="color:#8cddad">ВЫХОД ОТКРЫТ</span>' : ''}</div>
        <span style="color:#9aaebd;font-size:10px;letter-spacing:2px">${moving ? "▶ ВРЕМЯ" : "Ⅱ ПАУЗА"}</span></div>
        ${terminal ? `<div style="text-align:center;letter-spacing:4px;font-size:20px;color:${state.status === "won" ? '#a4dfc0' : '#eea49d'}">${title}<div style="margin-top:10px;font-size:10px;letter-spacing:2px;color:#a0b1be">R · ЗАНОВО</div></div>` : '<div></div>'}
        <div style="display:flex;justify-content:space-between;font-size:10px;letter-spacing:1px;color:#8b9eae"><span>WASD · ДВИЖЕНИЕ &nbsp; SPACE · РЫВОК &nbsp; R · ЗАНОВО</span><span>${dashReady ? 'РЫВОК ГОТОВ' : 'РЫВОК ···'}</span></div></div>`;
        if (html !== this.previous) {
            this.runtime.objects.HowToControl.getFirstInstance()!.htmlContent = html;
            this.previous = html;
        }
    }
}
