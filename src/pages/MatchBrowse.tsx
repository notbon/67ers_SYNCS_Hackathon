import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMatches } from "../services/matchService";
import {
  LOCATION_MATCH_THRESHOLD,
  locationScore,
} from "../lib/locationMatch";
import SportIcon from "../components/SportIcon";
import type { Match } from "../types";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

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
        <label className="filter filter--wide">
          <span>Location</span>
          <input
            type="search"
            placeholder="e.g. Moore Park, Sydney"
            value={filters.location}
            onChange={(e) => updateFilter("location", e.target.value)}
          />
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
                  <Link to={`/matches/${match.id}`} className="match-card">
                    <div className="match-card-head">
                      <h3>{match.title}</h3>
                      <span className="match-card-sport">
                        <SportIcon sport={match.sport} size={15} />
                        {match.sport}
                      </span>
                    </div>

                    <dl className="match-card-meta">
                      <div>
                        <dt>Location</dt>
                        <dd>
                          {match.location}
                          {filters.location.trim() && score < 0.95 && (
                            <span className="match-card-approx">
                              {" "}
                              · close match
                            </span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>When</dt>
                        <dd>
                          {formatDate(match.match_date)} ·{" "}
                          {formatTime(match.match_time)}
                        </dd>
                      </div>
                      <div>
                        <dt>Skill</dt>
                        <dd>{match.skill_level ?? "All levels"}</dd>
                      </div>
                      <div>
                        <dt>Players</dt>
                        <dd>up to {match.max_players}</dd>
                      </div>
                    </dl>
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
