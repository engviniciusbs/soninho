"use client";

import { toast } from "sonner";
import type { NotificationSettings } from "@/hooks/settings/useNotificationSettings";
import { PushNotificationsCard } from "@/components/settings/PushNotificationsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

/**
 * Mais › Notificações. The settings object comes from the page, which owns
 * the loaded prefs and the in-flight flags.
 */
export function NotificationsTab({ settings }: { settings: NotificationSettings }) {
  return (
    <div className="flex flex-col gap-3.5">
      <PushNotificationsCard settings={settings} />
      <WeeklyEmailCard settings={settings} />
    </div>
  );
}

function WeeklyEmailCard({ settings }: { settings: NotificationSettings }) {
  const { prefs, save, busy, track } = settings;
  const enabled = prefs.weeklyEmailEnabled;
  const saving = busy.savingWeekly;

  async function handleToggle(next: boolean) {
    await track("savingWeekly", async () => {
      if (await save({ weeklyEmailEnabled: next })) {
        toast.success(next ? "Relatório semanal ativado!" : "Relatório semanal desativado");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatório semanal por e-mail</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-base font-bold text-sn-tx">{enabled ? "Ativado" : "Desativado"}</p>
            <p className="text-base text-sn-mu">
              Receba toda segunda-feira um resumo do sono da semana: total por dia, média de
              soneca, maior trecho noturno e aderência à meta.
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={saving}
            aria-label="Relatório semanal por e-mail"
          />
        </div>
      </CardContent>
    </Card>
  );
}
