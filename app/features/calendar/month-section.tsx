import { cx } from "@ngrok/mantle/cx";
import { format, isSameDay, isSameMonth } from "date-fns";
import { forwardRef, useMemo } from "react";
import { groupIssuesByDueDate, monthGridDays, monthGridRange, toISODate } from "./date-utils";
import { DayCell } from "./day-cell";
import { useCalendarIssues } from "./queries";
import type { CalendarIssue } from "./types";
import type { ViewOptions } from "./view-options";

// Stable empty array so memoized DayCells for empty days don't re-render.
const NO_ISSUES: CalendarIssue[] = [];

/**
 * One month in the endless scroll: a sticky-friendly label plus its 5-or-6-week
 * grid. Each section owns its own issues query (keyed by its grid range), so it
 * loads independently as it scrolls into view and is cached/deduped by React
 * Query like every other month.
 *
 * The ref is forwarded to the section element so the parent can scroll the
 * current month into view ("Today").
 */
export const MonthSection = forwardRef<
	HTMLDivElement,
	{
		month: Date;
		teamIds: string[];
		labelIds: string[];
		options: ViewOptions;
		today: Date;
		gridColsClass: string;
		onOpenIssue: (issue: CalendarIssue) => void;
	}
>(function MonthSection(
	{ month, teamIds, labelIds, options, today, gridColsClass, onOpenIssue },
	ref,
) {
	const range = useMemo(() => monthGridRange(month), [month]);
	const params = useMemo(
		() => ({
			start: toISODate(range.gridStart),
			end: toISODate(range.gridEnd),
			teamIds,
			labelIds,
		}),
		[range, teamIds, labelIds],
	);

	const { data: issues = [], isLoading, isError } = useCalendarIssues(params);

	// View toggles applied client-side (instant, no refetch).
	const visibleIssues = useMemo(
		() =>
			issues.filter(
				(issue) =>
					(options.showCompleted || issue.state.type !== "completed") &&
					(options.showSubtasks || !issue.parent),
			),
		[issues, options.showCompleted, options.showSubtasks],
	);
	const byDate = useMemo(() => groupIssuesByDueDate(visibleIssues), [visibleIssues]);

	const allDays = useMemo(() => monthGridDays(month), [month]);
	const days = useMemo(
		() =>
			options.showWeekends
				? allDays
				: allDays.filter((day) => day.getDay() !== 0 && day.getDay() !== 6),
		[allDays, options.showWeekends],
	);

	return (
		<section ref={ref} className="scroll-mt-9 pb-8">
			<div className="flex items-baseline gap-2 pb-2">
				<h2 className="text-lg font-medium text-strong">{format(month, "MMMM yyyy")}</h2>
				{isLoading ? <span className="text-xs text-muted">Loading…</span> : null}
				{isError ? (
					<span className="text-xs text-strong">
						Couldn&apos;t load —{" "}
						<a href="/auth/linear" className="underline">
							reconnect Linear
						</a>
					</span>
				) : null}
			</div>

			<div className={cx("grid border-l border-t border-card", gridColsClass)}>
				{days.map((day) => (
					<DayCell
						key={day.toISOString()}
						date={day}
						issues={byDate.get(toISODate(day)) ?? NO_ISSUES}
						isCurrentMonth={isSameMonth(day, month)}
						isToday={isSameDay(day, today)}
						onOpenIssue={onOpenIssue}
					/>
				))}
			</div>
		</section>
	);
});
