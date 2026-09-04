import { createHash } from "node:crypto";

export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractCompanyKey(company: string): string {
  const norm = normalizeString(company);
  const stripped = norm
    .replace(/\b(inc|llc|ltd|limited|gmbh|corp|co|plc|sa|bv|ag|pvt|private)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped || norm;
}

export function extractTitleKey(title: string): string {
  return normalizeString(title);
}

export function extractLocationKey(params: {
  location?: string | null;
  city?: string | null;
  isRemote?: boolean;
}): string {
  const rawLoc = params.city ?? params.location ?? "";
  const firstCitySegment = rawLoc.split(",")[0] || "";
  const normLoc = normalizeString(firstCitySegment);

  if (normLoc.length > 0) {
    return normLoc;
  }

  if (params.isRemote) {
    return "remote";
  }

  return "";
}

export interface DedupeParams {
  company: string;
  title: string;
  location?: string | null;
  city?: string | null;
  isRemote?: boolean;
}

export function generateDedupeKey(params: DedupeParams): string {
  const companyKey = extractCompanyKey(params.company);
  const titleKey = extractTitleKey(params.title);
  const locationKey = extractLocationKey(params);

  const rawString = `${companyKey}|${titleKey}|${locationKey}`;
  return createHash("sha256").update(rawString).digest("hex");
}
