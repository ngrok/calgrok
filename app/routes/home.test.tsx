import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, test } from "vitest";
import { ConnectScreen } from "./home";

describe("ConnectScreen", () => {
	test("shows a Connect Linear link", () => {
		const Stub = createRoutesStub([{ path: "/", Component: () => <ConnectScreen /> }]);
		render(<Stub />);
		expect(screen.getByRole("heading", { name: /slated/i })).toBeInTheDocument();
		expect(screen.getByText(/places them by due date/i)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /connect linear/i })).toHaveAttribute(
			"href",
			"/auth/linear",
		);
	});
});
