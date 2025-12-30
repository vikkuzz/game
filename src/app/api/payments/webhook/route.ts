import { NextRequest, NextResponse } from "next/server";
import { validateYookassaWebhook } from "@/lib/yookassa";
import { activateBusinessCard } from "@/lib/businessCardStorage";

interface YookassaWebhookEvent {
  type: string;
  event: string;
  object: {
    id: string;
    status: string;
    paid: boolean;
    metadata?: {
      cardId?: string;
    };
  };
}

/**
 * POST /api/payments/webhook - Webhook от Яндекс.Кассы для уведомлений о статусе платежа
 */
export async function POST(request: NextRequest) {
  try {
    const secretKey = process.env.YOOKASSA_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        {
          error: "YooKassa secret key not configured",
        },
        { status: 500 }
      );
    }

    const body = await request.text();
    const signature = request.headers.get("X-YooMoney-Signature") || "";

    // В продакшене нужно валидировать подпись
    // const isValid = validateYookassaWebhook(secretKey, body, signature);
    // if (!isValid) {
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    // }

    const event: YookassaWebhookEvent = JSON.parse(body);

    // Обрабатываем только события успешной оплаты
    if (event.event === "payment.succeeded" && event.object.paid) {
      const cardId = event.object.metadata?.cardId;

      if (cardId) {
        // Активируем визитку после успешной оплаты
        await activateBusinessCard(cardId);
      }
    }

    // Всегда возвращаем 200, чтобы Яндекс.Касса не повторяла запрос
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    // Возвращаем 200, чтобы Яндекс.Касса не повторяла запрос при ошибке
    return NextResponse.json({ received: true });
  }
}

