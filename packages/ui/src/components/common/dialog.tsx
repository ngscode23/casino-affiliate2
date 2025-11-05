"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { XIcon } from "lucide-react"

import { cn } from "@shared/lib/utils"

type DialogContextValue = {
  open: boolean
  setOpen: (value: boolean) => void
  mountNode: HTMLElement | null
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialogContext(component: string): DialogContextValue {
  const context = React.useContext(DialogContext)
  if (!context) {
    throw new Error(`${component} must be used within <Dialog> inside the client tree.`)
  }
  return context
}

type DialogProps = {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

export function Dialog({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isControlled = controlledOpen != null
  const open = isControlled ? Boolean(controlledOpen) : uncontrolledOpen

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next)
      }
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange],
  )

  const [mountNode, setMountNode] = React.useState<HTMLElement | null>(null)
  React.useEffect(() => {
    setMountNode(document.body)
  }, [])

  const value = React.useMemo(
    () => ({ open, setOpen, mountNode }),
    [open, setOpen, mountNode],
  )

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
}

type DialogTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
  children?: React.ReactNode
}

function isReactElement<P = any>(child: React.ReactNode): child is React.ReactElement<P> {
  return React.isValidElement<P>(child)
}

export function DialogTrigger({ asChild = false, children, onClick, ...props }: DialogTriggerProps) {
  const { setOpen } = useDialogContext("DialogTrigger")
  const handleClick = React.useCallback(
    (event: React.MouseEvent<any>) => {
      onClick?.(event)
      if (!event.defaultPrevented) {
        setOpen(true)
      }
    },
    [onClick, setOpen],
  )

  if (asChild && isReactElement(children)) {
    const child = children
    const childOnClick = (child.props as { onClick?: (event: React.MouseEvent<any>) => void }).onClick

    return React.cloneElement(child, {
      ...props,
      onClick: (event: React.MouseEvent<any>) => {
        childOnClick?.(event)
        handleClick(event)
      },
    } as Partial<typeof child.props>)
  }

  return (
    <button type="button" {...props} onClick={handleClick}>
      {children}
    </button>
  )
}

type DialogContentProps = React.HTMLAttributes<HTMLDivElement> & {
  showCloseButton?: boolean
}

export function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogContentProps) {
  const { open, setOpen, mountNode } = useDialogContext("DialogContent")
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return undefined
    const previouslyFocused = document.activeElement as HTMLElement | null
    const node = contentRef.current
    if (node) {
      node.focus({ preventScroll: true })
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      previouslyFocused?.focus({ preventScroll: true })
    }
  }, [open, setOpen])

  if (!open || !mountNode) {
    return null
  }

  const overlay = (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/80"
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />
      <div
        {...props}
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-slate-800 bg-slate-900 p-6 text-white shadow-[0_36px_90px_-45px_rgba(15,23,42,0.7)] outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 sm:max-w-lg",
          className,
        )}
      >
        {showCloseButton ? (
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50"
            onClick={() => setOpen(false)}
          >
            <XIcon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        ) : null}
        {children}
      </div>
    </>
  )

  return createPortal(overlay, mountNode)
}

type DialogCloseProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
  children?: React.ReactNode
}

export function DialogClose({ asChild = false, children, onClick, ...props }: DialogCloseProps) {
  const { setOpen } = useDialogContext("DialogClose")
  const handleClick = React.useCallback(
    (event: React.MouseEvent<any>) => {
      onClick?.(event)
      if (!event.defaultPrevented) {
        setOpen(false)
      }
    },
    [onClick, setOpen],
  )

  if (asChild && isReactElement(children)) {
    const child = children
    const childOnClick = (child.props as { onClick?: (event: React.MouseEvent<any>) => void }).onClick

    return React.cloneElement(child, {
      ...props,
      onClick: (event: React.MouseEvent<any>) => {
        childOnClick?.(event)
        handleClick(event)
      },
    } as Partial<typeof child.props>)
  }

  return (
    <button type="button" {...props} onClick={handleClick}>
      {children}
    </button>
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      data-slot="dialog-title"
      className={cn("text-lg font-semibold leading-none", className)}
      {...props}
    />
  )
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="dialog-description"
      className={cn("text-sm text-[rgb(var(--text-dim))]", className)}
      {...props}
    />
  )
}

export function DialogOverlay() {
  return null
}

export function DialogPortal({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

export { Dialog as default }
