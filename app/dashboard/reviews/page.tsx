import { getProviderForCurrentUser } from "@/lib/auth/session";
import { getReviewsData } from "@/lib/dashboard/queries";
import { ReviewsContent } from "./reviews-content";

export default async function ReviewsPage() {
  const provider = await getProviderForCurrentUser();
  if (!provider) {
    return (
      <div className="space-y-6">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Reviews
        </h2>
        <p className="text-muted-foreground">
          Complete onboarding to start collecting reviews.
        </p>
      </div>
    );
  }

  const { reviews, requests } = await getReviewsData(provider.id);

  return (
    <ReviewsContent
      initialReviews={reviews.map((r: any) => ({
        id: r.id,
        customerName: r.customer_name,
        rating: r.rating,
        body: r.body ?? "",
        source: r.source ?? "platform",
        createdAt: r.created_at,
      }))}
      initialRequests={requests.map((req: any) => ({
        id: req.id,
        bookingId: req.booking_id,
        customerEmail: req.customer_email,
        status: req.status,
        sentAt: req.sent_at,
      }))}
    />
  );
}
