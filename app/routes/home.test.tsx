import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, test } from "vitest";
import { HomeView } from "./home";

function renderView(viewer: { name: string; email: string } | null) {
	const Stub = createRoutesStub([{ path: "/", Component: () => <HomeView viewer={viewer} /> }]);
	render(<Stub />);
}

describe("HomeView", () => {
	test("shows a Connect Linear link when logged out", () => {
		renderView(null);
		expect(screen.getByRole("heading", { name: /calgrok/i })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /connect linear/i })).toHaveAttribute(
			"href",
			"/auth/linear",
		);
	});

	test("shows the connected user and a disconnect button when logged in", () => {
		renderView({ name: "Joel Hans", email: "joel@ngrok.com" });
		expect(screen.getByText(/joel hans/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
	});
});
