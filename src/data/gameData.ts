import type { AreaId, CardDef, CharacterDef, PlayerColorTheme } from '../types/game.ts';

export const PLAYER_COLORS: PlayerColorTheme[] = [
  { id: 'amber', label: '琥珀', hex: '#d97706', ring: '#fbbf24' },
  { id: 'azure', label: '蒼穹', hex: '#2563eb', ring: '#60a5fa' },
  { id: 'crimson', label: '紅蓮', hex: '#dc2626', ring: '#f87171' },
  { id: 'emerald', label: '翠玉', hex: '#059669', ring: '#34d399' },
  { id: 'violet', label: '紫紺', hex: '#7c3aed', ring: '#a78bfa' },
  { id: 'rose', label: '薔薇', hex: '#db2777', ring: '#f472b6' },
];

export interface AreaDef {
  id: AreaId;
  name: string;
  diceLabel: string;
  diceValues: number[];
  effectSummary: string;
  attackRangeLabel: string;
  leftNeighbor: AreaId | null;
  rightNeighbor: AreaId | null;
  color: string;
}

// Clockwise from top: 探偵事務所 -> 大聖堂 -> 地下通路 -> 市庁舎 -> 盗賊ギルド (and center: 王の飛行船)
export const AREAS: Record<AreaId, AreaDef> = {
  detective: {
    id: 'detective',
    name: '探偵事務所',
    diceLabel: '1・2',
    diceValues: [1, 2],
    effectSummary: '推理カードを1枚引く',
    attackRangeLabel: '探偵事務所・盗賊ギルド・飛行船',
    leftNeighbor: 'thieves_guild',
    rightNeighbor: 'cathedral',
    color: '#2563eb',
  },
  cathedral: {
    id: 'cathedral',
    name: '大聖堂',
    diceLabel: '3・4',
    diceValues: [3, 4],
    effectSummary: '推理カードまたは白カードを1枚引く',
    attackRangeLabel: '大聖堂・探偵事務所・飛行船',
    leftNeighbor: 'detective',
    rightNeighbor: 'underground',
    color: '#d97706',
  },
  underground: {
    id: 'underground',
    name: '地下通路',
    diceLabel: '5・6',
    diceValues: [5, 6],
    effectSummary: '推理カードまたは黒カードを1枚引く',
    attackRangeLabel: '地下通路・大聖堂・飛行船',
    leftNeighbor: 'cathedral',
    rightNeighbor: 'city_hall',
    color: '#7c3aed',
  },
  city_hall: {
    id: 'city_hall',
    name: '市庁舎',
    diceLabel: '7・8',
    diceValues: [7, 8],
    effectSummary: '他のプレイヤー1人に2ダメージ、または自分を1回復',
    attackRangeLabel: '市庁舎・地下通路・飛行船',
    leftNeighbor: 'underground',
    rightNeighbor: 'thieves_guild',
    color: '#16a34a',
  },
  thieves_guild: {
    id: 'thieves_guild',
    name: '盗賊ギルド',
    diceLabel: '9',
    diceValues: [9],
    effectSummary: '他のプレイヤーの装備を1つ奪う',
    attackRangeLabel: '盗賊ギルド・市庁舎・飛行船',
    leftNeighbor: 'city_hall',
    rightNeighbor: 'detective',
    color: '#dc2626',
  },
  airship: {
    id: 'airship',
    name: '王の飛行船',
    diceLabel: '10',
    diceValues: [10],
    effectSummary: '全エリアのプレイヤーを攻撃できる',
    attackRangeLabel: '全エリア',
    leftNeighbor: null,
    rightNeighbor: null,
    color: '#eab308',
  },
};

export const NORMAL_AREA_ORDER: AreaId[] = [
  'detective',
  'cathedral',
  'underground',
  'city_hall',
  'thieves_guild',
];

export function diceTotalToArea(total: number): AreaId {
  if (total <= 2) return 'detective';
  if (total <= 4) return 'cathedral';
  if (total <= 6) return 'underground';
  if (total <= 8) return 'city_hall';
  if (total === 9) return 'thieves_guild';
  return 'airship';
}

// Damage Board Stage Labels (0 to 14)
export const DAMAGE_BOARD_LABELS: Record<number, string[]> = {
  8: ['A'],
  10: ['B', 'E'],
  11: ['C', 'U'],
  12: ['F'],
  13: ['D', 'V'],
  14: ['G', 'W'],
};

