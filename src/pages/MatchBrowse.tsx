import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMatches } from "../services/matchService";
import {
  LOCATION_MATCH_THRESHOLD,
  locationScore,
} from "../lib/locationMatch";
import SportIcon from "../components/SportIcon";
import HostBadge from "../components/HostBadge";
import { fetchHostsByToken } from "../services/hostService";
import { fetchParticipantCounts } from "../services/matchService";
import { sportVars } from "../lib/sportTheme";
import { getHostToken, type PlayerToken } from "../lib/playerToken";
import type { Match, MatchHost } from "../types";
import "./MatchBrowse.css";

// Keep these in step with the options offered in CreateMatch.tsx.
const SPORTS = [
  "Soccer",
  "Basketball",
  "Tennis",
  "Volleyball",
  "Touch Football",
  "Running",
];

const SKILL_LEVELS = [
  "Beginner",
  "Casual",
  "Intermediate",
  "Advanced",
  "All Levels",
];

type Filters = {
  location: string;
  sport: string;
  skillLevel: string;
  dateFrom: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
};

const EMPTY_FILTERS: Filters = {
  location: "",
  sport: "",
  skillLevel: "",
  dateFrom: "",
  dateTo: "",
  timeFrom: "",
  timeTo: "",
};

/** "18:30:00" | "18:30" -> "18:30" so <input type="time"> values compare. */
function toHhMm(time: string): string {
  return (time ?? "").slice(0, 5);
}

/**
 * A requested skill level is satisfied by an exact match, by a match that is
 * open to "All Levels", or by one that never specified a level. Searching for
 * "All Levels" itself means "don't care".
 */
function skillLevelMatches(matchSkill: string | null, wanted: string): boolean {
  if (!wanted || wanted === "All Levels") return true;
  if (!matchSkill || matchSkill === "All Levels") return true;
  return matchSkill === wanted;
}

