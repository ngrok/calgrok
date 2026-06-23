import { useDroppable } from "@dnd-kit/core";
import { cx } from "@ngrok/mantle/cx";
import { toISODate } from "./date-utils";
import { DraggableIssueCard } from "./draggable-issue-card";
import type { CalendarIssue } from "./types";

export function DayCell({
	date,
	issues,
	isCurrentMonth,
	isToday,
}: {
	date: Date;
	issues: CalendarIssue[];
	isCurrentMonth: boolean;
	isToday: boolean;
}) {
	// Each day is a drop target keyed by its ISO date (the new dueDate).
	const { setNodeRef, isOver } = useDroppable({ id: toISODate(date) });

	return (
		<div
			ref={setNodeRef}
			className={cx(
				"flex min-h-28 flex-col gap-1 border-b border-r border-card p-1",
				isOver && "bg-filled-accent/10 ring-1 ring-inset ring-accent-500",
			)}
		>
			<div className="flex justify-end">
				<span
					className={cx(
						"flex size-5 items-center justify-center rounded-full text-xs",
						isToday && "bg-filled-accent font-medium text-on-filled",
						!isToday && !isCurrentMonth && "text-muted",
						!isToday && isCurrentMonth && "text-strong",
					)}
				>
					{date.getDate()}
				</span>
			</div>

			<div className="flex flex-col gap-1">
				{issues.map((issue) => (
					<DraggableIssueCard key={issue.id} issue={issue} />
				))}
			</div>
		</div>
	);
}
