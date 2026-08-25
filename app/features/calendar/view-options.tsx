import { Button } from "@ngrok/mantle/button";
import { Checkbox } from "@ngrok/mantle/checkbox";
import { Popover } from "@ngrok/mantle/popover";
import { ArrowsClockwise, SlidersHorizontal } from "@phosphor-icons/react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { readStored } from "~/lib/storage";

export type ViewOptions = {
	showWeekends: boolean;
	showCompleted: boolean;
	showSubtasks: boolean;
};

const DEFAULTS: ViewOptions = {
	showWeekends: false,
	showCompleted: true,
	showSubtasks: true,
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

const OPTION_LABELS: { key: keyof ViewOptions; label: string }[] = [
	{ key: "showWeekends", label: "Show weekends" },
	{ key: "showCompleted", label: "Show completed" },
	{ key: "showSubtasks", label: "Show sub-tasks" },
];

export function ViewOptionsMenu({
	options,
	onToggle,
}: {
	options: ViewOptions;
	onToggle: (key: keyof ViewOptions) => void;
}) {
	return (
		<Popover.Root>
			<Popover.Trigger asChild>
				<Button type="button" appearance="outlined" icon={<SlidersHorizontal />}>
					Options
				</Button>
			</Popover.Trigger>
			<Popover.Content className="z-50 flex w-56 flex-col gap-1 rounded-md border border-card bg-card p-2 text-strong shadow-lg">
				{OPTION_LABELS.map(({ key, label }) => {
					const checkboxId = `view-option-${key}`;
					return (
						<label
							key={key}
							htmlFor={checkboxId}
							className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-card-hover"
						>
							<Checkbox id={checkboxId} checked={options[key]} onChange={() => onToggle(key)} />
							<span className="text-sm text-strong">{label}</span>
						</label>
					);
				})}
			</Popover.Content>
		</Popover.Root>
	);
}

/** Manual sync — refetch the visible month(s) on demand. */
export function RefreshButton() {
	const queryClient = useQueryClient();
	const isFetching = useIsFetching({ queryKey: ["calendar", "issues"] }) > 0;

	return (
		<Button
			type="button"
			appearance="outlined"
			aria-label="Refresh"
			disabled={isFetching}
			icon={<ArrowsClockwise className={isFetching ? "animate-spin" : undefined} />}
			onClick={() => queryClient.invalidateQueries({ queryKey: ["calendar", "issues"] })}
		>
			Refresh
		</Button>
	);
}
