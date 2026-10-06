// Admin sections. The sidebar and the routes are both built from this list.
// `milestone` names the issue in docs/MILESTONES.md that replaces the placeholder page.

export const NAV_GROUPS = [
  {
    label: 'Catalog',
    items: [
      {
        path: 'books',
        label: 'Books',
        icon: 'book',
        description: 'Create and edit books, upload covers, samples, and PDFs, and publish them.',
        milestone: 'M6-06',
      },
      {
        path: 'categories',
        label: 'Categories',
        icon: 'tag',
        description: 'Organise the catalog into categories shown in the store.',
        milestone: 'M6-03',
      },
      {
        path: 'authors',
        label: 'Authors',
        icon: 'pen',
        description: 'Manage author names and bios linked to books.',
        milestone: 'M6-03',
      },
    ],
  },
  {
    label: 'Sales',
    items: [
      {
        path: 'orders',
        label: 'Orders',
        icon: 'receipt',
        description: 'Review orders and payments, and issue refunds.',
        milestone: 'M13-01',
      },
      {
        path: 'customers',
        label: 'Customers',
        icon: 'users',
        description: 'See buyers, their purchases, and block accounts when needed.',
        milestone: 'M13-03',
      },
      {
        path: 'reviews',
        label: 'Reviews',
        icon: 'message',
        description: 'Moderate book reviews before and after they are published.',
        milestone: 'M12-03',
      },
    ],
  },
  {
    label: 'Store',
    items: [
      {
        path: 'settings',
        label: 'Settings',
        icon: 'sliders',
        description: 'Store name, logo, support email, tax, and download limits.',
        milestone: 'M14-01',
      },
      {
        path: 'audit-log',
        label: 'Audit log',
        icon: 'history',
        description: 'A record of every create, update, delete, refund, and block action.',
        milestone: 'M14-03',
      },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

export const DEFAULT_PATH = `/${NAV_ITEMS[0].path}`;
