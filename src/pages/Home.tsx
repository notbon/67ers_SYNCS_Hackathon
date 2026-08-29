// The "/" route is the Browse Matches experience. The match search itself
// lives in MatchBrowse.tsx (filter by location, sport, skill, date, time);
// Home wraps it with the landing content above and owns the sport-band
// filter, which it hands down to MatchBrowse as a controlled value.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import MatchBrowse from "./MatchBrowse";
import SportIcon from "../components/SportIcon";
import useReveal from "../hooks/useReveal";
import { fetchMatches } from "../services/matchService";
import type { Match } from "../types";
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

function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
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

export default function Home() {
  const [sport, setSport] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const revealRef = useReveal<HTMLDivElement>();

  const nearbyMatches = userLocation
  ? matches
      .filter(
        (match) =>
          match.latitude != null &&
          match.longitude != null
      )
      .map((match) => ({
        match,
        distance: distanceKm(
          userLocation.lat,
          userLocation.lng,
          match.latitude!,
          match.longitude!
        ),
      }))
      .filter(({ distance }) => distance <= 25)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
  : [];

  useEffect(() => {
    fetchMatches()
      .then((data) => {
        setMatches(data);
      })
      .catch((error) => {
        console.error("Could not load matches:", error);
      });
  }, []);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error("Google Maps API key missing");
      return;
    }

    function addMatchMarkers(map: google.maps.Map) {
      matches.forEach((match) => {
        if (match.latitude == null || match.longitude == null) return;

        const marker = new google.maps.Marker({
          position: {
            lat: match.latitude,
            lng: match.longitude,
          },
          map,
          title: match.title,
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="min-width: 180px;">
              <strong>${match.title}</strong>
              <p>${match.sport}</p>
              <p>${match.location}</p>
              <a href="/matches/${match.id}">View Match</a>
            </div>
          `,
        });

        marker.addListener("click", () => {
          infoWindow.open({
            anchor: marker,
            map,
          });
        });
      });
    }

    async function initMap() {
      if (!mapRef.current) return;

      const { Map } =
        await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          setUserLocation(userLocation);

          const map = new Map(mapRef.current!, {
            center: userLocation,
            zoom: 14,
          });

          new google.maps.Marker({
            position: userLocation,
            map,
            title: "You are here",
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#000000",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 3,
            },
          });

          addMatchMarkers(map);
        },
        () => {
          // If they don't allow location, default to Sydney
          const map = new Map(mapRef.current!, {
              center: {
                lat: -33.8688,
                lng: 151.2093,
              },
              zoom: 12,
            });

            addMatchMarkers(map);
        }
      );

    }

    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );

    if (existingScript) {
      if (window.google?.maps) {
        initMap();
      } else {
        existingScript.addEventListener("load", initMap);
      }

      return;
    }

    const script = document.createElement("script");

    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;

    script.async = true;
    script.defer = true;
    script.onload = initMap;

    document.head.appendChild(script);
  }, [matches]);

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
      <section className="nearby-map-section">
        <div className="wrap">
          <h2>Games Near You</h2>
          <p>See pickup games happening around your area.</p>

          <div className="nearby-layout">

            <div className="nearby-list">
              {nearbyMatches.length === 0 ? (
                <p>Finding games near you...</p>
              ) : (
                nearbyMatches.map(({ match, distance }) => (
                  <Link
                    key={match.id}
                    to={`/matches/${match.id}`}
                    className="nearby-card"
                  >
                    <div className="nearby-card-sport">
                      <SportIcon sport={match.sport} size={24} />
                      <span>{match.sport}</span>
                    </div>

                    <h3>{match.title}</h3>

                    <p>{match.location}</p>

                    <strong>
                      {distance.toFixed(1)} km away
                    </strong>
                  </Link>
                ))
              )}
            </div>

            <div
              ref={mapRef}
              className="nearby-map"
            />

          </div>
        </div>
      </section>

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
