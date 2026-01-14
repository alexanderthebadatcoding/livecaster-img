"use client";

import { useState } from "react";
import { Download } from "lucide-react";

export default function ESPNHeaderGenerator() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<Array<any> | null>(null);
  const [selectedSport, setSelectedSport] = useState("soccer");
  const [leagues, setLeagues] = useState<
    Array<{ id: string; name: string; abbreviation: string; slug: string }>
  >([]);
  const [selectedLeague, setSelectedLeague] = useState("");
  const [loadingLeagues, setLoadingLeagues] = useState(false);

  const sports = [
    { id: "soccer", name: "Soccer" },
    { id: "football", name: "Football" },
    { id: "basketball", name: "Basketball" },
    { id: "baseball", name: "Baseball" },
  ];

  const fetchLeagues = async (sport: string) => {
    setLoadingLeagues(true);
    setLeagues([]);
    setSelectedLeague("");
    setError("");

    try {
      const listRes = await fetch(
        `https://sports.core.api.espn.com/v2/sports/${sport}/leagues?lang=en&region=us`
      );
      const listData = await listRes.json();
      const refs = listData.items?.slice(0, 25) || [];

      // Fetch all league refs in parallel
      const leagueData = await Promise.all(
        refs.map(async (item: { $ref: string | URL | Request }) => {
          try {
            // Force HTTPS for all URLs
            const refUrl = typeof item.$ref === "string" ? item.$ref : String(item.$ref);
            const secureUrl = refUrl.replace("http://", "https://");
            const r = await fetch(secureUrl);
            const l = await r.json();
            return {
              id: l.id,
              name: l.name,
              abbreviation: l.abbreviation,
              slug: l.slug,
            };
          } catch {
            return null;
          }
        })
      );

      const validLeagues = leagueData.filter((l) => l !== null);
      setLeagues(validLeagues);

      if (validLeagues.length > 0) {
        setSelectedLeague(validLeagues[0].slug);
      }
    } catch (err) {
      setError("Failed to fetch leagues");
    } finally {
      setLoadingLeagues(false);
    }
  };

  const handleSportChange = (sport: string) => {
    setSelectedSport(sport);
    fetchLeagues(sport);
  };

  const handleFetchEvents = async () => {
    if (!selectedLeague) return;

    const apiUrl = `https://site.api.espn.com/apis/site/v2/sports/${selectedSport}/${selectedLeague}/scoreboard`;
    setUrl(apiUrl);

    setLoading(true);
    setError("");
    setEvents(null);

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error("Failed to fetch data");

      const data = await response.json();

      if (!data?.events || data.events.length === 0) {
        throw new Error("No events found in data");
      }

      setEvents(data.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  const fetchESPNData = async () => {
    setLoading(true);
    setError("");
    setEvents(null);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch data");

      const data = await response.json();

      if (!data?.events || data.events.length === 0) {
        throw new Error("No events found in data");
      }

      setEvents(data.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generateMatchupImage = (event: any, eventIndex: any) => {
    const competition = event.competitions?.[0];
    if (
      !competition ||
      !competition.competitors ||
      competition.competitors.length < 2
    )
      return;

    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const team1 = competition.competitors[0];
    const team2 = competition.competitors[1];

    // Left half - Team 1 gradient
    const bgColor1 = team1.team.alternateColor || "000000";
    const bgColor2 = team1.team.color || "000000";
    const gradient1 = ctx.createLinearGradient(0, 0, 600, 800);
    gradient1.addColorStop(0, `#${bgColor1}`);
    gradient1.addColorStop(1, `#${bgColor2}`);
    ctx.fillStyle = gradient1;
    ctx.fillRect(0, 0, 600, 800);

    // Right half - Team 2 gradient
    const bgColor3 = team2.team.alternateColor || "000000";
    const bgColor4 = team2.team.color || "FFFFFF";
    const gradient2 = ctx.createLinearGradient(600, 0, 1200, 800);
    gradient2.addColorStop(0, `#${bgColor3}`);
    gradient2.addColorStop(1, `#${bgColor4}`);
    ctx.fillStyle = gradient2;
    ctx.fillRect(600, 0, 600, 800);

    // Center divider line
    ctx.fillStyle = "#000000";
    ctx.fillRect(595, 0, 10, 800);

    let loadedImages = 0;
    const totalImages = 2;

    const checkComplete = () => {
      loadedImages++;
      if (loadedImages === totalImages) {
        // Download when both logos are drawn
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${team1.team.abbreviation}_vs_${team2.team.abbreviation}_matchup.png`;
          a.click();
          URL.revokeObjectURL(url);
        });
      }
    };

    // Load and draw Team 1 logo (left side)
    const img1 = new Image();
    img1.crossOrigin = "anonymous";
    img1.onload = () => {
      const maxSize = 400;
      const scale = Math.min(maxSize / img1.width, maxSize / img1.height);
      const w = img1.width * scale;
      const h = img1.height * scale;
      const x = (600 - w) / 2;
      const y = (800 - h) / 2 - 50;

      ctx.drawImage(img1, x, y, w, h);

      checkComplete();
    };
    img1.src = team1.team.logo;

    // Load and draw Team 2 logo (right side)
    const img2 = new Image();
    img2.crossOrigin = "anonymous";
    img2.onload = () => {
      const maxSize = 400;
      const scale = Math.min(maxSize / img2.width, maxSize / img2.height);
      const w = img2.width * scale;
      const h = img2.height * scale;
      const x = 600 + (600 - w) / 2;
      const y = (800 - h) / 2 - 50;

      ctx.drawImage(img2, x, y, w, h);

      checkComplete();
    };
    img2.src = team2.team.logo;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">
          Live Caster Image Generator
        </h1>
        <p className="text-gray-400 mb-8">
          Generate Matchup headers for all events from ESPN Api.
        </p>

        <div className="bg-gray-800 rounded-lg p-6 shadow-xl mb-8">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-white font-medium mb-2">Sport</label>
              <select
                value={selectedSport}
                onChange={(e) => handleSportChange(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
              >
                {sports.map((sport) => (
                  <option key={sport.id} value={sport.id}>
                    {sport.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">
                League
              </label>
              <select
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                disabled={loadingLeagues || leagues.length === 0}
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              >
                {loadingLeagues ? (
                  <option>Loading leagues...</option>
                ) : leagues.length === 0 ? (
                  <option>No leagues available</option>
                ) : (
                  leagues.map((league) => (
                    <option key={league.slug} value={league.slug}>
                      {league.name} ({league.abbreviation})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <label className="block text-white font-medium mb-2">
            ESPN API URL (auto-generated)
          </label>
          <input
            type="text"
            value={
              url ||
              `https://site.api.espn.com/apis/site/v2/sports/${selectedSport}/${
                selectedLeague || "[select-league]"
              }/scoreboard`
            }
            readOnly
            className="w-full px-4 py-3 bg-gray-700 text-gray-400 rounded-lg border border-gray-600 mb-4"
          />

          <button
            onClick={handleFetchEvents}
            disabled={!selectedLeague || loading || loadingLeagues}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {loading
              ? "Fetching..."
              : loadingLeagues
              ? "Loading Leagues..."
              : "Fetch All Events"}
          </button>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-6 py-4 rounded-lg mb-8">
            {error}
          </div>
        )}

        {events && events.length > 0 && (
          <div className="space-y-6">
            <div className="text-white text-lg font-semibold mb-4">
              Found {events.length} event{events.length !== 1 ? "s" : ""}
            </div>

            {events.map((event, eventIndex) => {
              const competition = event.competitions?.[0];
              if (
                !competition ||
                !competition.competitors ||
                competition.competitors.length < 2
              ) {
                return null;
              }

              const team1 = competition.competitors[0];
              const team2 = competition.competitors[1];

              return (
                <div
                  key={eventIndex}
                  className="bg-gray-800 rounded-lg p-6 shadow-xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white">
                      {event.name}
                    </h2>
                    <span className="text-gray-400 text-lg">
                      {competition.status.type.detail}
                    </span>
                  </div>

                  <div
                    className="mb-6 rounded-lg overflow-hidden"
                    style={{ aspectRatio: "3/2" }}
                  >
                    <div className="flex h-full">
                      <div
                        className="flex-1 flex flex-col items-center justify-center p-4"
                        style={{
                          backgroundImage: `linear-gradient(to bottom right, #${
                            team1.team.alternateColor || "000000"
                          }, #${team1.team.color || "000000"})`,
                        }}
                      >
                        <img
                          src={team1.team.logo}
                          alt={team1.team.displayName}
                          className="h-36 object-contain mb-3"
                        />
                      </div>

                      <div className="w-1 bg-black"></div>

                      <div
                        className="flex-1 flex flex-col items-center justify-center p-4"
                        style={{
                          backgroundImage: `linear-gradient(to bottom right, #${
                            team2.team.alternateColor || "000000"
                          }, #${team2.team.color || "FFFFFF"})`,
                        }}
                      >
                        <img
                          src={team2.team.logo}
                          alt={team2.team.displayName}
                          className="h-36 object-contain mb-3"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 mb-4">
                    Preview (actual download: 1200x800px)
                  </p>

                  <button
                    onClick={() => generateMatchupImage(event, eventIndex)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download size={20} />
                    Download {team1.team.abbreviation} vs{" "}
                    {team2.team.abbreviation}
                  </button>

                  <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-700">
                    <div className="text-center">
                      <img
                        src={team1.team.logo}
                        alt={team1.team.displayName}
                        className="w-16 h-16 object-contain mx-auto mb-2"
                      />
                      <p className="text-white font-semibold">
                        {team1.team.displayName}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {team1.team.abbreviation}
                      </p>
                    </div>
                    <div className="text-center">
                      <img
                        src={team2.team.logo}
                        alt={team2.team.displayName}
                        className="w-16 h-16 object-contain mx-auto mb-2"
                      />
                      <p className="text-white font-semibold">
                        {team2.team.displayName}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {team2.team.abbreviation}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!events && !error && (
          <div className="text-center text-gray-400 py-12">
            Enter an ESPN scoreboard URL above to get started
          </div>
        )}
      </div>
    </div>
  );
}