// 16 Characters (6 Citizens, 5 Raiders, 5 Shadows)
export const CHARACTERS: CharacterDef[] = [
  // シチズン (6人)
  {
    id: 'alice',
    name: 'アリス',
    kana: 'Alice',
    faction: 'CITIZEN',
    maxHp: 8,
    boardCode: 'A',
    abilityName: '慈愛の光',
    abilityDesc: '自分のターン中、ゲーム中1回だけ正体を公開して自分のダメージをすべて回復（0に）できる。',
    abilityType: 'ACTIVE_ONCE',
    winConditionDesc: 'ゲーム終了時に自分が生き残っていること。',
    accentColor: '#a855f7',
  },
  {
    id: 'angela',
    name: 'アンジェラ',
    kana: 'Angela',
    faction: 'CITIZEN',
    maxHp: 8,
    boardCode: 'A',
    abilityName: '気まぐれな風',
    abilityDesc: 'ゲーム中1回、自分のターン開始時に正体を公開して勝利対象を「右隣」から「左隣」のプレイヤーへ変更できる。',
    abilityType: 'ACTIVE_ONCE',
    winConditionDesc: '自分の右隣（能力使用時は左隣）のプレイヤーが勝利すること。',
    accentColor: '#c084fc',
  },
  {
    id: 'byron',
    name: 'バイロン',
    kana: 'Byron',
    faction: 'CITIZEN',
    maxHp: 10,
    boardCode: 'B',
    abilityName: '強奪',
    abilityDesc: '正体公開時、攻撃で2以上のダメージを与えた時、ダメージを与える代わりにその相手の装備カードを1枚奪うことができる。',
    abilityType: 'TRIGGER',
    winConditionDesc: '装備カードを4枚以上保持すること（達成した瞬間に勝利）。',
    accentColor: '#9333ea',
  },
  {
    id: 'craig',
    name: 'クレイグ',
    kana: 'Craig',
    faction: 'CITIZEN',
    maxHp: 11,
    boardCode: 'C',
    abilityName: '血の宴',
    abilityDesc: '正体公開時、自分が攻撃を行った後、自分に2ダメージを受けることで攻撃範囲内の別のプレイヤーにもう1回攻撃できる。',
    abilityType: 'TRIGGER',
    winConditionDesc: '自分が攻撃で他のプレイヤーを脱落させた時点で、脱落者が合計3人以上いること。',
    accentColor: '#7e22ce',
  },
  {
    id: 'claire',
    name: 'クレア',
    kana: 'Claire',
    faction: 'CITIZEN',
    maxHp: 11,
    boardCode: 'C',
    abilityName: '聖なる祈り',
    abilityDesc: '正体公開時、自分のターン開始時にダメージを1回復する。',
    abilityType: 'PASSIVE',
    winConditionDesc: '最初に脱落したプレイヤーになる、または最後の生存者2人以下の中に残ってゲームが終了すること。',
    accentColor: '#a855f7',
  },
  {
    id: 'daniel',
    name: 'ダニエル',
    kana: 'Daniel',
    faction: 'CITIZEN',
    maxHp: 13,
    boardCode: 'D',
    abilityName: '絶叫',
    abilityDesc: '他のプレイヤーが1人脱落した時、ただちに自分の正体を公開しなければならない。',
    abilityType: 'TRIGGER',
    winConditionDesc: '最初に脱落したプレイヤーになる、またはシャドウが全員脱落した時に自分が生き残っていること。',
    accentColor: '#6b21a8',
  },

  // レイダー (5人)
  {
    id: 'eimi',
    name: '映魅',
    kana: 'Eimi',
    faction: 'RAIDER',
    maxHp: 14,
    boardCode: 'G',
    abilityName: '霊盾',
    abilityDesc: 'ゲーム中1回、自分のターン開始時に正体を公開することで、次の自分のターン開始時まで他のプレイヤーからのダメージを一切受けない。',
    abilityType: 'ACTIVE_ONCE',
    winConditionDesc: '全てのシャドウが脱落すること。',
    accentColor: '#3b82f6',
  },
  {
    id: 'emma',
    name: 'エマ',
    kana: 'Emma',
    faction: 'RAIDER',
    maxHp: 10,
    boardCode: 'E',
    abilityName: 'テレポート',
    abilityDesc: '正体公開時、移動フェイズにダイスを振る代わりに今いる通常エリアの左右どちらかの隣接エリアへ移動できる。',
    abilityType: 'PASSIVE',
    winConditionDesc: '全てのシャドウが脱落すること。',
    accentColor: '#2563eb',
  },
  {
    id: 'felix',
    name: 'フェリックス',
    kana: 'Felix',
    faction: 'RAIDER',
    maxHp: 10,
    boardCode: 'E',
    abilityName: '封印の鎖',
    abilityDesc: 'ゲーム中1回、自分のターン開始時に正体を公開し、他のプレイヤー1人の特殊能力をゲーム終了まで無効化する。',
    abilityType: 'ACTIVE_ONCE',
    winConditionDesc: '全てのシャドウが脱落すること。',
    accentColor: '#1d4ed8',
  },
  {
    id: 'freddy',
    name: 'フレディ',
    kana: 'Freddy',
    faction: 'RAIDER',
    maxHp: 12,
    boardCode: 'F',
    abilityName: '落雷',
    abilityDesc: 'ゲーム中1回、自分のターン開始時に正体を公開し、他のプレイヤー1人に6面ダイスの出目分のダメージを与える。',
    abilityType: 'ACTIVE_ONCE',
    winConditionDesc: '全てのシャドウが脱落すること。',
    accentColor: '#0284c7',
  },
  {
    id: 'gordon',
    name: 'ゴードン',
    kana: 'Gordon',
    faction: 'RAIDER',
    maxHp: 12,
    boardCode: 'F',
    abilityName: '粉砕鉄槌',
    abilityDesc: 'ゲーム中1回、自分のターン開始時に正体を公開し、他のプレイヤー1人に4面ダイスの出目分のダメージを与える。',
    abilityType: 'ACTIVE_ONCE',
    winConditionDesc: '全てのシャドウが脱落すること。',
    accentColor: '#0369a1',
  },

  // シャドウ (5人)
  {
    id: 'ulrich',
    name: 'ウルリッヒ',
    kana: 'Ulrich',
    faction: 'SHADOW',
    maxHp: 11,
    boardCode: 'U',
    abilityName: '偽装工作',
    abilityDesc: '正体非公開の間、推理カード（緑カード）の効果を受ける際に嘘の回答をすることができる。',
    abilityType: 'PASSIVE',
    winConditionDesc: '全てのレイダーが脱落すること。',
    accentColor: '#ef4444',
  },
  {
    id: 'allister',
    name: 'アルスター',
    kana: 'Allister',
    faction: 'SHADOW',
    maxHp: 11,
    boardCode: 'U',
    abilityName: '冥界の魔光',
    abilityDesc: '正体公開時、自分のターン開始時に地下通路にいる他のプレイヤー1人を選び、3ダメージを与えることができる。',
    abilityType: 'ACTIVE_ONCE',
    winConditionDesc: '全てのレイダーが脱落すること。',
    accentColor: '#dc2626',
  },
  {
    id: 'vampire',
    name: 'ヴァンパイア',
    kana: 'Vampire',
    faction: 'SHADOW',
    maxHp: 13,
    boardCode: 'V',
    abilityName: '吸血',
    abilityDesc: '正体公開時、自分の攻撃で他のプレイヤーにダメージを与えた時、自分のダメージを2回復する。',
    abilityType: 'PASSIVE',
    winConditionDesc: '全てのレイダーが脱落すること。',
    accentColor: '#b91c1c',
  },
  {
    id: 'kodoku',
    name: '蠱毒使い',
    kana: 'Kodoku',
    faction: 'SHADOW',
    maxHp: 13,
    boardCode: 'V',
    abilityName: '蠱毒の呪い',
    abilityDesc: '正体公開時、自分の攻撃で他のプレイヤーに1以上のダメージを与えた時、さらに追加で1ダメージを与える。',
    abilityType: 'PASSIVE',
    winConditionDesc: '全てのレイダーが脱落すること。',
    accentColor: '#991b1b',
  },
  {
    id: 'walpurgis',
    name: 'ワルプルギス',
    kana: 'Walpurgis',
    faction: 'SHADOW',
    maxHp: 14,
    boardCode: 'W',
    abilityName: '反撃の狼牙',
    abilityDesc: '正体公開時、他のプレイヤーから攻撃を受けた直後（生存していれば）、その攻撃者に即座に反撃（通常攻撃）できる。',
    abilityType: 'TRIGGER',
    winConditionDesc: '全てのレイダーが脱落すること。',
    accentColor: '#7f1d1d',
  },
];

