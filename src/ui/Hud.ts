import { journeyMap,resultScreen,JOURNEY_STYLE } from "./Journey";
import { Campaign, WEAPONS } from "../game/Rooms";
import { GameState } from "../game/GameState";
import { TUTORIAL_ROOM, type RoomSpec } from "../game/Rooms";
import { Menu } from "./Menu";
interface HudInfo { room: RoomSpec; tutorial: boolean; last: boolean; boss: { hp: number; maxHp: number; phase: number; name?:string } | null; menu?: Menu; damage?: number; campaign?:Campaign;arrival?:number;hint?:string; }
const heart = (full: boolean) => `<svg width="21" height="20" viewBox="0 0 21 20" shape-rendering="crispEdges" aria-hidden="true"><path d="M2 3h3V1h3v2h4V1h3v2h3v8h-3v3h-3v3H9v-3H6v-3H2Z" fill="${full?'#9f3659':'#151923'}" stroke="#070a12" stroke-width="3"/><path d="M3 4h4v2H4v4H3Z" fill="${full?'#e899ab':'#4b4659'}"/></svg>`;
const skill = (kind: 'pulse'|'dash', ready: boolean) => `<svg width="31" height="31" viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><path d="M7 2h18v3h5v22h-5v3H7v-3H2V5h5Z" fill="#0c111d" stroke="#06080e" stroke-width="2"/><path d="M7 4h17v2h4v20h-4v2H7v-2H4V6h3" fill="none" stroke="${ready?'#9c8f85':'#45404a'}"/><path d="${kind==='pulse'?'M16 8v4h4v8h-4v4h-2v-4h-4v-8h4V8Z M8 14H6v5h2m16-5h2v5h-2':'M8 20l9-11h7l-9 11Z M10 23l7-8h5l-7 8Z'}" fill="${ready?'#8dcbd5':'#3a4655'}"/></svg>`;
export class HudController {
    private previous = "";
    constructor(private readonly runtime: IRuntime) {}
    update(state: GameState, active: boolean, dashReady: boolean, info: HudInfo = { room: TUTORIAL_ROOM, tutorial: true, last: false, boss: null }): void {
        const won = state.status === "won", terminal = state.status !== "playing", menu = info.menu;
        const title = won ? (info.tutorial ? "Обучение завершено" : info.last ? "Цветение освобождено" : "Путь свободен") : "Момент упущен";
        const heading = `<div class="life" aria-label="Здоровье ${state.hp} из 3"><div style="display:flex;gap:2px">${[0,1,2].map(i=>heart(i<state.hp)).join('')}</div><div class="relics"><span style="color:#82c2ce">◆</span> ${state.fragments}/2 <span style="margin-left:12px;color:#ab6c80">†</span> ${state.enemiesRemaining}</div></div>`;
        const boss = info.boss;
        const bossBar = boss ? `<div class="boss"><div class="boss-name">${boss.name??"Хранитель Цветения"}${boss.phase>1?'<span style="color:#c65c8c"> · Фаза '+boss.phase+'</span>':''}</div><div class="boss-track"><div class="boss-fill" style="width:${boss.hp/boss.maxHp*100}%"></div></div><span class="thorn left">✥</span><span class="thorn right">✥</span></div>`:'';
        const result=terminal?resultScreen(state,info.room,info.tutorial,info.last,info.campaign):'';
        const damage = info.damage || 0;
        const help = !menu || menu.guides;
        const html = `<style>${JOURNEY_STYLE}
        .game-hud{position:relative;width:100%;height:100%;pointer-events:none;color:#c6bfba;text-shadow:1px 2px #050710;font:11px 'Courier New',monospace;image-rendering:pixelated}
        .life{position:absolute;top:16px;left:19px;filter:drop-shadow(0 2px 2px #050710)}.relics{margin-top:6px;font-size:10px;letter-spacing:1px}
        .time-mark{position:absolute;right:20px;top:19px;color:#aba7b4;font-size:11px;letter-spacing:1px}.time-mark i{color:#81b6cd;font-style:normal}
        .skills{position:absolute;left:18px;bottom:17px;display:flex;gap:12px}.skill{text-align:center}.skill small{display:block;font:9px 'Courier New';margin-top:3px;color:#a39ca7}
        .screen-button{position:absolute;bottom:18px;right:18px;background:#090e19aa;border:1px solid #514955;color:#bcb4bb;font:10px 'Courier New';padding:5px 7px;pointer-events:auto;cursor:pointer}.screen-button:hover{border-color:#bd7893;color:#eee0dc}
        .boss{position:absolute;left:24%;width:52%;bottom:38px;text-align:center}.boss-name{font:12px Georgia,serif;letter-spacing:1px;color:#d1b2bf;margin-bottom:8px}.boss-track{height:5px;padding:2px;border-top:2px solid #867a84;border-bottom:2px solid #3e3549;box-shadow:0 0 0 2px #070a12;background:#111019}.boss-fill{height:100%;background:linear-gradient(#d276a0,#732447);box-shadow:inset 0 1px #eaa4b8}.thorn{position:absolute;bottom:-6px;font-size:23px;color:#b8a2ab}.thorn.left{left:-13px}.thorn.right{right:-13px}
        .result{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;background:#050711b8}.result h2{font:28px Georgia;color:#dfd2ca;font-weight:normal;letter-spacing:2px}.result p{font-size:11px;color:#b6a6b3}
        </style><div class="game-hud">${heading}<div style="position:absolute;top:17px;left:112px;font-size:9px;color:#a6a0b2">${info.campaign?WEAPONS[info.campaign.weapon].name+" · Q　◆ "+info.campaign.coins:""}<div style="margin-top:5px">M · карта пути</div></div><div class="time-mark">${active?'<i>◆</i>':'Ⅱ'} ${active?'':'ВРЕМЯ ЗАМЕРЛО'}</div>
        <div class="skills"><div class="skill">${skill('pulse',state.pulseCharge>0)}${help?'<small>E</small>':''}</div><div class="skill">${skill('dash',dashReady)}${help?'<small>SPACE</small>':''}</div></div>
        ${info.arrival&&info.arrival>0&&menu?.playing?`<div style="position:absolute;left:20%;top:50px;width:60%;text-align:center;opacity:${Math.min(1,info.arrival)}"><div style="font:16px Georgia;color:#e0cfd4">${info.room.title.split('/').at(-1)}</div><div style="margin-top:6px;font-size:9px">${info.room.subtitle}</div></div>`:''}<div style="position:absolute;bottom:18px;left:24%;width:50%;text-align:center;font-size:10px">${info.hint??''}</div>${bossBar}${menu?.playing?'<button id="fullscreen" class="screen-button" title="Полный экран">⛶</button>':''}${damage>0?`<div style="position:absolute;inset:0;box-shadow:inset 0 0 90px 30px #9c204d;background:#8c1d3b22;opacity:${Math.min(1,damage/.25)}"></div>`:''}${result}${menu?.page === "map"&&info.campaign?journeyMap(info.campaign,info.tutorial):menu&&!menu.playing?menu.html():''}</div>`;
        if (html !== this.previous) { this.runtime.objects.HowToControl.getFirstInstance()!.htmlContent = html; this.previous = html; }
    }
}
