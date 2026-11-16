import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
 * Soninho button (spec §8.1, mockup `.cta`, `.cta.alt`, `.ghost`).
 * The eight Hallmark states:
 *   default, hover (`hover:`), focus (`focus-visible:` outline, no delay),
 *   active (`active:` 1px press), disabled (`disabled:` / `data-disabled`),
 *   loading (`loading` prop: `aria-busy` + disabled + spinner),
 *   error (`aria-invalid:` danger border), selected (`aria-pressed` / `aria-expanded`).
 * Only transform and opacity animate; colours change instantly.
 */

const PRIMARY =
  "bg-sn-pr text-sn-pr-ink font-extrabold hover:bg-sn-pr/88 aria-expanded:bg-sn-pr/88 aria-pressed:bg-sn-pr/88"
const SECONDARY =
  "border-[1.5px] border-sn-pr bg-transparent text-sn-tx font-extrabold hover:bg-sn-pr/10 aria-expanded:bg-sn-pr/12 aria-pressed:bg-sn-pr/15"
const GHOST =
  "bg-transparent text-sn-pr font-bold hover:bg-sn-pr/10 aria-expanded:bg-sn-pr/10 aria-pressed:bg-sn-pr/15"
const ICON =
  "bg-transparent text-sn-tx font-bold hover:bg-sn-s2 aria-expanded:bg-sn-s2 aria-pressed:bg-sn-s2 aria-pressed:text-sn-pr"
const DESTRUCTIVE =
  "border-[1.5px] border-sn-danger/60 bg-transparent text-sn-danger font-bold hover:bg-sn-danger/10 aria-expanded:bg-sn-danger/10"

/** Old shadcn names, kept so existing call sites keep working. */
const LEGACY = {
  default: PRIMARY,
  outline: SECONDARY,
  link: GHOST,
} as const

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2.5 rounded-full border border-transparent bg-clip-padding font-sans whitespace-nowrap no-underline outline-none select-none transition-[transform,opacity] duration-(--sn-dur-micro) ease-sn-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-55 data-disabled:pointer-events-none data-disabled:opacity-55 aria-busy:cursor-progress aria-invalid:border-sn-danger aria-invalid:text-sn-danger [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        primary: PRIMARY,
        secondary: SECONDARY,
        ghost: GHOST,
        icon: ICON,
        destructive: DESTRUCTIVE,
        ...LEGACY,
      },
      size: {
        // The height of `default` depends on the variant (compoundVariants below).
        default: "",
        xs: "h-9 gap-1.5 px-3 text-sm after:absolute after:-inset-1 [&_svg:not([class*='size-'])]:size-4",
        sm: "h-11 gap-2 px-4 text-[15px] [&_svg:not([class*='size-'])]:size-4",
        md: "h-12 gap-2 px-5 text-base",
        lg: "h-14 px-7 text-lg",
        icon: "size-11 p-0",
        "icon-xs": "size-8 p-0 after:absolute after:-inset-1.5 [&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-9 p-0 after:absolute after:-inset-1 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-12 p-0",
      },
    },
    compoundVariants: [
      {
        variant: ["primary", "secondary", "destructive", "default", "outline"],
        size: "default",
        className: "h-14 px-6 text-lg",
      },
      {
        variant: ["ghost", "link"],
        size: "default",
        className: "h-11 px-3 text-[15px]",
      },
      { variant: "icon", size: "default", className: "size-11 p-0" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /** Busy state: sets `aria-busy`, disables the button and shows a spinner. */
    loading?: boolean
  }

function Button({
  className,
  variant = "primary",
  size = "default",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          data-slot="button-spinner"
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
export type { ButtonProps }
