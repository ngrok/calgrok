/** An issue as the calendar needs it — flattened, only the fields we render. */
export type CalendarIssue = {
	id: string;
	identifier: string;
	title: string;
	/** TimelessDate, "YYYY-MM-DD". Treated as the publish date. */
	dueDate: string;
	url: string;
	priority: number;
	priorityLabel: string;
	state: { id: string; name: string; color: string; type: string };
	assignee: {
		id: string;
		name: string;
		displayName: string;
		avatarUrl: string | null;
	} | null;
	labels: { id: string; name: string; color: string }[];
	project: { id: string; name: string; url: string } | null;
	team: { id: string; key: string; name: string };
	/** Present when the issue is a sub-task. */
	parent: { id: string } | null;
};

// A workflow state (status) as the picker uses it. `type` is Linear's category
// (backlog/unstarted/started/completed/cancelled); `position` orders them within
// a team the way Linear's own status menu does.
export type WorkflowState = {
	id: string;
	name: string;
	color: string;
	type: string;
	position: number;
};

// A label as the picker uses it: same display name may map to several Linear
// labels (the same `con/x` defined separately per team), so we carry all ids
// plus a per-team id for applying the right one to an issue.
export type LabelOption = {
	name: string;
	color: string;
	/** All label ids sharing this display name (used for filtering). */
	ids: string[];
	/** teamId -> labelId, for applying the team-correct label to an issue. */
	idByTeam: Record<string, string>;
};

export type IssuesQueryParams = {
	/** Inclusive "YYYY-MM-DD". */
	start: string;
	/** Inclusive "YYYY-MM-DD". */
	end: string;
	teamIds?: string[];
	labelIds?: string[];
};
