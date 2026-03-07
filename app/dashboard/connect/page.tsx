import { Suspense } from "react";
import ConnectContent from "./connect-content";

export default function ConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Payouts
            </h2>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <ConnectContent />
    </Suspense>
  );
}
