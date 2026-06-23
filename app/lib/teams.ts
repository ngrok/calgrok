export type TeamConfig = { key: string; name: string; id: string };

// Teams surfaced on the calendar, resolved from the ngrok Linear workspace.
// Add an entry here to include another team — nothing else is hard-coded to
// these IDs (the data model carries teamIds throughout).
export const TEAMS: TeamConfig[] = [
	{ key: "GTM", name: "GTM", id: "eab6f126-c17d-43e4-8278-a0a58be8644f" },
	{ key: "Content", name: "Content", id: "4610eaa2-4266-4e97-8d40-8a7161f7ec3c" },
];

export const DEFAULT_TEAM_IDS = TEAMS.map((team) => team.id);
