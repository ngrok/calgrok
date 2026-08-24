import { describe, expect, test } from "vitest";
import { explainTokenFailure } from "./linear-oauth.server";

// Linear's own wording ("Invalid secret") doesn't say which variable is wrong,
// and these messages are what someone setting calgrok up actually reads.
describe("explainTokenFailure", () => {
	test("a rejected secret names the variable and warns about rotation", () => {
		const message = explainTokenFailure(400, '{"error":"invalid_secret"}');
		expect(message).toContain("LINEAR_CLIENT_SECRET");
		expect(message).toMatch(/rotate/i);
	});

	test("an unknown client points at the owning workspace", () => {
		const message = explainTokenFailure(400, '{"error":"invalid_client"}');
		expect(message).toContain("LINEAR_CLIENT_ID");
		expect(message).toMatch(/workspace/i);
	});

	test("a rejected code says to start over rather than blaming config", () => {
		const message = explainTokenFailure(400, '{"error":"invalid_grant"}');
		expect(message).toMatch(/single-use/i);
		expect(message).not.toContain("LINEAR_CLIENT_SECRET");
	});

	test("a bad request points at the redirect URI", () => {
		expect(explainTokenFailure(400, '{"error":"invalid_request"}')).toContain(
			"LINEAR_REDIRECT_URI",
		);
	});

	test("a non-JSON body falls back to the raw status and text", () => {
		const message = explainTokenFailure(502, "<html>Bad Gateway</html>");
		expect(message).toContain("502");
		expect(message).toContain("Bad Gateway");
	});

	test("an unrecognised error code keeps Linear's own text", () => {
		expect(explainTokenFailure(400, '{"error":"something_new"}')).toContain("something_new");
	});
});
