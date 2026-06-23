import { act, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { DEFAULT_TEAM_IDS } from "~/lib/teams";
import { FilterBar, useCalendarFilters } from "./filters";
import type { LabelOption } from "./types";

const labels: LabelOption[] = [
	{ name: "web", color: "#5e6ad2", ids: ["gtm-web", "content-web"], idByTeam: {} },
	{ name: "blog", color: "#95a2b3", ids: ["content-blog"], idByTeam: {} },
];

describe("useCalendarFilters", () => {
	test("starts with all default teams and no labels", () => {
		const { result } = renderHook(() => useCalendarFilters());
		expect(result.current.teamIds).toEqual(DEFAULT_TEAM_IDS);
		expect(result.current.labelIds).toEqual([]);
	});

	test("toggleTeam removes then re-adds a team", () => {
		const { result } = renderHook(() => useCalendarFilters());
		const first = DEFAULT_TEAM_IDS[0] as string;

		act(() => result.current.toggleTeam(first));
		expect(result.current.teamIds).not.toContain(first);

		act(() => result.current.toggleTeam(first));
		expect(result.current.teamIds).toContain(first);
	});

	test("toggleLabelGroup adds and removes all ids of a name together", () => {
		const { result } = renderHook(() => useCalendarFilters());

		act(() => result.current.toggleLabelGroup(["gtm-web", "content-web"]));
		expect(result.current.labelIds).toEqual(["gtm-web", "content-web"]);

		act(() => result.current.toggleLabelGroup(["gtm-web", "content-web"]));
		expect(result.current.labelIds).toEqual([]);
	});
});

describe("FilterBar", () => {
	test("renders one row per label name and reflects team selection", () => {
		render(
			<FilterBar
				teamIds={[DEFAULT_TEAM_IDS[0] as string]}
				labelIds={[]}
				labels={labels}
				onToggleTeam={vi.fn()}
				onToggleLabelGroup={vi.fn()}
				onClearLabels={vi.fn()}
			/>,
		);

		expect(screen.getByRole("button", { name: "GTM" })).toHaveAttribute("aria-pressed", "true");
		expect(screen.getByRole("button", { name: "Content" })).toHaveAttribute(
			"aria-pressed",
			"false",
		);
		expect(screen.getByRole("button", { name: /labels/i })).toBeInTheDocument();
	});
});
