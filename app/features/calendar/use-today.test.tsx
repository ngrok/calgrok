import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { toISODate } from "./date-utils";
import { useToday } from "./use-today";

describe("useToday", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	test("returns the current date on mount", () => {
		vi.setSystemTime(new Date(2026, 6, 8, 14, 30));
		const { result } = renderHook(() => useToday());
		expect(toISODate(result.current)).toBe("2026-07-08");
	});

	test("rolls over at midnight without a refresh", () => {
		vi.setSystemTime(new Date(2026, 6, 8, 23, 59));
		const { result } = renderHook(() => useToday());
		expect(toISODate(result.current)).toBe("2026-07-08");

		act(() => {
			vi.advanceTimersByTime(2 * 60 * 1000); // past midnight + buffer
		});
		expect(toISODate(result.current)).toBe("2026-07-09");
	});

	test("keeps rolling over on subsequent midnights", () => {
		vi.setSystemTime(new Date(2026, 6, 8, 23, 59));
		const { result } = renderHook(() => useToday());

		act(() => {
			vi.advanceTimersByTime(2 * 60 * 1000);
		});
		expect(toISODate(result.current)).toBe("2026-07-09");

		act(() => {
			vi.advanceTimersByTime(24 * 60 * 60 * 1000);
		});
		expect(toISODate(result.current)).toBe("2026-07-10");
	});

	test("catches up when the tab regains focus after the timer was suspended", () => {
		vi.setSystemTime(new Date(2026, 6, 8, 14, 30));
		const { result } = renderHook(() => useToday());

		// Simulate a suspended laptop: the clock jumps but no timer fired.
		vi.setSystemTime(new Date(2026, 6, 10, 9, 0));
		act(() => {
			window.dispatchEvent(new Event("focus"));
		});
		expect(toISODate(result.current)).toBe("2026-07-10");
	});

	test("returns a stable value when the day has not changed", () => {
		vi.setSystemTime(new Date(2026, 6, 8, 14, 30));
		const { result } = renderHook(() => useToday());
		const first = result.current;

		vi.setSystemTime(new Date(2026, 6, 8, 18, 0));
		act(() => {
			window.dispatchEvent(new Event("focus"));
		});
		expect(result.current).toBe(first);
	});
});
