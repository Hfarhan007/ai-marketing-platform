import { Button } from '@repo/ui';

const features = [
  ['Campaign intelligence', 'Turn market signals into focused campaign briefs.'],
  ['Content at scale', 'Create on-brand assets for every channel from one workspace.'],
  ['Measurable growth', 'Connect creative decisions to outcomes your team can trust.'],
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <section className="relative py-24 text-center sm:py-32">
          <div aria-hidden className="absolute left-1/2 top-12 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-600/30 blur-3xl" />
          <div className="relative z-10 mx-auto max-w-4xl">
            <p className="mb-6 inline-flex rounded-full border border-indigo-400/30 bg-indigo-400/10 px-4 py-1.5 text-sm text-indigo-200">
              A smarter operating system for modern marketing
            </p>
            <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-7xl">
              Transform bold ideas into campaigns that perform.
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              Plan strategy, produce remarkable content, and learn from every customer interaction—all in one AI-native workspace.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Button>Start creating</Button>
              <a className="rounded-lg border border-slate-700 px-5 py-3 font-semibold hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" href="#features">
                Explore platform
              </a>
            </div>
          </div>
        </section>
        <section className="grid gap-5 pb-20 md:grid-cols-3" id="features">
          {features.map(([title, description], index) => (
            <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-7" key={title}>
              <span className="text-sm font-semibold text-indigo-400">0{index + 1}</span>
              <h2 className="mt-5 text-xl font-semibold">{title}</h2>
              <p className="mt-3 leading-7 text-slate-400">{description}</p>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