// 20 Green Cards (推理カード)
export const GREEN_CARD_DEFS: CardDef[] = [
  { id: 'g01', deck: 'GREEN', name: '推理：レイダーへの警告I', isEquipment: false, effectKey: 'RAIDER_DMG_1', countInDeck: 1, description: '君がレイダーなら、ダメージを1受ける。' },
  { id: 'g02', deck: 'GREEN', name: '推理：レイダーへの武装解除', isEquipment: false, effectKey: 'RAIDER_DISCARD_EQUIP', countInDeck: 1, description: '君がレイダーなら、装備カードを1枚捨てる（なければダメージ1）。' },
  { id: 'g03', deck: 'GREEN', name: '推理：レイダーへの追撃', isEquipment: false, effectKey: 'RAIDER_DMG_2', countInDeck: 1, description: '君がレイダーなら、ダメージを2受ける。' },
  { id: 'g04', deck: 'GREEN', name: '推理：シャドウへの警告I', isEquipment: false, effectKey: 'SHADOW_DMG_1', countInDeck: 1, description: '君がシャドウなら、ダメージを1受ける。' },
  { id: 'g05', deck: 'GREEN', name: '推理：シャドウへの武装解除', isEquipment: false, effectKey: 'SHADOW_DISCARD_EQUIP', countInDeck: 1, description: '君がシャドウなら、装備カードを1枚捨てる（なければダメージ1）。' },
  { id: 'g06', deck: 'GREEN', name: '推理：シャドウへの追撃', isEquipment: false, effectKey: 'SHADOW_DMG_2', countInDeck: 1, description: '君がシャドウなら、ダメージを2受ける。' },
  { id: 'g07', deck: 'GREEN', name: '推理：シチズンへの慈悲', isEquipment: false, effectKey: 'CITIZEN_HEAL_1', countInDeck: 1, description: '君がシチズンなら、ダメージを1回復する（ダメージ0ならダメージを1受ける）。' },
  { id: 'g08', deck: 'GREEN', name: '推理：シチズンからの徴収', isEquipment: false, effectKey: 'CITIZEN_GIVE_EQUIP', countInDeck: 1, description: '君がシチズンなら、装備カードを1枚私に渡す（なければダメージ1）。' },
  { id: 'g09', deck: 'GREEN', name: '推理：抗争者の宿命', isEquipment: false, effectKey: 'RAIDER_OR_SHADOW_DMG_1', countInDeck: 1, description: '君がレイダーかシャドウなら、ダメージを1受ける。' },
  { id: 'g10', deck: 'GREEN', name: '推理：光と市民の試練', isEquipment: false, effectKey: 'RAIDER_OR_CITIZEN_DMG_1', countInDeck: 1, description: '君がレイダーかシチズンなら、ダメージを1受ける。' },
  { id: 'g11', deck: 'GREEN', name: '推理：闇と市民の試練', isEquipment: false, effectKey: 'SHADOW_OR_CITIZEN_DMG_1', countInDeck: 1, description: '君がシャドウかシチズンなら、ダメージを1受ける。' },
  { id: 'g12', deck: 'GREEN', name: '推理：レイダーへの恩寵', isEquipment: false, effectKey: 'RAIDER_HEAL_1', countInDeck: 1, description: '君がレイダーなら、ダメージを1回復する（ダメージ0ならダメージを1受ける）。' },
  { id: 'g13', deck: 'GREEN', name: '推理：シャドウへの恩寵', isEquipment: false, effectKey: 'SHADOW_HEAL_1', countInDeck: 1, description: '君がシャドウなら、ダメージを1回復する（ダメージ0ならダメージを1受ける）。' },
  { id: 'g14', deck: 'GREEN', name: '推理：光と市民の癒し', isEquipment: false, effectKey: 'RAIDER_OR_CITIZEN_HEAL_1', countInDeck: 1, description: '君がレイダーかシチズンなら、ダメージを1回復する（ダメージ0ならダメージを1受ける）。' },
  { id: 'g15', deck: 'GREEN', name: '推理：闇と市民の癒し', isEquipment: false, effectKey: 'SHADOW_OR_CITIZEN_HEAL_1', countInDeck: 1, description: '君がシャドウかシチズンなら、ダメージを1回復する（ダメージ0ならダメージを1受ける）。' },
  { id: 'g16', deck: 'GREEN', name: '推理：弱き者への試練', isEquipment: false, effectKey: 'HP_LE_11_DMG_1', countInDeck: 1, description: '君の最大HPが11以下なら、ダメージを1受ける。' },
  { id: 'g17', deck: 'GREEN', name: '推理：強き者への罰', isEquipment: false, effectKey: 'HP_GE_12_DMG_2', countInDeck: 1, description: '君の最大HPが12以上なら、ダメージを2受ける。' },
  { id: 'g18', deck: 'GREEN', name: '推理：レイダーからの徴収', isEquipment: false, effectKey: 'RAIDER_GIVE_EQUIP', countInDeck: 1, description: '君がレイダーなら、装備カードを1枚私に渡す（なければダメージ1）。' },
  { id: 'g19', deck: 'GREEN', name: '推理：シチズンへの制裁', isEquipment: false, effectKey: 'CITIZEN_DMG_2', countInDeck: 1, description: '君がシチズンなら、ダメージを2受ける。' },
  { id: 'g20', deck: 'GREEN', name: '推理：真実の暴露', isEquipment: false, effectKey: 'REVEAL_TO_DRAWER', countInDeck: 1, description: '君は自分の正体（キャラクター）を私だけに見せる。' },
];

