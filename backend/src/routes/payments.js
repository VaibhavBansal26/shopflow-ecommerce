const router = require('express').Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { createRefund, listPaymentMethods, createCustomer, attachPaymentMethod } = require('../services/paymentService');
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe webhook — must be before express.json() body parser
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    await query(
      "UPDATE orders SET payment_status = 'paid', updated_at = NOW() WHERE stripe_payment_intent_id = $1",
      [pi.id]);
  } else if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object;
    await query(
      "UPDATE orders SET payment_status = 'failed', updated_at = NOW() WHERE stripe_payment_intent_id = $1",
      [pi.id]);
  }

  res.json({ received: true });
});

router.get('/methods', authenticate, async (req, res) => {
  const { rows } = await query('SELECT stripe_customer_id FROM users WHERE id = $1', [req.user.id]);
  if (!rows[0]?.stripe_customer_id) return res.json([]);
  const methods = await listPaymentMethods(rows[0].stripe_customer_id);
  res.json(methods);
});

router.post('/methods', authenticate, async (req, res) => {
  const { payment_method_id } = req.body;
  if (!payment_method_id) throw new AppError('payment_method_id required', 400);

  let { rows } = await query('SELECT stripe_customer_id FROM users WHERE id = $1', [req.user.id]);
  let customerId = rows[0]?.stripe_customer_id;

  if (!customerId) {
    const { rows: u } = await query('SELECT email, name FROM users WHERE id = $1', [req.user.id]);
    const customer = await createCustomer(u[0].email, u[0].name);
    customerId = customer.id;
    await query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, req.user.id]);
  }

  await attachPaymentMethod(customerId, payment_method_id);
  res.json({ success: true });
});

router.post('/refund', authenticate, async (req, res) => {
  const { order_id, amount } = req.body;
  const { rows } = await query(
    "SELECT stripe_payment_intent_id FROM orders WHERE id = $1 AND user_id = $2",
    [order_id, req.user.id]);
  if (!rows.length || !rows[0].stripe_payment_intent_id) {
    throw new AppError('No payment found for this order', 404);
  }
  const refund = await createRefund(rows[0].stripe_payment_intent_id, amount);
  await query("UPDATE orders SET payment_status = 'refunded', updated_at = NOW() WHERE id = $1", [order_id]);
  res.json({ success: true, refund_id: refund.id });
});

module.exports = router;
