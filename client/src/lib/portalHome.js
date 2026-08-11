// Every role currently lands on the same "overview" route (which renders role-specific content
// itself — see OverviewPage). Kept as a lookup rather than a literal so a future phase can give
// a role its own distinct landing route without touching every redirect call site.
const PORTAL_HOME_BY_ROLE = {
  client: '/app/overview',
  dietitian: '/app/overview',
  admin: '/app/overview',
};

export function getPortalHome(role) {
  return PORTAL_HOME_BY_ROLE[role] ?? '/app/overview';
}
