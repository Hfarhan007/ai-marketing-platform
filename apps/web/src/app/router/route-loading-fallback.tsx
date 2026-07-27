export function RouteLoadingFallback() {
  return <div aria-live="polite" className="grid min-h-[12rem] place-items-center p-6" role="status"><span className="size-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" /><span className="sr-only">Loading page</span></div>;
}
