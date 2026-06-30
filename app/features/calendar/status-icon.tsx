import { cx } from "@ngrok/mantle/cx";
import type { ReactNode } from "react";

/**
 * Linear-style workflow-state glyph: a small circle whose shape reflects the
 * state's category and is tinted with the state's own color.
 *
 *   backlog   → dashed ring
 *   unstarted → empty ring          (todo)
 *   started   → ring with a filled wedge   (in progress)
 *   completed → filled circle + check
 *   cancelled → filled circle + ✕
 *
 * Mirrors Linear's status icons so the calendar reads the same at a glance,
 * while the colors stay whatever Linear assigns each state.
 */
export function StatusIcon({
	type,
	color,
	label,
	className,
}: {
	type: string;
	color: string;
	label?: string;
	className?: string;
}) {
	let shape: ReactNode;
	switch (type) {
		case "completed":
			shape = (
				<>
					<circle cx="7" cy="7" r="7" fill={color} />
					<path
						d="M3.9 7.2 6 9.3 10.1 5"
						stroke="#fff"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</>
			);
			break;
		case "cancelled":
			shape = (
				<>
					<circle cx="7" cy="7" r="7" fill={color} />
					<path d="M5 5l4 4M9 5l-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
				</>
			);
			break;
		case "started":
			shape = (
				<>
					<circle cx="7" cy="7" r="6" stroke={color} strokeWidth="1.5" />
					{/* A 50%-filled inner wedge: stroke-dasharray paints half the donut. */}
					<circle
						cx="7"
						cy="7"
						r="3"
						stroke={color}
						strokeWidth="6"
						strokeDasharray="9.42 18.85"
						transform="rotate(-90 7 7)"
					/>
				</>
			);
			break;
		case "backlog":
			shape = (
				<circle cx="7" cy="7" r="6" stroke={color} strokeWidth="1.5" strokeDasharray="1.6 1.8" />
			);
			break;
		default:
			shape = <circle cx="7" cy="7" r="6" stroke={color} strokeWidth="1.5" />;
	}

	return (
		<svg viewBox="0 0 14 14" role="img" fill="none" className={cx("size-3.5 shrink-0", className)}>
			<title>{label ?? type}</title>
			{shape}
		</svg>
	);
}
