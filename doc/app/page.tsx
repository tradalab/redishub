import Link from "next/link"

export default function Page() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-24">
      <section className="mb-24">
        <h1 className="text-5xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          <span className="text-indigo-500 dark:text-indigo-400">RedisHub</span>
          <br />
          Modern Redis Client
        </h1>

        <p className="mt-6 max-w-xl text-lg text-neutral-600 dark:text-neutral-400">Fast, lightweight, and cross-platform.</p>

        <div className="mt-8 flex gap-4">
          <Link
            href="/download"
            className="
              rounded-lg
              bg-indigo-600 text-white
              px-6 py-3 font-medium
              hover:bg-indigo-500
              transition
            "
          >
            Download
          </Link>

          <Link
            href="https://github.com/tradalab/redishub"
            className="
              rounded-lg
              bg-neutral-200 text-neutral-900
              px-6 py-3 font-medium
              hover:bg-neutral-300
              transition
              dark:bg-neutral-800 dark:text-neutral-100
              dark:hover:bg-neutral-700
            "
          >
            View on GitHub
          </Link>
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
    <div
      className="
        rounded-xl
        border
        p-6
        bg-white border-neutral-200
        dark:bg-neutral-900 dark:border-neutral-800
      "
    >
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{desc}</p>
    </div>
  )
}
