import { render, screen } from "@testing-library/react";
import LoginPage from "./page";

jest.mock("./login-form", () => ({
  LoginForm: () => <div data-testid="login-form">mocked login form</div>,
}));

describe("LoginPage", () => {
  it("renders login guidance, demo credentials and the login form entry", () => {
    render(<LoginPage />);

    expect(
      screen.getByRole("heading", {
        name: "登录后才能访问绑定、归档和任务页面",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/demo@example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/demo123456/)).toBeInTheDocument();
    expect(screen.getByTestId("login-form")).toBeInTheDocument();
  });
});
