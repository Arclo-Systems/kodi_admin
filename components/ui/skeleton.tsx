import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        // Shimmer sutil (regla §Vida): un brillo que recorre, no solo opacidad.
        "bg-muted relative overflow-hidden rounded-md",
        "before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-foreground/10 before:to-transparent motion-safe:before:animate-shimmer",
        "motion-reduce:animate-pulse",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
