import { NextRequest, NextResponse } from "next/server";
import { createYookassaPayment } from "@/lib/yookassa";

/**
 * POST /api/payments/create - Создание платежа в Яндекс.Кассе
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, description, cardId, returnUrl } = body;

    // Получаем ключи из переменных окружения
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;

    if (!shopId || !secretKey) {
      return NextResponse.json(
        {
          success: false,
          error: "YooKassa credentials not configured",
        },
        { status: 500 }
      );
    }

    // Проверка обязательных полей
    if (!amount || !description || !cardId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: amount, description, cardId",
        },
        { status: 400 }
      );
    }

    // Создаем платеж в Яндекс.Кассе
    const payment = await createYookassaPayment(
      shopId,
      secretKey,
      amount,
      description,
      returnUrl || `${request.nextUrl.origin}/create-card?payment=success`,
      {
        cardId,
      }
    );

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        confirmationUrl: payment.confirmation.confirmation_url,
        status: payment.status,
      },
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error creating payment",
      },
      { status: 500 }
    );
  }
}

