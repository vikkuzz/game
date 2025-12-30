import { NextRequest, NextResponse } from "next/server";
import { getBusinessCardByShareUrl } from "@/lib/businessCardStorage";

/**
 * GET /api/cards/by-url/[shareUrl] - Получение визитки по shareUrl
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ shareUrl: string }> }
) {
  try {
    const params = await props.params;
    const shareUrl = `/${params.shareUrl}`;
    const card = await getBusinessCardByShareUrl(shareUrl);

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
    console.error("Error getting card by URL:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Ошибка при получении визитки",
      },
      { status: 500 }
    );
  }
}

