import { Button } from "@ngrok/mantle/button";
import { Calendar } from "@ngrok/mantle/calendar";
import { Checkbox } from "@ngrok/mantle/checkbox";
import { Dialog } from "@ngrok/mantle/dialog";
import { Popover } from "@ngrok/mantle/popover";
import { ArrowSquareOut, CalendarBlank, FolderOpen, X } from "@phosphor-icons/react";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { toISODate } from "./date-utils";
import {
	useClearDueDate,
	useIssueDescription,
	useLabels,
	useUpdateDueDate,
	useUpdateLabels,
} from "./queries";
import type { CalendarIssue } from "./types";

function Avatar({ assignee }: { assignee: NonNullable<CalendarIssue["assignee"]> }) {
	if (assignee.avatarUrl) {
		return <img src={assignee.avatarUrl} alt={assignee.name} className="size-5 rounded-full" />;
	}
	return (
		<span className="flex size-5 items-center justify-center rounded-full bg-filled-accent text-[10px] font-medium text-on-filled">
			{(assignee.displayName || assignee.name).charAt(0).toUpperCase()}
		</span>
	);
}

export function IssueDetailModal({
	issue,
	onClose,
}: {
	issue: CalendarIssue | null;
	onClose: () => void;
}) {
	const { data: conLabels = [] } = useLabels();
	const detail = useIssueDescription(issue?.id ?? null);
	const updateDueDate = useUpdateDueDate();
	const clearDueDate = useClearDueDate();
	const updateLabels = useUpdateLabels();
	const [dateOpen, setDateOpen] = useState(false);

	// Only labels that exist in this issue's team can be applied to it.
	const applicableLabels = issue
		? conLabels.filter((option) => option.idByTeam[issue.team.id])
		: [];

	function toggleTag(option: (typeof applicableLabels)[number]) {
		if (!issue) {
			return;
		}
		const teamLabelId = option.idByTeam[issue.team.id];
		if (!teamLabelId) {
			return;
		}
		// Drop any id belonging to this option, then add the team-correct one when
		// turning it on. Labels from other options (con/ or not) are preserved.
		const isOn = option.ids.some((id) => issue.labels.some((l) => l.id === id));
		const base = issue.labels.filter((l) => !option.ids.includes(l.id));
		const next = isOn
			? base
			: [...base, { id: teamLabelId, name: option.name, color: option.color }];
		updateLabels.mutate({ issueId: issue.id, labels: next });
	}

	return (
		<Dialog.Root
			open={Boolean(issue)}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
		>
			{issue ? (
				<Dialog.Content className="max-w-lg">
					<Dialog.Header>
						<Dialog.Title className="flex items-baseline gap-2">
							<span className="shrink-0 text-xs font-normal text-muted">{issue.identifier}</span>
							<span className="truncate">{issue.title}</span>
						</Dialog.Title>
						<Dialog.CloseIconButton />
					</Dialog.Header>

					<Dialog.Body className="flex flex-col gap-4">
						<div className="flex flex-wrap items-center gap-3 text-sm">
							{issue.assignee ? (
								<span className="flex items-center gap-1.5 text-strong">
									<Avatar assignee={issue.assignee} />
									{issue.assignee.name}
								</span>
							) : (
								<span className="text-muted">Unassigned</span>
							)}
							<span className="inline-flex items-center rounded-full border border-card px-2 py-0.5 text-xs text-muted">
								{issue.priorityLabel}
							</span>
						</div>

						<section>
							<h3 className="pb-1 text-xs font-medium uppercase tracking-wide text-muted">
								Description
							</h3>
							{detail.isLoading ? (
								<div className="h-16 animate-pulse rounded bg-card" />
							) : detail.data?.description ? (
								<p className="max-h-48 overflow-auto whitespace-pre-wrap text-sm text-strong">
									{detail.data.description}
								</p>
							) : (
								<p className="text-sm text-muted">No description.</p>
							)}
						</section>

						<section>
							<h3 className="pb-1 text-xs font-medium uppercase tracking-wide text-muted">
								Due date (publish)
							</h3>
							<div className="flex items-center gap-2">
								<Popover.Root open={dateOpen} onOpenChange={setDateOpen}>
									<Popover.Trigger asChild>
										<Button type="button" appearance="outlined" icon={<CalendarBlank />}>
											{format(parseISO(issue.dueDate), "MMM d, yyyy")}
										</Button>
									</Popover.Trigger>
									<Popover.Content className="z-50 w-auto rounded-md border border-card bg-card p-2 text-strong shadow-lg">
										<Calendar
											mode="single"
											selected={parseISO(issue.dueDate)}
											onSelect={(date) => {
												if (date) {
													updateDueDate.mutate({ issueId: issue.id, dueDate: toISODate(date) });
													setDateOpen(false);
												}
											}}
										/>
									</Popover.Content>
								</Popover.Root>
								<Button
									type="button"
									appearance="ghost"
									icon={<X />}
									onClick={() => {
										// Clearing removes the issue from the calendar, so close too.
										clearDueDate.mutate(issue.id);
										onClose();
									}}
								>
									Clear
								</Button>
							</div>
						</section>

						<section>
							<h3 className="pb-1 text-xs font-medium uppercase tracking-wide text-muted">Tags</h3>
							{applicableLabels.length === 0 ? (
								<p className="text-sm text-muted">No content tags for this team.</p>
							) : (
								<div className="flex max-h-40 flex-col gap-1 overflow-auto">
									{applicableLabels.map((option) => (
										<label
											key={option.name}
											className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-card"
										>
											<Checkbox
												checked={option.ids.some((id) => issue.labels.some((l) => l.id === id))}
												onChange={() => toggleTag(option)}
											/>
											<span
												className="size-2 shrink-0 rounded-full"
												style={{ backgroundColor: option.color }}
											/>
											<span className="truncate text-sm text-strong">{option.name}</span>
										</label>
									))}
								</div>
							)}
						</section>
					</Dialog.Body>

					<Dialog.Footer>
						{issue.project ? (
							<Button asChild appearance="outlined" icon={<FolderOpen />}>
								<a href={issue.project.url} target="_blank" rel="noreferrer">
									Project
								</a>
							</Button>
						) : null}
						<Button asChild appearance="filled" icon={<ArrowSquareOut />}>
							<a href={issue.url} target="_blank" rel="noreferrer">
								Open in Linear
							</a>
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			) : null}
		</Dialog.Root>
	);
}
