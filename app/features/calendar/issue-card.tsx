import { cx } from "@ngrok/mantle/cx";
import { ArrowSquareOut, FolderOpen } from "@phosphor-icons/react";
import { memo } from "react";
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
		<div
			className="group/card flex flex-col gap-1 rounded border border-card bg-card px-1.5 py-1 text-left"
			style={{ borderLeftColor: issue.state.color, borderLeftWidth: 3 }}
		>
			<p className="truncate text-xs font-medium text-strong" title={issue.title}>
				{issue.title}
			</p>

			<div className="flex items-center justify-between gap-1">
				<div className="flex min-w-0 items-center gap-1">
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

					{issue.labels.slice(0, MAX_LABEL_DOTS).map((label) => (
						<span
							key={label.id}
							title={label.name}
							className="size-2 shrink-0 rounded-full"
							style={{ backgroundColor: label.color }}
						/>
					))}
					{extraLabels > 0 ? <span className="text-[10px] text-muted">+{extraLabels}</span> : null}
				</div>

				<div className="flex shrink-0 items-center gap-1 text-muted">
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
							className={cx("hover:text-strong")}
							onClick={(e) => e.stopPropagation()}
						>
							<FolderOpen className="size-3.5" />
						</a>
					) : null}
				</div>
			</div>
		</div>
	);
});
