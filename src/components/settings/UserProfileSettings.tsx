"use client";

import { useEffect, useState } from "react";
import { User, Baby, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FAMILY_RELATIONS } from "@/lib/family/relations";
import { useUserProfile } from "@/components/providers/UserProfileProvider";
import { toast } from "sonner";
import type { UiMode } from "@/types";

export function UserProfileSettings() {
  const { profile, refreshProfile } = useUserProfile();
  const [displayName, setDisplayName] = useState("");
  const [familyRelation, setFamilyRelation] = useState<string>("");
  const [uiMode, setUiMode] = useState<UiMode>("standard");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    /* eslint-disable react-hooks/set-state-in-effect -- form defaults from fetched profile */
    setDisplayName(profile.display_name ?? "");
    setFamilyRelation(profile.family_relation ?? "");
    setUiMode(profile.ui_mode ?? "standard");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: displayName.trim() || null,
        family_relation: familyRelation || null,
        ui_mode: uiMode,
        syncFamilyMembers: true,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Não foi possível salvar seu perfil");
      return;
    }
    await refreshProfile();
    toast.success("Perfil atualizado");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5 text-primary" aria-hidden />
          Seu perfil na família
        </CardTitle>
        <CardDescription>
          Como você aparece para quem cuida do bebê junto com você — notificações e mural.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="profile-display-name" className="text-sm font-medium">
            Nome para exibir
          </label>
          <Input
            id="profile-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ex.: Vinícius"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="profile-relation" className="text-sm font-medium">
            Você é…
          </label>
          <Select
            value={familyRelation || "none"}
            onValueChange={(v) => setFamilyRelation(!v || v === "none" ? "" : v)}
          >
            <SelectTrigger id="profile-relation">
              <SelectValue placeholder="Escolha seu papel na família" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Não informado</SelectItem>
              {FAMILY_RELATIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="profile-ui-mode" className="text-sm font-medium">
            Modo do app
          </label>
          <Select
            value={uiMode}
            onValueChange={(v) => setUiMode(v as UiMode)}
          >
            <SelectTrigger id="profile-ui-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Completo — todas as telas</SelectItem>
              <SelectItem value="nanny">
                Babá — só timer e recados
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Baby className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
            No modo babá, escondemos análises e IA para deixar só o essencial do dia.
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden />
              Salvando…
            </>
          ) : (
            "Salvar perfil"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
