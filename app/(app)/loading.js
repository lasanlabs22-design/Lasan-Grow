// Skeleton shown while a page's server data loads.
function Block({ className }) {
  return <div className={`animate-pulse rounded-2xl bg-surface-2 ${className}`} />;
}

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Block className="mb-2 h-8 w-56" />
      <Block className="mb-7 h-4 w-80" />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Block key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <Block className="h-80" />
        <Block className="h-80" />
      </div>
    </div>
  );
}
