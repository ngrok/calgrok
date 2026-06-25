import {
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	PointerSensor,
	pointerWithin,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { cx } from "@ngrok/mantle/cx";
import { useQueryClient } from "@tanstack/react-query";
import { addMonths, startOfMonth } from "date-fns";
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { monthGridRange, toISODate, WEEKDAY_LABELS } from "./date-utils";
import { IssueCard } from "./issue-card";
import { IssueDetailModal } from "./issue-detail-modal";
import { MonthSection } from "./month-section";
import { prefetchCalendarIssues, useUpdateDueDate } from "./queries";
import type { CalendarIssue } from "./types";
import type { ViewOptions } from "./view-options";

// How many months to render initially: one before "today" plus a few after, so
// the viewport is filled and the observer takes over from there.
const INITIAL_OFFSETS = [-1, 0, 1, 2];

// Render a placeholder until mounted so the date-dependent grid doesn't differ
// between server and first client render (avoids hydration mismatch), and so
// the relative /api/issues fetches only ever run in the browser.
function useHydrated(): boolean {
	const [hydrated, setHydrated] = useState(false);
	useEffect(() => setHydrated(true), []);
	return hydrated;
}

/**
 * Find an issue by id across every cached calendar-issues query, reactively.
 * The modal is driven from this so optimistic edits (reschedule, retag) reflect
 * immediately regardless of which month section currently holds the issue.
 */
function useIssueById(id: string | null): CalendarIssue | null {
	const queryClient = useQueryClient();
	return useSyncExternalStore(
		(onChange) => queryClient.getQueryCache().subscribe(onChange),
		() => {
			if (!id) {
				return null;
			}
			const entries = queryClient.getQueriesData<CalendarIssue[]>({
				queryKey: ["calendar", "issues"],
			});
			for (const [, data] of entries) {
				const found = data?.find((issue) => issue.id === id);
				if (found) {
					return found;
				}
			}
			return null;
		},
		() => null,
	);
}

/** Imperative handle so the page header's "Today" button can scroll the list. */
export type MonthListHandle = { scrollToToday: () => void };

export const MonthList = forwardRef<
	MonthListHandle,
	{
		teamIds: string[];
		labelIds: string[];
		options: ViewOptions;
	}
>(function MonthList({ teamIds, labelIds, options }, ref) {
	const hydrated = useHydrated();
	const queryClient = useQueryClient();
	const today = useMemo(() => new Date(), []);
	const noTeams = teamIds.length === 0;

	const [months, setMonths] = useState<Date[]>(() => {
		const base = startOfMonth(new Date());
		return INITIAL_OFFSETS.map((offset) => addMonths(base, offset));
	});
	const currentMonthIso = useMemo(() => toISODate(startOfMonth(today)), [today]);

	const scrollRef = useRef<HTMLDivElement>(null);
	const todayRef = useRef<HTMLDivElement>(null);
	const topSentinelRef = useRef<HTMLDivElement>(null);
	const bottomSentinelRef = useRef<HTMLDivElement>(null);
	// scrollHeight captured just before a prepend, used to keep the viewport
	// anchored when months are added above.
	const prevScrollHeight = useRef<number | null>(null);

	// A fixed left gutter column (for the floating month label) plus the day
	// columns. Months render their owned weeks into this template so they line up.
	const gridColsClass = options.showWeekends
		? "grid-cols-[4.5rem_repeat(7,minmax(0,1fr))]"
		: "grid-cols-[4.5rem_repeat(5,minmax(0,1fr))]";
	const weekdayLabels = options.showWeekends ? WEEKDAY_LABELS : WEEKDAY_LABELS.slice(0, 5);

	const appendMonth = useCallback(() => {
		setMonths((ms) => {
			const last = ms[ms.length - 1];
			return last ? [...ms, addMonths(last, 1)] : ms;
		});
	}, []);

	const prependMonth = useCallback(() => {
		const el = scrollRef.current;
		if (el) {
			prevScrollHeight.current = el.scrollHeight;
		}
		setMonths((ms) => {
			const first = ms[0];
			return first ? [addMonths(first, -1), ...ms] : ms;
		});
	}, []);

	// After a prepend, restore the scroll position so the content the user was
	// looking at doesn't jump down. Keyed on `months` so it re-runs on every
	// add (the value itself isn't read — the prepend flag does the work).
	// biome-ignore lint/correctness/useExhaustiveDependencies: months is the intended trigger
	useLayoutEffect(() => {
		const el = scrollRef.current;
		if (el && prevScrollHeight.current != null) {
			el.scrollTop += el.scrollHeight - prevScrollHeight.current;
			prevScrollHeight.current = null;
		}
	}, [months]);

	const scrollToToday = useCallback(() => {
		todayRef.current?.scrollIntoView({ block: "start" });
	}, []);
	useImperativeHandle(ref, () => ({ scrollToToday }), [scrollToToday]);

	// Land on the current month on first paint.
	const didInit = useRef(false);
	useLayoutEffect(() => {
		if (hydrated && !didInit.current && todayRef.current) {
			todayRef.current.scrollIntoView({ block: "start" });
			didInit.current = true;
		}
	}, [hydrated]);

	// Grow the list in whichever direction the user scrolls.
	useEffect(() => {
		const root = scrollRef.current;
		if (!root || !hydrated || noTeams) {
			return;
		}
		const top = topSentinelRef.current;
		const bottom = bottomSentinelRef.current;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) {
						continue;
					}
					if (entry.target === bottom) {
						appendMonth();
					} else if (entry.target === top) {
						prependMonth();
					}
				}
			},
			{ root, rootMargin: "400px 0px" },
		);
		if (top) {
			observer.observe(top);
		}
		if (bottom) {
			observer.observe(bottom);
		}
		return () => observer.disconnect();
	}, [hydrated, noTeams, appendMonth, prependMonth]);

	// Warm the cache just beyond each edge so a freshly revealed month rarely
	// has to pop in empty (which would also shift the prepend anchor).
	useEffect(() => {
		if (noTeams) {
			return;
		}
		const first = months[0];
		const last = months[months.length - 1];
		if (!first || !last) {
			return;
		}
		const edges = [addMonths(first, -1), addMonths(last, 1)];
		for (const month of edges) {
			const range = monthGridRange(month);
			prefetchCalendarIssues(queryClient, {
				start: toISODate(range.gridStart),
				end: toISODate(range.gridEnd),
				teamIds,
				labelIds,
			});
		}
	}, [months, queryClient, teamIds, labelIds, noTeams]);

	// Issue detail modal, driven reactively from the cache (see useIssueById).
	const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
	const selectedIssue = useIssueById(selectedIssueId);
	const handleOpenIssue = useCallback((issue: CalendarIssue) => setSelectedIssueId(issue.id), []);

	// Drag-to-reschedule across the whole visible list.
	const updateDueDate = useUpdateDueDate();
	const [activeIssue, setActiveIssue] = useState<CalendarIssue | null>(null);
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

	if (noTeams) {
		return <p className="text-sm text-muted">Select at least one team to see issues.</p>;
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			{hydrated ? (
				<DndContext
					sensors={sensors}
					collisionDetection={pointerWithin}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
				>
					<div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
						<div ref={topSentinelRef} className="h-px" />
						<div
							className={cx(
								"sticky top-0 z-20 grid border-b border-card-muted bg-base py-2",
								gridColsClass,
							)}
						>
							<div />
							{weekdayLabels.map((label) => (
								<div key={label} className="px-1 text-base font-medium text-muted">
									{label}
								</div>
							))}
						</div>
						<div className="border-r border-card-muted">
							{months.map((month) => (
								<MonthSection
									key={toISODate(month)}
									ref={toISODate(month) === currentMonthIso ? todayRef : undefined}
									month={month}
									teamIds={teamIds}
									labelIds={labelIds}
									options={options}
									today={today}
									gridColsClass={gridColsClass}
									onOpenIssue={handleOpenIssue}
								/>
							))}
						</div>
						<div ref={bottomSentinelRef} className="h-px" />
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

			<IssueDetailModal issue={selectedIssue} onClose={() => setSelectedIssueId(null)} />
		</div>
	);
});
