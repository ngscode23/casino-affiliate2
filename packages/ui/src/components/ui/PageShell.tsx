import * as React from "react";

type Props = React.PropsWithChildren<{ className?: string }>

export function PageShell({ children, className = "" }: Props) {
  return (
    <main className={["w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-12", className].join(" ")}>{children}</main>
  );
}

export default PageShell;

