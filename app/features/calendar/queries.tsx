import { makeToast, Toast } from "@ngrok/mantle/toast";
import {
	keepPreviousData,
	type QueryClient,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import type {
	CalendarIssue,
	IssuesQueryParams,
	LabelsResponse,
	TeamsResponse,
	WorkflowState,
} from "./types";

function rollbackTo(
	queryClient: QueryClient,
	previous: [readonly unknown[], CalendarIssue[] | undefined][] | undefined,
	message: string,
) {
	for (const [key, data] of previous ?? []) {
		queryClient.setQueryData(key, data);
	}
	makeToast(
		<Toast.Root priority="danger">
			<Toast.Message>{message}</Toast.Message>
		</Toast.Root>,
	);
}

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

export function useCalendarIssues(params: IssuesQueryParams, enabled: boolean) {
	return useQuery({
		queryKey: calendarKeys.issues(params),
		queryFn: () => fetchIssues(params),
		enabled,
		// Keep showing the current month while the next one loads (no empty flash).
		placeholderData: keepPreviousData,
	});
}

async function fetchLabelsList(): Promise<LabelsResponse> {
	const res = await fetch("/api/labels", { headers: { Accept: "application/json" } });
	if (!res.ok) {
		throw new Error(`Failed to load labels (${res.status})`);
	}
	return (await res.json()) as LabelsResponse;
}

export function useLabels() {
	return useQuery({
		queryKey: [ROOT, "labels"] as const,
		queryFn: fetchLabelsList,
		staleTime: 5 * 60 * 1000, // labels change rarely
	});
}

async function fetchTeamsList(): Promise<TeamsResponse> {
	const res = await fetch("/api/teams", { headers: { Accept: "application/json" } });
	if (!res.ok) {
		throw new Error(`Failed to load teams (${res.status})`);
	}
	return (await res.json()) as TeamsResponse;
}

export function useTeams() {
	return useQuery({
		queryKey: [ROOT, "teams"] as const,
		queryFn: fetchTeamsList,
		staleTime: 5 * 60 * 1000, // teams change rarely
	});
}

async function fetchWorkflowStates(teamId: string): Promise<WorkflowState[]> {
	const res = await fetch(`/api/states?teamIds=${encodeURIComponent(teamId)}`, {
		headers: { Accept: "application/json" },
	});
	if (!res.ok) {
		throw new Error(`Failed to load statuses (${res.status})`);
	}
	const json = (await res.json()) as { states: WorkflowState[] };
	// Order the way Linear's own status menu does.
	return json.states.sort((a, b) => a.position - b.position);
}

/** Workflow states (statuses) available for a team, for the status picker. */
export function useWorkflowStates(teamId: string | null) {
	return useQuery({
		queryKey: [ROOT, "states", teamId] as const,
		queryFn: () => fetchWorkflowStates(teamId as string),
		enabled: Boolean(teamId),
		staleTime: 5 * 60 * 1000, // workflow states change rarely
	});
}

export function useIssueDescription(issueId: string | null) {
	return useQuery({
		queryKey: [ROOT, "issue", issueId] as const,
		queryFn: async () => {
			const res = await fetch(`/api/issue?id=${encodeURIComponent(issueId as string)}`, {
				headers: { Accept: "application/json" },
			});
			if (!res.ok) {
				throw new Error(`Failed to load issue (${res.status})`);
			}
			return (await res.json()) as { description: string | null };
		},
		enabled: Boolean(issueId),
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
			rollbackTo(
				queryClient,
				context?.previous,
				"We couldn't save that change — it's been reverted.",
			);
		},
		onSettled: () => {
			queryClient.invalidateQueries(issuesQueryFilter);
		},
	});
}

async function postClearDueDate(issueId: string): Promise<void> {
	const res = await fetch("/api/issues", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ issueId, dueDate: null }),
	});
	if (!res.ok) {
		throw new Error(`Failed to clear due date (${res.status})`);
	}
}

