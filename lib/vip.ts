// VIP listings — a seller pays credits to publish an item into the paid
// direct-access tier; a buyer pays credits to unlock it, which creates the
// Match immediately instead of requiring the usual mutual swipe. Costs are
// Config-overridable (see lib/config.ts CONFIG_KEYS), these are only the
// fallback defaults.
export const DEFAULT_VIP_PUBLISH_COST = 10;
export const DEFAULT_VIP_UNLOCK_COST = 5;
