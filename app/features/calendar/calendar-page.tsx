import { Button } from "@ngrok/mantle/button";
import { useMemo } from "react";
import { Form } from "react-router";
import { FilterBar, useCalendarFilters } from "./filters";
import { MonthGrid } from "./month-grid";
import { useLabels } from "./queries";
import { RefreshButton, useViewOptions, ViewOptionsMenu } from "./view-options";

export function CalendarPage({ viewer }: { viewer: { name: string; email: string } }) {
	const filters = useCalendarFilters();
	const { options, toggle } = useViewOptions();
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
		<div className="mx-auto flex min-h-dvh max-w-7xl flex-col gap-4 p-4 sm:p-6">
			<header className="flex items-center justify-between gap-2">
				<div>
					<h1 className="text-xl font-medium text-strong">calgrok</h1>
					<p className="text-xs text-muted">{viewer.name}</p>
				</div>
				<Form method="post" action="/auth/logout">
					<Button type="submit" appearance="outlined">
						Disconnect
					</Button>
				</Form>
			</header>

			<div className="flex flex-wrap items-center gap-2">
				<FilterBar
					teamIds={filters.teamIds}
					labelIds={filters.labelIds}
					labels={contentLabels}
					onToggleTeam={filters.toggleTeam}
					onToggleLabelGroup={filters.toggleLabelGroup}
					onClearLabels={filters.clearLabels}
				/>
				<div className="ml-auto flex items-center gap-2">
					<ViewOptionsMenu options={options} onToggle={toggle} />
					<RefreshButton />
				</div>
			</div>

			<MonthGrid teamIds={filters.teamIds} labelIds={effectiveLabelIds} options={options} />
		</div>
	);
}
