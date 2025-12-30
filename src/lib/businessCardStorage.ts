/**
 * Хранилище визиток
 * Использует файловое хранилище для разработки (данные сохраняются между перезагрузками)
 * В продакшене заменить на БД
 */
import * as fileStorage from "./businessCardStorageFile";

// Экспортируем все функции из файлового хранилища
export const saveBusinessCard = fileStorage.saveBusinessCard;
export const activateBusinessCard = fileStorage.activateBusinessCard;
export const getBusinessCard = fileStorage.getBusinessCard;
export const getBusinessCardByShareUrl = fileStorage.getBusinessCardByShareUrl;
export const updateBusinessCard = fileStorage.updateBusinessCard;
export const getAllCardIds = fileStorage.getAllCardIds;
