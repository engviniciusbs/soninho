"use client";

import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface InsightBadgeProps {
  text: string;
}

export function InsightBadge({ text }: InsightBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className="rounded-xl px-3 py-1.5 gap-1.5 text-xs font-medium bg-primary/10 text-primary border-primary/20"
    >
      <Sparkles className="h-3 w-3" />
      {text}
    </Badge>
  );
}
