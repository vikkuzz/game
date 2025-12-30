import React from "react";
import { Section } from "@/components/Section";
import { Heading } from "@/components/Heading";
import { Text } from "@/components/Text";
import { PrizeWheelCard } from "@/components/PrizeWheelCard";

/**
 * Страница с розыгрышем призов - роллинг фонов карточки визитки
 */
export default function PrizeWheelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Section padding="xl">
        <div className="max-w-4xl mx-auto">
          {/* Заголовок страницы */}
          <div className="text-center mb-12">
            <Heading level={1} className="mb-4 text-4xl md:text-5xl">
              🎰 Розыгрыш призов
            </Heading>
            <Text className="text-lg text-gray-600 max-w-2xl mx-auto">
              Нажмите на кнопку, чтобы запустить анимацию роллинга фонов и выиграть приз!
              Карточка визитки будет вращаться между разными цветовыми темами, пока не остановится на выигрышном варианте.
            </Text>
          </div>

          {/* Компонент с розыгрышем */}
          <PrizeWheelCard />

          {/* Описание */}
          <div className="mt-12 max-w-2xl mx-auto">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-md">
              <Heading level={2} className="text-2xl mb-4">
                Как это работает?
              </Heading>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>
                    Нажмите кнопку &quot;Запустить розыгрыш!&quot; чтобы начать анимацию
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>
                    Фоны карточки будут быстро прокручиваться в разных цветовых градиентах
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>
                    Анимация постепенно замедлится и остановится на случайном выигрышном призе
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span>
                    Вы увидите свой выигрыш и сможете запустить розыгрыш снова!
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

