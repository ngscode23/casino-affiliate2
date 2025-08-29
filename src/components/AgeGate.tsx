type AgeGateProps = {
  onAccept: () => void;
};

export function AgeGate({ onAccept }: AgeGateProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="max-w-md space-y-4 rounded-xl bg-slate-900 p-6 text-center">
        <h2 className="text-xl font-bold">Вам есть 18 лет?</h2>
        <button
          onClick={onAccept}
          className="rounded-lg bg-sky-400 px-4 py-2 font-semibold text-slate-900 hover:brightness-95"
        >
          Да, мне есть 18
        </button>
      </div>
    </div>
  );
}




















