import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: unknown) { console.error("[ErrorBoundary]", err); }
  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="m-4 rounded-xl border border-white/10 p-6 bg-[var(--bg-1)]">
          <div className="text-lg font-semibold mb-2">Something went wrong</div>
          <p className="text-[var(--text-dim)]">Try refreshing the page.</p>
        </div>
      );
    }
    return this.props.children;
  }
}




