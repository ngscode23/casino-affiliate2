# Reviews Testing Checklist

Чтобы не забыть про тесты отзывов:

- Запуск `pnpm --filter web-next test` прогоняет все vitest‑кейсы, включая `tests/components/ProductReviews.events.test.tsx`.
- Если нужно отдельно проверить синхронизацию событий, можно вызвать `pnpm --filter web-next vitest run tests/components/ProductReviews.events.test.tsx`.
- Перед мерджем ветки обязательно убедись, что тесты зелёные — они ловят расхождения между карточкой товара и блоком отзывов.

При появлении новых сценариев (например, админский модуль модерации отзывов) дополняй этот список и добавляй соответствующие `*.test.ts(x)` кейсы в `apps/web-next/tests`.
