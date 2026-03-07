"use client";

import { useParams } from "next/navigation";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function BookingSuccessPage() {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="font-display text-2xl">
            Payment Confirmed!
          </CardTitle>
          <CardDescription className="text-base">
            Your booking has been confirmed and your deposit has been processed
            successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <p>
              You'll receive a confirmation email shortly with all the details.
              The service provider will be in touch to confirm the exact timing.
            </p>
          </div>
          <Button className="w-full" asChild>
            <a href={`/site/${slug}`}>
              Back to Site <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
