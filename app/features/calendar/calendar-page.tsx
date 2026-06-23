import { Button } from "@ngrok/mantle/button";
import { Form } from "react-router";
import { FilterBar, useCalendarFilters } from "./filters";
import { MonthGrid } from "./month-grid";
import { useLabels } from "./queries";

export function CalendarPage({ viewer }: { viewer: { name: string; email: string } }) {
	const filters = useCalendarFilters();
	const { data: labels = [] } = useLabels();

	return (
		<div className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-4 p-4 sm:p-6">
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

			<FilterBar
				teamIds={filters.teamIds}
				labelIds={filters.labelIds}
				labels={labels}
				onToggleTeam={filters.toggleTeam}
				onToggleLabel={filters.toggleLabel}
				onClearLabels={filters.clearLabels}
			/>

			<MonthGrid teamIds={filters.teamIds} labelIds={filters.labelIds} />
		</div>
	);
}
