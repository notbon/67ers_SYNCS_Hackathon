// The "/" route is the Browse Matches experience. The match search itself
// lives in MatchBrowse.tsx (filter by location, sport, skill, date, time);
// Home wraps it with the landing content above and owns the sport-band
// filter, which it hands down to MatchBrowse as a controlled value.
import { useState } from "react";
import { Link } from "react-router-dom";
import MatchBrowse from "./MatchBrowse";
import SportIcon from "../components/SportIcon";
import useReveal from "../hooks/useReveal";
import "./Home.css";

// Keep in step with the options in CreateMatch.tsx and MatchBrowse.tsx.
const SPORT_BAND = [
  "Soccer",
  "Basketball",
  "Tennis",
  "Volleyball",
  "Touch Football",
  "Running",
];

const STEPS = [
  {
    n: "01",
    title: "Search your area",
    body: "Filter by location, sport, skill level and the times you're actually free.",
  },
  {
    n: "02",
    title: "Claim a spot",
    body: "Every match shows the roster cap, so you know if there's room before you turn up.",
  },
  {
    n: "03",
    title: "Or host your own",
    body: "Post a game in under a minute and let the roster fill itself.",
  },
];

export default function Home() {
  const [sport, setSport] = useState("");
  const revealRef = useReveal<HTMLDivElement>();

  // Clicking the active sport clears it, so the band works as a toggle.
  function pickSport(next: string) {
    setSport((current) => (current === next ? "" : next));

    document
      .getElementById("browse")
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  return (
    <div ref={revealRef}>
      <section className="hero full-bleed section-dark" aria-labelledby="hero-title">
        <div className="wrap hero-inner">
          <p className="eyebrow">Pickup sport, sorted</p>
          <h1 id="hero-title">
            Find your
            <br />
            next <span className="mark">game</span>
          </h1>
          <p className="hero-sub">
            Local matches you can actually get to, filtered by sport, skill and
            the hours you're free. Join in minutes — or post your own and fill
            the roster.
          </p>
          <div className="hero-actions">
            <Link to="/create" className="btn-primary">
              Create a match
            </Link>
            <a href="#browse" className="btn-outline">
              Browse matches
            </a>
          </div>
        </div>
      </section>

      <div className="sport-band full-bleed">
        <div className="wrap sport-band-inner">
          <h2 className="visually-hidden" id="sport-band-title">
            Filter matches by sport
          </h2>
          <ul className="sport-band-list" role="list" aria-labelledby="sport-band-title">
            {SPORT_BAND.map((name) => {
              const selected = sport === name;
              return (
                <li key={name}>
                  <button
                    type="button"
                    className={`sport-chip ${selected ? "is-selected" : ""}`}
                    aria-pressed={selected}
                    onClick={() => pickSport(name)}
                  >
                    <SportIcon sport={name} size={26} />
                    <span>{name}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {sport && (
            <button
              type="button"
              className="sport-band-clear"
              onClick={() => setSport("")}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <section className="steps" aria-labelledby="steps-title">
        <h2 id="steps-title" className="visually-hidden">
          How MatchUp works
        </h2>
        <ol className="steps-grid" role="list">
          {STEPS.map((step, i) => (
            <li
              key={step.n}
              className="step"
              data-reveal
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <span className="step-n" aria-hidden="true">
                {step.n}
              </span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <div id="browse">
        <MatchBrowse sport={sport} onSportChange={setSport} />
      </div>
    </div>
  );
}
