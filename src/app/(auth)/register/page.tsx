"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";
import { SoninhoLogoMark } from "@/components/brand/SoninhoLogoMark";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="glass rounded-3xl border border-white/10 p-8 shadow-2xl"
    >
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4 py-4"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold">Verifique seu e-mail</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Enviamos um link de confirmação para{" "}
              <strong className="text-foreground" translate="no">{email}</strong>.
              Clique no link para ativar sua conta.
            </p>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => router.push("/login")}
            >
              Voltar ao login
            </Button>
          </motion.div>
        ) : (
          <motion.div key="form">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 glow-primary">
                <SoninhoLogoMark size={52} className="animate-breathe" />
              </div>
              <h1 className="text-2xl font-bold shimmer-text">Criar Conta</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Comece a monitorar o sono do seu bebê
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-3" noValidate>
              <div>
                <label htmlFor="email" className="sr-only">E-mail</label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="E-mail…"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  spellCheck={false}
                  className="rounded-xl bg-muted/40 border-border/50 h-11"
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Senha</label>
                <Input
                  id="password"
                  type="password"
                  name="new-password"
                  placeholder="Senha (mín. 6 caracteres)…"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="rounded-xl bg-muted/40 border-border/50 h-11"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="sr-only">Confirmar senha</label>
                <Input
                  id="confirm-password"
                  type="password"
                  name="confirm-password"
                  placeholder="Confirmar senha…"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="rounded-xl bg-muted/40 border-border/50 h-11"
                />
              </div>

              {error && (
                <p role="alert" aria-live="polite" className="text-sm text-destructive text-center py-1">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full rounded-xl h-11 font-semibold glow-primary"
                disabled={loading}
              >
                {loading ? "Criando conta…" : "Criar Conta"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                Entrar
              </Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
