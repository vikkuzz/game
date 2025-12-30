import { NextRequest, NextResponse } from "next/server";
import { getYookassaPaymentStatus } from "@/lib/yookassa";

/**
 * GET /api/payments/status/[paymentId] - Получение статуса платежа
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ paymentId: string }> }
) {
  try {
    const params = await props.params;
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

    const payment = await getYookassaPaymentStatus(shopId, secretKey, params.paymentId);

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        paid: payment.paid,
        metadata: payment.metadata,
      },
    });
  } catch (error) {
    console.error("Error getting payment status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error getting payment status",
      },
      { status: 500 }
    );
  }
}

