"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { IconAlert, IconCheck, IconInfo, IconX } from "@/components/brand/icons"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <IconCheck size={16} className="text-sn-ok" />,
        info: <IconInfo size={16} className="text-sn-pr" />,
        warning: <IconAlert size={16} className="text-sn-warn" />,
        error: <IconX size={16} className="text-sn-danger" />,
        loading: (
          <span
            aria-hidden="true"
            className="block size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
          />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--sn-s1)",
          "--normal-text": "var(--sn-tx)",
          "--normal-border": "var(--sn-bd)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
