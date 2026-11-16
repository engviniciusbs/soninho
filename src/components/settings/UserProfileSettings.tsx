"use client";

import { useState } from "react";
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

/** Labels for `<SelectValue>`, which otherwise shows the raw value. */
const RELATION_ITEMS = [
  { value: "none", label: "Não informado" },
  ...FAMILY_RELATIONS.map((r) => ({ value: r.value, label: r.label })),
];
const UI_MODE_ITEMS = [
  { value: "standard", label: "Completo, com todas as telas" },
  { value: "nanny", label: "Babá, só timer e recados" },
];

export function UserProfileSettings() {
  const { profile, refreshProfile } = useUserProfile();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [familyRelation, setFamilyRelation] = useState<string>(profile?.family_relation ?? "");
  const [uiMode, setUiMode] = useState<UiMode>(profile?.ui_mode ?? "standard");
  const [saving, setSaving] = useState(false);

  // Re-sync the form whenever a new profile arrives (react.dev "storing
  // information from previous renders": adjust state during render, no effect).
  const [syncedProfile, setSyncedProfile] = useState(profile);
  if (profile !== syncedProfile) {
    setSyncedProfile(profile);
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setFamilyRelation(profile.family_relation ?? "");
      setUiMode(profile.ui_mode ?? "standard");
    }
  }

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
        <CardTitle>Seu perfil na família</CardTitle>
        <CardDescription className="text-base font-normal">
          Como você aparece para quem cuida do bebê junto com você, nas notificações e nos recados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="profile-display-name" className="text-sm font-bold text-sn-mu">
            Nome para exibir
          </label>
          <Input
            id="profile-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ex.: Vinícius"
            className="h-11 rounded-xl border-sn-mu/70 text-base"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="profile-relation" className="text-sm font-bold text-sn-mu">
            Você é…
          </label>
          <Select
            items={RELATION_ITEMS}
            value={familyRelation || "none"}
            onValueChange={(v) => setFamilyRelation(!v || v === "none" ? "" : v)}
          >
            <SelectTrigger id="profile-relation" className="h-11 w-full rounded-xl border-sn-mu/70 text-base">
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
          <label htmlFor="profile-ui-mode" className="text-sm font-bold text-sn-mu">
            Modo do app
          </label>
          <Select
            items={UI_MODE_ITEMS}
            value={uiMode}
            onValueChange={(v) => setUiMode(v as UiMode)}
          >
            <SelectTrigger id="profile-ui-mode" className="h-11 w-full rounded-xl border-sn-mu/70 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UI_MODE_ITEMS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-sn-mu">
            No modo babá, escondemos análises e IA para deixar só o essencial do dia.
          </p>
        </div>

        <Button size="md" onClick={handleSave} loading={saving} className="w-full">
          {saving ? "Salvando…" : "Salvar perfil"}
        </Button>
      </CardContent>
    </Card>
  );
}
