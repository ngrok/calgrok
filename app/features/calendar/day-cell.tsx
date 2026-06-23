import { cx } from "@ngrok/mantle/cx";
import { IssueCard } from "./issue-card";
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
	return (
		<div className="flex min-h-28 flex-col gap-1 border-b border-r border-card p-1">
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
					<IssueCard key={issue.id} issue={issue} />
				))}
			</div>
		</div>
	);
}
