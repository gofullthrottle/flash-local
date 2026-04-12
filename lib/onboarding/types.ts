export type PlanType = "UPFRONT" | "REV_SHARE";
export type PlanTier = "STARTER" | "PRO" | "PREMIUM";

export type WizardStepId =
  | "plan"
  | "tier"
  | "service"
  | "brand"
  | "pricing"
  | "payments"
  | "preview"
  | "google";

export const PLAN_TIERS = [
  {
    id: "STARTER" as PlanTier,
    label: "Starter",
    priceCentsMonthly: 0,
    description: "Get your business online free",
    features: [
      "Microsite with booking",
      "Up to 3 service packages",
      "Review collection",
      "Basic analytics",
    ],
  },
  {
    id: "PRO" as PlanTier,
    label: "Pro",
    priceCentsMonthly: 2900,
    description: "Grow with premium tools",
    features: [
      "Everything in Starter",
      "Unlimited packages",
      "Custom domain",
      "Google Business Profile setup",
      "Priority support",
    ],
    popular: true,
  },
  {
    id: "PREMIUM" as PlanTier,
    label: "Premium",
    priceCentsMonthly: 7900,
    description: "Full-service business toolkit",
    features: [
      "Everything in Pro",
      "Automated ad management",
      "Advanced analytics",
      "Dedicated onboarding",
      "API access",
    ],
  },
] as const;

export interface OnboardingData {
  plan: PlanType | null;
  tier: PlanTier;
  service: {
    verticalId: string;
    serviceArea: string;
    timezone: string;
  };
  brand: {
    displayName: string;
    slug: string;
    phone: string;
    email: string;
  };
  pricing: {
    packages: PackageInput[];
    depositEnabled: boolean;
    depositPercent: number;
  };
  payments: {
    setupComplete: boolean;
  };
}

export interface PackageInput {
  name: string;
  priceCents: number;
  description: string;
  includes: string[];
  recommended: boolean;
}

export const VERTICALS = [
  // Seasonal
  { id: "holiday-lights", label: "Holiday Light Installation", icon: "sparkles", category: "seasonal" },
  { id: "exterior-decor", label: "Exterior Holiday Decorating", icon: "home", category: "seasonal" },
  { id: "tree-delivery", label: "Tree Pickup & Delivery", icon: "trees", category: "seasonal" },
  { id: "tree-removal", label: "Tree Removal & Disposal", icon: "trash", category: "seasonal" },
  { id: "gift-wrapping", label: "Gift Wrapping", icon: "gift", category: "seasonal" },
  { id: "nye-cleanup", label: "New Year's Eve Cleanup", icon: "party", category: "seasonal" },
  { id: "snow-shoveling", label: "Snow Shoveling & De-ice", icon: "snow", category: "seasonal" },
  { id: "pool-open-close", label: "Pool Opening & Closing", icon: "waves", category: "seasonal" },
  // Home services (high-value niches)
  { id: "garage-declutter", label: "Garage Decluttering & Organization", icon: "archive", category: "home" },
  { id: "estate-cleanout", label: "Estate Cleanout", icon: "building", category: "home" },
  { id: "closet-org", label: "Closet & Home Organization", icon: "layout", category: "home" },
  { id: "junk-haul", label: "Junk Haul / Donation Runs", icon: "truck", category: "home" },
  { id: "dryer-vent", label: "Dryer Vent Cleaning", icon: "wind", category: "home" },
  // Outdoor
  { id: "pressure-wash", label: "Pressure Washing", icon: "droplets", category: "outdoor" },
  { id: "gutter-clean", label: "Gutter Cleaning", icon: "filter", category: "outdoor" },
  { id: "fence-stain", label: "Fence Staining & Repair", icon: "fence", category: "outdoor" },
  { id: "window-clean", label: "Window Cleaning", icon: "sparkle", category: "outdoor" },
  { id: "mosquito-treat", label: "Mosquito & Pest Treatment", icon: "bug", category: "outdoor" },
  // Specialty
  { id: "party-setup", label: "Party Setup & Teardown", icon: "tent", category: "event" },
  { id: "handyman", label: "Handyman", icon: "wrench", category: "specialty" },
  { id: "mobile-detail", label: "Mobile Auto Detailing", icon: "car", category: "specialty" },
  { id: "dog-waste", label: "Dog Waste Removal", icon: "paw-print", category: "home" },
  { id: "pet-portrait", label: "Pet Photography", icon: "camera", category: "specialty" },
  { id: "meal-prep", label: "Meal Prep & Delivery", icon: "utensils", category: "specialty" },
  { id: "errand-concierge", label: "Errand & Concierge Service", icon: "clipboard", category: "specialty" },
] as const;

export type VerticalId = (typeof VERTICALS)[number]["id"];

export const DEFAULT_PACKAGES: Record<string, PackageInput[]> = {
  "holiday-lights": [
    {
      name: "Basic",
      priceCents: 19900,
      description: "Up to 100ft of lights, single story",
      includes: ["100ft LED lights", "Installation", "Removal in January"],
      recommended: false,
    },
    {
      name: "Standard",
      priceCents: 39900,
      description: "Up to 250ft, two stories, roofline + bushes",
      includes: [
        "250ft LED lights",
        "Roofline + bushes",
        "Installation & removal",
        "Timer setup",
      ],
      recommended: true,
    },
    {
      name: "Premium",
      priceCents: 79900,
      description: "Full property, custom design, all structures",
      includes: [
        "Unlimited lights",
        "Custom design consultation",
        "All structures",
        "Installation & removal",
        "Maintenance visits",
      ],
      recommended: false,
    },
  ],
  "snow-shoveling": [
    {
      name: "Driveway",
      priceCents: 4900,
      description: "Standard driveway + walkway clearing",
      includes: ["Driveway", "Front walkway", "Salt application"],
      recommended: false,
    },
    {
      name: "Full Property",
      priceCents: 9900,
      description: "Driveway, walkways, stairs, porch",
      includes: [
        "Driveway",
        "All walkways",
        "Stairs & porch",
        "Salt application",
      ],
      recommended: true,
    },
    {
      name: "Monthly",
      priceCents: 29900,
      description: "Unlimited visits for the month",
      includes: [
        "Unlimited snow removal",
        "Full property",
        "Salt included",
        "Priority response",
      ],
      recommended: false,
    },
  ],
};

export const INITIAL_DATA: OnboardingData = {
  plan: null,
  tier: "STARTER",
  service: {
    verticalId: "",
    serviceArea: "",
    timezone: "America/Los_Angeles",
  },
  brand: {
    displayName: "",
    slug: "",
    phone: "",
    email: "",
  },
  pricing: {
    packages: [],
    depositEnabled: true,
    depositPercent: 30,
  },
  payments: {
    setupComplete: false,
  },
};
