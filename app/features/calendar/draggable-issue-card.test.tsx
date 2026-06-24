import { DndContext } from "@dnd-kit/core";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { DraggableIssueCard } from "./draggable-issue-card";
import type { CalendarIssue } from "./types";

const issue: CalendarIssue = {
	id: "1",
	identifier: "GTM-1",
	title: "ClickToOpen",
	dueDate: "2026-06-23",
	url: "https://linear.app/ngrok/issue/GTM-1",
	priority: 0,
	priorityLabel: "No priority",
	state: { id: "s", name: "S", color: "#fff", type: "started" },
	assignee: null,
	labels: [],
	project: null,
	team: { id: "t", key: "GTM", name: "GTM" },
	parent: null,
};

describe("DraggableIssueCard", () => {
	test("tapping the card body opens the issue", async () => {
		const onOpen = vi.fn();
		render(
			<DndContext>
				<DraggableIssueCard issue={issue} onOpen={onOpen} />
			</DndContext>,
		);
		await userEvent.click(screen.getByText("ClickToOpen"));
		expect(onOpen).toHaveBeenCalledTimes(1);
	});

	test("tapping the issue link does not open the modal", async () => {
		const onOpen = vi.fn();
		render(
			<DndContext>
				<DraggableIssueCard issue={issue} onOpen={onOpen} />
			</DndContext>,
		);
		await userEvent.click(screen.getByRole("link", { name: /open issue/i }));
		expect(onOpen).not.toHaveBeenCalled();
	});
});
