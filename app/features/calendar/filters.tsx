import { Button } from "@ngrok/mantle/button";
import { Checkbox } from "@ngrok/mantle/checkbox";
import { Popover } from "@ngrok/mantle/popover";
import { useState } from "react";
import { DEFAULT_TEAM_IDS, TEAMS } from "~/lib/teams";
import type { LinearLabel } from "./types";

export type CalendarFilters = {
	teamIds: string[];
	labelIds: string[];
	toggleTeam: (id: string) => void;
	toggleLabel: (id: string) => void;
	clearLabels: () => void;
};

export function useCalendarFilters(): CalendarFilters {
	const [teamIds, setTeamIds] = useState<string[]>(DEFAULT_TEAM_IDS);
	const [labelIds, setLabelIds] = useState<string[]>([]);

	function toggleTeam(id: string) {
		setTeamIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
	}
	function toggleLabel(id: string) {
		setLabelIds((prev) => (prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]));
	}
	function clearLabels() {
		setLabelIds([]);
	}

	return { teamIds, labelIds, toggleTeam, toggleLabel, clearLabels };
}

export function FilterBar({
	teamIds,
	labelIds,
	labels,
	onToggleTeam,
	onToggleLabel,
	onClearLabels,
}: {
	teamIds: string[];
	labelIds: string[];
	labels: LinearLabel[];
	onToggleTeam: (id: string) => void;
	onToggleLabel: (id: string) => void;
	onClearLabels: () => void;
}) {
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
						Labels{labelIds.length > 0 ? ` (${labelIds.length})` : ""}
					</Button>
				</Popover.Trigger>
				<Popover.Content className="z-50 flex max-h-80 w-64 flex-col gap-1 overflow-auto rounded-md border border-card bg-card p-2 text-strong shadow-lg">
					<div className="flex items-center justify-between px-1 pb-1">
						<span className="text-xs font-medium text-muted">Filter by label</span>
						{labelIds.length > 0 ? (
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
						labels.map((label) => (
							<label
								key={label.id}
								className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-card"
							>
								<Checkbox
									checked={labelIds.includes(label.id)}
									onChange={() => onToggleLabel(label.id)}
								/>
								<span
									className="size-2 shrink-0 rounded-full"
									style={{ backgroundColor: label.color }}
								/>
								<span className="truncate text-sm text-strong">{label.name}</span>
							</label>
						))
					)}
				</Popover.Content>
			</Popover.Root>
		</div>
	);
}
