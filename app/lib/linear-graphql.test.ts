import { afterEach, describe, expect, test, vi } from "vitest";
import { fetchCalendarProjects } from "./linear-graphql.server";

/**
 * The project query is the one place where Linear's own limits, rather than our
 * data, decide how the request is shaped. These cover the two things that broke
 * it in practice: the page sizes, and the filter.
 */

function stubFetch(nodes: unknown[] = []) {
	const fetchMock = vi.fn(
		async (_url: string, _init?: RequestInit) =>
			new Response(
				JSON.stringify({
					data: { projects: { pageInfo: { hasNextPage: false, endCursor: null }, nodes } },
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			),
	);
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

/** Stub fetch with one response per call, for the pagination path. */
function stubPages(pages: { nodes: unknown[]; hasNextPage: boolean; endCursor: string | null }[]) {
	let call = 0;
	const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => {
		const page = pages[Math.min(call++, pages.length - 1)];
		return new Response(
			JSON.stringify({
				data: {
					projects: {
						pageInfo: { hasNextPage: page?.hasNextPage, endCursor: page?.endCursor },
						nodes: page?.nodes ?? [],
					},
				},
			}),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		);
	});
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

function cursorOf(fetchMock: ReturnType<typeof stubPages>, call: number) {
	const init = fetchMock.mock.calls[call]?.[1];
	return (JSON.parse(init?.body as string) as { variables: { after: string | null } }).variables
		.after;
}

function project(id: string) {
	return { id, name: id, labels: { nodes: [] }, teams: { nodes: [] } };
}

function sentBody(fetchMock: ReturnType<typeof stubFetch>) {
	const init = fetchMock.mock.calls[0]?.[1];
	return JSON.parse(init?.body as string) as {
		query: string;
		variables: { filter: Record<string, unknown>; first: number };
	};
}

afterEach(() => vi.unstubAllGlobals());

describe("fetchCalendarProjects", () => {
	// Linear scores this query by the page sizes it asks for, not by the rows it
	// returns, and refuses anything over a complexity of 10,000 outright. 250
	// projects with uncapped nested connections scores ~34,600 and every month
	// fails to load; 25 with 10 scores 861. See the note on PROJECTS_PAGE_SIZE.
	test("stays inside Linear's per-query complexity cap", async () => {
		const fetchMock = stubFetch();
		await fetchCalendarProjects({
			authorization: "key",
			teamIds: ["t1"],
			start: "2026-08-31",
			end: "2026-10-11",
		});

		const { query, variables } = sentBody(fetchMock);
		expect(variables.first).toBeLessThanOrEqual(25);
		expect(query).toMatch(/labels\(first: (?:[1-9]|10)\)/);
		expect(query).toMatch(/teams\(first: (?:[1-9]|10)\)/);
	});

	test("scopes the query to the window and the selected teams", async () => {
		const fetchMock = stubFetch();
		await fetchCalendarProjects({
			authorization: "key",
			teamIds: ["t1", "t2"],
			start: "2026-08-31",
			end: "2026-10-11",
		});

		expect(sentBody(fetchMock).variables.filter).toEqual({
			targetDate: { gte: "2026-08-31", lte: "2026-10-11" },
			// Projects belong to one or more teams, so Linear filters them on
			// accessibleTeams rather than on a single team id.
			accessibleTeams: { id: { in: ["t1", "t2"] } },
		});
	});

	test("matches the configured project labels by name, ignoring case", async () => {
		const fetchMock = stubFetch();
		await fetchCalendarProjects({
			authorization: "key",
			teamIds: ["t1"],
			labelNames: ["DevEd", "Content"],
			start: "2026-08-31",
			end: "2026-10-11",
		});

		expect(sentBody(fetchMock).variables.filter.labels).toEqual({
			some: { or: [{ name: { eqIgnoreCase: "DevEd" } }, { name: { eqIgnoreCase: "Content" } }] },
		});
	});

	test("leaves projects unscoped when no label is configured", async () => {
		const fetchMock = stubFetch();
		await fetchCalendarProjects({
			authorization: "key",
			teamIds: ["t1"],
			labelNames: [],
			start: "2026-08-31",
			end: "2026-10-11",
		});

		expect(sentBody(fetchMock).variables.filter).not.toHaveProperty("labels");
	});

	test("flattens the nested labels and teams connections", async () => {
		const fetchMock = stubFetch([
			{
				id: "p1",
				name: "Little internet 02",
				targetDate: "2026-09-09",
				labels: { nodes: [{ id: "l1", name: "DevEd", color: "#5e6ad2" }] },
				teams: { nodes: [{ id: "t1", key: "CON", name: "Content" }] },
			},
		]);

		const projects = await fetchCalendarProjects({
			authorization: "key",
			teamIds: ["t1"],
			start: "2026-08-31",
			end: "2026-10-11",
		});

		expect(projects[0]?.labels).toEqual([{ id: "l1", name: "DevEd", color: "#5e6ad2" }]);
		expect(projects[0]?.teams).toEqual([{ id: "t1", key: "CON", name: "Content" }]);
		expect(fetchMock).toHaveBeenCalledOnce();
	});

	// A page of 25 means an ordinary month can span pages, so the cursor loop is
	// a normal path rather than an edge case.
	test("follows the cursor until Linear runs out of projects", async () => {
		const fetchMock = stubPages([
			{ nodes: [project("p1")], hasNextPage: true, endCursor: "cursor-1" },
			{ nodes: [project("p2")], hasNextPage: false, endCursor: null },
		]);

		const projects = await fetchCalendarProjects({
			authorization: "key",
			teamIds: ["t1"],
			start: "2026-08-31",
			end: "2026-10-11",
		});

		expect(projects.map((p) => p.id)).toEqual(["p1", "p2"]);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(cursorOf(fetchMock, 0)).toBeNull();
		expect(cursorOf(fetchMock, 1)).toBe("cursor-1");
	});

	// The guard is the only thing between a mistaken hasNextPage and an endless
	// loop of billed requests.
	test("stops paginating rather than looping forever", async () => {
		const fetchMock = stubPages([
			{ nodes: [project("p1")], hasNextPage: true, endCursor: "cursor" },
		]);

		await fetchCalendarProjects({
			authorization: "key",
			teamIds: ["t1"],
			start: "2026-08-31",
			end: "2026-10-11",
		});

		expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(20);
	});
});
