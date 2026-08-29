import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMatches } from "../services/matchService";
import SportIcon from "../components/SportIcon";
import HostBadge from "../components/HostBadge";
import { fetchHostsByToken } from "../services/hostService";
import { fetchParticipants } from "../services/matchService";
import type { MatchPlayer } from "../services/matchService";
import { avatarColour, initials } from "../lib/avatar";
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

function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;

  const toRad = (degrees: number) =>
    (degrees * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}


function matchesFilters(match: Match, filters: Filters): boolean {
  if (filters.sport && match.sport !== filters.sport) return false;

  if (!skillLevelMatches(match.skill_level, filters.skillLevel)) return false;

  if (filters.dateFrom && match.match_date < filters.dateFrom) return false;
  if (filters.dateTo && match.match_date > filters.dateTo) return false;

  const time = toHhMm(match.match_time);
  if (filters.timeFrom && time < filters.timeFrom) return false;
  if (filters.timeTo && time > filters.timeTo) return false;

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
  const [rosters, setRosters] = useState<Map<string, MatchPlayer[]>>(new Map());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [searchCoords, setSearchCoords] = useState<{
  lat: number;
  lng: number;
} | null>(null);

  const [radiusKm, setRadiusKm] = useState(5);
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

    fetchParticipants(matches.map((m) => m.id))
      .then((people) => {
        if (!cancelled) setRosters(people);
      })
      .catch((err) => console.error("Failed to load rosters:", err));

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
          fields: ["displayName", "formattedAddress", "location"],
        });

        const selectedLocation =
          place.formattedAddress ||
          place.displayName ||
          "";

        updateFilter("location", selectedLocation);

        if (place.location) {
          setSearchCoords({
            lat: place.location.lat(),
            lng: place.location.lng(),
          });
        }
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
    setSearchCoords(null);
    setRadiusKm(5);
    onSportChange?.("");

    if (locationAutocompleteRef.current) {
      locationAutocompleteRef.current.value = "";
    }
  }

  // Active filters living inside the collapsed group — surfaced on the toggle
  // so a filter is never silently applied out of sight.
  const advancedCount = useMemo(
    () =>
      [
        filters.skillLevel,
        filters.dateFrom,
        filters.dateTo,
        filters.timeFrom,
        filters.timeTo,
      ].filter((v) => v.trim() !== "").length,
    [filters],
  );

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((value) => value.trim() !== ""),
    [filters],
  );

  const visibleMatches = useMemo(() => {
  return matches
    .map((match) => {
      let distance: number | null = null;

      if (
        searchCoords &&
        match.latitude != null &&
        match.longitude != null
      ) {
        distance = distanceKm(
          searchCoords.lat,
          searchCoords.lng,
          match.latitude,
          match.longitude
        );
      }

      return {
        match,
        distance,
      };
    })
    .filter(({ match, distance }) => {
      if (!matchesFilters(match, filters)) {
        return false;
      }

      if (searchCoords) {
        if (distance === null) {
          return false;
        }

        if (distance > radiusKm) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      if (
        searchCoords &&
        a.distance !== null &&
        b.distance !== null
      ) {
        return a.distance - b.distance;
      }

      if (a.match.match_date !== b.match.match_date) {
        return a.match.match_date < b.match.match_date
          ? -1
          : 1;
      }

      return toHhMm(a.match.match_time) <
        toHhMm(b.match.match_time)
        ? -1
        : 1;
    });
}, [matches, filters, searchCoords, radiusKm]);

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
            <span>Radius</span>

            <select
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
            >
              <option value={1}>Within 1 km</option>
              <option value={2}>Within 2 km</option>
              <option value={5}>Within 5 km</option>
              <option value={10}>Within 10 km</option>
              <option value={25}>Within 25 km</option>
              <option value={50}>Within 50 km</option>
            </select>
          </label>

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

        <div className="filters-advanced-toggle">
          <button
            type="button"
            className="filters-more"
            aria-expanded={showAdvanced}
            aria-controls="advanced-filters"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? "Fewer filters" : "More filters"}
            {!showAdvanced && advancedCount > 0 && (
              <span className="filters-more-count">{advancedCount}</span>
            )}
          </button>
        </div>

        <div
          id="advanced-filters"
          className="filters-advanced"
          hidden={!showAdvanced}
        >
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

        </div>

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
              {visibleMatches.map(({ match, distance }, index) => (
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
                        {distance !== null && (
                          <span className="match-card-approx">
                            {" "}
                            · {distance.toFixed(1)} km away
                          </span>
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
                      {(() => {
                        const players = rosters.get(match.id) ?? [];
                        const shown = players.slice(0, 3);
                        const extra = players.length - shown.length;
                        return (
                          <span className="match-roster">
                            {players.length > 0 && (
                              <span className="roster-faces" aria-hidden="true">
                                {shown.map((p) => (
                                  <span
                                    key={p.id}
                                    className="roster-face"
                                    style={{ background: avatarColour(p.id) }}
                                    title={p.name}
                                  >
                                    {initials(p.name)}
                                  </span>
                                ))}
                                {extra > 0 && (
                                  <span className="roster-face roster-face--more">
                                    +{extra}
                                  </span>
                                )}
                              </span>
                            )}
                            <span className="match-roster-count">
                              {players.length}
                              <span className="match-roster-max">
                                /{match.max_players}
                              </span>
                              <span className="visually-hidden"> players going</span>
                            </span>
                          </span>
                        );
                      })()}
                    </div>

                    <span
                      className="match-roster-bar"
                      aria-hidden="true"
                      style={{
                        // Clamp so an over-subscribed match doesn't overflow.
                        "--fill": `${Math.min(
                          100,
                          match.max_players > 0
                            ? ((rosters.get(match.id)?.length ?? 0) /
                                match.max_players) *
                              100
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
