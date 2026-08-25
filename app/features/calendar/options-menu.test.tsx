import { ThemeProvider } from "@ngrok/mantle/theme";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { OptionsMenu } from "./options-menu";
import type { ViewOptions } from "./view-options";

const DEFAULT_OPTIONS: ViewOptions = {
	showWeekends: false,
	showCompleted: true,
	showSubtasks: true,
};

function renderMenu({
	options = DEFAULT_OPTIONS,
	onToggle = vi.fn(),
	Probe = null as (() => null) | null,
} = {}) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const Stub = createRoutesStub([
		{
			path: "/",
			Component: () => (
				<>
					{Probe ? <Probe /> : null}
					<OptionsMenu options={options} onToggle={onToggle} />
				</>
			),
		},
	]);

	render(
		<QueryClientProvider client={queryClient}>
			<ThemeProvider>
				<Stub />
			</ThemeProvider>
		</QueryClientProvider>,
	);
	return { onToggle, queryClient };
}

async function openMenu() {
	await userEvent.click(screen.getByRole("button", { name: "Options" }));
}

describe("OptionsMenu", () => {
	beforeEach(() => {
		// Mantle stores the theme in a cookie. Expire it so each test starts on
		// "system" instead of inheriting the previous test's choice.
		// biome-ignore lint/suspicious/noDocumentCookie: jsdom has no Cookie Store API.
		document.cookie = "mantle-ui-theme=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
		document.documentElement.className = "";
		document.documentElement.removeAttribute("data-theme");
		document.documentElement.removeAttribute("data-applied-theme");
	});

	test("groups the view toggles, the themes, and the actions under one trigger", async () => {
		renderMenu();
		await openMenu();

		expect(screen.getAllByRole("menuitemcheckbox").map((item) => item.textContent)).toEqual([
			"Show weekends",
			"Show completed",
			"Show sub-tasks",
		]);
		expect(screen.getAllByRole("menuitemradio").map((item) => item.textContent)).toEqual([
			"System",
			"Light",
			"Dark",
			"Light high contrast",
			"Dark high contrast",
		]);
		expect(screen.getByRole("menuitem", { name: "Refresh" })).toBeInTheDocument();
	});

	test("reflects the current view options and toggles them without closing", async () => {
		const { onToggle } = renderMenu();
		await openMenu();

		expect(screen.getByRole("menuitemcheckbox", { name: "Show weekends" })).not.toBeChecked();
		expect(screen.getByRole("menuitemcheckbox", { name: "Show completed" })).toBeChecked();

		await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Show weekends" }));
		expect(onToggle).toHaveBeenCalledWith("showWeekends");

		// Still open, so a second toggle needs no second trip to the trigger.
		await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Show completed" }));
		expect(onToggle).toHaveBeenCalledWith("showCompleted");
	});

	test("switches the theme from the menu", async () => {
		renderMenu();
		await openMenu();

		expect(screen.getByRole("menuitemradio", { name: "System" })).toBeChecked();
		await userEvent.click(screen.getByRole("menuitemradio", { name: "Dark" }));

		expect(document.documentElement.dataset.appliedTheme).toBe("dark");
		expect(document.documentElement).toHaveClass("dark");
		expect(document.cookie).toContain("mantle-ui-theme=dark");
	});

	test("refresh invalidates the cached issues", async () => {
		const { queryClient } = renderMenu();
		const invalidate = vi.spyOn(queryClient, "invalidateQueries");
		await openMenu();

		await userEvent.click(screen.getByRole("menuitem", { name: "Refresh" }));
		expect(invalidate).toHaveBeenCalledWith({ queryKey: ["calendar", "issues"] });
	});

	test("reports a sync in progress, then goes back to idle", async () => {
		let release = () => {};
		const inFlight = new Promise<void>((resolve) => {
			release = resolve;
		});
		// Stands in for a month section fetching its issues.
		function Probe() {
			useQuery({
				queryKey: ["calendar", "issues", "probe"],
				queryFn: async () => {
					await inFlight;
					return [];
				},
			});
			return null;
		}

		renderMenu({ Probe });
		await openMenu();

		const refreshing = screen.getByRole("menuitem", { name: /refreshing/i });
		expect(refreshing).toHaveAttribute("data-disabled");

		release();
		await waitFor(() =>
			expect(screen.getByRole("menuitem", { name: "Refresh" })).not.toHaveAttribute(
				"data-disabled",
			),
		);
	});

	// A personal API key is server config, not a session, so there is no
	// per-user connection for the browser to drop.
	test("offers nothing to disconnect from", async () => {
		renderMenu();
		await openMenu();

		expect(screen.queryByRole("menuitem", { name: "Disconnect" })).not.toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: "Refresh" })).toBeInTheDocument();
	});
});
