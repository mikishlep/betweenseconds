import { GameState } from "../game/GameState";
import { TUTORIAL_ROOM, type RoomSpec } from "../game/Rooms";
interface HudInfo { room: RoomSpec; tutorial: boolean; last: boolean; boss: { hp: number; maxHp: number; phase: number } | null; }
export class HudController {
    private previous = "";
    constructor(private readonly runtime: IRuntime) {}
    update(state: GameState, active: boolean, dashReady: boolean, info: HudInfo = { room: TUTORIAL_ROOM, tutorial: true, last: false, boss: null }): void {
        const won = state.status === "won", terminal = state.status !== "playing";
        const title = won ? (info.tutorial ? "ОБУЧЕНИЕ ПРОЙДЕНО" : info.last ? "РАЗЛОМ ЗАКРЫТ" : "КОМНАТА ОЧИЩЕНА") : "ВРЕМЯ ИСТЕКЛО";
        const next = info.tutorial ? "НА АРЕНУ" : info.last ? "НОВОЕ ПРОХОЖДЕНИЕ" : "СЛЕДУЮЩАЯ КОМНАТА";
        const objective = state.enemiesRemaining > 0 ? `ПОБЕДИ ПРОТИВНИКОВ · ${state.enemiesRemaining}` : state.fragments < 2 ? "СОБЕРИ ДВА ФРАГМЕНТА" : "ВЫХОД ОТКРЫТ →";
        const boss = info.boss;
        const html = `<div style="height:100%;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;color:#e5f6ff;font:12px/1.5 Arial,sans-serif;pointer-events:none;text-shadow:0 1px 3px #000,0 0 8px #000">
        <div><div style="display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;gap:15px;align-items:center"><span style="color:#ff8bba;font-size:16px;letter-spacing:3px" aria-label="Здоровье ${state.hp} из 3">${"♥".repeat(state.hp)}<span style="opacity:.25">${"♥".repeat(3-state.hp)}</span></span><span style="color:#80eaff">◇ ${state.fragments}/2</span><span style="color:#ff73bd">ВРАГИ ${state.enemiesRemaining}</span></div>
        <span style="font-size:10px;letter-spacing:2px;color:${active ? '#8feaff' : '#b7c5ce'}">${active ? "▶ ВРЕМЯ" : "Ⅱ СТОП-КАДР"}</span></div>
        <div style="margin-top:7px;font-size:10px;letter-spacing:2px;color:#d1e0ed">${info.room.title}</div><div style="font-size:10px;color:#b5c6d3">${info.room.subtitle}</div>
        ${boss ? `<div style="width:280px;margin:7px auto;text-align:center;font-size:10px;color:#ff8bcb">СТРАЖ РАЗЛОМА · ФАЗА ${boss.phase}<div style="height:4px;background:#2d192c;border:1px solid #9c4676"><div style="height:100%;width:${boss.hp / boss.maxHp * 100}%;background:#ff4eae"></div></div></div>` : ''}</div>
        ${terminal ? `<div style="text-align:center;letter-spacing:3px;font-size:21px;color:${won ? '#a4efdf' : '#ff9cae'}">${title}${won ? `<div style="margin:9px 0;font-size:12px;letter-spacing:1px">ОЦЕНКА ${state.rating(info.room.par)} · УДАРЫ ${state.attacks} · УРОН ${state.damageTaken}</div>` : ''}<div style="margin-top:10px;font-size:10px;letter-spacing:1px;color:#d0dde9">${won ? `ENTER · ${next} &nbsp; ` : ''}R · ЗАНОВО</div></div>` : '<div></div>'}
        <div><div style="display:flex;justify-content:space-between;margin-bottom:7px;font-size:10px;letter-spacing:1px"><span style="color:#92e7ed">${objective}</span><span style="color:#8eeeff">E · ИМПУЛЬС ${state.pulseCharge ? 'ГОТОВ' : 'НУЖНА ПОБЕДА'}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#c0d0de"><span>WASD · ДВИЖЕНИЕ &nbsp; SPACE · РЫВОК &nbsp; ЛКМ · УДАР &nbsp; E · ИМПУЛЬС &nbsp; H · ОБУЧЕНИЕ &nbsp; R · ЗАНОВО</span><span>${dashReady ? 'РЫВОК ГОТОВ' : 'РЫВОК ···'}</span></div></div></div>`;
        if (html !== this.previous) { this.runtime.objects.HowToControl.getFirstInstance()!.htmlContent = html; this.previous = html; }
    }
}
