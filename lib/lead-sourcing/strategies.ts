/**
 * Lead Sourcing Strategies for Niche Local Services
 *
 * The gold mine: businesses that provide a real service but have weak/no
 * online presence. These are NOT your typical dry cleaners — they're the
 * $5-15K garage declutterers, estate cleanout crews, fence stainers, etc.
 *
 * Key insight: Many high-value local services operate via word-of-mouth,
 * Craigslist, Nextdoor, or Facebook Marketplace. They have no Google Business
 * Profile, no website, and no way for customers to find/book/pay them online.
 * That's the exact gap FlashLocal fills.
 */

// ---------- Strategy: Google Places API Surface Scan ----------
// Google Maps shows businesses, but many lack a GBP claim.
// Use the Places API to search a vertical + area, then check for signals
// that the business is underserved (no website, no photos, few reviews).

export type PlacesLeadSignals = {
  place_id: string;
  name: string;
  address: string;
  phone?: string;
  rating?: number;
  review_count: number;
  has_website: boolean;
  website_url?: string;
  has_photos: boolean;
  photo_count: number;
  is_claimed: boolean; // GBP claimed status (if available)
  opportunity_score: number; // 0-100, higher = better lead
};

export function scoreGooglePlaceLead(place: {
  rating?: number;
  review_count: number;
  has_website: boolean;
  has_photos: boolean;
  photo_count: number;
}): number {
  let score = 50; // baseline

  // No website = major opportunity
  if (!place.has_website) score += 25;

  // Few or no photos = not investing in online presence
  if (!place.has_photos) score += 10;
  else if (place.photo_count < 3) score += 5;

  // Low review count = early stage or not asking for reviews
  if (place.review_count === 0) score += 15;
  else if (place.review_count < 5) score += 10;
  else if (place.review_count < 10) score += 5;
  else score -= 5; // established presence, less need

  // Low rating but exists = they need help (or might be motivated)
  if (place.rating && place.rating < 3.5) score += 5;

  // High rating + few reviews = great service, bad marketing
  if (place.rating && place.rating >= 4.5 && place.review_count < 10) {
    score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

// ---------- Strategy: Craigslist / Marketplace / Nextdoor Scan ----------
// Many niche providers advertise on classifieds. These are warm leads because:
// 1. They're already advertising (they want customers)
// 2. They don't have a proper website (they need FlashLocal)
// 3. They're actively doing the work (proven demand)

export const CRAIGSLIST_CATEGORIES = [
  { path: "household-services", verticals: ["garage-declutter", "closet-org", "estate-cleanout"] },
  { path: "labor-hauling", verticals: ["junk-haul", "estate-cleanout"] },
  { path: "skilled-trades", verticals: ["handyman", "fence-stain", "pressure-wash"] },
  { path: "domestic-gigs", verticals: ["errand-concierge", "meal-prep"] },
  { path: "event-gigs", verticals: ["party-setup"] },
  { path: "pet-gigs", verticals: ["dog-waste", "pet-portrait"] },
] as const;

// ---------- Strategy: Social Media / Facebook Groups ----------
// Local Facebook groups ("Austin Home Services", "Denver Handyman Recs")
// are full of solo operators without websites. Patterns to search:
export const FACEBOOK_SEARCH_PATTERNS = [
  "{city} home services",
  "{city} handyman recommendations",
  "{city} {vertical} services",
  "{city} local business recommendations",
  "{city} home organization",
  "{city} junk removal",
  "{city} seasonal services",
] as const;

// ---------- Strategy: Vehicle/Van Spotting ----------
// Many service businesses have branded vehicles but no website.
// Reps can photograph vehicles with business info and create prospects.
export type VehicleSpotPayload = {
  business_name: string;
  phone?: string;
  vehicle_description?: string;
  photo_url?: string;
  lat: number;
  lng: number;
};

// ---------- Niche vertical opportunity analysis ----------
// Use this data to prioritize which verticals reps should target

export type VerticalOpportunity = {
  vertical_id: string;
  avg_job_value_cents: number;
  gbp_competition: "low" | "medium" | "high";
  // How many providers in this vertical have a proper website
  // Lower = more opportunity for FlashLocal
  online_saturation: "low" | "medium" | "high";
  // Typical customer acquisition cost for providers in this vertical
  // Higher = more value in our platform
  typical_cac_cents: number;
  pitch_angle: string;
};

export const NICHE_OPPORTUNITIES: VerticalOpportunity[] = [
  {
    vertical_id: "garage-declutter",
    avg_job_value_cents: 800000,
    gbp_competition: "low",
    online_saturation: "low",
    typical_cac_cents: 15000,
    pitch_angle: "Most garage decluttering businesses run on word-of-mouth and Craigslist. A FlashLocal microsite + booking page instantly makes you look professional and lets customers book online. Average job is $5-15K — even one extra booking per month pays for itself many times over.",
  },
  {
    vertical_id: "estate-cleanout",
    avg_job_value_cents: 1000000,
    gbp_competition: "low",
    online_saturation: "low",
    typical_cac_cents: 20000,
    pitch_angle: "Estate cleanouts are high-trust, high-value jobs ($5-20K). Families searching for this service often go with whoever looks most professional online. A FlashLocal site with reviews and booking gives you instant credibility.",
  },
  {
    vertical_id: "closet-org",
    avg_job_value_cents: 500000,
    gbp_competition: "low",
    online_saturation: "low",
    typical_cac_cents: 10000,
    pitch_angle: "Home organization is booming post-Netflix decluttering shows. Most organizers rely on Instagram and word-of-mouth. A bookable microsite turns followers into paying customers.",
  },
  {
    vertical_id: "fence-stain",
    avg_job_value_cents: 300000,
    gbp_competition: "low",
    online_saturation: "low",
    typical_cac_cents: 8000,
    pitch_angle: "Fence staining is seasonal gold — everyone needs it but most people can't find someone to do it. Very few fence stainers have websites. Be the first in your area to show up online.",
  },
  {
    vertical_id: "dryer-vent",
    avg_job_value_cents: 20000,
    gbp_competition: "low",
    online_saturation: "low",
    typical_cac_cents: 5000,
    pitch_angle: "Dryer vent cleaning is a fire safety essential that most homeowners forget about. Low ticket but high volume and recurring. Easy to pitch as a public safety service.",
  },
  {
    vertical_id: "pressure-wash",
    avg_job_value_cents: 40000,
    gbp_competition: "medium",
    online_saturation: "medium",
    typical_cac_cents: 7000,
    pitch_angle: "Pressure washing is competitive online but still lots of solo operators using just their phone number on a truck. A pro page with before/after photos and instant booking beats a phone number every time.",
  },
  {
    vertical_id: "mosquito-treat",
    avg_job_value_cents: 40000,
    gbp_competition: "medium",
    online_saturation: "low",
    typical_cac_cents: 10000,
    pitch_angle: "Mosquito treatment is seasonal but recurring — once customers sign up, they re-book every season. Low competition online, high customer lifetime value.",
  },
  {
    vertical_id: "dog-waste",
    avg_job_value_cents: 15000,
    gbp_competition: "low",
    online_saturation: "low",
    typical_cac_cents: 3000,
    pitch_angle: "Dog waste removal is the ultimate subscription business — weekly visits, auto-pay, low churn. Most operators have zero web presence. A FlashLocal site with auto-booking is an instant upgrade.",
  },
];

// ---------- Lead qualification scoring ----------
// When a rep encounters a business, score how good a lead it is

export type LeadQualification = {
  has_website: boolean;
  has_gbp: boolean;
  has_reviews_online: boolean;
  currently_advertising: boolean;
  high_value_vertical: boolean;
  owner_receptive: boolean;
};

export function qualifyLead(q: LeadQualification): {
  score: number;
  tier: "hot" | "warm" | "cold";
  pitch_priority: string;
} {
  let score = 0;

  // No website = strongest signal
  if (!q.has_website) score += 30;
  // No GBP = customers can't find them on Maps
  if (!q.has_gbp) score += 25;
  // No reviews = no social proof
  if (!q.has_reviews_online) score += 15;
  // Currently advertising = they want customers, just doing it wrong
  if (q.currently_advertising) score += 15;
  // High value vertical = bigger commission potential
  if (q.high_value_vertical) score += 10;
  // Owner is receptive = soft factor but important
  if (q.owner_receptive) score += 5;

  const tier: "hot" | "warm" | "cold" =
    score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";

  const priorities: string[] = [];
  if (!q.has_website) priorities.push("No website — show them how fast FlashLocal sets one up");
  if (!q.has_gbp) priorities.push("No Google Business Profile — offer GBP wizard");
  if (q.currently_advertising) priorities.push("Already spending on ads — show how FlashLocal captures those clicks");
  if (!q.has_reviews_online) priorities.push("No reviews — demo the review collection system");

  return {
    score,
    tier,
    pitch_priority: priorities[0] ?? "General value prop",
  };
}
