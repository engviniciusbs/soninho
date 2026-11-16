"use client";

import { toast } from "sonner";
import type { NotificationSettings } from "@/hooks/settings/useNotificationSettings";
import { IconBell, IconSend } from "@/components/brand/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

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
    <Card>
      <CardHeader>
        <CardTitle>Alertas de soneca</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {!status.isSupported ? (
          <p className="text-base text-sn-mu">Seu navegador não suporta notificações push.</p>
        ) : (
          <>
            {/* Permission / subscription status */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-base font-bold text-sn-tx">
                  {status.isSubscribed ? "Notificações ativadas" : "Notificações desativadas"}
                </p>
                <p className="text-base text-sn-mu">
                  {status.permission === "denied"
                    ? "Bloqueado pelo navegador. Libere as notificações nas permissões do site."
                    : status.isSubscribed
                      ? "Você receberá alertas sobre sonecas e janelas de sono."
                      : "Ative para receber alertas inteligentes."}
                </p>
              </div>
              <Button
                variant={status.isSubscribed ? "secondary" : "primary"}
                size="sm"
                loading={status.isLoading}
                disabled={status.permission === "denied"}
                onClick={handleToggle}
              >
                {!status.isLoading && <IconBell />}
                {status.isSubscribed ? "Desativar" : "Ativar"}
              </Button>
            </div>

            {status.isSubscribed && (
              <>
                {/* Alert timing */}
                <fieldset className="space-y-2 border-t border-sn-bd pt-4">
                  <legend className="float-left mb-2 w-full text-sm font-bold text-sn-mu">
                    Alertar antes da soneca (minutos)
                  </legend>
                  <div className="clear-left flex gap-2">
                    {ALERT_OPTIONS.map((min) => (
                      <button
                        key={min}
                        type="button"
                        onClick={() => edit({ alertBefore: min })}
                        aria-pressed={prefs.alertBefore === min}
                        className={cn(
                          "flex h-11 min-w-12 flex-1 cursor-pointer items-center justify-center rounded-full font-sans text-base font-bold tabular-nums outline-none",
                          "transition-transform duration-(--sn-dur-micro) ease-sn-out active:scale-[0.98]",
                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr",
                          prefs.alertBefore === min
                            ? "bg-sn-pr text-sn-pr-ink"
                            : "bg-sn-s2 text-sn-tx hover:bg-sn-s2/70"
                        )}
                      >
                        {min}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {/* Quiet hours */}
                <div className="space-y-2">
                  <p className="text-sm font-bold text-sn-mu">Horário silencioso (sem notificações)</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      aria-label="Início do horário silencioso"
                      value={prefs.quietStart}
                      onChange={(e) => edit({ quietStart: e.target.value })}
                      className="h-11 w-32 rounded-xl border-sn-mu/70 text-base tabular-nums"
                    />
                    <span className="text-base text-sn-mu">até</span>
                    <Input
                      type="time"
                      aria-label="Fim do horário silencioso"
                      value={prefs.quietEnd}
                      onChange={(e) => edit({ quietEnd: e.target.value })}
                      className="h-11 w-32 rounded-xl border-sn-mu/70 text-base tabular-nums"
                    />
                  </div>
                </div>

                {/* Enable/disable dispatch */}
                <div className="flex items-center justify-between gap-4 border-t border-sn-bd pt-4">
                  <div className="space-y-1">
                    <p className="text-base font-bold text-sn-tx">Envio automático</p>
                    <p className="text-sm text-sn-mu">
                      Receber alertas a cada 5 minutos quando necessário
                    </p>
                  </div>
                  <Switch
                    checked={prefs.enabled}
                    onCheckedChange={(next) => edit({ enabled: next })}
                    aria-label="Envio automático"
                  />
                </div>

                {/* Save + Test */}
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} loading={saving} className="flex-1">
                    Salvar preferências
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleTest} loading={testing}>
                    {!testing && <IconSend />}
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
