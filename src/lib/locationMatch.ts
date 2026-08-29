// Fuzzy comparison between the free-text `location` a user typed when creating
// a match (e.g. "Moore Park, Sydney") and whatever a browsing user types into
// the location search box (e.g. "moore park" or "sydny park"). Neither side is
// structured, so we normalise both and score their overlap instead of asking
// for an exact string match.

const STOP_WORDS = new Set([
  "the",
  "at",
  "in",
  "on",
  "near",
  "by",
  "of",
  "and",
  "a",
]);

/** lowercase, strip accents + punctuation, collapse whitespace. */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining accent marks
    .replace(/[^a-z0-9\s]/g, " ") // punctuation -> space
    .replace(/\s+/g, " ")
    .trim();
}

/** meaningful words only (drops stop words and empties). */
function tokenise(value: string): string[] {
  return normalise(value)
    .split(" ")
    .filter((token) => token.length > 0 && !STOP_WORDS.has(token));
}

/** set of character bigrams for the whitespace-stripped string. */
function bigrams(value: string): Set<string> {
  const compact = normalise(value).replace(/\s/g, "");
  const grams = new Set<string>();
  for (let i = 0; i < compact.length - 1; i += 1) {
    grams.add(compact.slice(i, i + 2));
  }
  return grams;
}

/** Sørensen–Dice similarity of two strings, 0..1. Tolerates typos. */
function diceCoefficient(a: string, b: string): number {
  const gramsA = bigrams(a);
  const gramsB = bigrams(b);
  if (gramsA.size === 0 || gramsB.size === 0) return 0;

  let overlap = 0;
  for (const gram of gramsA) {
    if (gramsB.has(gram)) overlap += 1;
  }
  return (2 * overlap) / (gramsA.size + gramsB.size);
}

/**
 * Score how well `matchLocation` (as typed into the DB) satisfies the browsing
 * user's `query`. Returns 0..1 — 1 is a clean hit, 0 is unrelated. An empty
 * query matches everything.
 */
export function locationScore(matchLocation: string, query: string): number {
  const normalisedQuery = normalise(query);
  if (!normalisedQuery) return 1;

  const normalisedLocation = normalise(matchLocation);
  if (!normalisedLocation) return 0;

  // 1. One contains the other outright: "moore park" vs "moore park, sydney".
  if (
    normalisedLocation.includes(normalisedQuery) ||
    normalisedQuery.includes(normalisedLocation)
  ) {
    return 1;
  }

  // 2. Token coverage: does every meaningful word in the query turn up in the
  //    stored location, as a whole word or a prefix ("alex" -> "alexandria")?
  const queryTokens = tokenise(query);
  const locationTokens = tokenise(matchLocation);

  if (queryTokens.length > 0 && locationTokens.length > 0) {
    const covered = queryTokens.filter((queryToken) =>
      locationTokens.some(
        (locationToken) =>
          locationToken === queryToken ||
          locationToken.startsWith(queryToken) ||
          queryToken.startsWith(locationToken),
      ),
    ).length;

    const coverage = covered / queryTokens.length;
    if (coverage === 1) return 0.95;
    if (coverage > 0) {
      return Math.max(coverage * 0.8, diceCoefficient(matchLocation, query));
    }
  }

  // 3. Pure fuzzy fallback for misspellings: "sydny park" vs "Sydney Park".
  return diceCoefficient(matchLocation, query);
}

/** Minimum score for a match to be considered a location hit. */
export const LOCATION_MATCH_THRESHOLD = 0.45;

/** Convenience boolean wrapper around {@link locationScore}. */
export function locationMatches(matchLocation: string, query: string): boolean {
  return locationScore(matchLocation, query) >= LOCATION_MATCH_THRESHOLD;
}
