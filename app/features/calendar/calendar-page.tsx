import { Button } from "@ngrok/mantle/button";
import { Form } from "react-router";
import { MonthGrid } from "./month-grid";

export function CalendarPage({ viewer }: { viewer: { name: string; email: string } }) {
	return (
		<div className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-4 p-4 sm:p-6">
			<header className="flex items-center justify-between gap-2">
				<div>
					<h1 className="text-xl font-medium text-strong">calgrok</h1>
					<p className="text-xs text-muted">GTM &amp; Content · {viewer.name}</p>
				</div>
				<Form method="post" action="/auth/logout">
					<Button type="submit" appearance="outlined">
						Disconnect
					</Button>
				</Form>
			</header>

			<MonthGrid />
		</div>
	);
}
