import type { CalendarIssue, WorkflowState } from "~/features/calendar/types";

export type RawLabel = { id: string; name: string; color: string; teamId: string | null };
export type RawTeam = { id: string; key: string; name: string };

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
      priority
      priorityLabel
      state { id name color type }
      assignee { id name displayName avatarUrl }
      labels { nodes { id name color } }
      project { id name url }
      team { id key name }
      parent { id }
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
    nodes { id name color isGroup team { id } }
  }
}`;

type LabelsData = {
	issueLabels: {
		pageInfo: { hasNextPage: boolean; endCursor: string | null };
		nodes: {
			id: string;
			name: string;
			color: string;
			isGroup: boolean;
			team: { id: string } | null;
		}[];
	};
};

/**
 * All non-group labels with their owning team. Labels with the same name can
 * exist in multiple teams; the route groups them for display while keeping each
 * team's id.
 */
export async function fetchLabels(accessToken: string): Promise<RawLabel[]> {
	const labels: RawLabel[] = [];
	let after: string | null = null;

	for (let page = 0; page < 20; page++) {
		const result: LabelsData = await linearGraphQL<LabelsData>(accessToken, LABELS_QUERY, {
			first: 250,
			after,
		});
		for (const node of result.issueLabels.nodes) {
			if (!node.isGroup) {
				labels.push({
					id: node.id,
					name: node.name,
					color: node.color,
					teamId: node.team?.id ?? null,
				});
			}
		}
		if (!result.issueLabels.pageInfo.hasNextPage) {
			break;
		}
		after = result.issueLabels.pageInfo.endCursor;
	}

	return labels;
}

const TEAMS_QUERY = `
query Teams($first: Int!, $after: String) {
  viewer {
    teams(first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes { id key name }
    }
  }
}`;

type TeamsData = {
	viewer: {
		teams: {
			pageInfo: { hasNextPage: boolean; endCursor: string | null };
			nodes: RawTeam[];
		};
	};
};

/** Teams the authenticated Linear user belongs to. */
export async function fetchTeams(accessToken: string): Promise<RawTeam[]> {
	const teams: RawTeam[] = [];
	let after: string | null = null;

	for (let page = 0; page < 20; page++) {
		const result: TeamsData = await linearGraphQL<TeamsData>(accessToken, TEAMS_QUERY, {
			first: 250,
			after,
		});
		teams.push(...result.viewer.teams.nodes);
		if (!result.viewer.teams.pageInfo.hasNextPage) {
			break;
		}
		after = result.viewer.teams.pageInfo.endCursor;
	}

	return teams.sort((a, b) => a.name.localeCompare(b.name));
}

const WORKFLOW_STATES_QUERY = `
query WorkflowStates($teamIds: [ID!]!, $first: Int!, $after: String) {
  workflowStates(filter: { team: { id: { in: $teamIds } } }, first: $first, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes { id name color type position team { id } }
  }
}`;

type WorkflowStatesData = {
	workflowStates: {
		pageInfo: { hasNextPage: boolean; endCursor: string | null };
		nodes: (WorkflowState & { team: { id: string } })[];
	};
};

/** Workflow states (statuses) for the given teams, each carrying its team id. */
export async function fetchWorkflowStates(
	accessToken: string,
	teamIds: string[],
): Promise<(WorkflowState & { teamId: string })[]> {
	const states: (WorkflowState & { teamId: string })[] = [];
	let after: string | null = null;

	for (let page = 0; page < 20; page++) {
		const result: WorkflowStatesData = await linearGraphQL<WorkflowStatesData>(
			accessToken,
			WORKFLOW_STATES_QUERY,
			{ teamIds, first: 250, after },
		);
		for (const node of result.workflowStates.nodes) {
			const { team, ...state } = node;
			states.push({ ...state, teamId: team.id });
		}
		if (!result.workflowStates.pageInfo.hasNextPage) {
			break;
		}
		after = result.workflowStates.pageInfo.endCursor;
	}

	return states;
}

const UPDATE_STATE_MUTATION = `
mutation UpdateState($id: String!, $stateId: String!) {
  issueUpdate(id: $id, input: { stateId: $stateId }) {
    success
  }
}`;

export async function updateIssueState(params: {
	accessToken: string;
	issueId: string;
	stateId: string;
}): Promise<void> {
	const data = await linearGraphQL<{ issueUpdate: { success: boolean } }>(
		params.accessToken,
		UPDATE_STATE_MUTATION,
		{ id: params.issueId, stateId: params.stateId },
	);
	if (!data.issueUpdate.success) {
		throw new Error("Linear did not accept the status update");
	}
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
	/** A "YYYY-MM-DD" date, or null to clear it (removes the issue from the calendar). */
	dueDate: string | null;
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

const UPDATE_LABELS_MUTATION = `
mutation UpdateLabels($id: String!, $labelIds: [String!]) {
  issueUpdate(id: $id, input: { labelIds: $labelIds }) {
    success
  }
}`;

// Note: issueUpdate replaces the entire label set. Callers must pass the full
// desired list (the modal merges kept non-namespace labels with edited ones).
export async function updateIssueLabels(params: {
	accessToken: string;
	issueId: string;
	labelIds: string[];
}): Promise<void> {
	const data = await linearGraphQL<{ issueUpdate: { success: boolean } }>(
		params.accessToken,
		UPDATE_LABELS_MUTATION,
		{ id: params.issueId, labelIds: params.labelIds },
	);
	if (!data.issueUpdate.success) {
		throw new Error("Linear did not accept the label update");
	}
}

const ISSUE_DETAIL_QUERY = `
query IssueDetail($id: String!) {
  issue(id: $id) {
    id
    description
  }
}`;

export async function fetchIssueDetail(
	accessToken: string,
	issueId: string,
): Promise<{ description: string | null }> {
	const data = await linearGraphQL<{ issue: { id: string; description: string | null } }>(
		accessToken,
		ISSUE_DETAIL_QUERY,
		{ id: issueId },
	);
	return { description: data.issue.description };
}
