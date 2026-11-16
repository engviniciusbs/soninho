"use client";

import { Mail } from "lucide-react";
import { toast } from "sonner";
import type { NotificationSettings } from "@/hooks/settings/useNotificationSettings";
import { PushNotificationsCard } from "@/components/settings/PushNotificationsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * "Notificações" tab. The settings object comes from the page so edits and the
 * loaded prefs survive switching tabs (inactive panels unmount).
 */
export function NotificationsTab({ settings }: { settings: NotificationSettings }) {
  return (
    <>
      <PushNotificationsCard settings={settings} />
      <WeeklyEmailCard settings={settings} />
    </>
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
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Relatório semanal por e-mail
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5 pr-4">
            <p className="text-sm font-medium">{enabled ? "Ativado" : "Desativado"}</p>
            <p className="text-xs text-muted-foreground">
              Receba toda segunda-feira um resumo do sono da semana: total por dia, média de
              soneca, maior trecho noturno e aderência à meta.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Relatório semanal por e-mail"
            disabled={saving}
            onClick={() => handleToggle(!enabled)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
              enabled ? "bg-primary" : "bg-secondary"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
