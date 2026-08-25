import { Button } from "@ngrok/mantle/button";
import { Plus } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AuthMode } from "~/lib/auth-mode";
import { toISODate } from "./date-utils";
import { FilterBar, useCalendarFilters } from "./filters";
import { MonthList, type MonthListHandle } from "./month-list";
import { NewIssueDialog } from "./new-issue-dialog";
import { OptionsMenu } from "./options-menu";
import { useLabels, useTeams } from "./queries";
import { useViewOptions } from "./view-options";

export function CalendarPage({
	viewer,
	authMode,
}: {
	viewer: { name: string; email: string };
	authMode: AuthMode;
}) {
	const teamsQuery = useTeams();
	const teams = teamsQuery.data?.teams ?? [];
	const defaultTeamIds = teamsQuery.data?.defaultTeamIds ?? [];
	const filters = useCalendarFilters(teams, defaultTeamIds);
	const { labelIds, setLabelIds } = filters;
	const { options, toggle } = useViewOptions();
	const listRef = useRef<MonthListHandle>(null);
	const labelsQuery = useLabels();
	const labelConfig = labelsQuery.data;
	const labels = labelConfig?.labels ?? [];
	const requiresLabelMatch = labelConfig?.requiresLabelMatch ?? true;
	const visibleLabels = useMemo(
		() =>
			filters.teamIds.length === 0
				? []
				: labels.filter(
						(option) =>
							option.globalIds.length > 0 ||
							filters.teamIds.some((teamId) => option.idByTeam[teamId]),
					),
		[filters.teamIds, labels],
	);
	const visibleSelectedLabelIds = useMemo(() => {
		if (filters.labelIds.length === 0) {
			return [];
		}
		const visibleIds = new Set(visibleLabels.flatMap((option) => option.ids));
		return filters.labelIds.filter((id) => visibleIds.has(id));
	}, [filters.labelIds, visibleLabels]);
	const defaultLabelIds = useMemo(
		() => visibleLabels.filter((option) => option.matchesNamespace).flatMap((option) => option.ids),
		[visibleLabels],
	);
	const lastAppliedDefaultLabels = useRef<string | null>(null);
	useEffect(() => {
		if (!requiresLabelMatch || !labelsQuery.isSuccess) {
			return;
		}

		const defaultSignature = defaultLabelIds.join(",");
		const visibleIds = new Set(visibleLabels.flatMap((option) => option.ids));
		const prunedLabelIds = labelIds.filter((id) => visibleIds.has(id));

		if (defaultLabelIds.length > 0 && prunedLabelIds.length === 0) {
			if (lastAppliedDefaultLabels.current !== defaultSignature) {
				setLabelIds(defaultLabelIds);
				lastAppliedDefaultLabels.current = defaultSignature;
			}
			return;
		}

		if (prunedLabelIds.length !== labelIds.length) {
			setLabelIds(prunedLabelIds);
		}
	}, [
		defaultLabelIds,
		labelIds,
		labelsQuery.isSuccess,
		requiresLabelMatch,
		setLabelIds,
		visibleLabels,
	]);

	// Effective filter: explicit selected visible labels. Namespace defaults are
	// written into filter state above so the picker and query stay in sync.
	const effectiveLabelIds = useMemo(
		() => (requiresLabelMatch || visibleSelectedLabelIds.length > 0 ? visibleSelectedLabelIds : []),
		[visibleSelectedLabelIds, requiresLabelMatch],
	);
	const canFetchIssues =
		labelsQuery.isSuccess &&
		filters.teamIds.length > 0 &&
		(!requiresLabelMatch || effectiveLabelIds.length > 0);
	// The due date the new-issue dialog opens on; null while it's closed.
	const [newIssueDate, setNewIssueDate] = useState<string | null>(null);
	const openNewIssue = useCallback((dueDate: string) => setNewIssueDate(dueDate), []);
	const issueQueryBlockedMessage = labelsQuery.isSuccess
		? requiresLabelMatch && effectiveLabelIds.length === 0
			? "No labels match the configured namespace."
			: undefined
		: "Loading labels…";

	return (
		<div className="flex h-dvh flex-col">
			<header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-card p-4 sm:p-6">
				<div>
					<h1 className="text-xl font-medium text-strong">calgrok</h1>
					<p className="text-xs text-muted">{viewer.name}</p>
				</div>
				<FilterBar
					teams={teams}
					teamsLoading={teamsQuery.isLoading}
					teamIds={filters.teamIds}
					labelIds={filters.labelIds}
					labels={visibleLabels}
					onToggleTeam={filters.toggleTeam}
					onToggleLabelGroup={filters.toggleLabelGroup}
					onClearLabels={filters.clearLabels}
				/>
				<div className="ml-auto flex items-center gap-2">
					<Button
						type="button"
						appearance="filled"
						icon={<Plus />}
						onClick={() => openNewIssue(toISODate(new Date()))}
					>
						New issue
					</Button>
					<Button
						type="button"
						appearance="outlined"
						onClick={() => listRef.current?.scrollToToday()}
					>
						Today
					</Button>
					<OptionsMenu options={options} onToggle={toggle} authMode={authMode} />
				</div>
			</header>

			<main className="flex min-h-0 flex-1 flex-col">
				<MonthList
					ref={listRef}
					teamIds={filters.teamIds}
					labelIds={effectiveLabelIds}
					options={options}
					canFetchIssues={canFetchIssues}
					blockedMessage={issueQueryBlockedMessage}
					onNewIssue={openNewIssue}
				/>
			</main>

			<NewIssueDialog
				date={newIssueDate}
				onClose={() => setNewIssueDate(null)}
				defaultTeamId={filters.teamIds[0] ?? null}
			/>
		</div>
	);
}
