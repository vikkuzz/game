/**
 * Типы для действий игроков в сетевой игре
 */

import type { PlayerId, UnitType } from "./game";
import type { CastleUpgrades } from "./game";

export type GameActionType =
  | "buyUnit"
  | "upgradeBuilding"
  | "repairBuilding"
  | "upgradeCastleStat"
  | "togglePause"
  | "toggleAutoUpgrade"
  | "setGameSpeed"
  | "voteForSpeed";

export interface GameAction {
  type: GameActionType;
  playerId: PlayerId;
  timestamp: number;
  actionId: string;
  data: any;
}

export interface BuyUnitAction extends GameAction {
  type: "buyUnit";
  data: {
    barrackId: string;
    unitType: UnitType;
  };
}

export interface UpgradeBuildingAction extends GameAction {
  type: "upgradeBuilding";
  data: {
    buildingId: string;
  };
}

export interface RepairBuildingAction extends GameAction {
  type: "repairBuilding";
  data: {
    buildingId: string;
  };
}

export interface UpgradeCastleStatAction extends GameAction {
  type: "upgradeCastleStat";
  data: {
    stat: keyof CastleUpgrades;
  };
}

export interface TogglePauseAction extends GameAction {
  type: "togglePause";
  data: {};
}

export interface ToggleAutoUpgradeAction extends GameAction {
  type: "toggleAutoUpgrade";
  data: {};
}

export interface SetGameSpeedAction extends GameAction {
  type: "setGameSpeed";
  data: {
    speed: number;
  };
}

export interface VoteForSpeedAction extends GameAction {
  type: "voteForSpeed";
  data: {
    speed: number;
  };
}

