"use client";

import Image from "next/image";
import { IconCamera, IconMoon } from "@/components/brand/icons";
import { cn } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "home" | "lg";

interface BabyAvatarProps {
  /** URL da foto (Supabase Storage) */
  avatarUrl?: string | null;
  /** Nome do bebê: rótulo acessível e, sem foto, a inicial */
  name?: string;
  /**
   * sm = 36px (TopBar)
   * md = 48px (listas)
   * home = 56px (topo da home)
   * lg = 80px (formulário do bebê)
   */
  size?: AvatarSize;
  /** Vira um botão que abre o seletor de foto (modo edição) */
  editable?: boolean;
  onUploadClick?: () => void;
  /** Estado de carregamento do upload */
  uploading?: boolean;
  className?: string;
}

const sizeMap: Record<AvatarSize, { box: string; px: string; initial: string; icon: number }> = {
  sm: { box: "size-9", px: "36px", initial: "text-base", icon: 18 },
  md: { box: "size-12", px: "48px", initial: "text-2xl", icon: 22 },
  home: { box: "size-14", px: "56px", initial: "text-[26px]", icon: 26 },
  lg: { box: "size-20", px: "80px", initial: "text-4xl", icon: 34 },
};

/** First letter or digit of the name, uppercased; `null` when there is none. */
function initialOf(name: string): string | null {
  const ch = name.trim().match(/[\p{L}\p{N}]/u)?.[0];
  return ch ? ch.toLocaleUpperCase("pt-BR") : null;
}

/**
 * Baby avatar: the photo when there is one; otherwise the name's initial in
 * Fraunces on lavender; with no name, the line moon on the first surface.
 */
export function BabyAvatar({
  avatarUrl,
  name = "",
  size = "md",
  editable = false,
  onUploadClick,
  uploading = false,
  className,
}: BabyAvatarProps) {
  const s = sizeMap[size];
  const label = name.trim() || "Bebê";
  const initial = initialOf(name);

  const face = avatarUrl ? (
    <Image
      src={avatarUrl}
      alt={label}
      fill
      sizes={s.px}
      className="object-cover"
      priority={size === "lg"}
    />
  ) : initial ? (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-full items-center justify-center bg-sn-pr font-display font-semibold text-sn-pr-ink",
        s.initial,
        "leading-none"
      )}
    >
      {initial}
    </span>
  ) : (
    <span
      aria-hidden="true"
      className="flex size-full items-center justify-center bg-sn-s1 text-sn-pr"
    >
      <IconMoon size={s.icon} />
    </span>
  );

  const circle = cn(
    "relative block shrink-0 overflow-hidden rounded-full",
    s.box,
    !initial || avatarUrl ? "border border-sn-bd" : null
  );

  return (
    <div
      className={cn("relative inline-flex shrink-0", className)}
      style={{ touchAction: "manipulation" }}
    >
      {editable ? (
        <button
          type="button"
          onClick={onUploadClick}
          disabled={uploading}
          aria-label={`Alterar foto de ${label}`}
          className={cn(
            circle,
            "group cursor-pointer transition-transform duration-150 active:scale-95 motion-reduce:transition-none",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {face}
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center rounded-full bg-sn-bg/60 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
          >
            <IconCamera size={20} className="text-sn-tx" />
          </span>
        </button>
      ) : avatarUrl ? (
        <span className={circle}>{face}</span>
      ) : (
        <span className={circle} role="img" aria-label={label}>
          {face}
        </span>
      )}

      {uploading && (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-spin rounded-full border-2 border-sn-pr border-t-transparent motion-reduce:animate-none"
        />
      )}
    </div>
  );
}
