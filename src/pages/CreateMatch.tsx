import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createMatch } from "../services/matchService";
import { useAuth } from "../context/AuthContext";
import "./CreateMatch.css";
import { supabase } from "../lib/supabase";

function CreateMatch() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [title, setTitle] = useState("");
  const [sport, setSport] = useState("");
  const [location, setLocation] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("");
  const [skillLevel, setSkillLevel] = useState("");
  const [description, setDescription] = useState("");

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // When Google Maps can't load (missing/invalid key, Places API off, offline)
  // fall back to a plain text location field rather than rendering nothing.
  const [mapsFailed, setMapsFailed] = useState(false);

  const locationRef = useRef<HTMLDivElement>(null);
  const autocompleteElementRef =
  useRef<google.maps.places.PlaceAutocompleteElement | null>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey === "<key>") {
      console.error(
        "Google Maps API key missing or still a placeholder — " +
          "falling back to a plain location field.",
      );
      setMapsFailed(true);
      return;
    }

async function initAutocomplete() {
  if (!locationRef.current) return;

  try {
  const { PlaceAutocompleteElement } =
    await google.maps.importLibrary("places") as google.maps.PlacesLibrary;

  const placeAutocomplete = new PlaceAutocompleteElement();

  autocompleteElementRef.current = placeAutocomplete;

  placeAutocomplete.placeholder = "Search for a location";

  placeAutocomplete.addEventListener(
    "gmp-select",
    async (event: google.maps.places.PlacePredictionSelectEvent) => {
      const place = event.placePrediction.toPlace();

      await place.fetchFields({
        fields: ["displayName", "formattedAddress", "location"],
      });

      const selectedLocation =
        place.formattedAddress ||
        place.displayName ||
        "";

      setLocation(selectedLocation);
      if (place.location) {
        setLatitude(place.location.lat());
        setLongitude(place.location.lng());
      }
    }
  );

  locationRef.current.replaceWith(placeAutocomplete);
  } catch (err) {
    console.error("Google Places failed to initialise:", err);
    setMapsFailed(true);
  }
}

    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );

    if (existingScript) {
      initAutocomplete();
      return;
    }

    const script = document.createElement("script");

    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;

    script.async = true;
    script.defer = true;
    script.onload = initAutocomplete;
    script.onerror = () => {
      console.error("Google Maps script failed to load — check the API key.");
      setMapsFailed(true);
    };

    document.head.appendChild(script);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!mapsFailed && (latitude === null || longitude === null)) {
      alert("Please pick a location from the suggestions list.");
      return;
    }

    // Without Maps we still need somewhere for the match to happen; it just
    // won't have coordinates, so it won't appear in radius-filtered searches.
    if (mapsFailed && !location.trim()) {
      alert("Please enter a location.");
      return;
    }

    if (!userId) {
      alert("Please sign in before creating a match.");
      return;
    }

    try {
      const data = await createMatch({
        title,
        sport,
        location,
        latitude,
        longitude,
        match_date: matchDate,
        match_time: matchTime,
        max_players: Number(maxPlayers),
        skill_level: skillLevel,
        description,
        // Attribute the match to the signed-in host so it shows up in their
        // "Matches You're Hosting" list (Profile) and carries a host badge.
        created_by: userId,
      });

      const createdMatch = data?.[0];

      if (createdMatch) {
        const { error: participantError } = await supabase
          .from("match_participants")
          .insert({
            match_id: createdMatch.id,
            user_id: userId,
            status: "approved",
          });

        if (participantError) {
          throw participantError;
        }
      }

  // Straight to Browse — it refetches on mount, so the new match is there.
  // `created` is passed so Browse can confirm it landed.
  navigate("/", { state: { created: createdMatch?.id ?? true } });
} catch (error) {
  console.error("Error creating match:", error);
  alert("Could not create match");
}
  }

  
  return (
  <div className="create-match-page">
    <div className="create-match-card">
      <h1>Create Match</h1>
      <p>Set up a game and find people to join.</p>

      <form onSubmit={handleSubmit} className="create-match-form">
        <input
          required
          placeholder="Match title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <select
          required
          value={sport}
          onChange={(e) => setSport(e.target.value)}
        >
          <option value="">Select a sport</option>
          <option value="Soccer">Soccer</option>
          <option value="Basketball">Basketball</option>
          <option value="Tennis">Tennis</option>
          <option value="Volleyball">Volleyball</option>
          <option value="Touch Football">Touch Football</option>
          <option value="Running">Running</option>
        </select>

        {mapsFailed ? (
          <input
            required
            placeholder="Location (e.g. Moore Park, Sydney)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        ) : (
          <div ref={locationRef}></div>
        )}

        <input
          required
          type="date"
          value={matchDate}
          onChange={(e) => setMatchDate(e.target.value)}
        />

        <input
          required
          type="time"
          value={matchTime}
          onChange={(e) => setMatchTime(e.target.value)}
        />

        <input
          required
          type="number"
          min="2"
          max="100"
          placeholder="Max players"
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(e.target.value)}
        />

        <select
          required
          value={skillLevel}
          onChange={(e) => setSkillLevel(e.target.value)}
        >
          <option value="">Select skill level</option>
          <option value="Beginner">Beginner</option>
          <option value="Casual">Casual</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
          <option value="All Levels">All Levels</option>
        </select>

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button type="submit" className="create-match-button">
          Create Match
        </button>
      </form>
    </div>
  </div>
);
}

export default CreateMatch;
