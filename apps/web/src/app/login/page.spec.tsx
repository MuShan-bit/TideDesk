import { render, screen } from "@testing-library/react";
import LoginPage from "./page";
import { getMessages } from "@/lib/i18n";

jest.mock("./login-form", () => ({
  LoginForm: () => <div data-testid="login-form">mocked login form</div>,
}));

jest.mock("@/lib/request-locale", () => {
  const { getMessages } = jest.requireActual("@/lib/i18n");

  return {
    getRequestMessages: jest.fn(async () => ({
      locale: "zh-CN",
      messages: getMessages("zh-CN"),
    })),
  };
});

describe("LoginPage", () => {
  it("renders login guidance, demo credentials and the login form entry", async () => {
    const messages = getMessages("zh-CN");

    render(await LoginPage());

    expect(
      screen.getByRole("heading", {
        name: messages.login.heroTitle,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/demo@example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/demo123456/)).toBeInTheDocument();
    expect(screen.getByTestId("login-form")).toBeInTheDocument();
  });
});