// 12 White Cards (合計15枚: 装備7枚, 使い捨て8枚)
export const WHITE_CARD_DEFS: CardDef[] = [
  { id: 'w_mermaid', deck: 'WHITE', name: '人魚の涙', isEquipment: false, effectKey: 'MERMAID_TEARS', countInDeck: 1, description: '自分の最大HPが10以下なら、正体を公開することで自分のダメージをすべて回復できる。' },
  { id: 'w_holy_water', deck: 'WHITE', name: 'いやしの聖水', isEquipment: false, effectKey: 'HOLY_WATER', countInDeck: 3, description: '自分のダメージを2回復する。' },
  { id: 'w_advent', deck: 'WHITE', name: '光臨', isEquipment: false, effectKey: 'ADVENT', countInDeck: 1, description: '自分がレイダーなら、正体を公開して自分のダメージをすべて回復できる。' },
  { id: 'w_compass', deck: 'WHITE', name: '神秘のコンパス', isEquipment: true, effectKey: 'MYSTIC_COMPASS', countInDeck: 1, description: '移動時、ダイスを2回振り、好きな方の結果を選ぶことができる。' },
  { id: 'w_robe', deck: 'WHITE', name: '賢者のローブ', isEquipment: true, effectKey: 'SAGE_ROBE', countInDeck: 1, description: '自分が与える攻撃ダメージが-1され、自分が受ける攻撃ダメージも-1される。' },
  { id: 'w_rosary', deck: 'WHITE', name: '銀のロザリオ', isEquipment: true, effectKey: 'SILVER_ROSARY', countInDeck: 2, description: '自分の攻撃で他のプレイヤーを脱落させた時、そのプレイヤーの装備カードをすべて奪う。' },
  { id: 'w_parasol', deck: 'WHITE', name: '虹色のパラソル', isEquipment: true, effectKey: 'RAINBOW_PARASOL', countInDeck: 1, description: '他のプレイヤーが引いた黒カード（使い捨て）によるダメージや悪影響を受けない。' },
  { id: 'w_angel', deck: 'WHITE', name: '守護天使', isEquipment: false, effectKey: 'GUARDIAN_ANGEL', countInDeck: 1, description: '次の自分のターン開始時まで、他のプレイヤーの攻撃によるダメージを受けない。' },
  { id: 'w_flare', deck: 'WHITE', name: '裁きの閃光', isEquipment: false, effectKey: 'JUDGEMENT_FLARE', countInDeck: 1, description: '自分以外のすべてのプレイヤーに2ダメージを与える。' },
  { id: 'w_brooch', deck: 'WHITE', name: '幸運のブローチ', isEquipment: true, effectKey: 'FORTUNE_BROOCH', countInDeck: 1, description: '「市庁舎」のエリア効果による2ダメージを受けない。' },
  { id: 'w_blessing', deck: 'WHITE', name: '恩恵', isEquipment: false, effectKey: 'BLESSING', countInDeck: 1, description: '自分以外のプレイヤー1人を選び、6面ダイスを振ってその出目分だけダメージを回復する。' },
  { id: 'w_excalibur', deck: 'WHITE', name: 'エクスカリバー', isEquipment: true, effectKey: 'EXCALIBUR', countInDeck: 1, description: '自分がレイダーで正体を公開しているなら、自分の攻撃ダメージが+2される。' },
];

