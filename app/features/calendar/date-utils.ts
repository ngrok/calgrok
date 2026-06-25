import {
	addDays,
	eachDayOfInterval,
	endOfMonth,
	endOfWeek,
	format,
	isSameMonth,
	startOfMonth,
	startOfWeek,
} from "date-fns";
import type { CalendarIssue } from "./types";

// Work calendar: weeks start on Monday.
const WEEK_STARTS_ON = 1 as const;

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** The first and last day of the 5-or-6-week grid that frames a month. */
export function monthGridRange(month: Date): { gridStart: Date; gridEnd: Date } {
	return {
		gridStart: startOfWeek(startOfMonth(month), { weekStartsOn: WEEK_STARTS_ON }),
		gridEnd: endOfWeek(endOfMonth(month), { weekStartsOn: WEEK_STARTS_ON }),
	};
}

/** Every day shown in the month grid, including leading/trailing days. */
export function monthGridDays(month: Date): Date[] {
	const { gridStart, gridEnd } = monthGridRange(month);
	return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

/**
 * The weeks "owned" by a month, so the endless scroll never renders a week
 * twice. A week belongs to the month that contains its Monday: a week
 * straddling two months (e.g. Jun 29–Jul 5) is owned by the earlier month and
 * shows the next month's days as muted trailing cells. Each entry is a full
 * 7-day Mon→Sun array, so every rendered row stays column-aligned.
 */
export function monthOwnedWeeks(month: Date): Date[][] {
	let monday = startOfWeek(startOfMonth(month), { weekStartsOn: WEEK_STARTS_ON });
	// The first week's Monday may live in the previous month; that week is owned
	// there, so skip ahead to the first Monday that actually falls in this month.
	if (!isSameMonth(monday, month)) {
		monday = addDays(monday, 7);
	}
	const weeks: Date[][] = [];
	while (isSameMonth(monday, month)) {
		weeks.push(Array.from({ length: 7 }, (_, i) => addDays(monday, i)));
		monday = addDays(monday, 7);
	}
	return weeks;
}

export function toISODate(date: Date): string {
	return format(date, "yyyy-MM-dd");
}

/** Bucket issues by their dueDate ("YYYY-MM-DD") for O(1) day lookups. */
export function groupIssuesByDueDate(issues: CalendarIssue[]): Map<string, CalendarIssue[]> {
	const byDate = new Map<string, CalendarIssue[]>();
	for (const issue of issues) {
		const existing = byDate.get(issue.dueDate);
		if (existing) {
			existing.push(issue);
		} else {
			byDate.set(issue.dueDate, [issue]);
		}
	}
	return byDate;
}
