import { getAppBaseUrl, normalizeAppUrl } from "@/lib/app-url";

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
    expect(normalizeAppUrl("preview.auto-x-to-wechat.vercel.app/")).toBe(
      "https://preview.auto-x-to-wechat.vercel.app",
    );
  });

  it("prefers NEXTAUTH_URL when provided", () => {
    process.env.NEXTAUTH_URL = "https://example.com/";
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_BRANCH_URL = "preview.auto-x-to-wechat.vercel.app";

    expect(getAppBaseUrl()).toBe("https://example.com");
  });

  it("uses preview branch url on vercel preview deployments", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_BRANCH_URL = "preview.auto-x-to-wechat.vercel.app";

    expect(getAppBaseUrl()).toBe(
      "https://preview.auto-x-to-wechat.vercel.app",
    );
  });

  it("uses production project url on vercel production deployments", () => {
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "auto-x-to-wechat.vercel.app";

    expect(getAppBaseUrl()).toBe("https://auto-x-to-wechat.vercel.app");
  });
});
