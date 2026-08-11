import { LayoutDashboard, Utensils, LineChart, Phone, FileText, Users, CalendarRange, BookOpen, Inbox, BarChart3 } from 'lucide-react';

// Single source of truth for the portal shell: who sees what, matching CLAUDE.md §5 exactly.
// Route guards in router.jsx derive their role lists from this via ROUTE_ROLES below, so the
// nav and the route guards can never drift apart.
export const NAV_BY_ROLE = {
  client: [
    { to: '/app/overview', label: 'Overview', icon: LayoutDashboard },
    { to: '/app/meals', label: "This week's meals", icon: Utensils },
    { to: '/app/progress', label: 'My progress', icon: LineChart },
    { to: '/app/calls', label: 'Calls', icon: Phone },
    { to: '/app/reports', label: 'Reports', icon: FileText },
  ],
  dietitian: [
    { to: '/app/overview', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/clients', label: 'Clients', icon: Users },
    { to: '/app/plan', label: 'Weekly plan builder', icon: CalendarRange },
    { to: '/app/recipes', label: 'Recipe library', icon: BookOpen },
    { to: '/app/calls', label: 'Schedule calls', icon: Phone },
    { to: '/app/reports', label: 'Report reviews', icon: FileText },
  ],
  admin: [
    { to: '/app/overview', label: 'Business overview', icon: LayoutDashboard },
    { to: '/app/enquiries', label: 'Enquiry pipeline', icon: Inbox },
    { to: '/app/clients', label: 'Clients', icon: Users },
    { to: '/app/plan', label: 'Weekly plan', icon: CalendarRange },
    { to: '/app/recipes', label: 'Recipe library', icon: BookOpen },
    { to: '/app/insights', label: 'Growth insights', icon: BarChart3 },
  ],
};

// { overview: ['client','dietitian','admin'], meals: ['client'], calls: ['client','dietitian'], ... }
export const ROUTE_ROLES = Object.entries(NAV_BY_ROLE).reduce((acc, [role, items]) => {
  for (const { to } of items) {
    const path = to.replace('/app/', '');
    acc[path] = acc[path] ? [...acc[path], role] : [role];
  }
  return acc;
}, {});
