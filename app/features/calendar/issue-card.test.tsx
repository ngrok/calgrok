import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { IssueCard } from "./issue-card";
import type { CalendarIssue } from "./types";

const issue: CalendarIssue = {
	id: "1",
	identifier: "GTM-1",
	title: "Launch blog post",
	dueDate: "2026-06-23",
	url: "https://linear.app/ngrok/issue/GTM-1",
	priority: 2,
	priorityLabel: "High",
	state: { id: "s1", name: "In Progress", color: "#f2c94c", type: "started" },
	assignee: { id: "u1", name: "Joel Hans", displayName: "Joel", avatarUrl: null },
	labels: [{ id: "l1", name: "Blog", color: "#5e6ad2" }],
	project: { id: "p1", name: "Q3 Content", url: "https://linear.app/ngrok/project/q3" },
	team: { id: "t1", key: "GTM", name: "GTM" },
	parent: null,
};

describe("IssueCard", () => {
	test("shows the title and links to the issue and project", () => {
		render(<IssueCard issue={issue} />);
		expect(screen.getByText("Launch blog post")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /open issue gtm-1/i })).toHaveAttribute(
			"href",
			issue.url,
		);
		expect(screen.getByRole("link", { name: /open project/i })).toHaveAttribute(
			"href",
			"https://linear.app/ngrok/project/q3",
		);
	});

	test("shows a status badge with the state name", () => {
		render(<IssueCard issue={issue} />);
		expect(screen.getByTitle("Status: In Progress")).toHaveTextContent("In Progress");
	});

	test("omits the project link when there is no project", () => {
		render(<IssueCard issue={{ ...issue, project: null }} />);
		expect(screen.queryByRole("link", { name: /open project/i })).not.toBeInTheDocument();
	});
});
