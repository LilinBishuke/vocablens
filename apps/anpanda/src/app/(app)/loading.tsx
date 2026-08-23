export default function AppLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-page pt-6" aria-busy>
      <div className="h-7 w-32 animate-pulse rounded-badge bg-progress-bar/70" />
      <div className="h-36 animate-pulse rounded-card-lg bg-progress-bar/50" />
      <div className="flex flex-col gap-2.5 pt-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="glass-card h-16 animate-pulse rounded-card opacity-70"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
