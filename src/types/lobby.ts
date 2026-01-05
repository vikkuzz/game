/**
 * Типы для системы лобби и сетевой игры
 */

import { PlayerId } from "./game";

export type GameMode = "1v3ai" | "1v1+2ai" | "1v1v1+1ai" | "1v1v1v1";

export interface LobbyPlayer {
  id: string; // Уникальный ID игрока (socket.id)
  name: string; // Имя игрока
  isHost: boolean; // Является ли хостом лобби
  isReady: boolean; // Готов ли к игре
  assignedSlot?: PlayerId; // Назначенный слот (0-3)
}

export interface Lobby {
  id: string; // Уникальный ID лобби
  hostId: string; // ID хоста лобби
  mode: GameMode; // Режим игры
  players: LobbyPlayer[]; // Список игроков
  maxPlayers: number; // Максимальное количество игроков
  countdown?: number; // Оставшееся время до старта (секунды)
  isStarting: boolean; // Игра запускается
  gameStarted: boolean; // Игра началась
}

export interface JoinLobbyRequest {
  lobbyId: string;
  playerName: string;
}

export interface CreateLobbyRequest {
  mode: GameMode;
  playerName: string;
}

export interface LobbyUpdate {
  lobby: Lobby;
}

export interface PlayerSlotAssignment {
  playerId: string;
  slot: PlayerId;
}

export interface GameStartData {
  lobby: Lobby;
  playerSlotMap: Map<string, PlayerId>; // Маппинг socket.id -> PlayerId
}

