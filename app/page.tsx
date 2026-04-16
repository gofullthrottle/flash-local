import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Globe,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const VERTICALS = [
  "Holiday Lights",
  "Exterior Decorating",
  "Tree Pickup & Delivery",
  "Gift Wrapping",
  "NYE Cleanup",
  "Party Setup",
  "Snow Shoveling",
  "Junk Haul",
];

const STEPS = [
  {
    icon: Zap,
    title: "Pick your service",
    description:
      "Choose your seasonal hustle. We load smart defaults — pricing, packages, FAQs — so you skip the blank page.",
  },
  {
    icon: Sparkles,
    title: "Brand it in 60 seconds",
    description:
      "Business name, phone, a few photos. We generate a clean site with booking + payments built in.",
  },
  {
    icon: Globe,
    title: "Go live instantly",
    description:
      "Your site publishes immediately. We walk you through Google Business Profile setup step by step.",
  },
  {
    icon: CreditCard,
    title: "Get paid",
    description:
      "Customers book and pay online. Deposits, full payments, tips — all handled through Stripe.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-display text-xl font-bold">
            Flash<span className="text-primary/70">Local</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground">
              How It Works
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground">
              Pricing
            </a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/start">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 sm:py-32">
          <div className="mx-auto max-w-6xl px-4 text-center">
            <Badge variant="secondary" className="mb-6">
              <Clock className="mr-1 h-3 w-3" /> Launch in under 10 minutes
            </Badge>
            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Turn your holiday hustle
              <br />
              <span className="text-primary/70">into a real business tonight.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Clean website. Online booking. Payments built in. Google profile
              guided end-to-end. Two plans — pay upfront or $0 upfront with
              rev-share.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="xl" asChild>
                <Link href="/start">
                  Launch My Business <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild>
                <Link href="#how-it-works">See How It Works</Link>
              </Button>
            </div>
            {/* Social proof */}
            <div className="mt-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-background bg-muted"
                  />
                ))}
              </div>
              <span>
                Built for the{" "}
                <strong className="text-foreground">2026 season</strong> — local
                crews welcome
              </span>
            </div>
          </div>
        </section>

        {/* Verticals strip */}
        <section className="border-y bg-muted/50 py-8">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {VERTICALS.map((v) => (
                <Badge key={v} variant="outline" className="text-sm">
                  {v}
                </Badge>
              ))}
              <Badge variant="outline" className="text-sm">
                + more
              </Badge>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                From zero to bookable in 4 steps
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                No coding. No design skills. No waiting.
              </p>
            </div>
            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <div key={step.title} className="relative">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <div className="mb-1 text-sm font-medium text-muted-foreground">
                    Step {i + 1}
                  </div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                Two ways to launch
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Cash upfront or $0 upfront — your call.
              </p>
            </div>
            <div className="mt-16 grid gap-8 md:grid-cols-2 lg:max-w-4xl lg:mx-auto">
              {/* Upfront */}
              <Card className="relative">
                <CardHeader>
                  <CardTitle className="font-display">Launch Plan</CardTitle>
                  <CardDescription>
                    Pay once, keep full control of your payments.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">
                    $99
                    <span className="text-lg font-normal text-muted-foreground">
                      {" "}one-time
                    </span>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {[
                      "Custom microsite + subdomain",
                      "Online booking + payments",
                      "3-tier pricing packages",
                      "Google Business Profile wizard",
                      "Reviews collection",
                      "Basic analytics",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" size="lg" asChild>
                    <Link href="/start?plan=upfront">Start for $99</Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Rev-share */}
              <Card className="relative border-primary">
                <div className="absolute -top-3 left-6">
                  <Badge>Most Popular</Badge>
                </div>
                <CardHeader>
                  <CardTitle className="font-display">Partner Plan</CardTitle>
                  <CardDescription>
                    $0 upfront. We take a small cut of each booking.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">
                    $0
                    <span className="text-lg font-normal text-muted-foreground">
                      {" "}upfront
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    15% platform fee on customer payments
                  </p>
                  <ul className="mt-6 space-y-3">
                    {[
                      "Everything in Launch, plus:",
                      "Stripe Connect payouts (weekly)",
                      "Priority ad management",
                      "Dedicated support",
                      "Custom domain (free)",
                      "Cancel anytime — keep your data",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" size="lg" asChild>
                    <Link href="/start?plan=rev_share">
                      Start for Free <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        {/* Trust / FAQ */}
        <section id="faq" className="border-t py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="font-display text-center text-3xl font-bold sm:text-4xl">
              Questions? Answers.
            </h2>
            <div className="mt-12 space-y-8">
              {[
                {
                  q: "How fast is my site actually live?",
                  a: "Your microsite publishes the moment you hit 'Publish' — under 10 minutes if you move quick. Google Business Profile visibility depends on Google's verification process, which we guide you through step by step.",
                },
                {
                  q: "What's the catch with the $0 Partner plan?",
                  a: "No catch. Customer payments flow through our Stripe setup. We take 15% as a platform fee; you get the rest via weekly payouts to your bank account. Cancel anytime.",
                },
                {
                  q: "Do I need a business license?",
                  a: "Requirements vary by city. We help you present professionally but you're responsible for any local licensing. Most seasonal services don't require special licenses, but check your area.",
                },
                {
                  q: "Can customers book and pay online?",
                  a: "Yes. Your site includes a booking calendar and Stripe-powered checkout. Customers can pay deposits or full amounts. You get notified instantly.",
                },
                {
                  q: "What about the ad management?",
                  a: "Optional. Toggle it on from your dashboard, set a daily budget, and we run optimized local ads for you. You can turn it off anytime.",
                },
              ].map(({ q, a }) => (
                <div key={q}>
                  <h3 className="text-lg font-semibold">{q}</h3>
                  <p className="mt-2 text-muted-foreground">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t bg-primary py-20 text-primary-foreground">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Ready to get booked?
            </h2>
            <p className="mt-4 text-lg opacity-90">
              10 minutes. That's it. Website + payments + booking.
            </p>
            <Button
              size="xl"
              variant="secondary"
              className="mt-8"
              asChild
            >
              <Link href="/start">
                Launch My Business <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
          <div className="font-display font-semibold text-foreground">
            FlashLocal
          </div>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <a href="mailto:support@flashlocal.com" className="hover:text-foreground">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
