import { addDays, isSameDay, startOfDay } from "date-fns";
import { useEffect, useState } from "react";

/**
 * Today's date, kept current without a page refresh. A timer fires just past
 * midnight to roll the day over, and the date is re-checked whenever the tab
 * regains focus or visibility — browsers throttle background timers and
 * suspend them across laptop sleep, so the wake-up moment is the reliable one.
 * Consumers only re-render when the calendar day actually changes.
 */
export function useToday(): Date {
	const [today, setToday] = useState(() => new Date());

	useEffect(() => {
		let timer: number | undefined;

		const check = () => {
			const now = new Date();
			setToday((prev) => (isSameDay(prev, now) ? prev : now));
			scheduleMidnightTick();
		};

		function scheduleMidnightTick() {
			window.clearTimeout(timer);
			const now = new Date();
			const msUntilMidnight = startOfDay(addDays(now, 1)).getTime() - now.getTime();
			// Small buffer so a timer that fires a hair early doesn't land on the
			// same day and skip the rollover.
			timer = window.setTimeout(check, msUntilMidnight + 1_000);
		}

		scheduleMidnightTick();
		window.addEventListener("focus", check);
		document.addEventListener("visibilitychange", check);
		return () => {
			window.clearTimeout(timer);
			window.removeEventListener("focus", check);
			document.removeEventListener("visibilitychange", check);
		};
	}, []);

	return today;
}
