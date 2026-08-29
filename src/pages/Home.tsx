// The "/" route is the Browse Matches experience. The match search itself
// lives in MatchBrowse.tsx (filter by location, sport, skill, date, time);
// Home wraps it with the landing content above so App.tsx routing and
// MatchBrowse's logic stay untouched.
import { Link } from "react-router-dom";
import MatchBrowse from "./MatchBrowse";
import SportIcon from "../components/SportIcon";
import "./Home.css";

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
  return (
    <>
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
        <ul className="wrap sport-band-inner" role="list">
          {SPORT_BAND.map((sport) => (
            <li key={sport} className="sport-chip">
              <SportIcon sport={sport} size={26} />
              <span>{sport}</span>
            </li>
          ))}
        </ul>
      </div>

      <section className="steps" aria-labelledby="steps-title">
        <h2 id="steps-title" className="visually-hidden">
          How MatchUp works
        </h2>
        <ol className="steps-grid" role="list">
          {STEPS.map((step) => (
            <li key={step.n} className="step">
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
        <MatchBrowse />
      </div>
    </>
  );
}
