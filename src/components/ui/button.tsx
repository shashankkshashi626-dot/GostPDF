import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'active'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:opacity-50 disabled:pointer-events-none cursor-pointer active:scale-[0.98]",
          // Variants
          variant === 'default' && "bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-sm",
          variant === 'destructive' && "bg-red-600 text-zinc-50 hover:bg-red-500 shadow-sm",
          variant === 'outline' && "border border-zinc-200 bg-transparent hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-900 dark:hover:text-zinc-50",
          variant === 'secondary' && "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-50 dark:hover:bg-zinc-700/80 border border-transparent dark:border-zinc-800",
          variant === 'ghost' && "hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-50",
          variant === 'link' && "text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50",
          variant === 'active' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/10 font-semibold border border-emerald-500/20",
          // Sizes
          size === 'default' && "h-10 px-4 py-2",
          size === 'sm' && "h-8 px-3 rounded-md text-xs",
          size === 'lg' && "h-12 px-8 rounded-lg",
          size === 'icon' && "h-9 w-9",
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
