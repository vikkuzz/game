"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";

interface PrizeWheelCardProps {
  className?: string;
}

// Варианты фонов для розыгрыша
const backgroundThemes = [
  {
    name: "Синий градиент",
    gradient: "from-blue-400 to-blue-600",
    prize: "Скидка 10%",
  },
  {
    name: "Фиолетовый градиент",
    gradient: "from-purple-400 to-purple-600",
    prize: "Скидка 20%",
  },
  {
    name: "Розовый градиент",
    gradient: "from-pink-400 to-pink-600",
    prize: "Бесплатная консультация",
  },
  {
    name: "Оранжевый градиент",
    gradient: "from-orange-400 to-orange-600",
    prize: "Скидка 15%",
  },
  {
    name: "Зеленый градиент",
    gradient: "from-green-400 to-green-600",
    prize: "Подарочный набор",
  },
  {
    name: "Красный градиент",
    gradient: "from-red-400 to-red-600",
    prize: "Скидка 25%",
  },
  {
    name: "Бирюзовый градиент",
    gradient: "from-cyan-400 to-cyan-600",
    prize: "VIP статус",
  },
  {
    name: "Золотой градиент",
    gradient: "from-yellow-400 to-amber-600",
    prize: "Главный приз!",
  },
];

/**
 * Компонент карточки визитки с анимацией роллинга фонов для розыгрыша приза
 */
export function PrizeWheelCard({ className }: PrizeWheelCardProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedPrize, setSelectedPrize] = useState<string | null>(null);
  const [showPrize, setShowPrize] = useState(false);
  const rollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRollingRef = useRef(false);

  // Функция для начала розыгрыша
  const startRoll = () => {
    if (isRollingRef.current) return;

    // Очищаем предыдущий интервал, если он есть
    if (rollIntervalRef.current) {
      clearTimeout(rollIntervalRef.current);
      rollIntervalRef.current = null;
    }

    isRollingRef.current = true;
    setIsRolling(true);
    setShowPrize(false);
    setSelectedPrize(null);

    // Случайно выбираем выигрышный фон
    const targetIndex = Math.floor(Math.random() * backgroundThemes.length);
    const minRolls = 20;
    const maxRolls = 30;
    const totalRolls = Math.floor(Math.random() * (maxRolls - minRolls + 1)) + minRolls;

    let currentRoll = 0;
    let speed = 50; // Начальная скорость (мс)

    const roll = () => {
      if (!isRollingRef.current) return;

      currentRoll++;
      
      // Замедляемся по мере приближения к концу
      if (currentRoll > totalRolls - 8) {
        speed = Math.min(speed * 1.2, 250);
      }

      if (currentRoll >= totalRolls) {
        // Финальная прокрутка к целевому индексу
        const finalRolls = backgroundThemes.length * 2; // Дополнительные обороты
        let finalCount = 0;

        const finalInterval = setInterval(() => {
          if (!isRollingRef.current) {
            clearInterval(finalInterval);
            return;
          }

          setCurrentIndex((prev) => {
            const nextIndex = (prev + 1) % backgroundThemes.length;
            finalCount++;

            if (finalCount >= finalRolls && nextIndex === targetIndex) {
              clearInterval(finalInterval);
              isRollingRef.current = false;
              setIsRolling(false);
              setSelectedPrize(backgroundThemes[targetIndex].prize);
              setTimeout(() => setShowPrize(true), 300);
              rollIntervalRef.current = null;
              return targetIndex;
            }
            return nextIndex;
          });
        }, 150);

        if (rollIntervalRef.current) {
          clearTimeout(rollIntervalRef.current);
        }
        rollIntervalRef.current = finalInterval as unknown as NodeJS.Timeout;
        
        // Делаем последний шаг перед переходом на медленный режим
        setCurrentIndex((prev) => (prev + 1) % backgroundThemes.length);
        return;
      }

      // Продолжаем быструю прокрутку
      setCurrentIndex((prev) => (prev + 1) % backgroundThemes.length);
      rollIntervalRef.current = setTimeout(roll, speed) as unknown as NodeJS.Timeout;
    };

    // Начинаем роллинг
    rollIntervalRef.current = setTimeout(roll, speed) as unknown as NodeJS.Timeout;
  };

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      isRollingRef.current = false;
      if (rollIntervalRef.current) {
        clearTimeout(rollIntervalRef.current);
        clearInterval(rollIntervalRef.current);
      }
    };
  }, []);

  const currentTheme = backgroundThemes[currentIndex];

  return (
    <div className={cn("max-w-md mx-auto", className)}>
      <Card
        className={cn(
          "bg-gradient-to-br transition-all duration-500 ease-out",
          `bg-gradient-to-br ${currentTheme.gradient}`,
          isRolling && "transform scale-105",
          showPrize && "ring-4 ring-yellow-400 ring-opacity-75 shadow-2xl"
        )}
        padding="xl"
        shadow={showPrize ? "xl" : "lg"}
        rounded="xl">
        {/* Контент карточки */}
        <div className="text-center text-white">
          <div className="mb-6">
            <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/50 shadow-lg mx-auto flex items-center justify-center mb-4">
              <svg
                className="w-16 h-16 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
            </div>
          </div>

          <h2 className="text-3xl font-bold mb-2 drop-shadow-lg">
            Розыгрыш призов!
          </h2>

          {!isRolling && !showPrize && (
            <p className="text-white/90 mb-6">
              Нажмите на кнопку, чтобы начать розыгрыш
            </p>
          )}

          {isRolling && (
            <div className="mb-6">
              <p className="text-xl font-semibold mb-2 animate-pulse">
                Крутится...
              </p>
              <div className="flex justify-center">
                <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              </div>
            </div>
          )}

          {showPrize && selectedPrize && (
            <div className="mb-6 animate-bounce">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border-2 border-white/50">
                <p className="text-sm text-white/80 mb-1">Ваш приз:</p>
                <p className="text-2xl font-bold text-yellow-300 drop-shadow-lg">
                  {selectedPrize}
                </p>
              </div>
            </div>
          )}

          {/* Кнопка запуска */}
          <Button
            onClick={startRoll}
            disabled={isRolling}
            className={cn(
              "w-full py-3 text-lg font-semibold transition-all",
              isRolling
                ? "opacity-50 cursor-not-allowed"
                : "hover:scale-105 active:scale-95",
              showPrize && "bg-yellow-500 hover:bg-yellow-600"
            )}
            variant={showPrize ? "primary" : "primary"}>
            {isRolling ? "Крутится..." : showPrize ? "Еще раз!" : "Запустить розыгрыш!"}
          </Button>

          {/* Индикатор текущего фона */}
          {!isRolling && !showPrize && (
            <p className="text-sm text-white/70 mt-4">
              Текущий фон: {currentTheme.name}
            </p>
          )}
        </div>
      </Card>

      {/* Дополнительная информация */}
      {showPrize && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Поздравляем! Вы выиграли: <strong>{selectedPrize}</strong>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Выигрышный фон: {currentTheme.name}
          </p>
        </div>
      )}
    </div>
  );
}

