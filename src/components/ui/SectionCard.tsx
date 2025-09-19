import * as React from "react";

type Props = React.PropsWithChildren<{
  title?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}>;

export default function SectionCard({ title, actions, children, className = "", contentClassName = "" }: Props) {
  return (
    <section
      className={[
        "rounded-2xl bg-card border border-border",
        "p-6",
        className,
      ].join(" ")}
    >
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="text-2xl font-semibold tracking-tight">{title}</h2> : <div />}
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      )}
      <div className={["grid gap-4", contentClassName].join(" ")}>{children}</div>
    </section>
  );
}
