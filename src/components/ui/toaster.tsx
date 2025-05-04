
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
import { Check } from "lucide-react" // Import Check icon

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        // Check specific variants for custom layouts
        const isSuccessVariant = variant === 'success';
        const isConfirmationVariant = variant === 'confirmation';

        return (
          <Toast key={id} variant={variant} {...props}>
            {isSuccessVariant ? (
              // Custom structure for success (bookmark) variant
              <div className="flex flex-col w-full">
                {/* Orange Header */}
                <div className="bg-accent text-accent-foreground p-3 rounded-t-md relative flex items-center justify-center gap-2">
                  {/* Apply text-base for larger font size */}
                  {title && <ToastTitle className="text-base">{title}</ToastTitle>}
                   {/* Place Close button inside header for success variant */}
                   <ToastClose className="absolute right-1 top-1" />
                </div>
                {/* White Body */}
                <div className="bg-background text-foreground p-4 pt-3 grid gap-1 text-center rounded-b-md">
                  {description && <ToastDescription>{description}</ToastDescription>}
                   {/* Action button remains in the body */}
                   {action}
                </div>
              </div>
            ) : isConfirmationVariant ? (
                 // Custom structure for confirmation (copied) variant
                 <div className="flex flex-col w-full">
                    {/* Green Header */}
                    <div className="bg-secondary text-secondary-foreground p-3 rounded-t-md relative flex items-center justify-center gap-2">
                      {/* Check icon added here */}
                      {title && (
                        <ToastTitle className="flex items-center gap-1.5">
                           <Check className="h-4 w-4" aria-hidden="true" />
                           {title}
                        </ToastTitle>
                      )}
                      {/* Place Close button inside header for confirmation variant */}
                      <ToastClose className="absolute right-1 top-1" />
                    </div>
                    {/* White Body */}
                    <div className="bg-background text-foreground p-4 pt-3 grid gap-1 text-center rounded-b-md">
                       {description && <ToastDescription>{description}</ToastDescription>}
                       {/* Action button remains in the body (if any) */}
                       {action}
                    </div>
                 </div>
            ) : (
              // Default structure for other variants (default, destructive)
              <div className="grid gap-1 p-6 pr-8"> {/* Apply default padding here */}
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
                {action && <div className="mt-2">{action}</div>} {/* Optionally add margin to action */}
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
