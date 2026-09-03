import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cx } from "@ngrok/mantle/cx";
import { useRef } from "react";
import { ProjectCard } from "./project-card";
import type { CalendarProject } from "./types";

// Same tap detection as the issue card: dnd-kit swallows the synthetic click, so
// a pointer that barely moves counts as a tap. A project has no detail modal of
// its own, so a tap goes where the card's link goes — the project in Linear.
const TAP_THRESHOLD_PX = 5;

export function DraggableProjectCard({ project }: { project: CalendarProject }) {
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
		id: project.id,
		data: { project },
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
				// Let a click on the card's own link do its own thing.
				if ((event.target as HTMLElement).closest("a")) {
					return;
				}
				const movedX = Math.abs(event.clientX - start.x);
				const movedY = Math.abs(event.clientY - start.y);
				if (movedX < TAP_THRESHOLD_PX && movedY < TAP_THRESHOLD_PX) {
					window.open(project.url, "_blank", "noreferrer");
				}
			}}
		>
			<ProjectCard project={project} />
		</div>
	);
}
