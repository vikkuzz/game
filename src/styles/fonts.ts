import { Inter, Roboto, Open_Sans, Lato, Montserrat } from "next/font/google";

// Определяем доступные шрифты
export const fonts = {
  inter: Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
  }),
  roboto: Roboto({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-roboto",
    weight: ["300", "400", "500", "700"],
  }),
  openSans: Open_Sans({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-open-sans",
    weight: ["300", "400", "600", "700"],
  }),
  lato: Lato({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-lato",
    weight: ["300", "400", "700"],
  }),
  montserrat: Montserrat({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-montserrat",
    weight: ["300", "400", "500", "600", "700"],
  }),
};

// Тип для доступных шрифтов
export type FontFamily = keyof typeof fonts;

// Конфигурация шрифтов для тем
export const fontConfig = {
  default: "inter",
  alternatives: ["roboto", "openSans", "lato", "montserrat"] as FontFamily[],
};

// Функция для получения CSS класса шрифта
export const getFontClassName = (fontFamily: FontFamily) => {
  return fonts[fontFamily].className;
};

// Функция для получения переменной шрифта
export const getFontVariable = (fontFamily: FontFamily) => {
  return fonts[fontFamily].variable;
};
