import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cx } from "@ngrok/mantle/cx";
import { useRef } from "react";
import { IssueCard } from "./issue-card";
import type { CalendarIssue } from "./types";

// dnd-kit's listeners swallow the synthetic `click`, so we detect a tap from the
// pointer events it uses: if the pointer barely moved between down and up, treat
// it as a click and open the modal. A real drag moves further and is ignored.
const TAP_THRESHOLD_PX = 5;

export function DraggableIssueCard({
	issue,
	onOpen,
}: {
	issue: CalendarIssue;
	onOpen: (issue: CalendarIssue) => void;
}) {
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
		id: issue.id,
		data: { issue },
	});
	const pointerStart = useRef<{ x: number; y: number } | null>(null);

	return (
		<div
			ref={setNodeRef}
			style={{ transform: CSS.Translate.toString(transform) }}
			className={cx("cursor-pointer touch-none", isDragging && "opacity-40")}
			{...attributes}
			{...listeners}
			onPointerDown={(event) => {
				pointerStart.current = { x: event.clientX, y: event.clientY };
				listeners?.onPointerDown?.(event);
			}}
			onPointerUp={(event) => {
				const start = pointerStart.current;
				pointerStart.current = null;
				if (!start) {
					return;
				}
				// Let clicks on the issue/project links do their own thing.
				if ((event.target as HTMLElement).closest("a")) {
					return;
				}
				const movedX = Math.abs(event.clientX - start.x);
				const movedY = Math.abs(event.clientY - start.y);
				if (movedX < TAP_THRESHOLD_PX && movedY < TAP_THRESHOLD_PX) {
					onOpen(issue);
				}
			}}
		>
			<IssueCard issue={issue} />
		</div>
	);
}
