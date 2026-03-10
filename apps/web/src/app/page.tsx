import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Football Management System</h1>
      <p className="mt-2 text-zinc-300">
        Public competition website. Open a published competition using its slug.
      </p>
      <div className="mt-6">
        <Link className="underline" href="/competition/example-slug">
          /competition/example-slug
        </Link>
      </div>
    </main>
  );
}

