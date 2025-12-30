import { NextRequest, NextResponse } from "next/server";
import { activateBusinessCard, getAllCardIds } from "@/lib/businessCardStorage";

/**
 * POST /api/cards/[id]/activate - Активация визитки после оплаты
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const cardId = params.id;
    
    console.log(`[API /api/cards/[id]/activate] Attempting to activate card with id: "${cardId}"`);
    const card = await activateBusinessCard(cardId);

    if (!card) {
      const allIds = await getAllCardIds();
      console.error(`[API /api/cards/[id]/activate] Card "${cardId}" not found for activation`);
      console.error(`[API /api/cards/[id]/activate] Available card IDs: ${allIds.length > 0 ? allIds.join(", ") : "none"}`);
      return NextResponse.json(
        {
          success: false,
          error: "Визитка не найдена",
          cardId: cardId, // Добавляем ID в ответ для отладки
          availableIds: allIds, // Показываем доступные ID (для отладки)
          hint: "Проверьте, что визитка была создана и данные сохранены в файл",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      card,
    });
  } catch (error) {
    console.error("Error activating card:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Ошибка при активации визитки",
      },
      { status: 500 }
    );
  }
}

