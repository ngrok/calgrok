import { act, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { DEFAULT_TEAM_IDS } from "~/lib/teams";
import { FilterBar, useCalendarFilters } from "./filters";

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

	test("toggleLabel and clearLabels manage label selection", () => {
		const { result } = renderHook(() => useCalendarFilters());

		act(() => result.current.toggleLabel("label-1"));
		act(() => result.current.toggleLabel("label-2"));
		expect(result.current.labelIds).toEqual(["label-1", "label-2"]);

		act(() => result.current.toggleLabel("label-1"));
		expect(result.current.labelIds).toEqual(["label-2"]);

		act(() => result.current.clearLabels());
		expect(result.current.labelIds).toEqual([]);
	});
});

describe("FilterBar", () => {
	test("renders a toggle per team reflecting selection", () => {
		const onToggleTeam = vi.fn();
		render(
			<FilterBar
				teamIds={[DEFAULT_TEAM_IDS[0] as string]}
				labelIds={[]}
				labels={[]}
				onToggleTeam={onToggleTeam}
				onToggleLabel={vi.fn()}
				onClearLabels={vi.fn()}
			/>,
		);

		const gtm = screen.getByRole("button", { name: "GTM" });
		const content = screen.getByRole("button", { name: "Content" });
		expect(gtm).toHaveAttribute("aria-pressed", "true");
		expect(content).toHaveAttribute("aria-pressed", "false");
		expect(screen.getByRole("button", { name: /labels/i })).toBeInTheDocument();
	});
});