function matchesFilters(match: Match, filters: Filters): boolean {
  if (filters.sport && match.sport !== filters.sport) return false;

  if (!skillLevelMatches(match.skill_level, filters.skillLevel)) return false;

  if (filters.dateFrom && match.match_date < filters.dateFrom) return false;
  if (filters.dateTo && match.match_date > filters.dateTo) return false;

  const time = toHhMm(match.match_time);
  if (filters.timeFrom && time < filters.timeFrom) return false;
  if (filters.timeTo && time > filters.timeTo) return false;

  if (
    filters.location.trim() &&
    locationScore(match.location, filters.location) < LOCATION_MATCH_THRESHOLD
  ) {
    return false;
  }

  return true;
}

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(time: string): string {
  const hhmm = toHhMm(time);
  const parsed = new Date(`2000-01-01T${hhmm}:00`);
  if (Number.isNaN(parsed.getTime())) return hhmm;
  return parsed.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

type MatchBrowseProps = {
  /** Optional controlled sport filter, driven by the sport band on Home. */
  sport?: string;
  onSportChange?: (sport: string) => void;
};

export default function MatchBrowse({
  sport,
  onSportChange,
}: MatchBrowseProps = {}) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [hosts, setHosts] = useState<Map<PlayerToken, MatchHost>>(new Map());
  const [rosters, setRosters] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const locationContainerRef = useRef<HTMLDivElement>(null);

  const locationAutocompleteRef =
  useRef<google.maps.places.PlaceAutocompleteElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchMatches()
      .then((data) => {
        if (!cancelled) setMatches(data);
      })
      .catch((err) => {
        console.error("Failed to load matches:", err);
        if (!cancelled) setError("Could not load matches. Try again shortly.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // How many players are signed up to each match, in one batch.
  useEffect(() => {
    if (matches.length === 0) return;
    let cancelled = false;

    fetchParticipantCounts(matches.map((m) => m.id))
      .then((counts) => {
        if (!cancelled) setRosters(counts);
      })
      .catch((err) => console.error("Failed to load roster counts:", err));

    return () => {
      cancelled = true;
    };
  }, [matches]);

  // Resolve host profiles (photo + name) for the loaded matches in one batch.
  // Purely decorative, so failures inside fetchHostsByToken degrade to no badge.
  useEffect(() => {
    if (matches.length === 0) return;

    let cancelled = false;
    fetchHostsByToken(matches.map(getHostToken)).then((resolved) => {
      if (!cancelled) setHosts(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [matches]);

  function hostFor(match: Match): MatchHost | null {
    const token = getHostToken(match);
    return (token && hosts.get(token)) || match.host || null;
  }

  useEffect(() => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error("Google Maps API key missing");
    return;
  }

  async function initAutocomplete() {
    if (!locationContainerRef.current) return;

    const { PlaceAutocompleteElement } =
      await google.maps.importLibrary(
        "places"
      ) as google.maps.PlacesLibrary;

    const autocomplete = new PlaceAutocompleteElement();

    autocomplete.placeholder = "Search for a location";

    locationAutocompleteRef.current = autocomplete;

    autocomplete.addEventListener(
      "gmp-select",
      async (
        event: google.maps.places.PlacePredictionSelectEvent
      ) => {
        const place = event.placePrediction.toPlace();

        await place.fetchFields({
          fields: ["displayName", "formattedAddress"],
        });

        const selectedLocation =
          place.formattedAddress ||
          place.displayName ||
          "";

        updateFilter("location", selectedLocation);
      }
    );

    locationContainerRef.current.innerHTML = "";
    locationContainerRef.current.appendChild(autocomplete);
  }

  if (window.google?.maps) {
    initAutocomplete();
    return;
  }

  const existingScript = document.querySelector(
    'script[src*="maps.googleapis.com/maps/api/js"]'
  );

  if (existingScript) {
    existingScript.addEventListener("load", initAutocomplete);
    return;
  }

  const script = document.createElement("script");

  script.src =
    `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;

  script.async = true;
  script.defer = true;
  script.onload = initAutocomplete;

  document.head.appendChild(script);
}, []);

  // Mirror the controlled sport value into the internal filter state.
  useEffect(() => {
    if (sport === undefined) return;
    setFilters((prev) => (prev.sport === sport ? prev : { ...prev, sport }));
  }, [sport]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    if (key === "sport") onSportChange?.(value as string);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    onSportChange?.("");

    if (locationAutocompleteRef.current) {
      locationAutocompleteRef.current.value = "";
    }
  }

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((value) => value.trim() !== ""),
    [filters],
  );

  const visibleMatches = useMemo(() => {
    const locationQuery = filters.location.trim();

    return matches
      .map((match) => ({
        match,
        locationScore: locationQuery
          ? locationScore(match.location, locationQuery)
          : 1,
      }))
      .filter(({ match }) => matchesFilters(match, filters))
      .sort((a, b) => {
        // When searching by location, closest match first; otherwise soonest.
        if (locationQuery && b.locationScore !== a.locationScore) {
          return b.locationScore - a.locationScore;
        }
        if (a.match.match_date !== b.match.match_date) {
          return a.match.match_date < b.match.match_date ? -1 : 1;
        }
        return toHhMm(a.match.match_time) < toHhMm(b.match.match_time) ? -1 : 1;
      });
  }, [matches, filters]);

  return (
    <section className="page match-browse" aria-labelledby="browse-title">
      <div className="section-head">
        <h2 id="browse-title">Browse matches</h2>
      </div>
      <p className="page-subtitle">Find a game near you and jump in.</p>

      <form className="filters" onSubmit={(e) => e.preventDefault()}>
        <div className="filter filter--wide">
          <span>Location</span>

          <div
            ref={locationContainerRef}
            className="browse-location-autocomplete"
          />
        </div>

        <label className="filter">
          <span>Sport</span>
          <select
            value={filters.sport}
            onChange={(e) => updateFilter("sport", e.target.value)}
          >
            <option value="">Any sport</option>
            {SPORTS.map((sport) => (
              <option key={sport} value={sport}>
                {sport}
              </option>
            ))}
          </select>
        </label>

        <label className="filter">
          <span>Skill level</span>
          <select
            value={filters.skillLevel}
            onChange={(e) => updateFilter("skillLevel", e.target.value)}
          >
            <option value="">Any skill level</option>
            {SKILL_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>

        <label className="filter">
          <span>Date from</span>
          <input
            type="date"
            value={filters.dateFrom}
            max={filters.dateTo || undefined}
            onChange={(e) => updateFilter("dateFrom", e.target.value)}
          />
        </label>

        <label className="filter">
          <span>Date to</span>
          <input
            type="date"
            value={filters.dateTo}
            min={filters.dateFrom || undefined}
            onChange={(e) => updateFilter("dateTo", e.target.value)}
          />
        </label>

        <label className="filter">
          <span>Earliest time</span>
          <input
            type="time"
            value={filters.timeFrom}
            onChange={(e) => updateFilter("timeFrom", e.target.value)}
          />
        </label>

        <label className="filter">
          <span>Latest time</span>
          <input
            type="time"
            value={filters.timeTo}
            onChange={(e) => updateFilter("timeTo", e.target.value)}
          />
        </label>

        <button
          type="button"
          className="filters-clear"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
        >
          Clear filters
        </button>
      </form>

      {loading && <p className="match-browse-status">Loading matches…</p>}

      {error && !loading && (
        <p className="match-browse-status match-browse-status--error">{error}</p>
      )}

      {!loading && !error && (
        <>
          <p className="match-browse-count" aria-live="polite">
            {visibleMatches.length}{" "}
            {visibleMatches.length === 1 ? "match" : "matches"}
            {hasActiveFilters ? " matching your filters" : ""}
          </p>

          {visibleMatches.length === 0 ? (
            <p className="match-browse-status">
              No matches found. Try widening your search.
            </p>
          ) : (
            <ul className="match-list" role="list">
              {visibleMatches.map(({ match, locationScore: score }, index) => (
                <li
                  key={match.id}
                  className="match-item"
                  style={{ animationDelay: `${Math.min(index, 7) * 45}ms` }}
                >
                  <Link
                    to={`/matches/${match.id}`}
                    className="match-card"
                    style={sportVars(match.sport)}
                  >
                    <span className="match-card-bar" aria-hidden="true" />

                    <div className="match-card-top">
                      <span className="match-card-sport">
                        <SportIcon sport={match.sport} size={15} />
                        {match.sport}
                      </span>
                      <span className="match-card-skill">
                        {match.skill_level ?? "All levels"}
                      </span>
                    </div>

                    <h3>{match.title}</h3>

                    <dl className="match-card-facts">
                      <dt className="visually-hidden">Location</dt>
                      <dd>
                        {match.location}
                        {filters.location.trim() && score < 0.95 && (
                          <span className="match-card-approx"> · close match</span>
                        )}
                      </dd>
                      <dt className="visually-hidden">When</dt>
                      <dd>
                        {formatDate(match.match_date)} ·{" "}
                        {formatTime(match.match_time)}
                      </dd>
                    </dl>

                    <div className="match-card-foot">
                      <HostBadge host={hostFor(match)} size={34} />
                      <span className="match-roster">
                        <span className="match-roster-count">
                          {rosters.get(match.id) ?? 0}
                          <span className="match-roster-max">
                            /{match.max_players}
                          </span>
                        </span>
                        <span className="match-roster-label">going</span>
                      </span>
                    </div>

                    <span
                      className="match-roster-bar"
                      aria-hidden="true"
                      style={{
                        // Clamp so an over-subscribed match doesn't overflow.
                        "--fill": `${Math.min(
                          100,
                          match.max_players > 0
                            ? ((rosters.get(match.id) ?? 0) / match.max_players) * 100
                            : 0,
                        )}%`,
                      } as React.CSSProperties}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
