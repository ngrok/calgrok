import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from "react-router";
import type { LinksFunction } from "react-router";
import stylesheet from "./app.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: stylesheet }];

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
			</head>
			<body className="bg-body text-strong">
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	// One QueryClient per browser session. Created in state so it is stable
	// across re-renders and isn't shared between requests during SSR.
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 60_000,
						refetchOnWindowFocus: false,
					},
				},
			}),
	);

	return (
		<QueryClientProvider client={queryClient}>
			<Outlet />
		</QueryClientProvider>
	);
}

export function ErrorBoundary({ error }: { error: unknown }) {
	let title = "Something went wrong";
	let detail = "An unexpected error occurred.";

	if (isRouteErrorResponse(error)) {
		title = `${error.status} ${error.statusText}`;
		detail = error.data;
	} else if (error instanceof Error) {
		detail = error.message;
	}

	return (
		<main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-2 p-8 text-center">
			<h1 className="text-2xl font-medium text-strong">{title}</h1>
			<p className="text-muted">{detail}</p>
		</main>
	);
}
