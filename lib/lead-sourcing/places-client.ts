/**
 * Google Places API (New) client — Text Search + Place Details
 * Docs: https://developers.google.com/maps/documentation/places/web-service/search-text
 */

const PLACES_BASE = "https://places.googleapis.com/v1/places";

export type PlaceResult = {
  place_id: string;
  name: string;
  formatted_address: string;
  phone_number?: string;
  website_uri?: string;
  rating?: number;
  user_rating_count: number;
  photo_count: number;
  business_status?: string;
  location?: { lat: number; lng: number };
};

type RawPlace = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  photos?: unknown[];
  businessStatus?: string;
  location?: { latitude: number; longitude: number };
};

export async function searchPlaces(params: {
  query: string;
  lat: number;
  lng: number;
  radiusMeters: number;
}): Promise<{ results: PlaceResult[]; configured: boolean }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return { results: [], configured: false };
  }

  const body = {
    textQuery: params.query,
    locationBias: {
      circle: {
        center: { latitude: params.lat, longitude: params.lng },
        radius: Math.min(params.radiusMeters, 50000),
      },
    },
    maxResultCount: 20,
  };

  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.internationalPhoneNumber",
    "places.websiteUri",
    "places.rating",
    "places.userRatingCount",
    "places.photos",
    "places.businessStatus",
    "places.location",
  ].join(",");

  try {
    const res = await fetch(`${PLACES_BASE}:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Places API ${res.status}: ${text}`);
    }

    const data = (await res.json()) as { places?: RawPlace[] };
    const results: PlaceResult[] = (data.places ?? []).map((p) => ({
      place_id: p.id,
      name: p.displayName?.text ?? "Unknown",
      formatted_address: p.formattedAddress ?? "",
      phone_number: p.internationalPhoneNumber,
      website_uri: p.websiteUri,
      rating: p.rating,
      user_rating_count: p.userRatingCount ?? 0,
      photo_count: p.photos?.length ?? 0,
      business_status: p.businessStatus,
      location: p.location
        ? { lat: p.location.latitude, lng: p.location.longitude }
        : undefined,
    }));

    return { results, configured: true };
  } catch (err) {
    console.error("[places:error]", err);
    return { results: [], configured: true };
  }
}
