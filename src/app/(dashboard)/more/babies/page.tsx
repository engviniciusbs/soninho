"use client";

import { DetailHeader } from "@/components/ui/detail-header";
import { BabiesSettings } from "@/components/settings/BabiesSettings";

export default function MoreBabiesPage() {
  return (
    <div>
      <DetailHeader title="Bebês" backHref="/more" />
      <BabiesSettings />
    </div>
  );
}
