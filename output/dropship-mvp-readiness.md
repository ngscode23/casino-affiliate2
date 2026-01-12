# Dropshipping MVP — Readiness Audit (по текущему коду + Supabase schema)

Дата аудита: 2026-01-12

## TL;DR (честно)

**Readiness score: 63 / 100** — запуск возможен как “soft launch / MVP”, но есть несколько **P0 рисков** вокруг paid→fulfillment консистентности (OOS/price/mapping) и фоновых задач (cron/processing).

Главный критерий “готово”: *любая оплаченная заявка либо гарантированно уходит в PO, либо гарантированно попадает в понятный manual review с уведомлением и без повторных дублей.*

---

## 1) Readiness score по блокам

| Блок | Статус | Риск | Что сделать (суть) |
|---|---:|---:|---|
| Catalog & Pricing (stock/price/ETA consistency) | 65/100 | Medium | Единый source-of-truth для цены (везде `price_cents`), re-check наличия/цены на этапе `payments/create`, политика для OOS/price changed после order create. |
| Supplier ops (mapping, feed, runs, cron) | 60/100 | Medium | Настроить продовый scheduler для `supplier-feed/cron`, докрутить “remote feed” (api_base_url), ускорить обновления `ecom_products` (batch/rpc вместо loop update). |
| Order lifecycle (order status, PO status, shipment status) | 70/100 | Medium | Явная машина состояний: `orders.status` (“pending/paid/failed/refunded/…”) и `payment_status` + правила переходов; единая точка “paid”. |
| Fulfillment (tracking updates, customer visibility) | 55/100 | Medium/High | Авто-обновление трекинга (cron + provider), customer-facing tracking page/события, “exception/returned” сценарии. |
| Customer comms (emails, templates, retries) | 60/100 | Medium | Outbox уже есть; добавить idempotency/claim-lock для параллельных запусков, шаблоны/HTML, retries/observability, SLA на отправку. |
| Admin tooling (suppliers, SKUs, feed runs, PO, shipments, RMA) | 65/100 | Medium | RMA admin flow до конца (approve/receive/refund), ручной “manual review queue” для PO-ошибок/миссматчей. |
| Security/RLS (что может сломать клиент/админ) | 75/100 | Low/Medium | Убедиться, что cron secret не светится (не `NEXT_PUBLIC_*`), проверить grants на `email_outbox` (RLS выключен), rate-limit на webhook/admin endpoints. |
| Reliability (idempotency, dedupe, error handling, logs) | 55/100 | High | Idempotency webhook/PO items частично закрыто; нужен “job queue” или жёсткий retry/backoff для PO creation; outbox concurrency-safe. |
| SEO/UX (минимум: понятные ошибки, пустые состояния) | 50/100 | Medium | Понятные ошибки на checkout, empty-states, “что дальше” после оплаты, улучшение `/orders/<id>` статуса/трекинга. |

---

## 2) Что осталось сделать (приоритет)

### P0 — блокеры для запуска

1) **CRON_SECRET**
   - На проде **обязательно** длинный случайный секрет (не “123”), только server-side env.
   - Никаких `NEXT_PUBLIC_CRON_SECRET` (секрет не должен попадать в бандл/HTML).
2) **Paid → Fulfillment гарантия**
   - На `payments/create` добавить **re-validation**: все позиции заказа должны быть `is_available=true` и `inventory_status != out_of_stock` + должен существовать mapping в `supplier_skus` (или понятная политика “manual review”).
   - Если re-check не прошёл → не создавать intent, возвращать 409/422 + давать понятную ошибку пользователю.
3) **PO creation reliability**
   - Сейчас PO создаётся из webhook (fire-and-forget). Для продакшена лучше:
     - либо сохранять “job” в таблицу и обрабатывать cron’ом,
     - либо делать retry/queue + строгую запись ошибок в DB (чтобы не терять paid заказы).
