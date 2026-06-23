import { type QueryClient, useQuery } from "@tanstack/react-query";
import type { CalendarIssue, IssuesQueryParams } from "./types";

const ROOT = "calendar";

export const calendarKeys = {
	root: [ROOT] as const,
	issues: (params: IssuesQueryParams) =>
		[
			ROOT,
			"issues",
			params.start,
			params.end,
			(params.teamIds ?? []).join(","),
			(params.labelIds ?? []).join(","),
		] as const,
};

async function fetchIssues(params: IssuesQueryParams): Promise<CalendarIssue[]> {
	const search = new URLSearchParams({ start: params.start, end: params.end });
	if (params.teamIds?.length) {
		search.set("teamIds", params.teamIds.join(","));
	}
	if (params.labelIds?.length) {
		search.set("labelIds", params.labelIds.join(","));
	}

	const res = await fetch(`/api/issues?${search.toString()}`, {
		headers: { Accept: "application/json" },
	});
	if (!res.ok) {
		throw new Error(`Failed to load issues (${res.status})`);
	}
	const json = (await res.json()) as { issues: CalendarIssue[] };
	return json.issues;
}

export function useCalendarIssues(params: IssuesQueryParams) {
	return useQuery({
		queryKey: calendarKeys.issues(params),
		queryFn: () => fetchIssues(params),
	});
}

/** Warm the cache for a month the user is likely to navigate to next. */
export function prefetchCalendarIssues(client: QueryClient, params: IssuesQueryParams) {
	return client.prefetchQuery({
		queryKey: calendarKeys.issues(params),
		queryFn: () => fetchIssues(params),
	});
}
