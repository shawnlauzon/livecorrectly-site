import type React from "react"
import { cn } from "@/lib/utils"

export function Wrap({
  as: Component = "div",
  className,
  children,
  ...props
}: {
  as?: React.ElementType
  className?: string
  children: React.ReactNode
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Component className={cn("mx-auto w-full max-w-[1080px] px-8 max-sm:px-[22px]", className)} {...props}>
      {children}
    </Component>
  )
}
