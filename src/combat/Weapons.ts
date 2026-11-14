export type Weapon = 'blade'|'maul'|'bow'|'rose'|'lance';
export interface WeaponSpec {name:string;description:string;range:number;damage:number;cooldown:number;windup:number;cone:number;ranged:boolean;fx:string;}
export const WEAPONS:Record<Weapon,WeaponSpec>={
 blade:{name:'Клинок',description:'Быстрый ближний бой. Узкий удар, короткая подготовка.',range:85,damage:1,cooldown:.38,windup:.05,cone:.4,ranged:false,fx:'Slash'},
 maul:{name:'Боевой молот',description:'2 урона широким ударом. Пробивает щит Бастиона и оглушает его. Долгий замах.',range:105,damage:2,cooldown:1.5,windup:.4,cone:.1,ranged:false,fx:'PlayerImpact'},
 bow:{name:'Лук',description:'Один дальний выстрел. Нет ближнего взмаха и сбивания пуль.',range:340,damage:1,cooldown:.58,windup:.16,cone:.4,ranged:true,fx:'PlayerArrow'},
 rose:{name:'Клинок Цветения',description:'Широкий взмах на 130. Сбивает пули веером, но медленнее обычного клинка.',range:130,damage:1,cooldown:.5,windup:.1,cone:0,ranged:false,fx:'PlayerRose'},
 lance:{name:'Копьё Эха',description:'Дальний пробивающий заряд: 2 урона, до двух целей. Долгая подготовка.',range:430,damage:2,cooldown:.75,windup:.2,cone:.4,ranged:true,fx:'PlayerLance'}
};
export const STARTING_WEAPONS:Weapon[]=['blade','maul','bow'];