4) **Cron scheduling в проде**
   - Настроить scheduler (Vercel Cron / Cloudflare / Supabase scheduled function / любой внешний) для:
     - `/api/admin/supplier-feed/cron`
     - `/api/admin/email-outbox/process`
5) **Refund/RMA базовая политика**
   - Минимум: customer request (RMA “requested”) + admin approve/reject + refund flow (Stripe) + фиксация статуса.

### P1 — нужно в течение 1–2 недель

1) **Tracking updates**
   - Cron, который обновляет `shipments` (по carrier API / webhook) и кладёт `tracking_update` в `email_outbox`.
2) **Outbox concurrency**
   - Добавить claim/locking (например: `status=processing`, `processing_started_at`, `processing_by`) чтобы два параллельных запуска не отправили одно и то же письмо.
3) **Manual review queue**
   - Таблица/вьюха для “заказы требуют внимания”: OOS, missing mapping, amount mismatch, PO failed.
4) **Supplier feed performance**
   - Убрать per-row update `ecom_products` в цикле → заменить на batch update (RPC) или upsert через staging table.

### P2 — хорошо бы, но можно позже

1) HTML email templates + локализация.
2) Customer self-service: cancel (до PO sent), address fix, resend tracking email.
3) SEO: canonical, structured data, 404/empty states, performance budget.

---

## 3) Где остаётся ручная работа (и как снизить)

### Ручное сейчас (нормально для соло-MVP)

- Mapping supplier SKUs → твои SKU (контроль качества).
- Разбор “amount mismatch / manual review” кейсов.
- Ручное выставление tracking/статусов shipment (если нет интеграции carrier).
- RMA/returns вручную (пока объём маленький).

### Что автоматизировать cron’ом (первым делом)

- `supplier-feed/cron` (обновление наличия/цен).
- `email-outbox/process` (рассылка трекинга/уведомлений).
- “PO watchdog”: поиск paid заказов без PO / PO в failed и автоповтор/эскалация.
- “Shipment watchdog”: shipments без `last_event_at` N дней → email/алерт.

### Что оставить ручным на твоём этапе

- Полноценную интеграцию с каждым supplier API (кроме одного “default supplier”).
- Автоматические возвраты/споры/chargeback workflow (оставить как manual SOP).

---

## 4) Проверки/тесты (реальные сценарии)

### Happy path

1) User → cart → `orders-create` → `payments/create` → Stripe succeed webhook → order = paid → PO created → shipment created → tracking update → email_outbox → process → email.

### Edge cases (чеклист)

- **OOS между cart и оплатой**
  - Товар доступен при `orders-create`, но стал `out_of_stock` до `payments/create`.
  - Ожидание: `payments/create` блокирует оплату + объясняет, что товар недоступен.
- **price changed**
  - `ecom_products.price_cents` изменился после `orders-create`.
  - Ожидание: сумма заказа фиксирована (либо политика “reprice + reconfirm”).
- **missing supplier_skus**
  - Заказ оплачен, но для SKU нет mapping в `supplier_skus`.
  - Ожидание: order/PO попадает в manual review + уведомление админу.
- **duplicate webhook**
  - Один и тот же Stripe event приходит дважды.
  - Ожидание: второй раз no-op (dedupe по event id, без дубликатов PO items).
- **shipment exception/returned**
  - shipment.status = exception/returned.
  - Ожидание: письмо клиенту + админская задача (RMA/refund policy).
- **refund/RMA**
  - RMA requested → approve → received → refund.
  - Ожидание: корректные статусы `orders` + `payments` + фиксация в `rma_requests`.

### Какие тесты/фикстуры добавить первыми

1) `payments/create`:
   - Блокирует оплату если товар OOS / mapping отсутствует.
2) `payments/webhook`:
   - Проверка что `orders.status` становится `"paid"` при `payment_intent.succeeded`.
   - Проверка idempotency PO items (2 одинаковых webhook → 1 набор items).
3) `email-outbox/process`:
   - Concurrency test: 2 параллельных запуска → письмо 1 раз.

