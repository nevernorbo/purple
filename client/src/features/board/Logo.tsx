export function Logo() {
  return (
    <div className="flex items-center gap-2 select-none">
      <span aria-hidden className="flex h-4 items-start gap-0.5">
        <span className="h-4 w-1.5 bg-primary" />
        <span className="h-2.5 w-1.5 bg-primary/55" />
      </span>
      <span className="text-sm font-semibold tracking-tight">purple</span>
    </div>
  )
}
