"use client";

import { Bell, BellOff, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import type { NotificationSettings } from "@/hooks/settings/useNotificationSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ALERT_OPTIONS = [5, 10, 15, 20];

/** Push subscription toggle plus alert timing, quiet hours and dispatch prefs. */
export function PushNotificationsCard({ settings }: { settings: NotificationSettings }) {
  const { prefs, edit, save, push, busy, track } = settings;
  const { saving, testing } = busy;
  const { status } = push;

  async function handleSave() {
    const { enabled, alertBefore, quietStart, quietEnd } = prefs;
    await track("saving", async () => {
      if (await save({ enabled, alertBefore, quietStart, quietEnd })) {
        toast.success("Preferências de notificação salvas!");
      }
    });
  }

  async function handleTest() {
    await track("testing", async () => {
      try {
        if (await push.test()) toast.success("Notificação de teste enviada!");
        else toast.error("Erro ao enviar notificação de teste");
      } catch {
        toast.error("Erro de rede");
      }
    });
  }

  async function handleToggle() {
    if (status.isSubscribed) {
      await push.disable();
      toast.info("Notificações desativadas");
    } else {
      const ok = await push.enable();
      if (ok) toast.success("Notificações ativadas!");
      else toast.error("Não foi possível ativar notificações");
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Notificações Push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status.isSupported ? (
          <p className="text-sm text-muted-foreground">
            Seu navegador não suporta notificações push.
          </p>
        ) : (
          <>
            {/* Permission / subscription status */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  {status.isSubscribed ? "Notificações ativadas" : "Notificações desativadas"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {status.permission === "denied"
                    ? "Bloqueado pelo navegador. Altere nas configurações do site."
                    : status.isSubscribed
                      ? "Você receberá alertas sobre sonecas e janelas de sono."
                      : "Ative para receber alertas inteligentes."}
                </p>
              </div>
              <Button
                variant={status.isSubscribed ? "outline" : "default"}
                size="sm"
                className="rounded-xl gap-2"
                disabled={status.isLoading || status.permission === "denied"}
                onClick={handleToggle}
              >
                {status.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : status.isSubscribed ? (
                  <BellOff className="h-4 w-4" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                {status.isSubscribed ? "Desativar" : "Ativar"}
              </Button>
            </div>

            {status.isSubscribed && (
              <>
                {/* Alert timing */}
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <label className="text-xs text-muted-foreground">
                    Alertar antes da soneca (minutos)
                  </label>
                  <div className="flex gap-2">
                    {ALERT_OPTIONS.map((min) => (
                      <button
                        key={min}
                        type="button"
                        onClick={() => edit({ alertBefore: min })}
                        className={`flex h-9 w-12 items-center justify-center rounded-lg text-sm font-medium transition-all ${
                          prefs.alertBefore === min
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary hover:bg-secondary/80"
                        }`}
                      >
                        {min}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quiet hours */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Horário silencioso (sem notificações)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={prefs.quietStart}
                      onChange={(e) => edit({ quietStart: e.target.value })}
                      className="rounded-xl w-28"
                    />
                    <span className="text-xs text-muted-foreground">até</span>
                    <Input
                      type="time"
                      value={prefs.quietEnd}
                      onChange={(e) => edit({ quietEnd: e.target.value })}
                      className="rounded-xl w-28"
                    />
                  </div>
                </div>

                {/* Enable/disable dispatch */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="space-y-0.5">
                    <p className="text-sm">Envio automático</p>
                    <p className="text-xs text-muted-foreground">
                      Receber alertas a cada 5 minutos quando necessário
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={prefs.enabled}
                    onClick={() => edit({ enabled: !prefs.enabled })}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      prefs.enabled ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        prefs.enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Save + Test */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-xl flex-1 gap-2"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Salvar preferências
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleTest}
                    disabled={testing}
                    className="rounded-xl gap-2"
                  >
                    {testing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Testar
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
