/** Decorative, aria-hidden backdrop pieces shared by the landing sections. */

export function MoonOrb() {
  return (
    <div className="relative flex items-center justify-center">
      <div
        className="absolute h-[560px] w-[560px] rounded-full motion-reduce:hidden"
        style={{
          background:
            "radial-gradient(circle, rgba(129,140,248,0.22) 0%, transparent 60%)",
          animation: "breathe 6s ease-in-out infinite",
        }}
      />
      <div
        className="absolute h-[380px] w-[380px] rounded-full border border-white/[0.06] motion-reduce:hidden"
        style={{
          animation: "orbit-slow 60s linear infinite",
        }}
      />
      <div
        className="absolute h-[300px] w-[300px] rounded-full border border-white/[0.08] motion-reduce:hidden"
        style={{
          animation: "orbit-slow 40s linear infinite reverse",
        }}
      />

      <div
        className="relative h-[220px] w-[220px] rounded-full sm:h-[280px] sm:w-[280px]"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, #fefce8 0%, #e9d5ff 35%, #818cf8 80%, #4338ca 100%)",
          boxShadow:
            "inset -30px -30px 60px rgba(15,23,42,0.7), 0 0 80px rgba(196,181,253,0.35), 0 0 160px rgba(129,140,248,0.25)",
        }}
      >
        <span
          className="absolute top-[35%] left-[30%] h-8 w-8 rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(circle, rgba(15,23,42,0.4) 0%, transparent 70%)",
          }}
        />
        <span
          className="absolute top-[55%] left-[55%] h-5 w-5 rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(15,23,42,0.4) 0%, transparent 70%)",
          }}
        />
      </div>
    </div>
  );
}

const starPositions = [
  { top: "12%", left: "18%", size: 2, delay: 0 },
  { top: "22%", left: "82%", size: 3, delay: 0.8 },
  { top: "68%", left: "10%", size: 2, delay: 1.5 },
  { top: "78%", left: "88%", size: 3, delay: 2.2 },
  { top: "38%", left: "8%", size: 1, delay: 0.4 },
  { top: "48%", left: "92%", size: 2, delay: 1.1 },
  { top: "85%", left: "42%", size: 1, delay: 1.8 },
  { top: "15%", left: "50%", size: 1, delay: 0.6 },
];

export function Stars({ dense = true }: { dense?: boolean }) {
  const stars = dense ? starPositions : starPositions.slice(0, 5);
  return (
    <>
      {stars.map((s, i) => (
        <span
          key={i}
          className="pointer-events-none absolute rounded-full bg-white motion-reduce:opacity-60"
          style={{
            top: s.top,
            left: s.left,
            width: `${s.size}px`,
            height: `${s.size}px`,
            boxShadow: "0 0 6px rgba(255,255,255,0.8)",
            animation: `twinkle 2.5s ease-in-out ${s.delay}s infinite`,
          }}
          aria-hidden
        />
      ))}
    </>
  );
}
