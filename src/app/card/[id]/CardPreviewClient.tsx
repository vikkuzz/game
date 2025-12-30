"use client";

import React from "react";
import { BusinessCardPreview } from "@/components/BusinessCardPreview";
import { BusinessCard } from "@/types/businessCard";

interface CardPreviewPageProps {
  card: BusinessCard;
}

/**
 * Клиентский компонент для страницы предпросмотра визитки
 */
export function CardPreviewPage({ card }: CardPreviewPageProps) {
  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      alert("Ссылка скопирована в буфер обмена!");
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      // Fallback для старых браузеров
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        alert("Ссылка скопирована в буфер обмена!");
      } catch (err) {
        console.error("Fallback copy failed:", err);
      }
      document.body.removeChild(textArea);
    }
  };

  return <BusinessCardPreview card={card} onShare={handleShare} />;
}

