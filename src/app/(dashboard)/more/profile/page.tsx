"use client";

import { DetailHeader } from "@/components/ui/detail-header";
import { UserProfileSettings } from "@/components/settings/UserProfileSettings";
import { SignOutButton } from "@/components/settings/SignOutButton";

export default function MoreProfilePage() {
  return (
    <div>
      <DetailHeader title="Perfil e preferências" backHref="/more" />
      <div className="flex flex-col gap-3.5">
        <UserProfileSettings />
        <SignOutButton />
      </div>
    </div>
  );
}
