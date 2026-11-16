"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUserProfile } from "@/components/providers/UserProfileProvider";
import { isNannyAllowed } from "@/components/layout/nannyAccess";

export function NannyRouteGuard({ children }: { children: React.ReactNode }) {
  const { isNannyMode, isLoading } = useUserProfile();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !isNannyMode) return;
    if (!isNannyAllowed(pathname)) {
      router.replace("/app");
    }
  }, [isNannyMode, isLoading, pathname, router]);

  return <>{children}</>;
}
