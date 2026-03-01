import Link from "next/link";

export default function StartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="font-display text-lg font-bold">
            Flash<span className="text-primary/70">Local</span>
          </Link>
          <span className="text-sm text-muted-foreground">
            Setup Wizard
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
