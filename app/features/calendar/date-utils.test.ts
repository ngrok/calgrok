import { describe, expect, test } from "vitest";
import { groupIssuesByDueDate, monthGridDays, toISODate } from "./date-utils";
import type { CalendarIssue } from "./types";

describe("monthGridDays", () => {
	test("covers the whole month, starts on Monday, and is whole weeks", () => {
		const days = monthGridDays(new Date(2026, 5, 1)); // June 2026
		expect(days.length % 7).toBe(0);
		expect(days[0]?.getDay()).toBe(1); // Monday
		const iso = days.map(toISODate);
		expect(iso).toContain("2026-06-01");
		expect(iso).toContain("2026-06-30");
	});
});

describe("groupIssuesByDueDate", () => {
	test("buckets issues by their dueDate", () => {
		const make = (id: string, dueDate: string): CalendarIssue => ({
			id,
			identifier: `GTM-${id}`,
			title: `Issue ${id}`,
			dueDate,
			url: "https://linear.app/x",
			priority: 0,
			priorityLabel: "No priority",
			state: { id: "s", name: "Todo", color: "#fff", type: "unstarted" },
			assignee: null,
			labels: [],
			project: null,
			team: { id: "t", key: "GTM", name: "GTM" },
		});
		const grouped = groupIssuesByDueDate([
			make("1", "2026-06-23"),
			make("2", "2026-06-23"),
			make("3", "2026-06-24"),
		]);
		expect(grouped.get("2026-06-23")).toHaveLength(2);
		expect(grouped.get("2026-06-24")).toHaveLength(1);
		expect(grouped.get("2026-06-25")).toBeUndefined();
	});
});
