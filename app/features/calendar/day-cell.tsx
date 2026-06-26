import { useDroppable } from "@dnd-kit/core";
import { cx } from "@ngrok/mantle/cx";
import { forwardRef, memo, useState } from "react";
import { toISODate } from "./date-utils";
import { DraggableIssueCard } from "./draggable-issue-card";
import type { CalendarIssue } from "./types";

// Cap visible cards per day so a busy day doesn't blow up the row height.
const MAX_VISIBLE = 4;

export const DayCell = memo(
	forwardRef<
		HTMLDivElement,
		{
			date: Date;
			issues: CalendarIssue[];
			isCurrentMonth: boolean;
			isToday: boolean;
			onOpenIssue: (issue: CalendarIssue) => void;
		}
	>(function DayCell({ date, issues, isCurrentMonth, isToday, onOpenIssue }, ref) {
		// Each day is a drop target keyed by its ISO date (the new dueDate).
		const { setNodeRef, isOver } = useDroppable({ id: toISODate(date) });
		const [expanded, setExpanded] = useState(false);
		function setRefs(node: HTMLDivElement | null) {
			setNodeRef(node);
			if (typeof ref === "function") {
				ref(node);
			} else if (ref) {
				ref.current = node;
			}
		}

		const hidden = issues.length - MAX_VISIBLE;
		const visible = expanded ? issues : issues.slice(0, MAX_VISIBLE);

		return (
			<div
				ref={setRefs}
				className={cx(
					"flex min-h-28 flex-col gap-1.5 border-b border-l border-card-muted p-1.5 transition-colors",
					!isCurrentMonth && "bg-card-hover/40",
					isToday && "bg-filled-accent/5",
					isOver && "bg-filled-accent/10 ring-1 ring-inset ring-accent-500",
				)}
			>
				<div className="flex justify-end">
					<span
						className={cx(
							"flex size-5 items-center justify-center rounded-full text-sm",
							isToday && "bg-filled-accent font-medium text-on-filled",
							!isToday && !isCurrentMonth && "text-muted",
							!isToday && isCurrentMonth && "text-strong",
						)}
					>
						{date.getDate()}
					</span>
				</div>

				<div className="flex flex-col gap-1.5">
					{visible.map((issue) => (
						<DraggableIssueCard key={issue.id} issue={issue} onOpen={onOpenIssue} />
					))}
					{!expanded && hidden > 0 ? (
						<button
							type="button"
							className="rounded px-1 py-0.5 text-left text-xs text-muted hover:text-strong"
							onClick={() => setExpanded(true)}
						>
							+{hidden} more
						</button>
					) : null}
				</div>
			</div>
		);
	}),
);
