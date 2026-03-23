import { handleAuthenticatedRoute, protectedRoutes } from "./proxy";

jest.mock("@/auth", () => ({
  auth: jest.fn((handler: unknown) => handler),
}));

const redirectMock = jest.fn((url: URL) => ({
  type: "redirect",
  url: url.toString(),
}));
const nextMock = jest.fn(() => ({
  type: "next",
}));

jest.mock("next/server", () => ({
  NextResponse: {
    redirect: (url: URL) => redirectMock(url),
    next: () => nextMock(),
  },
}));

describe("proxy auth guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("covers all application workspaces that should require authentication", () => {
    expect(protectedRoutes).toEqual(
      expect.arrayContaining([
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
      ]),
    );
  });

  it("redirects unauthenticated requests for protected routes to login", () => {
    const result = handleAuthenticatedRoute({
      auth: null,
      nextUrl: {
        origin: "http://localhost:3000",
        pathname: "/reports",
        search: "?page=2",
      },
    });

    expect(result).toEqual({
      type: "redirect",
      url: "http://localhost:3000/login?callbackUrl=%2Freports%3Fpage%3D2",
    });
  });

  it("allows public requests when the route is not protected", () => {
    const result = handleAuthenticatedRoute({
      auth: null,
      nextUrl: {
        origin: "http://localhost:3000",
        pathname: "/",
        search: "",
      },
    });

    expect(result).toEqual({
      type: "next",
    });
  });

  it("redirects authenticated users away from login", () => {
    const result = handleAuthenticatedRoute({
      auth: {
        user: {
          id: "user-001",
        },
      },
      nextUrl: {
        origin: "http://localhost:3000",
        pathname: "/login",
        search: "",
      },
    });

    expect(result).toEqual({
      type: "redirect",
      url: "http://localhost:3000/dashboard",
    });
  });
});
