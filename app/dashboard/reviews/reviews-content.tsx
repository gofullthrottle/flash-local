"use client";

import { useState } from "react";
import { Mail, MessageSquare, Send, Star, StarHalf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Review {
  id: string;
  customerName: string;
  rating: number;
  body: string;
  source: string;
  createdAt: string;
}

interface ReviewRequest {
  id: string;
  bookingId: string;
  customerEmail: string;
  status: "PENDING" | "SENT" | "COMPLETED" | "EXPIRED";
  sentAt: string | null;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        if (i < Math.floor(rating)) {
          return (
            <Star
              key={i}
              className="h-4 w-4 fill-amber-400 text-amber-400"
            />
          );
        }
        if (i < rating) {
          return (
            <StarHalf
              key={i}
              className="h-4 w-4 fill-amber-400 text-amber-400"
            />
          );
        }
        return (
          <Star key={i} className="h-4 w-4 text-muted-foreground/30" />
        );
      })}
    </div>
  );
}

const REQUEST_STATUS_COLORS: Record<ReviewRequest["status"], string> = {
  PENDING: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  EXPIRED: "bg-red-100 text-red-700",
};

export function ReviewsContent({
  initialReviews,
  initialRequests,
}: {
  initialReviews: Review[];
  initialRequests: ReviewRequest[];
}) {
  const [reviews] = useState<Review[]>(initialReviews);
  const [requests] = useState<ReviewRequest[]>(initialRequests);
  const [tab, setTab] = useState<"reviews" | "requests">("reviews");

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Reviews
        </h2>
        <p className="text-muted-foreground">
          Collect and manage customer reviews to build trust.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">
              {avgRating > 0 ? avgRating.toFixed(1) : "—"}
            </div>
            <StarRating rating={avgRating} />
            <p className="mt-1 text-xs text-muted-foreground">
              Average rating
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{reviews.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Total reviews</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">
              {requests.filter((r) => r.status === "SENT").length}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Pending requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <Button
          variant={tab === "reviews" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("reviews")}
        >
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
          Reviews ({reviews.length})
        </Button>
        <Button
          variant={tab === "requests" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("requests")}
        >
          <Send className="mr-1.5 h-3.5 w-3.5" />
          Requests ({requests.length})
        </Button>
      </div>

      {tab === "reviews" ? (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Star className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-4 font-medium">No reviews yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Send review requests to customers after completing their
                  jobs.
                </p>
              </CardContent>
            </Card>
          ) : (
            reviews.map((review) => (
              <Card key={review.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {review.customerName}
                      </CardTitle>
                      <div className="mt-1 flex items-center gap-2">
                        <StarRating rating={review.rating} />
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {review.source === "review_request"
                        ? "Requested"
                        : "Direct"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {review.body}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Send Review Requests
              </CardTitle>
              <CardDescription>
                After marking a booking as complete, send a review request from
                the{" "}
                <a
                  href="/dashboard/bookings"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Bookings page
                </a>
                .
              </CardDescription>
            </CardHeader>
          </Card>

          {requests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-4 font-medium">No requests sent yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Complete a booking and send a review request to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => (
              <Card key={request.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {request.customerEmail}
                      </span>
                    </div>
                    {request.sentAt && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Sent {new Date(request.sentAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Badge
                    className={REQUEST_STATUS_COLORS[request.status]}
                    variant="outline"
                  >
                    {request.status}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
