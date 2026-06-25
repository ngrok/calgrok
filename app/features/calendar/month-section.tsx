import { cx } from "@ngrok/mantle/cx";
import { format, getDate, getMonth, isSameDay, isSameMonth } from "date-fns";
import { forwardRef, useMemo } from "react";
import { groupIssuesByDueDate, monthGridRange, monthOwnedWeeks, toISODate } from "./date-utils";
import { DayCell } from "./day-cell";
import { useCalendarIssues } from "./queries";
import type { CalendarIssue } from "./types";
import type { ViewOptions } from "./view-options";

// Stable empty array so memoized DayCells for empty days don't re-render.
const NO_ISSUES: CalendarIssue[] = [];

/**
 * One month in the endless scroll, rendered as the weeks it owns (see
 * monthOwnedWeeks) so adjacent months flow into one continuous grid with no
 * duplicated boundary weeks. There's no month heading; instead the month name
 * floats in the left gutter of the week where the 1st falls. Each section owns
 * its own issues query (keyed by its grid range), so it loads independently as
 * it scrolls into view and is cached/deduped by React Query like every other
 * month.
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

	const weeks = useMemo(() => monthOwnedWeeks(month), [month]);

	return (
		<section ref={ref} className="scroll-mt-9">
			{isError ? (
				<p className="py-1 pl-[4.5rem] text-xs text-strong">
					Couldn&apos;t load —{" "}
					<a href="/auth/linear" className="underline">
						reconnect Linear
					</a>
				</p>
			) : null}

			{weeks.map((week, i) => {
				const monday = week[0];
				if (!monday) {
					return null;
				}
				const days = options.showWeekends
					? week
					: week.filter((day) => day.getDay() !== 0 && day.getDay() !== 6);
				// Mark the week where a new month begins with a big gutter label;
				// January also shows the year underneath.
				const firstOfMonth = week.find((day) => getDate(day) === 1);

				return (
					<div key={monday.toISOString()} className={cx("grid", gridColsClass)}>
						<div className="flex flex-col items-end gap-0.5 pr-2 pt-1.5 leading-none">
							{firstOfMonth ? (
								<>
									<span className="text-xl font-semibold text-strong">
										{format(firstOfMonth, "MMM")}
									</span>
									{getMonth(firstOfMonth) === 0 ? (
										<span className="text-xs text-muted">{format(firstOfMonth, "yyyy")}</span>
									) : null}
								</>
							) : null}
							{i === 0 && isLoading ? (
								<span className="text-[10px] font-normal text-muted">Loading…</span>
							) : null}
						</div>
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
				);
			})}
		</section>
	);
});
