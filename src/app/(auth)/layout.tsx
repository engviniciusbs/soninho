export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      {/* Ambient orbs */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-indigo/8 blur-3xl" />
        <div className="absolute top-1/2 left-0 h-48 w-48 -translate-y-1/2 rounded-full bg-lavender/6 blur-3xl" />
      </div>

      {/* Static star dots */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        {[
          { top: "15%", left: "10%", delay: "0s", size: "h-1 w-1" },
          { top: "25%", left: "80%", delay: "0.5s", size: "h-1.5 w-1.5" },
          { top: "65%", left: "15%", delay: "1s", size: "h-1 w-1" },
          { top: "75%", left: "88%", delay: "1.5s", size: "h-1 w-1" },
          { top: "40%", left: "92%", delay: "0.8s", size: "h-0.5 w-0.5" },
          { top: "85%", left: "40%", delay: "0.3s", size: "h-1 w-1" },
          { top: "10%", left: "55%", delay: "1.2s", size: "h-0.5 w-0.5" },
        ].map((star, i) => (
          <div
            key={i}
            className={`absolute rounded-full bg-white/40 animate-twinkle ${star.size}`}
            style={{ top: star.top, left: star.left, animationDelay: star.delay }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-[400px]">{children}</div>
    </div>
  );
}
