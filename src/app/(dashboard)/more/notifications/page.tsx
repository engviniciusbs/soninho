"use client";

import { useNotificationSettings } from "@/hooks/settings/useNotificationSettings";
import { DetailHeader } from "@/components/ui/detail-header";
import { NotificationsTab } from "@/components/settings/NotificationsTab";

export default function MoreNotificationsPage() {
  const notifications = useNotificationSettings();

  return (
    <div>
      <DetailHeader title="Notificações" backHref="/more" />
      <NotificationsTab settings={notifications} />
    </div>
  );
}
