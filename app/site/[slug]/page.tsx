import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCents } from "@/lib/utils";
import { getProviderBySlug } from "@/lib/supabase/queries";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const data = await getProviderBySlug(slug);
  if (!data) return { title: "Not Found" };

  const vertical = data.provider.vertical_id.replace(/-/g, " ");
  const area =
    typeof data.profile?.service_area === "object" &&
    data.profile.service_area !== null &&
    "raw" in (data.profile.service_area as any)
      ? (data.profile.service_area as any).raw
      : "";

  return {
    title: `${data.provider.display_name} — ${vertical} in ${area}`,
    description:
      data.profile?.headline ??
      `Book ${vertical} services from ${data.provider.display_name}`,
  };
}

export default async function MicrositePage({ params }: Props) {
  const { slug } = await params;
  const data = await getProviderBySlug(slug);
  if (!data) notFound();

  const { provider, profile, packages } = data;
  const vertical = provider.vertical_id.replace(/-/g, " ");
  const serviceArea =
    typeof profile?.service_area === "object" &&
    profile?.service_area !== null &&
    "raw" in (profile.service_area as any)
      ? (profile.service_area as any).raw
      : "your area";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <span className="font-display text-lg font-bold">
            {provider.display_name}
          </span>
          <div className="flex items-center gap-3">
            <Button size="sm" asChild>
              <Link href={`/site/${slug}/book`}>Book Now</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b bg-gradient-to-b from-muted/50 py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 text-center">
            <Badge variant="secondary" className="mb-4">
              <Clock className="mr-1 h-3 w-3" /> Now booking
            </Badge>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
              {profile?.headline ??
                `Professional ${vertical} services`}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              {profile?.description ??
                `Reliable, professional ${vertical} in ${serviceArea}. Book online in minutes.`}
            </p>
            <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {serviceArea}
              </span>
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />{" "}
                New on FlashLocal
              </span>
            </div>
            <div className="mt-8 flex justify-center gap-4">
              <Button size="lg" asChild>
                <Link href={`/site/${slug}/book`}>Get a Quote</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#packages">View Packages</a>
              </Button>
            </div>
          </div>
        </section>

        {/* Packages */}
        <section id="packages" className="py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">
              Our Packages
            </h2>
            <p className="mt-2 text-center text-muted-foreground">
              Transparent pricing. No hidden fees.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg: any) => (
                <Card
                  key={pkg.id}
                  className={
                    pkg.recommended ? "relative border-primary shadow-md" : ""
                  }
                >
                  {pkg.recommended && (
                    <div className="absolute -top-3 left-4">
                      <Badge>Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle>{pkg.name}</CardTitle>
                    <div className="text-3xl font-bold">
                      {formatCents(pkg.price_cents)}
                    </div>
                    {pkg.description && (
                      <p className="text-sm text-muted-foreground">
                        {pkg.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    {Array.isArray(pkg.includes) && pkg.includes.length > 0 && (
                      <ul className="space-y-2">
                        {(pkg.includes as string[]).map((item: string) => (
                          <li
                            key={item}
                            className="flex items-start gap-2 text-sm"
                          >
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" asChild>
                      <Link
                        href={`/site/${slug}/book?package=${pkg.id}`}
                      >
                        Book This Package
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="border-t bg-muted/30 py-16">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-center font-display text-2xl font-bold">
              Why Book With Us
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {[
                {
                  title: "Instant Confirmation",
                  desc: "Book online and get confirmed immediately. No phone tag.",
                },
                {
                  title: "Secure Payments",
                  desc: "Pay online with any card. Deposits available. Powered by Stripe.",
                },
                {
                  title: "Satisfaction Guaranteed",
                  desc: "Not happy? We'll make it right or refund your deposit.",
                },
              ].map((item) => (
                <div key={item.title} className="text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-primary py-16 text-primary-foreground">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Ready to book?
            </h2>
            <p className="mt-3 opacity-90">
              Secure your spot today. Limited availability this season.
            </p>
            <Button size="lg" variant="secondary" className="mt-6" asChild>
              <Link href={`/site/${slug}/book`}>Book Now</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-muted-foreground">
          <p>{provider.display_name} &middot; Powered by FlashLocal</p>
        </div>
      </footer>
    </div>
  );
}
