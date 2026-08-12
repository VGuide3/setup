"use client";

export function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Grid */}
      <div className="absolute inset-0 grid-bg animate-grid-pulse" />

      {/* Floating orbs */}
      <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-primary/20 blur-[120px] animate-float" />
      <div
        className="absolute -right-32 top-1/4 h-[30rem] w-[30rem] rounded-full bg-accent/15 blur-[120px] animate-float"
        style={{ animationDelay: "1.5s" }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-[28rem] w-[28rem] rounded-full bg-[hsl(280,80%,66%)]/15 blur-[120px] animate-float"
        style={{ animationDelay: "3s" }}
      />

      {/* Top sheen */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,hsl(240_16%_4%)_100%)]" />
    </div>
  );
}
