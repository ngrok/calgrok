import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cx } from "@ngrok/mantle/cx";
import { IssueCard } from "./issue-card";
import type { CalendarIssue } from "./types";

export function DraggableIssueCard({ issue }: { issue: CalendarIssue }) {
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
		id: issue.id,
		data: { issue },
	});

	return (
		<div
			ref={setNodeRef}
			style={{ transform: CSS.Translate.toString(transform) }}
			className={cx("cursor-grab touch-none", isDragging && "opacity-40")}
			{...listeners}
			{...attributes}
		>
			<IssueCard issue={issue} />
		</div>
	);
}
