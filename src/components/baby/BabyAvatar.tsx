"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface BabyAvatarProps {
  /** URL da foto (Supabase Storage) */
  avatarUrl?: string | null;
  /** Emoji fallback */
  emoji?: string;
  /** Nome do bebê (usado como alt text) */
  name?: string;
  /**
   * sm  = 36px  (TopBar)
   * md  = 48px  (listas)
   * lg  = 80px  (Home hero)
   * xl  = 96px  (Settings form)
   */
  size?: "sm" | "md" | "lg" | "xl";
  /** Exibe botão de câmera ao passar o mouse / tocar (modo edição) */
  editable?: boolean;
  onUploadClick?: () => void;
  /** Estado de carregamento do upload */
  uploading?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { container: "h-9 w-9", emoji: "text-lg", ring: "ring-1", camera: "h-3 w-3" },
  md: { container: "h-12 w-12", emoji: "text-2xl", ring: "ring-2", camera: "h-3.5 w-3.5" },
  lg: { container: "h-20 w-20", emoji: "text-4xl", ring: "ring-2", camera: "h-4 w-4" },
  xl: { container: "h-24 w-24", emoji: "text-5xl", ring: "ring-2", camera: "h-5 w-5" },
};

/** Inner content shared between the button and div variants */
function AvatarContent({
  hasPhoto,
  avatarUrl,
  name,
  emoji,
  size,
  s,
  editable,
  uploading,
}: {
  hasPhoto: boolean;
  avatarUrl?: string | null;
  name: string;
  emoji: string;
  size: "sm" | "md" | "lg" | "xl";
  s: (typeof sizeMap)[keyof typeof sizeMap];
  editable: boolean;
  uploading: boolean;
}) {
  return (
    <>
      {hasPhoto ? (
        <Image
          src={avatarUrl!}
          alt={`Foto de ${name}`}
          fill
          sizes={size === "sm" ? "36px" : size === "md" ? "48px" : size === "lg" ? "80px" : "96px"}
          className="object-cover"
          priority={size === "lg" || size === "xl"}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(129,140,248,0.2) 0%, rgba(196,181,253,0.15) 100%)",
          }}
        >
          <span className={s.emoji} role="img" aria-hidden="true">
            {emoji}
          </span>
        </div>
      )}

      {/* Camera overlay — only in editable mode */}
      {editable && (
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50"
          aria-hidden="true"
        >
          {uploading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Camera className={cn(s.camera, "text-white")} />
          )}
        </motion.div>
      )}
    </>
  );
}

export function BabyAvatar({
  avatarUrl,
  emoji = "🍼",
  name = "Bebê",
  size = "md",
  editable = false,
  onUploadClick,
  uploading = false,
  className,
}: BabyAvatarProps) {
  const s = sizeMap[size];
  const hasPhoto = !!avatarUrl;

  const circleClasses = cn(
    "relative overflow-hidden rounded-full",
    s.container,
    s.ring,
    "ring-offset-2 ring-offset-background",
    hasPhoto ? "ring-white/20" : "ring-primary/30"
  );

  return (
    <div
      className={cn("relative inline-flex shrink-0", className)}
      style={{ touchAction: "manipulation" }}
    >
      {/*
       * Use <button> only when editable=true.
       * When non-editable (e.g. inside a SelectTrigger which is already a <button>),
       * render a plain <div> to avoid the invalid nested <button> HTML error.
       */}
      {editable ? (
        <motion.button
          type="button"
          onClick={onUploadClick}
          aria-label={`Alterar foto de ${name}`}
          className={cn(
            circleClasses,
            "cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring"
          )}
          whileTap={{ scale: 0.95 }}
        >
          <AvatarContent
            hasPhoto={hasPhoto}
            avatarUrl={avatarUrl}
            name={name}
            emoji={emoji}
            size={size}
            s={s}
            editable={editable}
            uploading={uploading}
          />
        </motion.button>
      ) : (
        <div
          className={cn(circleClasses, "cursor-default")}
          aria-label={name}
          role="img"
        >
          <AvatarContent
            hasPhoto={hasPhoto}
            avatarUrl={avatarUrl}
            name={name}
            emoji={emoji}
            size={size}
            s={s}
            editable={false}
            uploading={false}
          />
        </div>
      )}

      {/* Spinning ring while uploading */}
      {uploading && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
