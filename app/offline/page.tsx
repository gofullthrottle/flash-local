export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto max-w-md space-y-4">
        <div className="text-6xl">📡</div>
        <h1 className="text-2xl font-bold">You&apos;re Offline</h1>
        <p className="text-muted-foreground">
          No worries — any prospects or scout data you captured will sync
          automatically when you&apos;re back online.
        </p>
        <div className="rounded-lg border bg-muted/50 p-4 text-sm">
          <p className="font-medium">While offline you can still:</p>
          <ul className="mt-2 space-y-1 text-left text-muted-foreground">
            <li>- View cached prospect data</li>
            <li>- Capture new prospects (queued for sync)</li>
            <li>- Record scout breadcrumbs (queued for sync)</li>
          </ul>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