// 12 Black Cards (合計15枚: 装備6枚, 使い捨て9枚)
export const BLACK_CARD_DEFS: CardDef[] = [
  { id: 'b_henchman', deck: 'BLACK', name: 'オリバーの子分', isEquipment: false, effectKey: 'HENCHMAN', countInDeck: 2, description: '他のプレイヤー1人を選び、装備カードを1枚奪う。' },
  { id: 'b_gatling', deck: 'BLACK', name: 'ガトリング', isEquipment: true, effectKey: 'GATLING', countInDeck: 1, description: '自分の攻撃時、攻撃範囲内にいる他のプレイヤー全員を同時に攻撃する。' },
  { id: 'b_bat', deck: 'BLACK', name: '吸血コウモリ', isEquipment: false, effectKey: 'VAMPIRE_BAT', countInDeck: 2, description: '他のプレイヤー1人に2ダメージを与え、自分のダメージを1回復する。' },
  { id: 'b_crossbow', deck: 'BLACK', name: 'クロスボウガン', isEquipment: true, effectKey: 'CROSSBOW', countInDeck: 1, description: '攻撃範囲が広がり、自分のエリアに加えて「左隣」と「右隣」のエリアも攻撃できるようになる。' },
  { id: 'b_handgun', deck: 'BLACK', name: '拳銃（R）', isEquipment: true, effectKey: 'HANDGUN_R', countInDeck: 1, description: '通常の攻撃範囲の代わりに、それ以外のすべての通常エリアを攻撃できるようになる。' },
  { id: 'b_saber', deck: 'BLACK', name: 'サーベル', isEquipment: true, effectKey: 'SABER', countInDeck: 1, description: '自分の攻撃で1以上のダメージを与える時、与えるダメージが+1される。' },
  { id: 'b_scope', deck: 'BLACK', name: '死神のスコープ', isEquipment: true, effectKey: 'REAPER_SCOPE', countInDeck: 2, description: '自分の攻撃ダイスを振った後、どちらか1つのダイスを1回だけ振り直すことができる。' },
  { id: 'b_ritual', deck: 'BLACK', name: '戦慄の闇儀式', isEquipment: false, effectKey: 'DIABOLIC_RITUAL', countInDeck: 1, description: '自分がシャドウなら、正体を公開して自分のダメージをすべて回復できる。' },
  { id: 'b_doll', deck: 'BLACK', name: '呪いの人形', isEquipment: false, effectKey: 'CURSED_DOLL', countInDeck: 1, description: '他のプレイヤー1人を選び6面ダイスを振る。1〜4なら相手に3ダメージ、5〜6なら自分に3ダメージ。' },
  { id: 'b_banana', deck: 'BLACK', name: 'バナナの皮', isEquipment: false, effectKey: 'BANANA_PEEL', countInDeck: 1, description: '自分の装備カードを1枚、他のプレイヤー1人に渡す。装備を持っていなければ自分に1ダメージ。' },
  { id: 'b_riot', deck: 'BLACK', name: '暴動', isEquipment: false, effectKey: 'RIOT', countInDeck: 1, description: '6面と4面ダイスを振り、合計値に対応するエリアにいる全プレイヤー（自分含む）に3ダメージ。' },
  { id: 'b_watchdog', deck: 'BLACK', name: '三つ目の番犬', isEquipment: false, effectKey: 'WATCHDOG', countInDeck: 1, description: '他のプレイヤー1人を選び、2ダメージを与え、自分も2ダメージを受ける。' },
];

export function getCharacterById(id: string): CharacterDef {
  const found = CHARACTERS.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown character id: ${id}`);
  return found;
}

export function getFactionLabel(faction: CharacterDef['faction']): string {
  switch (faction) {
    case 'CITIZEN':
      return 'シチズン';
    case 'RAIDER':
      return 'レイダー';
    case 'SHADOW':
      return 'シャドウ';
  }
}
