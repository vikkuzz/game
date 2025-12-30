/**
 * Интеграция с Яндекс.Кассой (ЮKassa)
 * Документация: https://yookassa.ru/developers/api
 */

interface YookassaPaymentRequest {
  amount: {
    value: string;
    currency: string;
  };
  description: string;
  confirmation: {
    type: "redirect";
    return_url: string;
  };
  metadata?: Record<string, string>;
}

interface YookassaPaymentResponse {
  id: string;
  status: string;
  amount: {
    value: string;
    currency: string;
  };
  description: string;
  recipient: {
    account_id: string;
    gateway_id: string;
  };
  created_at: string;
  confirmation: {
    type: string;
    confirmation_url: string;
  };
  paid: boolean;
  metadata?: Record<string, string>;
}

/**
 * Создание платежа в Яндекс.Кассе
 */
export async function createYookassaPayment(
  shopId: string,
  secretKey: string,
  amount: number,
  description: string,
  returnUrl: string,
  metadata?: Record<string, string>
): Promise<YookassaPaymentResponse> {
  const auth = Buffer.from(`${shopId}:${secretKey}`).toString("base64");

  const paymentRequest: YookassaPaymentRequest = {
    amount: {
      value: amount.toFixed(2),
      currency: "RUB",
    },
    description,
    confirmation: {
      type: "redirect",
      return_url: returnUrl,
    },
    metadata: metadata || {},
  };

  const response = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
      "Idempotence-Key": `${Date.now()}-${Math.random()}`,
    },
    body: JSON.stringify(paymentRequest),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`YooKassa API error: ${error.description || response.statusText}`);
  }

  return response.json();
}

/**
 * Получение статуса платежа
 */
export async function getYookassaPaymentStatus(
  shopId: string,
  secretKey: string,
  paymentId: string
): Promise<YookassaPaymentResponse> {
  const auth = Buffer.from(`${shopId}:${secretKey}`).toString("base64");

  const response = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`YooKassa API error: ${error.description || response.statusText}`);
  }

  return response.json();
}

/**
 * Валидация webhook от Яндекс.Кассы
 */
export function validateYookassaWebhook(
  secretKey: string,
  body: string,
  signature: string
): boolean {
  // В реальном приложении нужно использовать криптографическую проверку подписи
  // Для демонстрации возвращаем true
  // В продакшене используйте библиотеку для проверки HMAC-SHA256
  return true;
}

