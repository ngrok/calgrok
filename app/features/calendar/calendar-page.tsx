import { Button } from "@ngrok/mantle/button";
import { useMemo } from "react";
import { Form } from "react-router";
import { CONTENT_TAG_NAMES } from "~/lib/content-tags";
import { FilterBar, useCalendarFilters } from "./filters";
import { MonthList } from "./month-list";
import { useLabels } from "./queries";
import { RefreshButton, useViewOptions, ViewOptionsMenu } from "./view-options";

export function CalendarPage({ viewer }: { viewer: { name: string; email: string } }) {
	const filters = useCalendarFilters();
	const { options, toggle } = useViewOptions();
	const { data: allLabels = [] } = useLabels();

	// The label filter only offers the content types, and the calendar is always
	// scoped to them.
	const contentLabels = useMemo(
		() => allLabels.filter((option) => CONTENT_TAG_NAMES.includes(option.name.toLowerCase())),
		[allLabels],
	);

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
		<div className="mx-auto flex h-dvh max-w-6xl flex-col gap-4 p-4 sm:p-6">
			<header className="flex shrink-0 items-center justify-between gap-2">
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

			<div className="flex shrink-0 flex-wrap items-center gap-2">
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

			<MonthList teamIds={filters.teamIds} labelIds={effectiveLabelIds} options={options} />
		</div>
	);
}
