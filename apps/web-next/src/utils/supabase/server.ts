/**
 * Лёгкий shim для тестов / dev: экспортирует createClient.
 * Тесты обычно мокают эту функцию (vi.mock), поэтому здесь достаточно
 * минимальной реализации для корректного импорта и типизации.
 *
 * При необходимости заменить на реальную инициализацию Supabase в проде.
 */

export type SupabaseInsertResult = Promise<{ error: null | Error }>;

export type SupabaseFrom = (table: string) => {
	// упрощённый интерфейс: только insert используется в тестах
	insert: (rows: any) => SupabaseInsertResult;
};

export const createClient = async (): Promise<{ from: SupabaseFrom }> => {
	const from: SupabaseFrom = (table: string) => {
		return {
			insert: async (_rows: any) => {
				// По умолчанию успешный результат; тесты могут мокать и менять поведение.
				return { error: null };
			},
		};
	};

	return { from };
};
