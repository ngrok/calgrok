import { act, render, renderHook, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { FilterBar, useCalendarFilters } from "./filters";
import type { LabelOption, TeamOption } from "./types";

const teams: TeamOption[] = [
	{ id: "gtm", key: "GTM", name: "GTM" },
	{ id: "content", key: "CON", name: "Content" },
];

const labels: LabelOption[] = [
	{
		name: "web",
		color: "#5e6ad2",
		matchesNamespace: true,
		ids: ["gtm-web", "content-web"],
		idByTeam: {},
		globalIds: [],
	},
	{
		name: "blog",
		color: "#95a2b3",
		matchesNamespace: false,
		ids: ["content-blog"],
		idByTeam: {},
		globalIds: [],
	},
];

describe("useCalendarFilters", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	test("starts with no labels and no teams when no default is configured", () => {
		const { result } = renderHook(() => useCalendarFilters(teams, []));
		expect(result.current.teamIds).toEqual([]);
		expect(result.current.labelIds).toEqual([]);
	});

	test("seeds the default teams on first visit and drops unknown ids", () => {
		const { result } = renderHook(() => useCalendarFilters(teams, ["content", "old-team"]));
		expect(result.current.teamIds).toEqual(["content"]);
	});

	test("toggleTeam removes then re-adds a team", () => {
		const { result } = renderHook(() => useCalendarFilters(teams, []));
		const first = teams[0]?.id as string;

		act(() => result.current.toggleTeam(first));
		expect(result.current.teamIds).toContain(first);

		act(() => result.current.toggleTeam(first));
		expect(result.current.teamIds).not.toContain(first);
	});

	test("restores selected teams from localStorage and drops unknown ids", () => {
		localStorage.setItem("calgrok:team-ids:v1", JSON.stringify(["content", "old-team"]));
		const { result } = renderHook(() => useCalendarFilters(teams, ["gtm"]));

		expect(result.current.teamIds).toEqual(["content"]);
	});

	test("a stored empty selection wins over the configured default", () => {
		localStorage.setItem("calgrok:team-ids:v1", JSON.stringify([]));
		const { result } = renderHook(() => useCalendarFilters(teams, ["gtm"]));

		expect(result.current.teamIds).toEqual([]);
	});

	test("toggleLabelGroup adds and removes all ids of a name together", () => {
		const { result } = renderHook(() => useCalendarFilters(teams, []));

		act(() => result.current.toggleLabelGroup(["gtm-web", "content-web"]));
		expect(result.current.labelIds).toEqual(["gtm-web", "content-web"]);

		act(() => result.current.toggleLabelGroup(["gtm-web", "content-web"]));
		expect(result.current.labelIds).toEqual([]);
	});
});

describe("FilterBar", () => {
	test("renders teams in a dropdown and reflects team selection", async () => {
		render(
			<FilterBar
				teams={teams}
				teamsLoading={false}
				teamIds={["gtm"]}
				labelIds={[]}
				labels={labels}
				onToggleTeam={vi.fn()}
				onToggleLabelGroup={vi.fn()}
				onClearLabels={vi.fn()}
			/>,
		);

		expect(screen.getByRole("button", { name: "Teams (1)" })).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: "Teams (1)" }));
		expect(screen.getByText("Filter by team")).toBeInTheDocument();
		expect(screen.getByRole("checkbox", { name: /GTM/ })).toBeChecked();
		expect(screen.getByRole("checkbox", { name: /Content/ })).not.toBeChecked();
		expect(screen.getByRole("button", { name: /labels/i })).toBeInTheDocument();
	});
});
