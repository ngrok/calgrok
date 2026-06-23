import { Button } from "@ngrok/mantle/button";
import { useQueryClient } from "@tanstack/react-query";
import { addMonths, format, isSameDay, isSameMonth, startOfMonth } from "date-fns";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_TEAM_IDS } from "~/lib/teams";
import {
	groupIssuesByDueDate,
	monthGridDays,
	monthGridRange,
	toISODate,
	WEEKDAY_LABELS,
} from "./date-utils";
import { DayCell } from "./day-cell";
import { prefetchCalendarIssues, useCalendarIssues } from "./queries";

// Render a placeholder until mounted so the date-dependent grid doesn't differ
// between server and first client render (avoids hydration mismatch), and so
// the relative /api/issues fetch only ever runs in the browser.
function useHydrated(): boolean {
	const [hydrated, setHydrated] = useState(false);
	useEffect(() => setHydrated(true), []);
	return hydrated;
}

export function MonthGrid() {
	const hydrated = useHydrated();
	const queryClient = useQueryClient();
	const [month, setMonth] = useState(() => startOfMonth(new Date()));

	const range = useMemo(() => monthGridRange(month), [month]);
	const params = useMemo(
		() => ({
			start: toISODate(range.gridStart),
			end: toISODate(range.gridEnd),
			teamIds: DEFAULT_TEAM_IDS,
		}),
		[range],
	);

	const { data: issues = [], isLoading, isError } = useCalendarIssues(params);
	const byDate = useMemo(() => groupIssuesByDueDate(issues), [issues]);
	const days = useMemo(() => monthGridDays(month), [month]);
	const today = useMemo(() => new Date(), []);

	// Prefetch the neighbouring months so prev/next feels instant.
	useEffect(() => {
		for (const offset of [-1, 1]) {
			const neighbour = monthGridRange(addMonths(month, offset));
			prefetchCalendarIssues(queryClient, {
				start: toISODate(neighbour.gridStart),
				end: toISODate(neighbour.gridEnd),
				teamIds: DEFAULT_TEAM_IDS,
			});
		}
	}, [month, queryClient]);

	return (
		<div className="flex flex-col">
			<header className="flex items-center justify-between gap-2 pb-3">
				<div className="flex items-center gap-2">
					<h2 className="text-lg font-medium text-strong">{format(month, "MMMM yyyy")}</h2>
					{hydrated && isLoading ? <span className="text-xs text-muted">Loading…</span> : null}
				</div>
				<div className="flex items-center gap-1">
					<Button
						type="button"
						appearance="outlined"
						aria-label="Previous month"
						icon={<CaretLeft />}
						onClick={() => setMonth((m) => addMonths(m, -1))}
					/>
					<Button
						type="button"
						appearance="outlined"
						onClick={() => setMonth(startOfMonth(new Date()))}
					>
						Today
					</Button>
					<Button
						type="button"
						appearance="outlined"
						aria-label="Next month"
						icon={<CaretRight />}
						onClick={() => setMonth((m) => addMonths(m, 1))}
					/>
				</div>
			</header>

			<div className="grid grid-cols-7">
				{WEEKDAY_LABELS.map((label) => (
					<div key={label} className="px-1 pb-1 text-xs font-medium text-muted">
						{label}
					</div>
				))}
			</div>

			{hydrated ? (
				<div className="grid grid-cols-7 border-l border-t border-card">
					{days.map((day) => (
						<DayCell
							key={day.toISOString()}
							date={day}
							issues={byDate.get(toISODate(day)) ?? []}
							isCurrentMonth={isSameMonth(day, month)}
							isToday={isSameDay(day, today)}
						/>
					))}
				</div>
			) : (
				<div className="h-96 animate-pulse rounded border border-card bg-card" />
			)}

			{isError ? (
				<p className="pt-3 text-sm text-strong">
					Couldn&apos;t load issues.{" "}
					<a href="/auth/linear" className="underline">
						Reconnect Linear
					</a>
					.
				</p>
			) : null}
		</div>
	);
}
