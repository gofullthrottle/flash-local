export type PlanType = "UPFRONT" | "REV_SHARE";

export type WizardStepId =
  | "plan"
  | "service"
  | "brand"
  | "pricing"
  | "payments"
  | "preview"
  | "google";

export interface OnboardingData {
  plan: PlanType | null;
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
  { id: "holiday-lights", label: "Holiday Light Installation", icon: "sparkles" },
  { id: "exterior-decor", label: "Exterior Holiday Decorating", icon: "home" },
  { id: "tree-delivery", label: "Tree Pickup & Delivery", icon: "trees" },
  { id: "tree-removal", label: "Tree Removal & Disposal", icon: "trash" },
  { id: "gift-wrapping", label: "Gift Wrapping", icon: "gift" },
  { id: "nye-cleanup", label: "New Year's Eve Cleanup", icon: "party" },
  { id: "party-setup", label: "Party Setup & Teardown", icon: "tent" },
  { id: "snow-shoveling", label: "Snow Shoveling & De-ice", icon: "snow" },
  { id: "junk-haul", label: "Junk Haul / Donation Runs", icon: "truck" },
  { id: "handyman", label: "Holiday Handyman", icon: "wrench" },
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
