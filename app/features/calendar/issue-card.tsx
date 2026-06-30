import { ArrowSquareOut, FolderOpen } from "@phosphor-icons/react";
import { memo } from "react";
import { PriorityIcon } from "./priority-icon";
import { StatusIcon } from "./status-icon";
import type { CalendarIssue } from "./types";

function initialsOf(name: string): string {
	const parts = name.trim().split(/\s+/);
	const first = parts[0]?.[0] ?? "?";
	const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
	return (first + last).toUpperCase();
}

const MAX_LABEL_DOTS = 3;

// Memoized: issue refs are stable across renders (from the query cache), so
// non-dragging cards skip re-rendering during a drag.
export const IssueCard = memo(function IssueCard({ issue }: { issue: CalendarIssue }) {
	const extraLabels = issue.labels.length - MAX_LABEL_DOTS;

	return (
		<div className="group/card flex flex-col gap-1 rounded-md border border-card bg-card px-2 py-1.5 text-left shadow-sm transition-colors hover:bg-card-hover">
			<div className="flex items-center gap-1.5">
				<StatusIcon type={issue.state.type} color={issue.state.color} label={issue.state.name} />
				<p className="truncate text-sm font-medium leading-snug text-strong" title={issue.title}>
					{issue.title}
				</p>
			</div>

			<div className="flex items-center gap-1.5 pl-5">
				<span className="shrink-0 text-[11px] font-medium tabular-nums text-muted">
					{issue.identifier}
				</span>
				{issue.priority > 0 ? (
					<PriorityIcon
						priority={issue.priority}
						label={issue.priorityLabel}
						className="text-muted"
					/>
				) : null}
				{issue.labels.slice(0, MAX_LABEL_DOTS).map((label) => (
					<span
						key={label.id}
						title={label.name}
						className="size-1.5 shrink-0 rounded-full"
						style={{ backgroundColor: label.color }}
					/>
				))}
				{extraLabels > 0 ? <span className="text-[10px] text-muted">+{extraLabels}</span> : null}

				<div className="ml-auto flex shrink-0 items-center gap-1">
					<div className="flex items-center gap-1 text-muted opacity-0 transition-opacity focus-within:opacity-100 group-hover/card:opacity-100">
						<a
							href={issue.url}
							target="_blank"
							rel="noreferrer"
							onClick={(e) => e.stopPropagation()}
							aria-label={`Open issue ${issue.identifier}`}
							title={`Open issue ${issue.identifier}`}
							className="hover:text-strong"
						>
							<ArrowSquareOut className="size-3.5" />
						</a>
						{issue.project ? (
							<a
								href={issue.project.url}
								target="_blank"
								rel="noreferrer"
								aria-label={`Open project: ${issue.project.name}`}
								title={`Open project: ${issue.project.name}`}
								className="hover:text-strong"
								onClick={(e) => e.stopPropagation()}
							>
								<FolderOpen className="size-3.5" />
							</a>
						) : null}
					</div>

					{issue.assignee ? (
						issue.assignee.avatarUrl ? (
							<img
								src={issue.assignee.avatarUrl}
								alt={issue.assignee.name}
								title={issue.assignee.name}
								className="size-4 shrink-0 rounded-full"
							/>
						) : (
							<span
								title={issue.assignee.name}
								className="flex size-4 shrink-0 items-center justify-center rounded-full bg-filled-accent text-[8px] font-medium text-on-filled"
							>
								{initialsOf(issue.assignee.displayName || issue.assignee.name)}
							</span>
						)
					) : null}
				</div>
			</div>
		</div>
	);
});
