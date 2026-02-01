import Link from "next/link"
import Image from "next/image"

export default function Page() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-24">
      <section className="mb-24 grid items-center gap-12 md:grid-cols-2">
        <div>
          <h1 className="text-5xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            <span className="text-indigo-500 dark:text-indigo-400">RedisHub</span>
            <br />
            Modern Redis Client
          </h1>

          <p className="mt-6 max-w-xl text-lg text-neutral-600 dark:text-neutral-400">Fast, lightweight, and cross-platform.</p>

          <div className="mt-8 flex gap-4">
            <Link href="/download" className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-500 transition">
              Download
            </Link>

            <Link
              href="https://github.com/tradalab/redishub"
              className="rounded-lg bg-neutral-200 px-6 py-3 font-medium text-neutral-900 hover:bg-neutral-300 transition dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
            >
              View on GitHub
            </Link>
          </div>
        </div>

        <div className="relative flex justify-center md:justify-end">
          <div className="pointer-events-none absolute inset-0 flex justify-center">
            <div className="h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl md:h-96 md:w-96 dark:bg-indigo-400/10" />
          </div>
          <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md">
            <Image src="/logo.png" alt="RedisHub Logo" width={500} height={500} className="w-full h-auto object-contain rounded-2xl shadow-xl" priority />
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <Feature title="Optimized for Redis" desc="A smooth and intuitive workflow designed specifically for Redis data exploration and management." />
        <Feature title="Modern UI Experience" desc="Clean, elegant, and responsive interface built with contemporary UI patterns." />
        <Feature title="Cross-Platform" desc="Runs consistently on major operating systems with a native-feeling shell." />
        <Feature title="Key Explorer" desc="Browse, view, and edit keys with structured navigation and real-time updates." />
        <Feature title="Lightweight & Fast" desc="Minimal overhead, instant startup, and efficient performance for everyday use." />
        <Feature title="Developer Friendly" desc="Simple, predictable, and built with a focus on productivity and clarity." />
      </section>
    </main>
  )
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border p-6 bg-white border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{desc}</p>
    </div>
  )
}
