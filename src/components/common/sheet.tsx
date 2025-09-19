// src/components/common/sheet.tsx
import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { X } from "lucide-react";
import { cn } from "@/lib/cn"; // важно: именно из /lib/cn

type Side = "top" | "right" | "bottom" | "left";

export const Sheet        = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose   = Dialog.Close;
export const SheetPortal  = Dialog.Portal;

export const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof Dialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(function SheetOverlay({ className, ...props }, ref) {
  return (
    <Dialog.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  );
});

type SheetContentProps = React.ComponentPropsWithoutRef<typeof Dialog.Content> & {
  side?: Side;
  /** Заголовок для скринридера, если aria-label не передан */
  hiddenTitle?: string;
};

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  SheetContentProps
>(function SheetContent(
  { className, children, side = "right", hiddenTitle = "Navigation panel", ...props },
  ref
) {
  const hasAriaLabel = !!(props as any)["aria-label"];

  return (
    <SheetPortal>
      <SheetOverlay />
      <Dialog.Content
        ref={ref}
        // снимаем auto-ARIA и управляем сами
        aria-describedby={undefined}
        aria-labelledby={undefined}
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-card text-[var(--text)] shadow-xl transition ease-in-out",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:duration-300 data-[state=open]:duration-500",
          side === "right"  && "inset-y-0 right-0 h-full w-3/4 border-l border-border shadow-xl sm:max-w-sm data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          side === "left"   && "inset-y-0 left-0  h-full w-3/4 border-r border-border shadow-xl sm:max-w-sm data-[state=closed]:slide-out-to-left  data-[state=open]:slide-in-from-left",
          side === "top"    && "inset-x-0 top-0 h-auto border-b border-border shadow-lg data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
          side === "bottom" && "inset-x-0 bottom-0 h-auto border-t border-border shadow-lg data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          className
        )}
        {...props}
      >
        {/* Если не задан aria-label — добавим скрытый Title, чтобы Radix не ругался */}
        {!hasAriaLabel && (
          <VisuallyHidden asChild>
            <Dialog.Title>{hiddenTitle}</Dialog.Title>
          </VisuallyHidden>
        )}

        {children}

        {/* Кнопка закрытия с единым фокус-стилем */}
        <Dialog.Close
          className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-full border border-border bg-white text-muted shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent-20)] dark:border-white/10 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/20"
          aria-label="Close"
        >
          <X className="size-4" aria-hidden="true" />
        </Dialog.Close>
      </Dialog.Content>
    </SheetPortal>
  );
});

export function SheetHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-1.5 p-4", className)} {...props} />
  );
}

export function SheetFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
  );
}

export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof Dialog.Title>,
  React.ComponentPropsWithoutRef<typeof Dialog.Title>
>(function SheetTitle({ className, ...props }, ref) {
  return (
    <Dialog.Title
      ref={ref}
      className={cn("text-base font-semibold", className)}
      {...props}
    />
  );
});

export const SheetDescription = React.forwardRef<
  React.ElementRef<typeof Dialog.Description>,
  React.ComponentPropsWithoutRef<typeof Dialog.Description>
>(function SheetDescription({ className, ...props }, ref) {
  return (
    <Dialog.Description
      ref={ref}
      className={cn("text-sm text-[var(--text-dim)]", className)}
      {...props}
    />
  );
});


