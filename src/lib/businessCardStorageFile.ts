/**
 * Файловое хранилище визиток (для разработки)
 * Использует JSON файл для сохранения данных между перезагрузками
 */
import { BusinessCard } from "@/types/businessCard";
import fs from "fs/promises";
import path from "path";

const STORAGE_FILE = path.join(process.cwd(), "data", "businessCards.json");

/**
 * Обеспечиваем существование директории и файла
 */
async function ensureStorageFile() {
  const dir = path.dirname(STORAGE_FILE);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // Директория уже существует
  }
  
  try {
    await fs.access(STORAGE_FILE);
  } catch {
    // Файл не существует, создаем пустой
    await fs.writeFile(STORAGE_FILE, JSON.stringify({}, null, 2));
  }
}

/**
 * Загрузка данных из файла
 */
async function loadStorage(): Promise<Map<string, BusinessCard>> {
  await ensureStorageFile();
  try {
    const data = await fs.readFile(STORAGE_FILE, "utf-8");
    const json = JSON.parse(data);
    return new Map(Object.entries(json));
  } catch (error) {
    console.error("[businessCardStorageFile] Error loading storage:", error);
    return new Map();
  }
}

/**
 * Сохранение данных в файл
 */
async function saveStorage(storage: Map<string, BusinessCard>) {
  await ensureStorageFile();
  const obj = Object.fromEntries(storage);
  await fs.writeFile(STORAGE_FILE, JSON.stringify(obj, null, 2));
}

/**
 * Генерация уникального ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Генерация уникального URL для sharing (используем ID визитки)
 */
function generateShareUrl(id: string): string {
  return `/card/${id}`;
}

/**
 * Сохранение визитки
 */
export async function saveBusinessCard(
  data: Omit<BusinessCard, "id" | "createdAt" | "updatedAt" | "shareUrl" | "isActive">
): Promise<BusinessCard> {
  const storage = await loadStorage();
  const id = generateId();
  const shareUrl = generateShareUrl(id);
  const now = new Date().toISOString();

  const businessCard: BusinessCard = {
    ...data,
    id,
    shareUrl,
    createdAt: now,
    updatedAt: now,
    isActive: false, // По умолчанию неактивна до оплаты
  };

  storage.set(id, businessCard);
  await saveStorage(storage);
  console.log(`[businessCardStorageFile] Card saved with id: "${id}", shareUrl: "${shareUrl}", total cards: ${storage.size}`);
  return businessCard;
}

/**
 * Активация визитки (после оплаты)
 */
export async function activateBusinessCard(id: string): Promise<BusinessCard | null> {
  const storage = await loadStorage();
  const card = storage.get(id);
  if (!card) {
    console.log(`[businessCardStorageFile] Cannot activate card "${id}" - not found`);
    return null;
  }

  const updatedCard: BusinessCard = {
    ...card,
    isActive: true,
    updatedAt: new Date().toISOString(),
  };

  storage.set(id, updatedCard);
  await saveStorage(storage);
  console.log(`[businessCardStorageFile] Card "${id}" activated successfully`);
  return updatedCard;
}

/**
 * Получение визитки по ID
 */
export async function getBusinessCard(id: string): Promise<BusinessCard | null> {
  const storage = await loadStorage();
  const card = storage.get(id) || null;
  if (!card) {
    console.log(`[businessCardStorageFile] Card with id "${id}" not found. Storage size: ${storage.size}`);
  } else {
    console.log(`[businessCardStorageFile] Card "${id}" found. isActive: ${card.isActive}`);
  }
  return card;
}

/**
 * Получить все ID визиток (для отладки)
 */
export function getAllCardIds(): string[] {
  // Синхронная версия для отладки (может быть неточной)
  return [];
}

/**
 * Получение визитки по shareUrl
 */
export async function getBusinessCardByShareUrl(shareUrl: string): Promise<BusinessCard | null> {
  const storage = await loadStorage();
  // shareUrl имеет формат /card/[id], нужно извлечь id
  const id = shareUrl.replace("/card/", "");
  const card = storage.get(id);
  if (card && card.isActive) {
    return card;
  }
  return null;
}

/**
 * Обновление визитки
 */
export async function updateBusinessCard(
  id: string,
  data: Partial<Omit<BusinessCard, "id" | "createdAt" | "shareUrl">>
): Promise<BusinessCard | null> {
  const storage = await loadStorage();
  const card = storage.get(id);
  if (!card) return null;

  const updatedCard: BusinessCard = {
    ...card,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  storage.set(id, updatedCard);
  await saveStorage(storage);
  return updatedCard;
}





