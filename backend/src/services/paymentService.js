const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const createPaymentIntent = async ({ amount, currency = 'inr', metadata = {}, paymentMethodTypes = ['card'] }) => {
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to paise
    currency,
    payment_method_types: paymentMethodTypes,
    metadata,
  });
  return intent;
};

const confirmPaymentIntent = async (paymentIntentId) => {
  return await stripe.paymentIntents.retrieve(paymentIntentId);
};

const createRefund = async (paymentIntentId, amount) => {
  const params = { payment_intent: paymentIntentId };
  if (amount) params.amount = Math.round(amount * 100);
  return await stripe.refunds.create(params);
};

const attachPaymentMethod = async (customerId, paymentMethodId) => {
  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
};

const createCustomer = async (email, name) => {
  return await stripe.customers.create({ email, name });
};

const listPaymentMethods = async (customerId) => {
  const methods = await stripe.paymentMethods.list({ customer: customerId, type: 'card' });
  return methods.data;
};

module.exports = {
  createPaymentIntent,
  confirmPaymentIntent,
  createRefund,
  attachPaymentMethod,
  createCustomer,
  listPaymentMethods,
};
