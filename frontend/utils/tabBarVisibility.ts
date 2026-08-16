const ACCOUNT_DELETION_ROUTE = "/settings/account-deletion";

export function shouldHideTabBar(pathname: string): boolean {
  const routePath = pathname.replace(/^\/\(tabs\)/, "");
  const normalizedPath = routePath.length > 1 ? routePath.replace(/\/+$/, "") : routePath;
  return normalizedPath === ACCOUNT_DELETION_ROUTE;
}
