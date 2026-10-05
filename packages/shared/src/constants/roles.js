// User roles (SRS §6, users.role). The admin role is granted only to allowlisted emails.
export const ROLE = Object.freeze({
  BUYER: 'buyer',
  ADMIN: 'admin',
});

export const ROLES = Object.freeze(Object.values(ROLE));
