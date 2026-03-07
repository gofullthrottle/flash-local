import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-4xl font-bold">Site not found</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        This provider doesn't exist or hasn't published their site yet.
      </p>
      <Button className="mt-8" asChild>
        <Link href="/">Go to FlashLocal</Link>
      </Button>
    </div>
  );
}
