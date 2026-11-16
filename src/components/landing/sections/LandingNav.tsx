import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SoninhoLogoMark } from "@/components/brand/SoninhoLogoMark";

export function LandingNav() {
  return (
    <nav className="fixed top-4 left-4 right-4 z-50 sm:top-6 sm:left-6 sm:right-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/10 bg-[#0a1020]/60 px-5 py-3 backdrop-blur-xl sm:px-6 sm:py-3.5">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-full py-0.5 pr-1 outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1020]"
        >
          <SoninhoLogoMark size={30} />
          <span className="font-display text-lg tracking-tight text-white">
            Soninho
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2 text-sm text-white/70 transition-colors hover:text-white sm:inline-flex"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#080e1a] transition-transform duration-200 hover:-translate-y-0.5 sm:px-5"
          >
            Começar
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </nav>
  );
}
