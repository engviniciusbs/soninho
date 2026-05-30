"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Users, ShieldCheck, Eye, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SoninhoLogoMark } from "@/components/brand/SoninhoLogoMark";
import { createClient } from "@/lib/supabase/client";

type InviteInfo = {
  id: string;
  role: "caregiver" | "viewer";
  family_relation: string | null;
  family_name: string;
  expires_at: string;
};

import { getFamilyRelationLabel, PERMISSION_ROLE_LABELS } from "@/lib/family/relations";

const ROLE_LABELS: Record<string, string> = {
  caregiver: PERMISSION_ROLE_LABELS.caregiver,
  viewer: PERMISSION_ROLE_LABELS.viewer,
};

const ROLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  caregiver: ShieldCheck,
  viewer: Eye,
};

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    async function init() {
      // Check auth
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);

      // Fetch invite info (public endpoint)
      const res = await fetch(`/api/family/accept/${token}`);
      if (res.ok) {
        const { data } = await res.json();
        setInvite(data);
      } else {
        setStatus("error");
        setErrorMsg("Convite inválido ou expirado.");
      }
      setLoading(false);
    }
    init();
  }, [token, supabase]);

  const handleAccept = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }

    setAccepting(true);
    const res = await fetch(`/api/family/accept/${token}`, { method: "POST" });
    if (res.ok) {
      setStatus("success");
      setTimeout(() => router.push("/app"), 2000);
    } else {
      const body = await res.json();
      setErrorMsg(body.error ?? "Erro ao aceitar convite.");
      setStatus("error");
    }
    setAccepting(false);
  };

  const RoleIcon = invite ? (ROLE_ICONS[invite.role] ?? Users) : Users;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      {/* Ambient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-breathe" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-breathe" style={{ animationDelay: "1s" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        <div className="glass rounded-2xl p-8 flex flex-col items-center gap-6 text-center border border-border/50">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <SoninhoLogoMark size={40} className="animate-breathe" />
            <span className="text-xl font-bold shimmer-text">Soninho</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando convite...</p>
            </div>
          ) : status === "error" ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <XCircle className="w-12 h-12 text-destructive" />
              <p className="font-semibold text-destructive">Convite inválido</p>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" onClick={() => router.push("/app")}>
                Ir para o app
              </Button>
            </div>
          ) : status === "success" ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              <p className="font-semibold text-foreground">Bem-vindo(a) à família!</p>
              <p className="text-sm text-muted-foreground">Redirecionando...</p>
            </div>
          ) : (
            <>
              {/* Family avatar */}
              <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center">
                <Users className="w-10 h-10 text-primary" />
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Você foi convidado(a) para</p>
                <h1 className="text-2xl font-bold text-foreground">{invite?.family_name}</h1>
              </div>

              {/* Role badge */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <RoleIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {invite ? ROLE_LABELS[invite.role] : ""}
                  </span>
                </div>
                {invite?.family_relation && (
                  <p className="text-sm text-muted-foreground">
                    como {getFamilyRelationLabel(invite.family_relation)}
                  </p>
                )}
              </div>

              <div className="w-full space-y-3">
                {!isAuthenticated && (
                  <p className="text-xs text-muted-foreground">
                    Você precisa fazer login para aceitar o convite.
                  </p>
                )}

                <Button
                  className="w-full h-12 text-base font-semibold"
                  onClick={handleAccept}
                  disabled={accepting}
                >
                  {accepting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : !isAuthenticated ? (
                    "Fazer login para entrar"
                  ) : (
                    <>
                      <Users className="w-4 h-4 mr-2" />
                      Entrar na família
                    </>
                  )}
                </Button>

                <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => router.push("/")}>
                  Cancelar
                </Button>
              </div>

              {invite && (
                <p className="text-xs text-muted-foreground">
                  Convite expira em {new Date(invite.expires_at).toLocaleDateString("pt-BR")}
                </p>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
