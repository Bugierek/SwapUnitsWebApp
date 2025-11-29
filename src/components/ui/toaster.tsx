
"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, duration, ...props }) {
        // Treat success/confirmation as green success toasts; destructive stays red; default neutral.
        const isSuccessVariant = variant === 'success' || variant === 'confirmation';
        const effectiveDuration =
          duration ??
          (variant === 'success' || variant === 'confirmation'
            ? 3000
            : variant === 'destructive'
              ? 5000
              : 4000);

        return (
          <Toast key={id} variant={variant} duration={effectiveDuration} {...props}>
            {isSuccessVariant ? (
              // Green success styling with purple-friendly body
              <div className="flex w-full flex-col overflow-hidden rounded-md border border-emerald-500 shadow-lg">
                <div className="relative flex items-center justify-center gap-2 bg-emerald-500 p-3 text-white">
                  {title && <ToastTitle className="text-base text-white">{title}</ToastTitle>}
                  <ToastClose className="absolute right-1 top-1 text-white/80 hover:text-white" />
                </div>
                <div className="bg-card/95 p-4 pt-3 text-center text-foreground">
                  {description && (
                    <ToastDescription className="text-sm text-foreground">
                      {description}
                    </ToastDescription>
                  )}
                  {action && <div className="mt-2">{action}</div>}
                </div>
              </div>
            ) : (
              // Default structure for other variants (default, destructive)
              <div
                className={
                  variant === 'destructive'
                    ? 'grid gap-1 rounded-md border border-red-500 bg-red-50 p-6 pr-8 text-red-900 shadow-lg dark:bg-red-950 dark:text-red-50'
                    : 'grid gap-1 rounded-md border border-border/60 bg-card/95 p-6 pr-8 text-foreground shadow-lg'
                }
              >
                {title && (
                  <ToastTitle
                    className={
                      variant === 'destructive'
                        ? 'text-red-900 dark:text-red-50'
                        : 'text-foreground'
                    }
                  >
                    {title}
                  </ToastTitle>
                )}
                {description && (
                  <ToastDescription
                    className={
                      variant === 'destructive'
                        ? 'text-red-900/90 dark:text-red-50/90'
                        : 'text-muted-foreground'
                    }
                  >
                    {description}
                  </ToastDescription>
                )}
                {action && <div className="mt-2">{action}</div>}
                <ToastClose />
              </div>
            )}
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
