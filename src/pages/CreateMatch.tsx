import { useState } from "react";
import { createMatch } from "../services/matchService";

function CreateMatch() {
  const [title, setTitle] = useState("");
  const [sport, setSport] = useState("");
  const [location, setLocation] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("");
  const [skillLevel, setSkillLevel] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
  const data = await createMatch({
    title,
    sport,
    location,
    match_date: matchDate,
    match_time: matchTime,
    max_players: Number(maxPlayers),
    skill_level: skillLevel,
    description,
    created_by: null,
  });

  console.log("Created match:", data);
  alert("Match created!");

  setTitle("");
  setSport("");
  setLocation("");
  setMatchDate("");
  setMatchTime("");
  setMaxPlayers("");
  setSkillLevel("");
  setDescription("");
} catch (error) {
  console.error("Error creating match:", error);
  alert("Could not create match");
}
  }

  return (
    <div>
      <h1>Create Match</h1>

      <form onSubmit={handleSubmit}>
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

        <input
          required
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

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

        <button type="submit">Create Match</button>
      </form>
    </div>
  );
}

export default CreateMatch;
