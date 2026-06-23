import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { calendarKeys, useUpdateDueDate } from "./queries";
import type { CalendarIssue } from "./types";

const params = { start: "2026-06-01", end: "2026-07-06", teamIds: ["t1"], labelIds: [] };

const issue: CalendarIssue = {
	id: "issue-1",
	identifier: "GTM-1",
	title: "Launch blog post",
	dueDate: "2026-06-10",
	url: "https://linear.app/x",
	state: { id: "s", name: "Todo", color: "#fff", type: "unstarted" },
	assignee: null,
	labels: [],
	project: null,
	team: { id: "t1", key: "GTM", name: "GTM" },
};

afterEach(() => vi.unstubAllGlobals());

describe("useUpdateDueDate", () => {
	test("optimistically moves the issue to the new dueDate and POSTs the change", async () => {
		const fetchMock = vi.fn(
			async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
		);
		vi.stubGlobal("fetch", fetchMock);

		const queryClient = new QueryClient();
		queryClient.setQueryData(calendarKeys.issues(params), [issue]);

		const wrapper = ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
		const { result } = renderHook(() => useUpdateDueDate(), { wrapper });

		await act(async () => {
			await result.current.mutateAsync({ issueId: "issue-1", dueDate: "2026-06-12" });
		});

		const cached = queryClient.getQueryData<CalendarIssue[]>(calendarKeys.issues(params));
		expect(cached?.[0]?.dueDate).toBe("2026-06-12");
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/issues",
			expect.objectContaining({ method: "POST" }),
		);
	});

	test("rolls back the optimistic move if the request fails", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("nope", { status: 500 })),
		);

		const queryClient = new QueryClient();
		queryClient.setQueryData(calendarKeys.issues(params), [issue]);

		const wrapper = ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
		const { result } = renderHook(() => useUpdateDueDate(), { wrapper });

		await act(async () => {
			await result.current.mutateAsync({ issueId: "issue-1", dueDate: "2026-06-12" }).catch(() => {});
		});

		const cached = queryClient.getQueryData<CalendarIssue[]>(calendarKeys.issues(params));
		expect(cached?.[0]?.dueDate).toBe("2026-06-10");
	});
});
