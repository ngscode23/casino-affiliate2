# Smoke‑тесты платежей и вебхука (Stripe)

Этот документ помогает быстро проверить идемпотентность `/api/payments/create` и обработку вебхуков `/api/payments/webhook`.

## Подготовка

- Заполните переменные окружения в `apps/web-next/.env.local` (или через хостинг):
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
  - Для локальной отладки трекинга можно временно включить `TRACK_DEBUG=1` (в проде — `0`).

- Убедитесь, что применены миграции из `apps/web-next/supabase/migrations/`:
  - `20251010_processed_events.sql`
  - `20251010_webhook_mismatch.sql`
  - `20251010_orders_payment_intent_unique.sql`

## Идемпотентность `/api/payments/create`

1. Подготовьте заказ в БД Supabase:
   - `orders.status` = `pending` (или `failed`),
   - ненулевая сумма: либо `orders.amount_cents > 0`, либо корректные значения в `order_v2.amount_total` / `order_items`.

2. Выполните POST на `/api/payments/create` c `order_id`.
   - Ожидаемо: `{ ok: true, client_secret }`.

3. Повторите тот же запрос:
   - Ожидаемо: повторно вернётся тот же `client_secret` (если Intent не `succeeded`).
   - Если Intent уже `succeeded` — 409 `already_paid`.
   - Если кто‑то сменил сумму/валюту заказа — 409 `amount_mismatch`.

## Вебхук `/api/payments/webhook`

1. Настройте Stripe CLI для локальной проверки:

```bash
stripe listen --forward-to http://localhost:3000/api/payments/webhook \
  --events payment_intent.succeeded,payment_intent.payment_failed
```

2. После создания Intent выполните:

```bash
stripe trigger payment_intent.succeeded
```

3. Проверьте в БД:
   - `processed_events`: есть запись с `event_id`.
   - `stripe_webhooks`: заполнились `expected_amount_cents`, `expected_currency`,
     поле `mismatch_reason` пустое для корректных платежей.
   - `orders`: статус обновился `pending/failed` → `paid`, проставлены `paid_at`, `payment_intent_id`, `amount_cents`, `currency`.

4. Повторная доставка того же события (replay) — игнорируется (возврат 200 + запись уже в `processed_events`).

## Диагностика трекинга (опционально)

При `TRACK_DEBUG=1` запросы к `/api/track/click` и `/api/track/impression` при ошибке возвращают заголовок `x-track-debug` с кодом/сообщением последней попытки RPC, а в консоль летят `console.warn`.

