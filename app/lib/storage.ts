/**
 * localStorage reads that survive the calgrok -> Slated rename.
 *
 * Saved keys are namespaced (`slated:view-options:v1`). The app shipped under
 * the name calgrok first, so anyone who used it before the rename has their
 * team filter and view options under a `calgrok:` key. Read the new key, then
 * fall back to the old one, so the rename doesn't silently reset the calendar
 * to an empty team selection on their next visit.
 *
 * Writes only ever use the current key. The legacy key is left in place rather
 * than migrated: it costs a few bytes, and reading it is idempotent.
 */

const LEGACY_PREFIX = "calgrok:";
const CURRENT_PREFIX = "slated:";

export function readStored(key: string): string | null {
	try {
		const current = localStorage.getItem(key);
		if (current !== null) {
			return current;
		}
		return localStorage.getItem(key.replace(CURRENT_PREFIX, LEGACY_PREFIX));
	} catch {
		// Storage can be unavailable (private mode, blocked site data).
		return null;
	}
}
