import { createIssue, fetchIssueDetail, type NewIssueInput } from "~/lib/linear-graphql.server";
import { getLinearAuth } from "~/lib/linear.server";
import type { Route } from "./+types/api.issue";

// Linear's priority scale: 0 none, 1 urgent, 2 high, 3 medium, 4 low.
const MAX_PRIORITY = 4;

// BFF resource route for on-demand issue detail (the heavy `description` field
// the calendar list query doesn't load).
export async function loader({ request }: Route.LoaderArgs) {
	const auth = await getLinearAuth(request);
	if (!auth) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const id = new URL(request.url).searchParams.get("id");
	if (!id) {
		throw new Response("Missing 'id' query param", { status: 400 });
	}

	const detail = await fetchIssueDetail(auth.accessToken, id);
	return Response.json(detail, auth.headers ? { headers: auth.headers } : undefined);
}

// Create an issue: POST { teamId, title, description?, dueDate?, labelIds?,
// stateId?, priority? } -> Linear issueCreate. Responds with the new issue in
// calendar shape so the client can place the card immediately.
export async function action({ request }: Route.ActionArgs) {
	const auth = await getLinearAuth(request);
	if (!auth) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const body = (await request.json()) as Partial<NewIssueInput>;
	const title = body.title?.trim();
	if (!body.teamId) {
		throw new Response("Missing 'teamId'", { status: 400 });
	}
	if (!title) {
		throw new Response("Missing 'title'", { status: 400 });
	}
	if (
		body.priority !== undefined &&
		(!Number.isInteger(body.priority) || body.priority < 0 || body.priority > MAX_PRIORITY)
	) {
		throw new Response("Invalid 'priority'", { status: 400 });
	}

	const description = body.description?.trim();
	const issue = await createIssue({
		accessToken: auth.accessToken,
		input: {
			teamId: body.teamId,
			title,
			...(description ? { description } : {}),
			...(body.dueDate ? { dueDate: body.dueDate } : {}),
			...(body.labelIds?.length ? { labelIds: body.labelIds } : {}),
			...(body.stateId ? { stateId: body.stateId } : {}),
			...(body.priority !== undefined ? { priority: body.priority } : {}),
		},
	});

	return Response.json({ issue }, auth.headers ? { headers: auth.headers } : undefined);
}
