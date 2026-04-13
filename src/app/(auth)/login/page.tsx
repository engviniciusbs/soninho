"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Moon } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("E-mail ou senha incorretos. Tente novamente.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="glass rounded-3xl border border-white/10 p-8 shadow-2xl"
    >
      {/* Header */}
      <div className="mb-8 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.1 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 glow-primary"
        >
          <Moon className="h-8 w-8 text-primary animate-breathe" aria-hidden="true" />
        </motion.div>
        <h1 className="text-2xl font-bold shimmer-text">Soninho</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Entre para acompanhar o sono do seu bebê
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-3" noValidate>
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
            name="password"
            placeholder="Senha…"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
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
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="flex-1 border-t border-border/50" />
        <span className="text-xs text-muted-foreground">ou</span>
        <div className="flex-1 border-t border-border/50" />
      </div>

      <Button
        variant="outline"
        className="w-full rounded-xl h-11 border-border/50 bg-muted/30 hover:bg-muted/50"
        onClick={handleGoogleLogin}
        type="button"
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Entrar com Google
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link href="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
          Criar conta
        </Link>
      </p>
    </motion.div>
  );
}
