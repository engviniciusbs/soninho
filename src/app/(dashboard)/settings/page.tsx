"use client";

import { Wrench } from "lucide-react";
import { useNotificationSettings } from "@/hooks/settings/useNotificationSettings";
import { GeneralTab } from "@/components/settings/GeneralTab";
import { NotificationsTab } from "@/components/settings/NotificationsTab";
import { ToolsTab } from "@/components/settings/ToolsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";

export default function SettingsPage() {
  // Page-level so the loaded prefs/edits survive tab switches; its initial load
  // also resolves the user id the family section needs.
  const notifications = useNotificationSettings();

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <PageHeader title="Configurações" subtitle="Bebês, família, notificações e ferramentas" />

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-xl">
          <TabsTrigger value="general" className="rounded-lg">
            Geral
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg">
            Notificações
          </TabsTrigger>
          <TabsTrigger value="tools" className="rounded-lg">
            <Wrench className="h-3.5 w-3.5" />
            Ferramentas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-4">
          <GeneralTab currentUserId={notifications.userId} />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 mt-4">
          <NotificationsTab settings={notifications} />
        </TabsContent>

        <TabsContent value="tools" className="space-y-6 mt-4">
          <ToolsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
