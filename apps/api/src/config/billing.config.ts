export const billingConfig = () => ({
  billing: {
    provider: process.env.BILLING_PROVIDER ?? 'fake',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    gracePeriodDays: Number(process.env.BILLING_GRACE_PERIOD_DAYS ?? 7),
  },
});
