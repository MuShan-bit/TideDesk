import { NextResponse } from "next/server";
import { auth } from "@/auth";

const protectedRoutes = [
  "/dashboard",
  "/bindings",
  "/archives",
  "/runs",
  "/publishing",
];

export default auth((request) => {
  const { nextUrl, auth: session } = request;
  const isProtectedRoute = protectedRoutes.some((route) =>
    nextUrl.pathname.startsWith(route),
  );

  if (!session && isProtectedRoute) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (session && nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/bindings/:path*",
    "/archives/:path*",
    "/runs/:path*",
    "/publishing/:path*",
  ],
};
