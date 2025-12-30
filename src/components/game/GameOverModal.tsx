"use client";

import React from "react";
import { GameState, PlayerId } from "@/types/game";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

interface GameOverModalProps {
  gameState: GameState;
  onRestart: () => void;
}

const PLAYER_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b"]; // Синий, красный, зеленый, оранжевый
const PLAYER_NAMES = ["Игрок 1", "Игрок 2", "Игрок 3", "Игрок 4"];

export function GameOverModal({ gameState, onRestart }: GameOverModalProps) {
  if (!gameState.gameOver) return null;

  const winner =
    gameState.winner !== null
      ? gameState.players.find((p) => p.id === gameState.winner)
      : null;

  // Сортируем игроков по количеству убийств и разрушенных зданий
  const sortedPlayers = [...gameState.players].sort((a, b) => {
    const aScore = a.stats.unitsKilled + a.stats.buildingsDestroyed * 2;
    const bScore = b.stats.unitsKilled + b.stats.buildingsDestroyed * 2;
    return bScore - aScore;
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card
        className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        padding="xl"
        shadow="xl">
        <div className="text-center mb-6">
          <h2 className="text-4xl font-bold mb-2">
            {winner ? (
              <>
                <span style={{ color: PLAYER_COLORS[winner.id] }}>
                  {PLAYER_NAMES[winner.id]}
                </span>{" "}
                победил!
              </>
            ) : (
              "Ничья!"
            )}
          </h2>
          <p className="text-gray-600">
            Время игры: {formatTime(gameState.gameTime)}
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <h3 className="text-2xl font-bold text-center mb-4">
            Статистика боя
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sortedPlayers.map((player) => {
              const isWinner = player.id === gameState.winner;
              return (
                <Card
                  key={player.id}
                  className={`border-2 ${
                    isWinner ? "border-yellow-400 bg-yellow-50" : ""
                  }`}
                  padding="lg"
                  shadow="md">
                  <div className="text-center mb-3">
                    <div
                      className="w-8 h-8 rounded-full mx-auto mb-2"
                      style={{ backgroundColor: PLAYER_COLORS[player.id] }}
                    />
                    <h4 className="font-bold text-lg">
                      {PLAYER_NAMES[player.id]}
                      {isWinner && " 🏆"}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {isWinner ? "Победитель" : "Проиграл"}
                    </p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Убито юнитов:</span>
                      <span className="font-bold">
                        {player.stats.unitsKilled}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Потеряно юнитов:</span>
                      <span className="font-bold text-red-600">
                        {player.stats.unitsLost}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Разрушено зданий:</span>
                      <span className="font-bold">
                        {player.stats.buildingsDestroyed}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Потеряно зданий:</span>
                      <span className="font-bold text-red-600">
                        {player.stats.buildingsLost}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2 mt-2">
                      <span className="text-gray-600">Нанесено урона:</span>
                      <span className="font-bold text-green-600">
                        {player.stats.damageDealt.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Получено урона:</span>
                      <span className="font-bold text-red-600">
                        {player.stats.damageTaken.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2 mt-2">
                      <span className="text-gray-600">Заработано золота:</span>
                      <span className="font-bold text-yellow-600">
                        {player.stats.goldEarned.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Финальное золото:</span>
                      <span className="font-bold">{player.gold}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="text-center">
          <Button onClick={onRestart} variant="primary" size="lg">
            Начать заново
          </Button>
        </div>
      </Card>
    </div>
  );
}
