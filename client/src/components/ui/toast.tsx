import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:top-auto sm:bottom-0 sm:max-w-[420px] sm:gap-2.5 md:max-w-[460px] animate-fade-in-fast",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-4 pr-7 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full backdrop-blur-sm animate-slide-in-right sm:animate-slide-in-bottom",
  {
    variants: {
      variant: {
        default: "border border-border/40 bg-background/90 text-foreground shadow-md",
        destructive:
          "destructive group border-destructive/30 bg-destructive/95 text-destructive-foreground shadow-md",
        success:
          "success group border-success/30 bg-success/95 text-success-foreground shadow-md",
        warning:
          "warning group border-warning/30 bg-warning/95 text-warning-foreground shadow-md",
        info:
          "info group border-info/30 bg-info/95 text-info-foreground shadow-md",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-background/70 px-3 text-sm font-medium shadow-sm ring-offset-background transition-all duration-200 hover:bg-background hover:shadow focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
      "group-[.destructive]:border-destructive/30 group-[.destructive]:bg-destructive/20 group-[.destructive]:text-destructive-foreground group-[.destructive]:hover:bg-destructive/30 group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      "group-[.success]:border-success/30 group-[.success]:bg-success/20 group-[.success]:text-success-foreground group-[.success]:hover:bg-success/30 group-[.success]:hover:text-success-foreground group-[.success]:focus:ring-success",
      "group-[.warning]:border-warning/30 group-[.warning]:bg-warning/20 group-[.warning]:text-warning-foreground group-[.warning]:hover:bg-warning/30 group-[.warning]:hover:text-warning-foreground group-[.warning]:focus:ring-warning",
      "group-[.info]:border-info/30 group-[.info]:bg-info/20 group-[.info]:text-info-foreground group-[.info]:hover:bg-info/30 group-[.info]:hover:text-info-foreground group-[.info]:focus:ring-info",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-full p-1 text-foreground/50 opacity-0 transition-opacity hover:bg-background/20 hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 active:scale-90",
      "group-[.destructive]:text-destructive-foreground/80 group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      "group-[.success]:text-success-foreground/80 group-[.success]:hover:text-success-foreground group-[.success]:focus:ring-success",
      "group-[.warning]:text-warning-foreground/80 group-[.warning]:hover:text-warning-foreground group-[.warning]:focus:ring-warning",
      "group-[.info]:text-info-foreground/80 group-[.info]:hover:text-info-foreground group-[.info]:focus:ring-info",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-base font-semibold leading-none tracking-tight mb-1", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90 leading-relaxed", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
