/** An issue as the calendar needs it — flattened, only the fields we render. */
export type CalendarIssue = {
	id: string;
	identifier: string;
	title: string;
	/** TimelessDate, "YYYY-MM-DD". Treated as the publish date. */
	dueDate: string;
	url: string;
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
};

export type LinearLabel = { id: string; name: string; color: string };

export type IssuesQueryParams = {
	/** Inclusive "YYYY-MM-DD". */
	start: string;
	/** Inclusive "YYYY-MM-DD". */
	end: string;
	teamIds?: string[];
	labelIds?: string[];
};
