import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CalendarIssue, IssuesQueryParams, LinearLabel } from "./types";

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
		// No teams selected → nothing to show; skip the request entirely.
		enabled: (params.teamIds?.length ?? 0) > 0,
	});
}

async function fetchLabelsList(): Promise<LinearLabel[]> {
	const res = await fetch("/api/labels", { headers: { Accept: "application/json" } });
	if (!res.ok) {
		throw new Error(`Failed to load labels (${res.status})`);
	}
	const json = (await res.json()) as { labels: LinearLabel[] };
	return json.labels;
}

export function useLabels() {
	return useQuery({
		queryKey: [ROOT, "labels"] as const,
		queryFn: fetchLabelsList,
		staleTime: 5 * 60 * 1000, // labels change rarely
	});
}

const issuesQueryFilter = { queryKey: [ROOT, "issues"] } as const;

async function postDueDate(issueId: string, dueDate: string): Promise<void> {
	const res = await fetch("/api/issues", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ issueId, dueDate }),
	});
	if (!res.ok) {
		throw new Error(`Failed to update due date (${res.status})`);
	}
}

/**
 * Reschedule an issue's dueDate with an optimistic cache update: the card jumps
 * to the new day immediately, the mutation fires in the background, and we roll
 * back if Linear rejects it.
 */
export function useUpdateDueDate() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ issueId, dueDate }: { issueId: string; dueDate: string }) =>
			postDueDate(issueId, dueDate),
		onMutate: async ({ issueId, dueDate }) => {
			await queryClient.cancelQueries(issuesQueryFilter);
			const previous = queryClient.getQueriesData<CalendarIssue[]>(issuesQueryFilter);
			queryClient.setQueriesData<CalendarIssue[]>(issuesQueryFilter, (old) =>
				old?.map((issue) => (issue.id === issueId ? { ...issue, dueDate } : issue)),
			);
			return { previous };
		},
		onError: (_error, _vars, context) => {
			for (const [key, data] of context?.previous ?? []) {
				queryClient.setQueryData(key, data);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries(issuesQueryFilter);
		},
	});
}

/** Warm the cache for a month the user is likely to navigate to next. */
export function prefetchCalendarIssues(client: QueryClient, params: IssuesQueryParams) {
	return client.prefetchQuery({
		queryKey: calendarKeys.issues(params),
		queryFn: () => fetchIssues(params),
	});
}
