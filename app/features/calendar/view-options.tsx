import { useEffect, useRef, useState } from "react";
import { readStored } from "~/lib/storage";

export type ViewOptions = {
	showWeekends: boolean;
	showCompleted: boolean;
	showSubtasks: boolean;
	showProjects: boolean;
};

const DEFAULTS: ViewOptions = {
	showWeekends: false,
	showCompleted: true,
	showSubtasks: true,
	showProjects: true,
};

const STORAGE_KEY = "slated:view-options:v1";

/** View toggles, persisted to localStorage (SSR-safe: defaults first, then load). */
export function useViewOptions() {
	const [options, setOptions] = useState<ViewOptions>(DEFAULTS);
	const loaded = useRef(false);

	useEffect(() => {
		try {
			const raw = readStored(STORAGE_KEY);
			if (raw) {
				setOptions({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<ViewOptions>) });
			}
		} catch {
			// ignore malformed storage
		}
		loaded.current = true;
	}, []);

	useEffect(() => {
		// Don't overwrite saved prefs with defaults before the initial load.
		if (!loaded.current) {
			return;
		}
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
		} catch {
			// ignore quota/availability errors
		}
	}, [options]);

	function toggle(key: keyof ViewOptions) {
		setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
	}

	return { options, toggle };
}
