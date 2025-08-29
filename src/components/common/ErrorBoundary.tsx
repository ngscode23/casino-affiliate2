import React from "react";

type State = { hasError: boolean; err?: unknown };

export default class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ReactNode }>,
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: unknown): State {
    return { hasError: true, err };
  }

  componentDidCatch(error: unknown, info: unknown) {

    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-6 text-red-400">
          Что-то пошло не так. Обнови страницу. Если повторяется — проверь консоль.
        </div>
      );
    }
    return this.props.children;
  }
}