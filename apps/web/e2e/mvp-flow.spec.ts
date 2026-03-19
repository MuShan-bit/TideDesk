import { expect, test } from "@playwright/test";

test("login, bind, crawl and browse archived content", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("邮箱").fill("demo@example.com");
  await page.getByLabel("密码").fill("demo123456");
  await Promise.all([
    page.waitForURL("**/dashboard"),
    page.getByRole("button", { name: "进入系统" }).click(),
  ]);

  await page.getByRole("link", { name: "Bindings" }).click();
  await expect(page).toHaveURL(/\/bindings$/);

  await page.getByLabel("X 用户 ID").fill("x-e2e-001");
  await page.getByLabel("用户名").fill("e2e_mock_user");
  await page.getByLabel("显示名").fill("E2E Mock User");
  await page
    .getByLabel("头像 URL")
    .fill("https://images.example.com/e2e-mock-user.png");
  await page.getByLabel("凭证来源").selectOption("COOKIE_IMPORT");
  await page.locator("#credentialPayload").fill(
    JSON.stringify(
      {
        username: "e2e_mock_user",
        xUserId: "x-e2e-001",
      },
      null,
      2,
    ),
  );
  await page.locator("#bindingCrawlIntervalMinutes").fill("60");
  await page
    .getByRole("button", { name: /创建绑定|更新绑定与凭证/ })
    .click();

  await expect(page.getByText("绑定信息已保存。")).toBeVisible();
  await page.reload();
  await expect(page.getByText("@e2e_mock_user")).toBeVisible();

  await page.getByRole("button", { name: "立即抓取" }).click();
  await expect(page.getByText(/手动抓取已执行/)).toBeVisible();

  await page.getByRole("link", { name: "Archives" }).click();
  await expect(page).toHaveURL(/\/archives$/);

  await page
    .getByPlaceholder("搜索正文、作者、绑定账号或帖子 ID")
    .fill("e2e_mock_user");
  await page.getByRole("button", { name: "应用筛选" }).click();

  await expect(page.getByText(/来源绑定账号：@e2e_mock_user/).first()).toBeVisible();
  await page.getByRole("link", { name: "查看详情" }).first().click();

  await expect(page).toHaveURL(/\/archives\/.+/);
  await expect(page.getByText("来源与上下文")).toBeVisible();
  await expect(page.getByText("@e2e_mock_user", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "打开原帖" })).toBeVisible();
});
