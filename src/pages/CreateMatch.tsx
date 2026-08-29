import { useEffect, useRef, useState } from "react";
import { createMatch } from "../services/matchService";
import { useAuth } from "../context/AuthContext";
import "./CreateMatch.css";

function CreateMatch() {
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

  const locationRef = useRef<HTMLDivElement>(null);
  const autocompleteElementRef =
  useRef<google.maps.places.PlaceAutocompleteElement | null>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error("Google Maps API key missing");
      return;
    }

async function initAutocomplete() {
  if (!locationRef.current) return;

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

    document.head.appendChild(script);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (latitude === null || longitude === null) {
      alert("Please select a location from the Google suggestions.");
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

  console.log("Created match:", data);
  alert("Match created!");

  setTitle("");
  setSport("");
  setLocation("");
  setLatitude(null);
  setLongitude(null);
  setMatchDate("");
  setMatchTime("");
  setMaxPlayers("");
  setSkillLevel("");
  setDescription("");

  if (autocompleteElementRef.current) {
    autocompleteElementRef.current.value = "";
  }
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

        <div ref={locationRef}></div>

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
