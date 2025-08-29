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
        "fixed inset-0 z-50 bg-black/50",
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
          "fixed z-50 flex flex-col gap-4 bg-[var(--bg-0)] text-[var(--text)] shadow-lg transition ease-in-out",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:duration-300 data-[state=open]:duration-500",
          side === "right"  && "inset-y-0 right-0 h-full w-3/4 border-l border-white/10 sm:max-w-sm data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          side === "left"   && "inset-y-0 left-0  h-full w-3/4 border-r border-white/10 sm:max-w-sm data-[state=closed]:slide-out-to-left  data-[state=open]:slide-in-from-left",
          side === "top"    && "inset-x-0 top-0 h-auto border-b border-white/10   data-[state=closed]:slide-out-to-top    data-[state=open]:slide-in-from-top",
          side === "bottom" && "inset-x-0 bottom-0 h-auto border-t border-white/10 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
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

        {/* Кнопка закрытия без сияющих колец */}
        <Dialog.Close
          className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-md opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-0"
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


