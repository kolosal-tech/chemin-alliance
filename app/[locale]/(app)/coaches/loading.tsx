// Skeleton affiché pendant le chargement serveur de la liste des coachs
// (route App Router : rendu automatiquement comme fallback Suspense).
export default function CoachesLoading() {
  const cell =
    "flex items-center gap-3.5 rounded-cardlg border border-sand-200 bg-surface p-4 dark:border-anthracite-600 dark:bg-anthracite-800";
  const block = "animate-pulse rounded bg-sand-200 dark:bg-anthracite-700";
  return (
    <main
      className="px-3 pt-6 safe-top lg:mx-auto lg:max-w-4xl"
      aria-busy="true"
      data-testid="coaches-loading"
    >
      <div className={`mb-4 h-8 w-48 ${block}`} />
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={cell}>
            <div className={`h-14 w-14 flex-none rounded-card ${block}`} />
            <div className="min-w-0 flex-1 space-y-2">
              <div className={`h-4 w-2/3 ${block}`} />
              <div className={`h-3 w-1/2 ${block}`} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
