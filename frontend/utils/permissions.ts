export type RoleCarrier = {
  role?: string | null;
};

export function isAdminUser(user?: RoleCarrier | null): boolean {
  return user?.role === "admin";
}
