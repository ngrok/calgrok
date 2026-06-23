import {
	eachDayOfInterval,
	endOfMonth,
	endOfWeek,
	format,
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
