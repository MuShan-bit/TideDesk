import {
  getAppBaseUrl,
  normalizeAppUrl,
  shouldUseSecureSessionCookie,
} from "@/lib/app-url";

const originalEnv = process.env;

describe("app-url", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
    };
    delete process.env.NEXTAUTH_URL;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_BRANCH_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("normalizes hostnames into https urls", () => {
    expect(normalizeAppUrl("preview.tidedesk.vercel.app/")).toBe(
      "https://preview.tidedesk.vercel.app",
    );
  });

  it("prefers NEXTAUTH_URL when provided", () => {
    process.env.NEXTAUTH_URL = "https://example.com/";
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_BRANCH_URL = "preview.tidedesk.vercel.app";

    expect(getAppBaseUrl()).toBe("https://example.com");
  });

  it("uses preview branch url on vercel preview deployments", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_BRANCH_URL = "preview.tidedesk.vercel.app";

    expect(getAppBaseUrl()).toBe(
      "https://preview.tidedesk.vercel.app",
    );
  });

  it("uses production project url on vercel production deployments", () => {
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "tidedesk.vercel.app";

    expect(getAppBaseUrl()).toBe("https://tidedesk.vercel.app");
  });

  it("does not force secure cookies for local http deployments", () => {
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    process.env.AUTH_TRUST_HOST = "true";

    expect(shouldUseSecureSessionCookie()).toBe(false);
  });

  it("uses secure cookies for https deployments", () => {
    process.env.NEXTAUTH_URL = "https://tidedesk.vercel.app";

    expect(shouldUseSecureSessionCookie()).toBe(true);
  });
});
