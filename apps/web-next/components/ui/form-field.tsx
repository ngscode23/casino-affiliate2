"use client";

import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import cn from "@shared/lib/cn";

type FormFieldProps = {
  id: string;
  label: string;
  children: ReactElement<any, any>;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
};

function mergeDescribedBy(existing: string | undefined, extras: string[]): string | undefined {
  const parts = (existing ?? "")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  for (const extra of extras) {
    if (!parts.includes(extra)) {
      parts.push(extra);
    }
  }
  return parts.length ? parts.join(" ") : undefined;
}

export function FormField({
  id,
  label,
  children,
  description,
  error,
  required,
  className,
}: FormFieldProps) {
  const helperId = description ? `${id}-desc` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = mergeDescribedBy(
    isValidElement(children) ? (children.props as any)["aria-describedby"] : undefined,
    [helperId, errorId].filter(Boolean) as string[],
  );

  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<any>, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })
    : children;

  return (
    <div className={cn("flex flex-col gap-1.5 text-sm", className)}>
      <label htmlFor={id} className="font-medium text-neutral-700 dark:text-neutral-200">
        <span>{label}</span>
        {required ? <span className="ml-1 text-rose-500" aria-hidden="true">*</span> : null}
      </label>
      {description ? (
        <p id={helperId} className="text-xs text-neutral-500 dark:text-neutral-400">
          {description}
        </p>
      ) : null}
      {isValidElement(control)
        ? cloneElement(control as ReactElement<any>, {
            id,
            "aria-describedby": describedBy,
            "aria-invalid": error ? true : undefined,
          })
        : control}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-rose-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default FormField;
