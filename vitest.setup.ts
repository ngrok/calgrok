import "@testing-library/jest-dom/vitest";

// jsdom has no matchMedia. Mantle's theme provider calls it to resolve the
// "system" theme, so give it a stub that reports no media query matches
// (prefers-color-scheme: light, no forced contrast).
if (typeof window !== "undefined" && !window.matchMedia) {
	window.matchMedia = (query: string) =>
		({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			addListener: () => {},
			removeListener: () => {},
			dispatchEvent: () => false,
		}) as MediaQueryList;
}
