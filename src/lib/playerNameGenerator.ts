/**
 * Генератор случайных имен для игроков
 */

const adjectives = [
  "Быстрый", "Сильный", "Храбрый", "Умный", "Ловкий", "Могучий", "Смелый",
  "Быстрый", "Тихий", "Громкий", "Яркий", "Темный", "Светлый", "Острый",
  "Твердый", "Мягкий", "Горячий", "Холодный", "Быстрый", "Медленный",
  "Большой", "Маленький", "Высокий", "Низкий", "Широкий", "Узкий"
];

const nouns = [
  "Волк", "Орел", "Тигр", "Лев", "Медведь", "Змей", "Дракон", "Феникс",
  "Воин", "Рыцарь", "Маг", "Лучник", "Варвар", "Паладин", "Разбойник",
  "Ниндзя", "Самурай", "Викинг", "Пират", "Охотник", "Странник", "Скиталец"
];

const numbers = Array.from({ length: 1000 }, (_, i) => i + 1);

/**
 * Генерирует случайное имя игрока
 */
export function generatePlayerName(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = numbers[Math.floor(Math.random() * numbers.length)];
  
  return `${adjective}${noun}${number}`;
}

