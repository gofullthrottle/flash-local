import { Suspense } from "react";
import { StartWizard } from "./wizard";

export default function StartPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Loading wizard...
        </div>
      }
    >
      <StartWizard />
    </Suspense>
  );
}
