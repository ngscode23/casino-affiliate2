export default function App() {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="p-6 rounded-xl bg-slate-800/60 border border-slate-700">
        <h1 className="text-3xl font-bold">Tailwind 4 работает</h1>
        <p className="mt-2 text-slate-300">Если фон страницы тёмный — всё ок.</p>
        <button className="mt-4 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white">
          Кнопка проверки
        </button>
      </div>
    </div>
  );
}