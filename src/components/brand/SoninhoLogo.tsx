"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { SoninhoLogoMark } from "./SoninhoLogoMark";

type SoninhoLogoProps = {
  markSize?: number;
  className?: string;
  textClassName?: string;
  /** Wrap mark + word in a link (e.g. to /app) */
  href?: string;
};

export function SoninhoLogo({
  markSize = 36,
  className,
  textClassName,
  href,
}: SoninhoLogoProps) {
  const inner = (
    <>
      <SoninhoLogoMark size={markSize} />
      <span
        className={cn(
          "font-display font-semibold tracking-tight text-foreground",
          textClassName ?? "text-lg"
        )}
      >
        Soninho
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className
        )}
      >
        {inner}
      </Link>
    );
  }

  return <div className={cn("flex items-center gap-2.5", className)}>{inner}</div>;
}
