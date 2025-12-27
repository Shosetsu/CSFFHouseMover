export interface SaveData {
  CurrentEnvironmentCard: EnvCard;
  EnvironmentsData: EnvCard[];
  CurrentCardsData: Card[];
  CurrentInventoryCards: Card[];
}

export interface Card {
  CardID: string;
  NPCID: string;
  CustomName: string;
  CustomDesc: string;
  EnvironmentKey: string;
  EnvironmentID: string;
  PrevEnvironmentID: string;
  PrevEnvTravelIndex: number;
  IgnoreBaseRow: boolean;
  SlotInformation: SlotInformation;
  CreatedOnTick: number;
  CreatedInSaveDataTick: number;
  IsPinned: boolean;
  NotYetCreated: boolean;
  IsTravelCard: boolean;
  TravelCardIndex: number;
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

export interface EnvCard extends Card {
  DictionaryKey: string;
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
