# Интеграция с Яндекс.Кассой (ЮKassa)

Этот проект поддерживает интеграцию с Яндекс.Кассой для обработки реальных платежей.

## Настройка

### 1. Регистрация в Яндекс.Кассе

1. Зарегистрируйтесь на [yookassa.ru](https://yookassa.ru)
2. Создайте магазин в личном кабинете
3. Получите идентификатор магазина (Shop ID) и секретный ключ (Secret Key)

### 2. Настройка переменных окружения

Создайте файл `.env.local` в корне проекта и добавьте следующие переменные:

```env
# Яндекс.Касса (ЮKassa) настройки
YOOKASSA_SHOP_ID=your_shop_id_here
YOOKASSA_SECRET_KEY=your_secret_key_here

# Использовать ли Яндекс.Кассу для оплаты (true/false)
# Если false, будет использоваться имитация оплаты
NEXT_PUBLIC_USE_YOOKASSA=true

# URL сайта для webhook'ов
SITE_URL=https://yourdomain.com
```

### 3. Настройка Webhook

В личном кабинете Яндекс.Кассы настройте webhook URL:
- URL: `https://yourdomain.com/api/payments/webhook`
- События: `payment.succeeded`

### 4. Тестовый режим

Для тестирования используйте тестовые данные:
- Shop ID: можно получить в тестовом магазине
- Secret Key: можно получить в тестовом магазине
- Тестовые карты для оплаты:
  - Успешная оплата: `5555 5555 5555 4444`, любой CVV, любая дата в будущем
  - Отклоненная карта: `5555 5555 5555 4477`

## Как это работает

1. Пользователь заполняет форму визитки
2. После сохранения создается платеж в Яндекс.Кассе через API `/api/payments/create`
3. Пользователь перенаправляется на страницу оплаты Яндекс.Кассы
4. После успешной оплаты Яндекс.Касса отправляет webhook на `/api/payments/webhook`
5. Webhook активирует визитку
6. Пользователь возвращается на сайт и видит успешную страницу с ссылкой на визитку

## API Endpoints

### POST /api/payments/create
Создает платеж в Яндекс.Кассе.

**Request:**
```json
{
  "amount": 299,
  "description": "Оплата онлайн визитки",
  "cardId": "card_id_here",
  "returnUrl": "https://yourdomain.com/create-card?payment=success&cardId=card_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "payment_id",
    "confirmationUrl": "https://yoomoney.ru/checkout/payments/v2/contract?orderId=...",
    "status": "pending"
  }
}
```

### POST /api/payments/webhook
Webhook от Яндекс.Кассы для уведомлений о статусе платежа.

### GET /api/payments/status/[paymentId]
Получение статуса платежа.

## Безопасность

⚠️ **Важно**: В продакшене необходимо реализовать проверку подписи webhook'ов от Яндекс.Кассы.

Текущая реализация использует упрощенную проверку. Для продакшена добавьте проверку HMAC-SHA256 подписи в функции `validateYookassaWebhook` в файле `src/lib/yookassa.ts`.

## Дополнительная информация

- [Документация Яндекс.Кассы](https://yookassa.ru/developers/api)
- [API Reference](https://yookassa.ru/developers/api#create_payment)

