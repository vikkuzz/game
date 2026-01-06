"use client";

import React, { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useGameState } from "@/hooks/useGameState";
import { useNetworkGameState } from "@/hooks/useNetworkGameState";
import { useSocket } from "@/hooks/useSocket";
import { GameMap } from "@/components/game/GameMap";
import { ControlPanel } from "@/components/game/ControlPanel";
import { GameOverModal } from "@/components/game/GameOverModal";
import { BuildingModal } from "@/components/game/BuildingModal";
import { Button } from "@/components/Button";
import { Section } from "@/components/Section";
import { UnitType, PlayerId, Building } from "@/types/game";
import { MobileControlPanel } from "@/components/game/MobileControlPanel";

/**
 * Страница игры Survival Chaos
 */
function GamePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { socket, isConnected } = useSocket();
  const [networkGameData, setNetworkGameData] = useState<{
    lobby: any;
    playerSlotMap: Record<string, PlayerId>;
    aiSlots?: PlayerId[];
  } | null>(null);
  const [isNetworkMode, setIsNetworkMode] = useState(false);
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [modalBuilding, setModalBuilding] = useState<Building | null>(null);

  // Загружаем данные сетевой игры из sessionStorage при загрузке страницы
  // Это позволяет автоматически переподключаться при обновлении страницы
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Сначала проверяем URL параметры
    const urlNetworkMode = searchParams?.get("network") === "true";
    const urlLobbyId = searchParams?.get("lobbyId") || null;

    // Затем проверяем sessionStorage для автоматического переподключения
    const stored = sessionStorage.getItem("networkGameData");
    
    if (stored) {
      try {
        const data = JSON.parse(stored);
        // Если есть сохраненные данные, используем их для переподключения
        setNetworkGameData(data);
        setIsNetworkMode(true);
        setLobbyId(data.lobby.id);
        
        // Обновляем URL, если он не совпадает
        if (!urlNetworkMode || urlLobbyId !== data.lobby.id) {
          router.replace(`/game?network=true&lobbyId=${data.lobby.id}`, { scroll: false });
        }
        
        console.log("[GamePage] Restored network game from sessionStorage:", data.lobby.id);
      } catch (error) {
        console.error("Error parsing network game data:", error);
        // Если данные некорректны, очищаем и возвращаемся в лобби
        sessionStorage.removeItem("networkGameData");
        router.push("/game/lobby");
      }
    } else if (urlNetworkMode && urlLobbyId) {
      // Если нет сохраненных данных, но есть URL параметры - это новый вход
      // В этом случае нужно загрузить данные из лобби или вернуться туда
      router.push("/game/lobby");
    } else {
      // Нет ни сохраненных данных, ни URL параметров - оффлайн режим
      setIsNetworkMode(false);
      setLobbyId(null);
    }
  }, [searchParams, router]);

  // В оффлайн-режиме используем локальное состояние и игровой цикл,
  // в сетевом режиме — только состояние, приходящее с сервера.
  // ВАЖНО: хуки должны вызываться всегда, не условно
  const localGame = useGameState();

  // Хук должен вызываться всегда, но с правильными параметрами
  const networkGame = useNetworkGameState(
    networkGameData && socket && isNetworkMode
      ? {
          lobbyId: networkGameData.lobby.id,
          playerSlotMap: networkGameData.playerSlotMap,
          socketId: socket.id || null,
          socket,
          isConnected,
          aiSlots: networkGameData.aiSlots || [],
        }
      : {
          lobbyId: "",
          playerSlotMap: {},
          socketId: null,
          socket: null,
          isConnected: false,
          aiSlots: [],
        }
  );

  // Определяем myPlayerId для сетевого режима
  // Используем сохраненный playerId из sessionStorage, если networkGame.myPlayerId не определен
  const [savedPlayerId, setSavedPlayerId] = useState<PlayerId | null>(null);
  
  useEffect(() => {
    if (isNetworkMode && lobbyId && typeof window !== "undefined") {
      const saved = sessionStorage.getItem(`playerId_${lobbyId}`);
      if (saved) {
        const playerId = parseInt(saved, 10) as PlayerId;
        setSavedPlayerId(playerId);
        console.log(`[GamePage] Loaded saved playerId from sessionStorage: ${playerId}`);
      }
    }
  }, [isNetworkMode, lobbyId]);
  
  const myPlayerId = isNetworkMode && networkGameData
    ? (networkGame.myPlayerId ?? savedPlayerId)
    : null;

  // В зависимости от режима берём состояние игры либо с сервера, либо из локального хука.
  const gameState = isNetworkMode
    ? networkGame.gameState
    : localGame?.gameState ?? null;

  // Набор действий в игре:
  // - в сетевом режиме: только отправка на сервер (сервер — единственный источник истины)
  // - в оффлайн-режиме: локальные изменения через useGameState
  const gameActions = isNetworkMode && networkGameData
    ? {
        buyUnit: (playerId: PlayerId, barrackId: string, unitType: UnitType) => {
          networkGame.buyUnit(playerId, barrackId, unitType);
        },
        upgradeBuilding: (playerId: PlayerId, buildingId: string) => {
          networkGame.upgradeBuilding(playerId, buildingId);
        },
        repairBuilding: (playerId: PlayerId, buildingId: string) => {
          networkGame.repairBuilding(playerId, buildingId);
        },
        upgradeCastleStat: (
          playerId: PlayerId,
          stat: keyof import("@/types/game").CastleUpgrades
        ) => {
          networkGame.upgradeCastleStat(playerId, stat);
        },
        togglePause: () => {
          networkGame.togglePause();
        },
        toggleAutoUpgrade: () => {
          networkGame.toggleAutoUpgrade();
        },
        setGameSpeed: (speed: number) => {
          // В сетевом режиме отправляем только голос на сервер
          networkGame.voteForSpeed?.(speed);
        },
        selectPlayer: (playerId: PlayerId) => {
          // В сетевом режиме запрещаем переключение между игроками
          if (myPlayerId !== null && playerId !== myPlayerId) {
            return;
          }
          networkGame.selectPlayer(playerId);
        },
        selectBuilding: (buildingId: string | null) => {
          networkGame.selectBuilding(buildingId);
        },
        restartGame: () => {
          // В сетевой игре перезапуск делается через новое лобби
          router.push("/game/lobby");
        },
      }
    : localGame; // В оффлайн-режиме localGame всегда определён (хук вызывается всегда)

  // Fallback для случаев, когда gameActions может быть null
  const {
    buyUnit,
    upgradeBuilding,
    repairBuilding,
    upgradeCastleStat,
    togglePause,
    toggleAutoUpgrade,
    setGameSpeed,
    selectPlayer,
    selectBuilding,
    restartGame,
  } = gameActions ?? {
    buyUnit: () => {},
    upgradeBuilding: () => {},
    repairBuilding: () => {},
    upgradeCastleStat: () => {},
    togglePause: () => {},
    toggleAutoUpgrade: () => {},
    setGameSpeed: () => {},
    selectPlayer: () => {},
    selectBuilding: () => {},
    restartGame: () => {},
  };

  // Инициализируем selectedPlayer в сетевом режиме на основе myPlayerId (только один раз)
  const selectedPlayerInitialized = React.useRef(false);
  const lastMyPlayerId = React.useRef<PlayerId | null>(null);
  
  useEffect(() => {
    // Сбрасываем флаг только если myPlayerId действительно изменился
    if (myPlayerId !== lastMyPlayerId.current) {
      selectedPlayerInitialized.current = false;
      lastMyPlayerId.current = myPlayerId;
    }

    if (
      isNetworkMode &&
      myPlayerId !== null &&
      gameState &&
      !selectedPlayerInitialized.current
    ) {
      // Автоматически выбираем своего игрока при загрузке (только один раз)
      if (gameState.selectedPlayer !== myPlayerId) {
        selectPlayer(myPlayerId);
        selectedPlayerInitialized.current = true;
      } else {
        // Если уже выбран правильный игрок, просто отмечаем как инициализированный
        selectedPlayerInitialized.current = true;
      }
    }
  }, [isNetworkMode, myPlayerId, gameState?.selectedPlayer, selectPlayer]);
  
  // В сетевом режиме не нужно синхронизировать локальное состояние,
  // так как мы используем состояние от сервера напрямую

  const handleBuildingClick = (buildingId: string) => {
    if (!gameState) return;
    
    // Находим здание
    const player = gameState.players[selectedPlayer];
    if (!player) return;
    
    let building: Building | null = null;
    if (player.castle.id === buildingId) {
      building = player.castle;
    } else {
      building = [...player.barracks, ...player.towers].find(
        (b) => b.id === buildingId
      ) || null;
    }
    
    if (building) {
      // Открываем модальное окно вместо выбора здания
      setModalBuilding(building);
      // Также выбираем здание для обратной совместимости
      selectBuilding(buildingId);
    }
  };

  // Если состояние еще не загружено, показываем загрузку
  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Загрузка игры...</div>
          <div className="flex items-center gap-2 justify-center">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm">
              {isNetworkMode ? "Подключение к серверу" : "Инициализация игры"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const selectedPlayer = gameState.selectedPlayer ?? 0;
  const currentPlayer = gameState.players[selectedPlayer];

  // Обновляем модальное окно при изменении gameState
  useEffect(() => {
    if (modalBuilding && currentPlayer) {
      let updatedBuilding: Building | null = null;
      if (currentPlayer.castle.id === modalBuilding.id) {
        updatedBuilding = currentPlayer.castle;
      } else {
        updatedBuilding = [...currentPlayer.barracks, ...currentPlayer.towers].find(
          (b) => b.id === modalBuilding.id
        ) || null;
      }
      if (updatedBuilding) {
        setModalBuilding(updatedBuilding);
      } else {
        // Здание было уничтожено, закрываем модальное окно
        setModalBuilding(null);
      }
    }
  }, [gameState, modalBuilding, currentPlayer]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col md:block">
      {/* Модальное окно управления зданием */}
      {modalBuilding && currentPlayer && (
        <BuildingModal
          building={modalBuilding}
          player={currentPlayer}
          playerId={selectedPlayer}
          onUpgrade={() => {
            upgradeBuilding(selectedPlayer, modalBuilding.id);
          }}
          onRepair={() => {
            repairBuilding(selectedPlayer, modalBuilding.id);
          }}
          onBuyUnit={
            modalBuilding.type === "barracks"
              ? (unitType) => {
                  buyUnit(selectedPlayer, modalBuilding.id, unitType);
                }
              : undefined
          }
          onClose={() => {
            setModalBuilding(null);
            selectBuilding(null);
          }}
        />
      )}
      {/* Мобильный layout - карта на весь экран */}
      <div className="md:hidden flex flex-col h-screen">
        {/* Компактный заголовок с управлением */}
        <div className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 px-3 py-2 z-10 flex-shrink-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h1 className="text-lg font-bold text-white">Survival Chaos</h1>
            <div className="flex gap-1 items-center">
              <Button
                onClick={togglePause}
                variant={gameState.isPaused ? "success" : "warning"}
                size="sm"
                className="text-xs px-2 py-1">
                {gameState.isPaused ? "▶" : "⏸"}
              </Button>
              <div className="flex gap-1 flex-col">
                <div className="flex gap-1">
                  <Button
                    onClick={() => setGameSpeed(0.5)}
                    variant={gameState.gameSpeed === 0.5 ? "primary" : "secondary"}
                    size="sm"
                    className="text-xs px-2 py-1"
                    disabled={isNetworkMode && gameState.gameSpeed !== 0.5 && myPlayerId !== null && (networkGame.speedVotes?.[myPlayerId] === 0.5)}>
                    0.5x
                  </Button>
                  <Button
                    onClick={() => setGameSpeed(1)}
                    variant={gameState.gameSpeed === 1 ? "primary" : "secondary"}
                    size="sm"
                    className="text-xs px-2 py-1"
                    disabled={isNetworkMode && gameState.gameSpeed !== 1 && myPlayerId !== null && (networkGame.speedVotes?.[myPlayerId] === 1)}>
                    1x
                  </Button>
                  <Button
                    onClick={() => setGameSpeed(2)}
                    variant={gameState.gameSpeed === 2 ? "primary" : "secondary"}
                    size="sm"
                    className="text-xs px-2 py-1"
                    disabled={isNetworkMode && gameState.gameSpeed !== 2 && myPlayerId !== null && (networkGame.speedVotes?.[myPlayerId] === 2)}>
                    2x
                  </Button>
                </div>
                {isNetworkMode && networkGame.speedVotes && Object.keys(networkGame.speedVotes).length > 0 && (
                  <div className="text-xs text-gray-400 mt-1">
                    Голосов: {Object.keys(networkGame.speedVotes).length} / {gameState.players.filter((p, idx) => p.isActive && !networkGame.aiSlots?.includes(idx as PlayerId)).length}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Золото и доход */}
          {gameState && gameState.players[gameState.selectedPlayer || 0] && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-gray-400">💰</span>
                <span className="text-yellow-400 font-bold">
                  {Math.floor(gameState.players[gameState.selectedPlayer || 0].gold)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-400">📈</span>
                <span className="text-green-400 font-semibold">
                  {gameState.players[gameState.selectedPlayer || 0].goldIncome}/сек
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Окно обзора карты - сжимается, но карта внутри полного размера с прокруткой */}
        <div className="flex-1 overflow-auto relative w-full bg-gray-800">
          <div className="inline-block">
            <GameMap
              gameState={gameState}
              selectedBuilding={gameState.selectedBuilding}
              onBuildingClick={handleBuildingClick}
              selectedPlayer={gameState.selectedPlayer ?? undefined}
            />
          </div>
        </div>

        {/* Мобильная панель с табами внизу */}
        <MobileControlPanel
          gameState={gameState}
          selectedPlayer={gameState.selectedPlayer || 0}
          onBuyUnit={(
            playerId: PlayerId,
            barrackId: string,
            unitType: UnitType
          ) => buyUnit(playerId, barrackId, unitType)}
          onUpgradeBuilding={(playerId: PlayerId, buildingId: string) =>
            upgradeBuilding(playerId, buildingId)
          }
          onRepairBuilding={(playerId: PlayerId, buildingId: string) =>
            repairBuilding(playerId, buildingId)
          }
          onUpgradeCastleStat={(playerId: PlayerId, stat) =>
            upgradeCastleStat(playerId, stat)
          }
          onSelectPlayer={(playerId: PlayerId) => selectPlayer(playerId)}
          onToggleAutoUpgrade={toggleAutoUpgrade}
          isNetworkMode={isNetworkMode}
          myPlayerId={myPlayerId}
        />
      </div>

      {/* Десктопный layout */}
      <Section padding="lg" className="hidden md:block">
        {/* Заголовок и управление */}
        <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-white">Survival Chaos</h1>
            {/* Золото и доход */}
            {gameState && gameState.players[gameState.selectedPlayer || 0] && (
              <div className="flex items-center gap-4 text-base">
                <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-1.5 rounded-lg">
                  <span className="text-yellow-400">💰</span>
                  <span className="text-yellow-400 font-bold">
                    {Math.floor(gameState.players[gameState.selectedPlayer || 0].gold)}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-1.5 rounded-lg">
                  <span className="text-green-400">📈</span>
                  <span className="text-green-400 font-semibold">
                    {gameState.players[gameState.selectedPlayer || 0].goldIncome}/сек
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 items-center w-full md:w-auto justify-between md:justify-end">
            {/* Управление игрой */}
            <Button
              onClick={togglePause}
              variant={gameState.isPaused ? "success" : "warning"}
              size="sm"
              className="flex-1 md:flex-none">
              {gameState.isPaused ? "▶ Продолжить" : "⏸ Пауза"}
            </Button>
            <div className="flex gap-1 flex-col">
              <div className="flex gap-1">
                <Button
                  onClick={() => setGameSpeed(0.5)}
                  variant={gameState.gameSpeed === 0.5 ? "primary" : "secondary"}
                  size="sm"
                  className="text-xs px-2"
                  disabled={isNetworkMode && gameState.gameSpeed !== 0.5 && myPlayerId !== null && (networkGame.speedVotes?.[myPlayerId] === 0.5)}>
                  0.5x
                </Button>
                <Button
                  onClick={() => setGameSpeed(1)}
                  variant={gameState.gameSpeed === 1 ? "primary" : "secondary"}
                  size="sm"
                  className="text-xs px-2"
                  disabled={isNetworkMode && gameState.gameSpeed !== 1 && myPlayerId !== null && (networkGame.speedVotes?.[myPlayerId] === 1)}>
                  1x
                </Button>
                <Button
                  onClick={() => setGameSpeed(2)}
                  variant={gameState.gameSpeed === 2 ? "primary" : "secondary"}
                  size="sm"
                  className="text-xs px-2"
                  disabled={isNetworkMode && gameState.gameSpeed !== 2 && myPlayerId !== null && (networkGame.speedVotes?.[myPlayerId] === 2)}>
                  2x
                </Button>
              </div>
              {isNetworkMode && networkGame.speedVotes && Object.keys(networkGame.speedVotes).length > 0 && (
                <div className="text-xs text-gray-400 text-center">
                  Голосов за ускорение: {Object.keys(networkGame.speedVotes).length} / {gameState.players.filter((p, idx) => p.isActive && !networkGame.aiSlots?.includes(idx as PlayerId)).length}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Информация о юнитах и прокачке игроков - скрыта на мобильных, показывается в панели */}
        <div className="mb-6 hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {gameState.players.map((player) => {
            const getPlayerStyles = (id: number) => {
              switch (id) {
                case 0:
                  return {
                    container: "bg-blue-900/50 border-blue-600",
                    title: "text-blue-300",
                  };
                case 1:
                  return {
                    container: "bg-red-900/50 border-red-600",
                    title: "text-red-300",
                  };
                case 2:
                  return {
                    container: "bg-green-900/50 border-green-600",
                    title: "text-green-300",
                  };
                case 3:
                  return {
                    container: "bg-yellow-900/50 border-yellow-600",
                    title: "text-yellow-300",
                  };
                default:
                  return {
                    container: "bg-gray-900/50 border-gray-600",
                    title: "text-gray-300",
                  };
              }
            };
            const styles = getPlayerStyles(player.id);
            return (
              <div
                key={player.id}
                className={`${styles.container} border-2 rounded-lg p-4 text-white`}>
                <h3 className={`text-lg font-bold mb-2 ${styles.title}`}>
                  Игрок {player.id + 1}
                </h3>

                {/* Информация о юнитах */}
                <div className="mb-3 space-y-1 text-sm">
                  <div className="font-semibold">Юниты:</div>
                  <div>
                    Всего:{" "}
                    <span className="font-bold">{player.units.length}</span>
                  </div>
                </div>

                {/* Информация о прокачке */}
                <div className="space-y-1 text-sm">
                  <div className="font-semibold">Прокачка:</div>
                  <div>Атака: {player.upgrades.attack}</div>
                  <div>Защита: {player.upgrades.defense}</div>
                  <div>Здоровье: {player.upgrades.health}</div>
                  <div>Доход: {player.upgrades.goldIncome}</div>
                  <div>Здоровье зданий: {player.upgrades.buildingHealth}</div>
                  <div>Атака зданий: {player.upgrades.buildingAttack}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Игровая область */}
        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Карта */}
          <div className="flex-1 flex justify-center overflow-x-auto md:overflow-visible">
            <GameMap
              gameState={gameState}
              selectedBuilding={gameState.selectedBuilding}
              onBuildingClick={handleBuildingClick}
              selectedPlayer={gameState.selectedPlayer ?? undefined}
            />
          </div>

          {/* Панель управления - скрыта на мобильных, показывается через выдвижное меню */}
          <div className="hidden lg:block w-full lg:w-96">
            <ControlPanel
              gameState={gameState}
              selectedPlayer={gameState.selectedPlayer || 0}
              onBuyUnit={(
                playerId: PlayerId,
                barrackId: string,
                unitType: UnitType
              ) => buyUnit(playerId, barrackId, unitType)}
              onUpgradeBuilding={(playerId: PlayerId, buildingId: string) =>
                upgradeBuilding(playerId, buildingId)
              }
              onRepairBuilding={(playerId: PlayerId, buildingId: string) =>
                repairBuilding(playerId, buildingId)
              }
              onUpgradeCastleStat={(playerId: PlayerId, stat) =>
                upgradeCastleStat(playerId, stat)
              }
              onSelectPlayer={(playerId: PlayerId) => selectPlayer(playerId)}
              onToggleAutoUpgrade={toggleAutoUpgrade}
              isNetworkMode={isNetworkMode}
              myPlayerId={myPlayerId}
            />
          </div>
        </div>


        {/* Инструкции - скрыты на мобильных */}
        <div className="mt-6 hidden md:block bg-white/10 backdrop-blur-sm rounded-lg p-4 text-white text-sm">
          <h3 className="font-bold mb-2">Как играть:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Выберите игрока (1-4) в панели управления</li>
            <li>Кликните на здание (замок, барак или башню) для выбора</li>
            <li>Улучшайте здания и прокачивайте войска в замке</li>
            <li>
              Покупайте юнитов в бараках (количество ограничено и
              восстанавливается)
            </li>
            <li>Юниты автоматически идут к соседям и в центр карты</li>
            <li>Побеждает последний выживший игрок!</li>
          </ul>
        </div>
      </Section>

      {/* Модальное окно окончания игры */}
      <GameOverModal gameState={gameState} onRestart={restartGame} />
      
      {/* Индикатор сетевого режима */}
      {isNetworkMode && (
        <div className="fixed top-20 right-4 bg-blue-900/90 backdrop-blur-sm border border-blue-600 rounded-lg px-4 py-2 text-white text-sm z-50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Сетевой режим</span>
            {lobbyId && <span className="text-blue-300">({lobbyId})</span>}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Обертка для поддержки useSearchParams
 */
export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка игры...</div>
      </div>
    }>
      <GamePageContent />
    </Suspense>
  );
}
