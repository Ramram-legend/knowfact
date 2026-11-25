export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Chargement du tableau de bord">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-56 rounded-lg bg-slate-200" />
          <div className="h-4 w-72 rounded bg-slate-200/80" />
        </div>
        <div className="h-9 w-36 rounded-lg bg-slate-200 hidden sm:block" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-slate-200 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-6 w-14 rounded bg-slate-200" />
              <div className="h-3.5 w-24 rounded bg-slate-200/80" />
            </div>
          </div>
        ))}
      </div>

      <div className="card space-y-3">
        <div className="h-5 w-44 rounded bg-slate-200" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card space-y-3">
            <div className="flex gap-2">
              <div className="h-5 w-24 rounded-full bg-slate-200" />
              <div className="h-5 w-16 rounded-full bg-slate-200/80" />
            </div>
            <div className="h-4 w-4/5 rounded bg-slate-200" />
            <div className="h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-2/3 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
