import { Button } from "@ngrok/mantle/button";
import { DropdownMenu } from "@ngrok/mantle/dropdown-menu";
import { ArrowsClockwise, SlidersHorizontal } from "@phosphor-icons/react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { ThemeMenuRadioGroup } from "~/components/theme-menu";
import type { ViewOptions } from "./view-options";

const OPTION_LABELS: { key: keyof ViewOptions; label: string }[] = [
	{ key: "showWeekends", label: "Show weekends" },
	{ key: "showCompleted", label: "Show completed" },
	{ key: "showSubtasks", label: "Show sub-tasks" },
];

/**
 * Everything in the header that isn't a per-visit action: the view toggles, the
 * theme, and a manual sync. Keeping them in one menu leaves the header to
 * "New issue" and "Today".
 */
export function OptionsMenu({
	options,
	onToggle,
}: {
	options: ViewOptions;
	onToggle: (key: keyof ViewOptions) => void;
}) {
	const queryClient = useQueryClient();
	const isFetching = useIsFetching({ queryKey: ["calendar", "issues"] }) > 0;

	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<Button type="button" appearance="outlined" icon={<SlidersHorizontal />}>
					Options
				</Button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" className="w-56">
				<DropdownMenu.Label>View</DropdownMenu.Label>
				{OPTION_LABELS.map(({ key, label }) => (
					<DropdownMenu.CheckboxItem
						key={key}
						checked={options[key]}
						// Hold the menu open so several toggles can be flipped at once.
						onSelect={(event) => event.preventDefault()}
						onCheckedChange={() => onToggle(key)}
					>
						{label}
					</DropdownMenu.CheckboxItem>
				))}

				<DropdownMenu.Separator />
				<DropdownMenu.Label>Theme</DropdownMenu.Label>
				<ThemeMenuRadioGroup />

				<DropdownMenu.Separator />
				<DropdownMenu.Item
					className="gap-2"
					disabled={isFetching}
					onSelect={(event) => {
						// The spinner below is the only sign a sync is running, so keep
						// the menu open long enough to show it.
						event.preventDefault();
						queryClient.invalidateQueries({ queryKey: ["calendar", "issues"] });
					}}
				>
					<ArrowsClockwise className={isFetching ? "animate-spin" : undefined} />
					{isFetching ? "Refreshing…" : "Refresh"}
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	);
}
