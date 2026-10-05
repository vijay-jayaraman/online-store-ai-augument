// Order lifecycle (SRS §6, orders.status). Only the verified payment.captured webhook sets `paid`.
export const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  EXPIRED: 'expired',
  REFUNDED: 'refunded',
});

export const ORDER_STATUSES = Object.freeze(Object.values(ORDER_STATUS));