/**
 * Clear an issue's dueDate. Optimistically removes it from the calendar (an
 * undated issue has no place on the grid), rolling back on failure.
 */
export function useClearDueDate() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (issueId: string) => postClearDueDate(issueId),
		onMutate: async (issueId) => {
			await queryClient.cancelQueries(issuesQueryFilter);
			const previous = queryClient.getQueriesData<CalendarIssue[]>(issuesQueryFilter);
			queryClient.setQueriesData<CalendarIssue[]>(issuesQueryFilter, (old) =>
				old?.filter((issue) => issue.id !== issueId),
			);
			return { previous };
		},
		onError: (_error, _vars, context) => {
			rollbackTo(
				queryClient,
				context?.previous,
				"We couldn't save that change — it's been reverted.",
			);
		},
		onSettled: () => {
			queryClient.invalidateQueries(issuesQueryFilter);
		},
	});
}

async function postLabels(issueId: string, labelIds: string[]): Promise<void> {
	const res = await fetch("/api/issues", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ issueId, labelIds }),
	});
	if (!res.ok) {
		throw new Error(`Failed to update labels (${res.status})`);
	}
}

/**
 * Replace an issue's labels with the given full set (caller merges kept
 * non-namespace labels), optimistically updating the cache with rollback.
 */
export function useUpdateLabels() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ issueId, labels }: { issueId: string; labels: CalendarIssue["labels"] }) =>
			postLabels(
				issueId,
				labels.map((label) => label.id),
			),
		onMutate: async ({ issueId, labels }) => {
			await queryClient.cancelQueries(issuesQueryFilter);
			const previous = queryClient.getQueriesData<CalendarIssue[]>(issuesQueryFilter);
			queryClient.setQueriesData<CalendarIssue[]>(issuesQueryFilter, (old) =>
				old?.map((issue) => (issue.id === issueId ? { ...issue, labels } : issue)),
			);
			return { previous };
		},
		onError: (_error, _vars, context) => {
			rollbackTo(
				queryClient,
				context?.previous,
				"We couldn't save that change — it's been reverted.",
			);
		},
		onSettled: () => {
			queryClient.invalidateQueries(issuesQueryFilter);
		},
	});
}

async function postState(issueId: string, stateId: string): Promise<void> {
	const res = await fetch("/api/issues", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ issueId, stateId }),
	});
	if (!res.ok) {
		throw new Error(`Failed to update status (${res.status})`);
	}
}

/**
 * Change an issue's status with an optimistic cache update: the badge/border
 * recolor immediately, then we roll back if Linear rejects it. The caller passes
 * the full new state so the cache reflects the right name and color at once.
 */
export function useUpdateState() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ issueId, state }: { issueId: string; state: CalendarIssue["state"] }) =>
			postState(issueId, state.id),
		onMutate: async ({ issueId, state }) => {
			await queryClient.cancelQueries(issuesQueryFilter);
			const previous = queryClient.getQueriesData<CalendarIssue[]>(issuesQueryFilter);
			queryClient.setQueriesData<CalendarIssue[]>(issuesQueryFilter, (old) =>
				old?.map((issue) => (issue.id === issueId ? { ...issue, state } : issue)),
			);
			return { previous };
		},
		onError: (_error, _vars, context) => {
			rollbackTo(
				queryClient,
				context?.previous,
				"We couldn't save that change — it's been reverted.",
			);
		},
		onSettled: () => {
			queryClient.invalidateQueries(issuesQueryFilter);
		},
	});
}

/** Warm the cache for a month the user is likely to navigate to next. */
export function prefetchCalendarIssues(client: QueryClient, params: IssuesQueryParams) {
	if ((params.teamIds?.length ?? 0) === 0) {
		return Promise.resolve();
	}
	return client.prefetchQuery({
		queryKey: calendarKeys.issues(params),
		queryFn: () => fetchIssues(params),
	});
}
