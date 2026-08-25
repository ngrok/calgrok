import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, test } from "vitest";
import { InvalidApiKeyScreen } from "./home";

// The one screen a visitor can land on instead of the calendar. There is no
// sign-in to retry, so this has to name the variable and where to fix it.
describe("InvalidApiKeyScreen", () => {
	test("names LINEAR_API_KEY and links to Linear's API settings", () => {
		const Stub = createRoutesStub([{ path: "/", Component: () => <InvalidApiKeyScreen /> }]);
		render(<Stub />);
		expect(screen.getByRole("heading", { name: /rejected the api key/i })).toBeInTheDocument();
		expect(screen.getByText("LINEAR_API_KEY")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /manage your api keys/i })).toHaveAttribute(
			"href",
			"https://linear.app/settings/api",
		);
	});
});
