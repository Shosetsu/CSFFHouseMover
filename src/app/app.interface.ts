/** 移动选项 */
export type MoverOption<T extends Card> = {
  /** 显示文本 */
  label: string;
  /** 类型 */
  type?: string;
  /** 引用的卡片对象 */
  ref: T;
  /** 环境ID */
  env?: string;
  /** 是否为当前环境的标记 */
  current?: boolean;
};

export interface SaveData {
  /** 当前环境卡片 */
  CurrentEnvironmentCard: EnvCard;
  /** 当前卡片数据列表 */
  CurrentCardsData: Card[];
  /** 当前库存卡片列表 */
  CurrentInventoryCards: Card[];
  /** 环境数据列表 */
  EnvironmentsData: EnvCard[];
}

/** 游戏卡片基础类型定义 */
export interface Card {
  /** 卡片的唯一ID */
  CardID: string;
  /** 环境键值 */
  EnvironmentKey: string;
  /** 自定义名称 */
  CustomName?: string;
  /** 创建时的tick数 */
  CreatedOnTick?: number;
  /** 旅行卡片索引 */
  TravelCardIndex?: number;

  NPCID: string;
  CustomDesc: string;
  EnvironmentID: string;
  PrevEnvironmentID: string;
  PrevEnvTravelIndex: number;
  IgnoreBaseRow: boolean;
  SlotInformation: SlotInformation;
  CreatedInSaveDataTick: number;
  IsPinned: boolean;
  NotYetCreated: boolean;
  IsTravelCard: boolean;
  CurrentWeight: number;
  ActiveDurabilities: number;
  Spoilage: number;
  Usage: number;
  Fuel: number;
  ConsumableCharges: number;
  LiquidQuantity: number;
  Special1: number;
  Special2: number;
  Special3: number;
  Special4: number;
  Flavours: any[];
  Spices: any[];
  ExplorationData: {
    CurrentExploration: number;
    ExplorationResults: ExplorationResult[];
  };
  TravelTargetKey: string;
  SavedRecipe: SavedRecipe;
  CollectionUses: any[];
  StatTriggeredActions: any[];
  PlayerAssignedDuties: any[];
  CombatState: number;
}

/** 环境卡片类型定义 */
export interface EnvCard extends Card {
  /** 环境字典键值 */
  DictionaryKey: string;
  /** 所有常规卡片列表 */
  AllRegularCards: Card[];
}

interface ExplorationResult {
  location?: string;
  discoveryTime?: number;
  findings?: string[];
}

interface SavedRecipe {
  ContainerID: string;
  Cards: Card[];
  ImageIndex: number;
  CustomName: string;
}

interface SlotInformation {
  SlotType: number;
  SlotIndex: number;
}
