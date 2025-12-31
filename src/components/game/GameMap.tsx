"use client";

import React from "react";
import { GameState, PlayerId } from "@/types/game";
import { BuildingComponent } from "./Building";
import { UnitComponent } from "./Unit";
import { GAME_CONFIG } from "@/lib/gameLogic";

interface GameMapProps {
  gameState: GameState;
  selectedBuilding: string | null;
  onBuildingClick: (buildingId: string) => void;
  selectedPlayer?: PlayerId;
}

export const GameMap: React.FC<GameMapProps> = ({
  gameState,
  selectedBuilding,
  onBuildingClick,
  selectedPlayer,
}) => {
  const mapSize = GAME_CONFIG.mapSize;
  const center = mapSize / 2;

  return (
    <div 
      className="relative bg-linear-to-br from-green-900 to-green-700 border-4 border-gray-800 rounded-lg shadow-2xl"
      style={{
        width: `${mapSize}px`,
        height: `${mapSize}px`,
        minWidth: `${mapSize}px`,
        minHeight: `${mapSize}px`,
        display: 'inline-block',
      }}>
      <div
        className="relative w-full h-full"
        style={{
          width: mapSize,
          height: mapSize,
          position: "relative",
        }}>
        {/* Центральная точка */}
        <div
          className="absolute w-4 h-4 bg-white rounded-full border-2 border-gray-800"
          style={{
            left: center - 8,
            top: center - 8,
          }}
        />

        {/* Сетка для ориентира (опционально) */}
        <svg
          className="absolute inset-0 opacity-20"
          style={{ width: mapSize, height: mapSize }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <React.Fragment key={i}>
              <line
                x1={0}
                y1={(i * mapSize) / 10}
                x2={mapSize}
                y2={(i * mapSize) / 10}
                stroke="white"
                strokeWidth={1}
              />
              <line
                x1={(i * mapSize) / 10}
                y1={0}
                x2={(i * mapSize) / 10}
                y2={mapSize}
                stroke="white"
                strokeWidth={1}
              />
            </React.Fragment>
          ))}
        </svg>

        {/* Буквы колонок (A-J) и цифры строк (1-10) */}
        <svg
          className="absolute inset-0 pointer-events-none z-10"
          style={{ width: mapSize, height: mapSize }}>
          {/* Буквы колонок сверху */}
          {Array.from({ length: 10 }).map((_, i) => {
            const letter = String.fromCharCode(65 + i); // A-J
            return (
              <text
                key={`col-${i}`}
                x={80 * i + 40}
                y={15}
                fill="white"
                fontSize="14"
                fontWeight="bold"
                textAnchor="middle"
                className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {letter}
              </text>
            );
          })}
          {/* Цифры строк слева */}
          {Array.from({ length: 10 }).map((_, i) => {
            const number = i + 1; // 1-10
            return (
              <text
                key={`row-${i}`}
                x={10}
                y={80 * i + 45}
                fill="white"
                fontSize="14"
                fontWeight="bold"
                textAnchor="middle"
                className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {number}
              </text>
            );
          })}
        </svg>

        {/* Здания */}
        {gameState.players.map((player) => {
          if (!player.isActive) return null;

          return (
            <React.Fragment key={player.id}>
              <BuildingComponent
                building={player.castle}
                isSelected={selectedBuilding === player.castle.id}
                onClick={() => onBuildingClick(player.castle.id)}
                playerGold={player.gold}
                playerGoldIncome={player.goldIncome}
                isCurrentPlayer={selectedPlayer === player.id}
              />
              {player.barracks.map((barrack) => (
                <BuildingComponent
                  key={barrack.id}
                  building={barrack}
                  isSelected={selectedBuilding === barrack.id}
                  onClick={() => onBuildingClick(barrack.id)}
                />
              ))}
              {player.towers.map((tower) => (
                <BuildingComponent
                  key={tower.id}
                  building={tower}
                  isSelected={selectedBuilding === tower.id}
                  onClick={() => onBuildingClick(tower.id)}
                />
              ))}
            </React.Fragment>
          );
        })}

        {/* Юниты */}
        {gameState.players.map((player) =>
          player.units.map((unit) => (
            <UnitComponent key={unit.id} unit={unit} />
          ))
        )}

        {/* Лазерные лучи от зданий */}
        <svg
          className="absolute inset-0 pointer-events-none z-20"
          style={{ width: mapSize, height: mapSize }}>
          {/* Эффект свечения для лазеров и стрел */}
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Стрелка для лучников (желтая) */}
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth">
              <path
                d="M0,0 L0,6 L9,3 z"
                fill="#fbbf24"
                opacity="0.9"
              />
            </marker>
            {/* Стрелка для магов (фиолетовая, более магическая) */}
            <marker
              id="magic-arrowhead"
              markerWidth="12"
              markerHeight="12"
              refX="10"
              refY="4"
              orient="auto"
              markerUnits="strokeWidth">
              <path
                d="M0,2 L2,0 L10,4 L2,8 L0,6 z"
                fill="#a855f7"
                opacity="0.9"
              />
            </marker>
          </defs>
          {gameState.players.map((player) => {
            if (!player.isActive) return null;

            const playerColors = ["#3b82f6", "#ef4444", "#22c55e", "#eab308"]; // blue, red, green, yellow
            const color = playerColors[player.id];

            return (
              <React.Fragment key={player.id}>
                {/* Луч от замка */}
                {player.castle.attackTarget && player.castle.health > 0 && (
                  <line
                    x1={player.castle.position.x}
                    y1={player.castle.position.y}
                    x2={player.castle.attackTarget.x}
                    y2={player.castle.attackTarget.y}
                    stroke={color}
                    strokeWidth="3"
                    strokeOpacity="0.8"
                    strokeLinecap="round"
                    filter="url(#glow)"
                  />
                )}
                {/* Лучи от башен */}
                {player.towers.map((tower) => {
                  if (!tower.attackTarget || tower.health <= 0) return null;
                  return (
                    <line
                      key={`laser-${tower.id}`}
                      x1={tower.position.x}
                      y1={tower.position.y}
                      x2={tower.attackTarget.x}
                      y2={tower.attackTarget.y}
                      stroke={color}
                      strokeWidth="2"
                      strokeOpacity="0.8"
                      strokeLinecap="round"
                      filter="url(#glow)"
                    />
                  );
                })}
                {/* Летящие стрелы от лучников и магов */}
                {player.units.map((unit) => {
                  // Рисуем летящие стрелы только для дальнобойных юнитов (лучников и магов)
                  if (
                    unit.attackTarget &&
                    unit.health > 0 &&
                    unit.isAttacking &&
                    (unit.type === "archer" || unit.type === "mage")
                  ) {
                    const isArcher = unit.type === "archer";
                    const arrowColor = isArcher ? "#fbbf24" : "#a855f7"; // Желтый для лучников, фиолетовый для магов
                    const dx = unit.attackTarget.x - unit.position.x;
                    const dy = unit.attackTarget.y - unit.position.y;
                    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                    const pathId = `arrow-path-${unit.id}-${player.id}`;
                    const pathData = `M ${unit.position.x} ${unit.position.y} L ${unit.attackTarget.x} ${unit.attackTarget.y}`;
                    
                    return (
                      <g key={`arrow-group-${unit.id}`}>
                        {/* Определяем путь для анимации (невидимый) */}
                        <path
                          id={pathId}
                          d={pathData}
                          fill="none"
                          stroke="none"
                          visibility="hidden"
                        />
                        {/* Летящая стрела */}
                        <g>
                          {/* Тело стрелы */}
                          <rect
                            x="-6"
                            y="-2"
                            width="10"
                            height="4"
                            fill={arrowColor}
                            filter="url(#glow)"
                            opacity="0.95"
                            transform={`rotate(${angle})`}>
                            <animateMotion
                              dur="0.3s"
                              repeatCount="1"
                              fill="remove"
                              calcMode="linear">
                              <mpath xlinkHref={`#${pathId}`} />
                            </animateMotion>
                          </rect>
                          {/* Наконечник стрелы */}
                          <polygon
                            points="4,-3 8,0 4,3"
                            fill={arrowColor}
                            filter="url(#glow)"
                            opacity="0.95"
                            transform={`rotate(${angle})`}>
                            <animateMotion
                              dur="0.3s"
                              repeatCount="1"
                              fill="remove"
                              calcMode="linear">
                              <mpath xlinkHref={`#${pathId}`} />
                            </animateMotion>
                          </polygon>
                        </g>
                      </g>
                    );
                  }
                  return null;
                })}
              </React.Fragment>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
