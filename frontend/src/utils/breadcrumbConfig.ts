export interface BreadcrumbRouteMeta {
  moduleLabel?: string;
  modulePath?: string;
  pageLabel: string;
}

const ROOT_MODULE_MAP: Record<string, { moduleLabel: string; modulePath: string }> = {
  master: { moduleLabel: 'Master', modulePath: '/master' },
  transaction: { moduleLabel: 'Transaction', modulePath: '/transaction' },
  finance: { moduleLabel: 'Finance', modulePath: '/finance' },
  report: { moduleLabel: 'Reports', modulePath: '/report' },
  'commercial-agreements': { moduleLabel: 'Commercial', modulePath: '/commercial-agreements' },
  'compliance-training': { moduleLabel: 'Compliance', modulePath: '/compliance-training' },
  admin: { moduleLabel: 'Settings', modulePath: '/admin/dashboard-configuration' },
  profile: { moduleLabel: 'Settings', modulePath: '/profile' },
  hcf: { moduleLabel: 'HCF', modulePath: '/hcf/dashboard' },
};

const ROUTE_META: Array<{ test: RegExp; meta: BreadcrumbRouteMeta }> = [
  { test: /^\/dashboard$/, meta: { pageLabel: 'Dashboard' } },
  { test: /^\/transaction$/, meta: { pageLabel: 'Transaction' } },
  { test: /^\/finance$/, meta: { pageLabel: 'Finance' } },
  { test: /^\/report$/, meta: { pageLabel: 'Reports' } },
  { test: /^\/commercial-agreements$/, meta: { pageLabel: 'Commercial' } },
  { test: /^\/compliance-training$/, meta: { pageLabel: 'Compliance' } },
  { test: /^\/master$/, meta: { moduleLabel: 'Master', modulePath: '/master', pageLabel: 'Master' } },
  { test: /^\/master\/company$/, meta: { moduleLabel: 'Master', modulePath: '/master', pageLabel: 'Company' } },
  { test: /^\/master\/area$/, meta: { moduleLabel: 'Master', modulePath: '/master', pageLabel: 'Area Master' } },
  { test: /^\/master\/state$/, meta: { moduleLabel: 'Master', modulePath: '/master', pageLabel: 'State Master' } },
  { test: /^\/master\/category$/, meta: { moduleLabel: 'Master', modulePath: '/master', pageLabel: 'Category Master' } },
  { test: /^\/master\/hcf-master$/, meta: { moduleLabel: 'Master', modulePath: '/master', pageLabel: 'HCF Master' } },
  { test: /^\/master\/hcf-amendments$/, meta: { moduleLabel: 'Master', modulePath: '/master', pageLabel: 'HCF Amendments' } },
  { test: /^\/master\/hcf-type$/, meta: { moduleLabel: 'Master', modulePath: '/master', pageLabel: 'HCF Type Master' } },
  { test: /^\/master\/fleet-management$/, meta: { moduleLabel: 'Transaction', modulePath: '/transaction', pageLabel: 'Vehicles' } },
  { test: /^\/master\/route-hcf-mapping$/, meta: { moduleLabel: 'Master', modulePath: '/master', pageLabel: 'Route Mapping' } },
  { test: /^\/master\/frequency$/, meta: { moduleLabel: 'Master', modulePath: '/master', pageLabel: 'Frequency Master' } },
  { test: /^\/master\/route$/, meta: { moduleLabel: 'Master', modulePath: '/master', pageLabel: 'Route Master' } },
  { test: /^\/master\/pcb-zone$/, meta: { moduleLabel: 'Master', modulePath: '/master', pageLabel: 'PCB Zone Master' } },
  { test: /^\/master\/color-code$/, meta: { moduleLabel: 'Master', modulePath: '/master', pageLabel: 'Color Code' } },
  { test: /^\/master\/user-management$/, meta: { moduleLabel: 'Master', modulePath: '/master', pageLabel: 'User Management' } },
  { test: /^\/master\/roles-permissions$/, meta: { moduleLabel: 'Master', modulePath: '/master', pageLabel: 'Roles & Permissions' } },
  { test: /^\/transaction\/compliance-register$/, meta: { moduleLabel: 'Compliance', modulePath: '/compliance-training', pageLabel: 'Compliance Register' } },
  { test: /^\/transaction\/route-assignment$/, meta: { moduleLabel: 'Transaction', modulePath: '/transaction', pageLabel: 'Route Assignment' } },
  { test: /^\/finance\/invoice-management$/, meta: { moduleLabel: 'Finance', modulePath: '/finance', pageLabel: 'Invoices' } },
  { test: /^\/finance\/generate-invoices$/, meta: { moduleLabel: 'Finance', modulePath: '/finance', pageLabel: 'Invoices' } },
  { test: /^\/finance\/draft-invoices\/[^/]+$/, meta: { moduleLabel: 'Finance', modulePath: '/finance', pageLabel: 'Batch Edit' } },
];

const toTitleCase = (value: string): string =>
  value
    .split('-')
    .filter(Boolean)
    .map((part) => {
      if (part.toLowerCase() === 'hcf') return 'HCF';
      return `${part.charAt(0).toUpperCase()}${part.slice(1)}`;
    })
    .join(' ');

export const resolveBreadcrumbMeta = (pathname: string, fallbackTitle?: string): BreadcrumbRouteMeta => {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const exactMatch = ROUTE_META.find((entry) => entry.test.test(normalizedPath));
  if (exactMatch) return exactMatch.meta;

  const pathParts = normalizedPath.split('/').filter(Boolean);
  const root = pathParts[0];

  if (!root) return { pageLabel: 'Dashboard' };

  const rootMeta = ROOT_MODULE_MAP[root];
  const lastSegment = pathParts[pathParts.length - 1];
  const pageLabel = fallbackTitle || toTitleCase(lastSegment);

  if (rootMeta) {
    return {
      moduleLabel: rootMeta.moduleLabel,
      modulePath: rootMeta.modulePath,
      pageLabel,
    };
  }

  return { pageLabel };
};
