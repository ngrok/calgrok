import { Button } from "@ngrok/mantle/button";
import { Checkbox } from "@ngrok/mantle/checkbox";
import { Popover } from "@ngrok/mantle/popover";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LabelOption, TeamOption } from "./types";

const TEAM_STORAGE_KEY = "calgrok:team-ids:v1";

export type CalendarFilters = {
	teamIds: string[];
	labelIds: string[];
	toggleTeam: (id: string) => void;
	toggleLabelGroup: (ids: string[]) => void;
	clearLabels: () => void;
	setLabelIds: (ids: string[]) => void;
};

export function useCalendarFilters(teams: TeamOption[]): CalendarFilters {
	const [teamIds, setTeamIds] = useState<string[]>([]);
	const [labelIds, setLabelIdsState] = useState<string[]>([]);
	const loadedStoredTeams = useRef(false);

	useEffect(() => {
		if (loadedStoredTeams.current || teams.length === 0) {
			return;
		}
		const validIds = new Set(teams.map((team) => team.id));
		try {
			const raw = localStorage.getItem(TEAM_STORAGE_KEY);
			const parsed = raw ? JSON.parse(raw) : [];
			if (Array.isArray(parsed)) {
				setTeamIds(parsed.filter((id): id is string => typeof id === "string" && validIds.has(id)));
			}
		} catch {
			// ignore malformed storage
		}
		loadedStoredTeams.current = true;
	}, [teams]);

	useEffect(() => {
		if (!loadedStoredTeams.current) {
			return;
		}
		const validIds = new Set(teams.map((team) => team.id));
		setTeamIds((prev) => {
			const next = prev.filter((id) => validIds.has(id));
			return next.length === prev.length ? prev : next;
		});
	}, [teams]);

	useEffect(() => {
		if (!loadedStoredTeams.current) {
			return;
		}
		try {
			localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(teamIds));
		} catch {
			// ignore quota/availability errors
		}
	}, [teamIds]);

	const setLabelIds = useCallback((ids: string[]) => {
		setLabelIdsState([...new Set(ids)]);
	}, []);

	function toggleTeam(id: string) {
		setTeamIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
	}
	// A label name can map to several ids across teams; toggle them together.
	function toggleLabelGroup(ids: string[]) {
		setLabelIdsState((prev) => {
			const allPresent = ids.every((id) => prev.includes(id));
			if (allPresent) {
				return prev.filter((id) => !ids.includes(id));
			}
			return [...new Set([...prev, ...ids])];
		});
	}
	function clearLabels() {
		setLabelIdsState([]);
	}

	return { teamIds, labelIds, toggleTeam, toggleLabelGroup, clearLabels, setLabelIds };
}

export function FilterBar({
	teams,
	teamsLoading,
	teamIds,
	labelIds,
	labels,
	onToggleTeam,
	onToggleLabelGroup,
	onClearLabels,
}: {
	teams: TeamOption[];
	teamsLoading: boolean;
	teamIds: string[];
	labelIds: string[];
	labels: LabelOption[];
	onToggleTeam: (id: string) => void;
	onToggleLabelGroup: (ids: string[]) => void;
	onClearLabels: () => void;
}) {
	const selectedCount = labels.filter((option) =>
		option.ids.some((id) => labelIds.includes(id)),
	).length;
	const selectedTeamCount = teams.filter((team) => teamIds.includes(team.id)).length;

	return (
		<div className="flex flex-wrap items-center gap-2">
			<Popover.Root>
				<Popover.Trigger asChild>
					<Button type="button" appearance="outlined">
						Teams{selectedTeamCount > 0 ? ` (${selectedTeamCount})` : ""}
					</Button>
				</Popover.Trigger>
				<Popover.Content className="z-50 flex max-h-80 w-72 flex-col gap-1 overflow-auto rounded-md border border-card bg-card p-2 text-strong shadow-lg">
					<div className="flex items-center justify-between px-1 pb-1">
						<span className="text-xs font-medium text-muted">Filter by team</span>
					</div>

					{teamsLoading ? <p className="px-1 text-xs text-muted">Loading teams…</p> : null}
					{!teamsLoading && teams.length === 0 ? (
						<p className="px-1 text-xs text-muted">No teams found.</p>
					) : null}
					{teams.map((team) => {
						const checkboxId = `team-filter-${team.id}`;
						return (
							<label
								key={team.id}
								htmlFor={checkboxId}
								className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-card"
							>
								<Checkbox
									id={checkboxId}
									checked={teamIds.includes(team.id)}
									onChange={() => onToggleTeam(team.id)}
								/>
								<span className="truncate text-sm text-strong">{team.name}</span>
								<span className="shrink-0 text-xs text-muted">{team.key}</span>
							</label>
						);
					})}
				</Popover.Content>
			</Popover.Root>

			<Popover.Root>
				<Popover.Trigger asChild>
					<Button type="button" appearance="outlined">
						Labels{selectedCount > 0 ? ` (${selectedCount})` : ""}
					</Button>
				</Popover.Trigger>
				<Popover.Content className="z-50 flex max-h-80 w-64 flex-col gap-1 overflow-auto rounded-md border border-card bg-card p-2 text-strong shadow-lg">
					<div className="flex items-center justify-between px-1 pb-1">
						<span className="text-xs font-medium text-muted">Filter by label</span>
						{selectedCount > 0 ? (
							<button
								type="button"
								className="text-xs text-muted underline hover:text-strong"
								onClick={onClearLabels}
							>
								Clear
							</button>
						) : null}
					</div>

					{labels.length === 0 ? (
						<p className="px-1 text-xs text-muted">No labels found.</p>
					) : (
						labels.map((option) => {
							const checkboxId = `label-filter-${option.ids.join("-")}`;
							return (
								<label
									key={option.name}
									htmlFor={checkboxId}
									className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-card"
								>
									<Checkbox
										id={checkboxId}
										checked={option.ids.some((id) => labelIds.includes(id))}
										onChange={() => onToggleLabelGroup(option.ids)}
									/>
									<span
										className="size-2 shrink-0 rounded-full"
										style={{ backgroundColor: option.color }}
									/>
									<span className="truncate text-sm text-strong">{option.name}</span>
									{option.matchesNamespace ? (
										<span className="shrink-0 text-xs text-muted">default</span>
									) : null}
								</label>
							);
						})
					)}
				</Popover.Content>
			</Popover.Root>
		</div>
	);
}
