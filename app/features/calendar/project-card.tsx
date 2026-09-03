import { ArrowSquareOut, Cube } from "@phosphor-icons/react";
import { memo } from "react";
import { PersonAvatar } from "./person-avatar";
import { StatusIcon } from "./status-icon";
import type { CalendarProject } from "./types";

const MAX_LABEL_DOTS = 3;

// Linear's coarse target-date periods, named for the tooltip that explains why
// a project sits on a day nobody chose.
const RESOLUTION_NAMES: Record<string, string> = {
	month: "a month",
	quarter: "a quarter",
	halfYear: "a half-year",
	year: "a year",
};

/**
 * A project on the calendar, placed by its target date.
 *
 * It reads as a sibling of the issue card, with two differences that say "this
 * is the bigger unit": the project's own color runs down the left edge, and the
 * row under the name carries the project glyph and the teams it spans, where an
 * issue carries its identifier.
 */
export const ProjectCard = memo(function ProjectCard({ project }: { project: CalendarProject }) {
	const extraLabels = project.labels.length - MAX_LABEL_DOTS;
	const extraTeams = project.teams.length - 1;
	const period = project.targetDateResolution
		? (RESOLUTION_NAMES[project.targetDateResolution] ?? "a period")
		: null;
	const progress = Math.round(project.progress * 100);

	return (
		<div
			className="group/card flex flex-col gap-1 rounded-md border border-l-2 border-card bg-card px-2 py-1.5 text-left shadow-sm transition-colors hover:bg-card-hover"
			style={{ borderLeftColor: project.color }}
		>
			<div className="flex items-center gap-1.5">
				<StatusIcon
					type={project.status.type}
					color={project.status.color}
					label={project.status.name}
				/>
				<p className="truncate text-sm font-medium leading-snug text-strong" title={project.name}>
					{project.name}
				</p>
			</div>

			<div className="flex items-center gap-1.5 pl-5">
				{/* Same glyph pattern as the status and priority icons: role + title, so
				    the one thing that says "project" is not colour alone. */}
				<Cube className="size-3 shrink-0 text-muted" role="img">
					<title>Project</title>
				</Cube>
				{project.teams[0] ? (
					<span className="shrink-0 text-[11px] font-medium text-muted">
						{project.teams[0].key}
						{extraTeams > 0 ? ` +${extraTeams}` : ""}
					</span>
				) : null}
				{progress > 0 ? (
					<span className="shrink-0 text-[11px] tabular-nums text-muted">{progress}%</span>
				) : null}
				{period ? (
					<span
						className="shrink-0 text-[10px] text-muted"
						title={`Linear tracks this target date as ${period}, not a day.`}
					>
						approx.
					</span>
				) : null}
				{project.labels.slice(0, MAX_LABEL_DOTS).map((label) => (
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
							href={project.url}
							target="_blank"
							rel="noreferrer"
							onClick={(e) => e.stopPropagation()}
							aria-label={`Open project: ${project.name}`}
							title={`Open project: ${project.name}`}
							className="hover:text-strong"
						>
							<ArrowSquareOut className="size-3.5" />
						</a>
					</div>

					{project.lead ? <PersonAvatar person={project.lead} /> : null}
				</div>
			</div>
		</div>
	);
});
