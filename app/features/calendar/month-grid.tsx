import {
	DndContext,
	DragOverlay,
	type DragEndEvent,
	type DragStartEvent,
	PointerSensor,
	pointerWithin,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { Button } from "@ngrok/mantle/button";
import { cx } from "@ngrok/mantle/cx";
import { useQueryClient } from "@tanstack/react-query";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { addMonths, format, isSameDay, isSameMonth, startOfMonth } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	groupIssuesByDueDate,
	monthGridDays,
	monthGridRange,
	toISODate,
	WEEKDAY_LABELS,
} from "./date-utils";
import { DayCell } from "./day-cell";
import { IssueCard } from "./issue-card";
import { IssueDetailModal } from "./issue-detail-modal";
import { prefetchCalendarIssues, useCalendarIssues, useUpdateDueDate } from "./queries";
import type { CalendarIssue } from "./types";
import type { ViewOptions } from "./view-options";

// Stable empty array so memoized DayCells for empty days don't re-render.
const NO_ISSUES: CalendarIssue[] = [];

// Render a placeholder until mounted so the date-dependent grid doesn't differ
// between server and first client render (avoids hydration mismatch), and so
// the relative /api/issues fetch only ever runs in the browser.
function useHydrated(): boolean {
	const [hydrated, setHydrated] = useState(false);
	useEffect(() => setHydrated(true), []);
	return hydrated;
}

export function MonthGrid({
	teamIds,
	labelIds,
	options,
}: {
	teamIds: string[];
	labelIds: string[];
	options: ViewOptions;
}) {
	const hydrated = useHydrated();
	const queryClient = useQueryClient();
	const [month, setMonth] = useState(() => startOfMonth(new Date()));

	const range = useMemo(() => monthGridRange(month), [month]);
	const params = useMemo(
		() => ({
			start: toISODate(range.gridStart),
			end: toISODate(range.gridEnd),
			teamIds,
			labelIds,
		}),
		[range, teamIds, labelIds],
	);

	const { data: issues = [], isLoading, isError } = useCalendarIssues(params);

	// View toggles applied client-side (instant, no refetch).
	const visibleIssues = useMemo(
		() =>
			issues.filter(
				(issue) =>
					(options.showCompleted || issue.state.type !== "completed") &&
					(options.showSubtasks || !issue.parent),
			),
		[issues, options.showCompleted, options.showSubtasks],
	);
	const byDate = useMemo(() => groupIssuesByDueDate(visibleIssues), [visibleIssues]);

	const allDays = useMemo(() => monthGridDays(month), [month]);
	const days = useMemo(
		() =>
			options.showWeekends
				? allDays
				: allDays.filter((day) => day.getDay() !== 0 && day.getDay() !== 6),
		[allDays, options.showWeekends],
	);
	const weekdayLabels = options.showWeekends ? WEEKDAY_LABELS : WEEKDAY_LABELS.slice(0, 5);
	const gridColsClass = options.showWeekends ? "grid-cols-7" : "grid-cols-5";

	const today = useMemo(() => new Date(), []);
	const noTeams = teamIds.length === 0;

	const updateDueDate = useUpdateDueDate();
	const [activeIssue, setActiveIssue] = useState<CalendarIssue | null>(null);

	// Derive the open issue from the live query data (by id) so optimistic edits
	// in the modal reflect immediately.
	const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
	const selectedIssue = useMemo(
		() => issues.find((issue) => issue.id === selectedIssueId) ?? null,
		[issues, selectedIssueId],
	);
	const handleOpenIssue = useCallback((issue: CalendarIssue) => setSelectedIssueId(issue.id), []);
	// Require a small drag distance so clicking the issue/project links still works.
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

	function handleDragStart(event: DragStartEvent) {
		setActiveIssue((event.active.data.current?.issue as CalendarIssue | undefined) ?? null);
	}

	function handleDragEnd(event: DragEndEvent) {
		const issue = event.active.data.current?.issue as CalendarIssue | undefined;
		setActiveIssue(null);
		const newDueDate = event.over?.id;
		if (!issue || typeof newDueDate !== "string" || newDueDate === issue.dueDate) {
			return;
		}
		updateDueDate.mutate({ issueId: issue.id, dueDate: newDueDate });
	}

	// Prefetch the neighbouring months so prev/next feels instant.
	useEffect(() => {
		if (noTeams) {
			return;
		}
		for (const offset of [-1, 1]) {
			const neighbour = monthGridRange(addMonths(month, offset));
			prefetchCalendarIssues(queryClient, {
				start: toISODate(neighbour.gridStart),
				end: toISODate(neighbour.gridEnd),
				teamIds,
				labelIds,
			});
		}
	}, [month, queryClient, teamIds, labelIds, noTeams]);

	return (
		<div className="flex flex-col">
			<header className="flex items-center justify-between gap-2 pb-3">
				<div className="flex items-center gap-2">
					<h2 className="text-lg font-medium text-strong">{format(month, "MMMM yyyy")}</h2>
					{hydrated && isLoading ? <span className="text-xs text-muted">Loading…</span> : null}
				</div>
				<div className="flex items-center gap-1">
					<Button
						type="button"
						appearance="outlined"
						aria-label="Previous month"
						icon={<CaretLeft />}
						onClick={() => setMonth((m) => addMonths(m, -1))}
					/>
					<Button
						type="button"
						appearance="outlined"
						onClick={() => setMonth(startOfMonth(new Date()))}
					>
						Today
					</Button>
					<Button
						type="button"
						appearance="outlined"
						aria-label="Next month"
						icon={<CaretRight />}
						onClick={() => setMonth((m) => addMonths(m, 1))}
					/>
				</div>
			</header>

			<div className={cx("grid", gridColsClass)}>
				{weekdayLabels.map((label) => (
					<div key={label} className="px-1 pb-1 text-xs font-medium text-muted">
						{label}
					</div>
				))}
			</div>

			{hydrated ? (
				<DndContext
					sensors={sensors}
					collisionDetection={pointerWithin}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
				>
					<div className={cx("grid border-l border-t border-card", gridColsClass)}>
						{days.map((day) => (
							<DayCell
								key={day.toISOString()}
								date={day}
								issues={byDate.get(toISODate(day)) ?? NO_ISSUES}
								isCurrentMonth={isSameMonth(day, month)}
								isToday={isSameDay(day, today)}
								onOpenIssue={handleOpenIssue}
							/>
						))}
					</div>
					<DragOverlay>
						{activeIssue ? (
							<div className="w-40 rotate-2 opacity-90">
								<IssueCard issue={activeIssue} />
							</div>
						) : null}
					</DragOverlay>
				</DndContext>
			) : (
				<div className="h-96 animate-pulse rounded border border-card bg-card" />
			)}

			{noTeams ? (
				<p className="pt-3 text-sm text-muted">Select at least one team to see issues.</p>
			) : null}

			{isError ? (
				<p className="pt-3 text-sm text-strong">
					Couldn&apos;t load issues.{" "}
					<a href="/auth/linear" className="underline">
						Reconnect Linear
					</a>
					.
				</p>
			) : null}

			<IssueDetailModal issue={selectedIssue} onClose={() => setSelectedIssueId(null)} />
		</div>
	);
}
