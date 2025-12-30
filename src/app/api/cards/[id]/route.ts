import { NextRequest, NextResponse } from "next/server";
import { getBusinessCard } from "@/lib/businessCardStorage";

/**
 * GET /api/cards/[id] - Получение визитки по ID
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const card = await getBusinessCard(params.id);

    if (!card) {
      return NextResponse.json(
        {
          success: false,
          error: "Визитка не найдена",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      card,
    });
  } catch (error) {
    console.error("Error getting card:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Ошибка при получении визитки",
      },
      { status: 500 }
    );
  }
}

