import { Button } from "@ngrok/mantle/button";
import { Checkbox } from "@ngrok/mantle/checkbox";
import { Popover } from "@ngrok/mantle/popover";
import { useState } from "react";
import { DEFAULT_TEAM_IDS, TEAMS } from "~/lib/teams";
import type { LabelOption } from "./types";

export type CalendarFilters = {
	teamIds: string[];
	labelIds: string[];
	toggleTeam: (id: string) => void;
	toggleLabelGroup: (ids: string[]) => void;
	clearLabels: () => void;
};

export function useCalendarFilters(): CalendarFilters {
	const [teamIds, setTeamIds] = useState<string[]>(DEFAULT_TEAM_IDS);
	const [labelIds, setLabelIds] = useState<string[]>([]);

	function toggleTeam(id: string) {
		setTeamIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
	}
	// A label name can map to several ids (same `con/x` across teams); toggle them
	// together.
	function toggleLabelGroup(ids: string[]) {
		setLabelIds((prev) => {
			const allPresent = ids.every((id) => prev.includes(id));
			if (allPresent) {
				return prev.filter((id) => !ids.includes(id));
			}
			return [...new Set([...prev, ...ids])];
		});
	}
	function clearLabels() {
		setLabelIds([]);
	}

	return { teamIds, labelIds, toggleTeam, toggleLabelGroup, clearLabels };
}

export function FilterBar({
	teamIds,
	labelIds,
	labels,
	onToggleTeam,
	onToggleLabelGroup,
	onClearLabels,
}: {
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

	return (
		<div className="flex flex-wrap items-center gap-2">
			<div className="flex items-center gap-1">
				{TEAMS.map((team) => {
					const active = teamIds.includes(team.id);
					return (
						<Button
							key={team.id}
							type="button"
							appearance={active ? "filled" : "outlined"}
							aria-pressed={active}
							onClick={() => onToggleTeam(team.id)}
						>
							{team.name}
						</Button>
					);
				})}
			</div>

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
						labels.map((option) => (
							<label
								key={option.name}
								className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-card"
							>
								<Checkbox
									checked={option.ids.some((id) => labelIds.includes(id))}
									onChange={() => onToggleLabelGroup(option.ids)}
								/>
								<span
									className="size-2 shrink-0 rounded-full"
									style={{ backgroundColor: option.color }}
								/>
								<span className="truncate text-sm text-strong">{option.name}</span>
							</label>
						))
					)}
				</Popover.Content>
			</Popover.Root>
		</div>
	);
}
