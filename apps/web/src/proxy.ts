import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const protectedRoutes = [
  "/dashboard",
  "/bindings",
  "/strategies",
  "/reports",
  "/ai",
  "/settings",
  "/taxonomy",
  "/archives",
  "/runs",
  "/publishing",
];

export function handleAuthenticatedRoute(request: {
  auth?: unknown;
  nextUrl: {
    origin: string;
    pathname: string;
    search?: string;
  };
}) {
  const { nextUrl, auth: session } = request;
  const isProtectedRoute = protectedRoutes.some((route) =>
    nextUrl.pathname.startsWith(route),
  );

  if (!session && isProtectedRoute) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set(
      "callbackUrl",
      `${nextUrl.pathname}${nextUrl.search ?? ""}`,
    );

    return NextResponse.redirect(loginUrl);
  }

  if (session && nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
  }

  return NextResponse.next();
}

export default auth((request) => {
  return handleAuthenticatedRoute(request);
});

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/bindings/:path*",
    "/strategies/:path*",
    "/reports/:path*",
    "/ai/:path*",
    "/settings/:path*",
    "/taxonomy/:path*",
    "/archives/:path*",
    "/runs/:path*",
    "/publishing/:path*",
  ],
};
