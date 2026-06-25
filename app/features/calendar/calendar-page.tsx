import { Button } from "@ngrok/mantle/button";
import { useMemo, useRef } from "react";
import { Form } from "react-router";
import { FilterBar, useCalendarFilters } from "./filters";
import { MonthList, type MonthListHandle } from "./month-list";
import { useLabels } from "./queries";
import { RefreshButton, useViewOptions, ViewOptionsMenu } from "./view-options";

export function CalendarPage({ viewer }: { viewer: { name: string; email: string } }) {
	const filters = useCalendarFilters();
	const { options, toggle } = useViewOptions();
	const listRef = useRef<MonthListHandle>(null);
	// Every "con/" label is offered automatically; the API already scopes labels
	// to that namespace, so new ones appear without a code change.
	const { data: contentLabels = [] } = useLabels();

	// Effective filter: the user's selection, or — when nothing is selected — all
	// content-type ids, so only content-tagged issues ever show.
	const effectiveLabelIds = useMemo(
		() =>
			filters.labelIds.length > 0
				? filters.labelIds
				: contentLabels.flatMap((option) => option.ids),
		[filters.labelIds, contentLabels],
	);

	return (
		<div className="flex h-dvh flex-col">
			<header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-card p-4 sm:p-6">
				<div>
					<h1 className="text-xl font-medium text-strong">calgrok</h1>
					<p className="text-xs text-muted">{viewer.name}</p>
				</div>
				<FilterBar
					teamIds={filters.teamIds}
					labelIds={filters.labelIds}
					labels={contentLabels}
					onToggleTeam={filters.toggleTeam}
					onToggleLabelGroup={filters.toggleLabelGroup}
					onClearLabels={filters.clearLabels}
				/>
				<div className="ml-auto flex items-center gap-2">
					<Button
						type="button"
						appearance="outlined"
						onClick={() => listRef.current?.scrollToToday()}
					>
						Today
					</Button>
					<ViewOptionsMenu options={options} onToggle={toggle} />
					<RefreshButton />
					<Form method="post" action="/auth/logout">
						<Button type="submit" appearance="outlined">
							Disconnect
						</Button>
					</Form>
				</div>
			</header>

			<main className="flex min-h-0 flex-1 flex-col">
				<MonthList
					ref={listRef}
					teamIds={filters.teamIds}
					labelIds={effectiveLabelIds}
					options={options}
				/>
			</main>
		</div>
	);
}
