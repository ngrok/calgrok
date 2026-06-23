import type { CalendarIssue, LinearLabel } from "~/features/calendar/types";

const GRAPHQL_URL = "https://api.linear.app/graphql";

type GraphQLResponse<T> = { data?: T; errors?: { message: string }[] };

async function linearGraphQL<T>(
	accessToken: string,
	query: string,
	variables: Record<string, unknown>,
): Promise<T> {
	const res = await fetch(GRAPHQL_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${accessToken}`,
		},
		body: JSON.stringify({ query, variables }),
	});

	if (res.status === 401) {
		// Token rejected — surface as 401 so the client can prompt re-auth.
		throw new Response("Linear authorization expired", { status: 401 });
	}
	if (!res.ok) {
		throw new Error(`Linear API error: ${res.status} ${await res.text()}`);
	}

	const json = (await res.json()) as GraphQLResponse<T>;
	if (json.errors?.length) {
		throw new Error(`Linear GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`);
	}
	if (!json.data) {
		throw new Error("Linear GraphQL returned no data");
	}
	return json.data;
}

// One query pulls every field the calendar renders, including nested
// assignee/state/labels/project — avoiding the per-issue N+1 fetches that make
// the @linear/sdk lazy accessors (and tools like LinCal) slow.
const CALENDAR_ISSUES_QUERY = `
query CalendarIssues($filter: IssueFilter!, $first: Int!, $after: String) {
  issues(filter: $filter, first: $first, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id
      identifier
      title
      dueDate
      url
      state { id name color type }
      assignee { id name displayName avatarUrl }
      labels { nodes { id name color } }
      project { id name url }
      team { id key name }
    }
  }
}`;

type RawIssue = Omit<CalendarIssue, "labels"> & {
	labels: { nodes: CalendarIssue["labels"] };
};

type CalendarIssuesData = {
	issues: {
		pageInfo: { hasNextPage: boolean; endCursor: string | null };
		nodes: RawIssue[];
	};
};

export async function fetchCalendarIssues(params: {
	accessToken: string;
	teamIds: string[];
	labelIds?: string[];
	start: string;
	end: string;
}): Promise<CalendarIssue[]> {
	// Scope the query to the selected teams AND the visible date window so we
	// never pull the whole backlog.
	const filter: Record<string, unknown> = {
		dueDate: { gte: params.start, lte: params.end },
		team: { id: { in: params.teamIds } },
	};
	if (params.labelIds && params.labelIds.length > 0) {
		filter.labels = { some: { id: { in: params.labelIds } } };
	}

	const issues: CalendarIssue[] = [];
	let after: string | null = null;

	// Paginate to exhaustion. A month of content issues is small; the cap is a
	// runaway guard.
	for (let page = 0; page < 20; page++) {
		const result: CalendarIssuesData = await linearGraphQL<CalendarIssuesData>(
			params.accessToken,
			CALENDAR_ISSUES_QUERY,
			{ filter, first: 250, after },
		);
		for (const node of result.issues.nodes) {
			issues.push({ ...node, labels: node.labels.nodes });
		}
		if (!result.issues.pageInfo.hasNextPage) {
			break;
		}
		after = result.issues.pageInfo.endCursor;
	}

	return issues;
}

const LABELS_QUERY = `
query IssueLabels($first: Int!, $after: String) {
  issueLabels(first: $first, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes { id name color isGroup }
  }
}`;

type LabelsData = {
	issueLabels: {
		pageInfo: { hasNextPage: boolean; endCursor: string | null };
		nodes: { id: string; name: string; color: string; isGroup: boolean }[];
	};
};

/** All applicable labels (group/parent labels excluded), sorted by name. */
export async function fetchLabels(accessToken: string): Promise<LinearLabel[]> {
	const labels: LinearLabel[] = [];
	let after: string | null = null;

	for (let page = 0; page < 20; page++) {
		const result: LabelsData = await linearGraphQL<LabelsData>(accessToken, LABELS_QUERY, {
			first: 250,
			after,
		});
		for (const node of result.issueLabels.nodes) {
			if (!node.isGroup) {
				labels.push({ id: node.id, name: node.name, color: node.color });
			}
		}
		if (!result.issueLabels.pageInfo.hasNextPage) {
			break;
		}
		after = result.issueLabels.pageInfo.endCursor;
	}

	labels.sort((a, b) => a.name.localeCompare(b.name));
	return labels;
}

const UPDATE_DUE_DATE_MUTATION = `
mutation UpdateDueDate($id: String!, $dueDate: TimelessDate) {
  issueUpdate(id: $id, input: { dueDate: $dueDate }) {
    success
  }
}`;

export async function updateIssueDueDate(params: {
	accessToken: string;
	issueId: string;
	dueDate: string;
}): Promise<void> {
	const data = await linearGraphQL<{ issueUpdate: { success: boolean } }>(
		params.accessToken,
		UPDATE_DUE_DATE_MUTATION,
		{ id: params.issueId, dueDate: params.dueDate },
	);
	if (!data.issueUpdate.success) {
		throw new Error("Linear did not accept the due date update");
	}
}
