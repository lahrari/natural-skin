const Stripe = require('stripe');

// Server-side source of truth for product prices — never trust prices sent
// from the client. Keep this in sync with the data-* attributes on the
// "Add to Cart" button in index.html.
const PRODUCTS = {
  'natural-skin-balm-4oz': { name: 'Natural Skin Balm — 4oz', price: 3200 },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey || stripeKey.includes('REPLACE_ME')) {
    return res.status(500).json({ error: 'Stripe is not configured yet. Add a real STRIPE_SECRET_KEY in your environment.' });
  }

  const stripe = Stripe(stripeKey);

  try {
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    const line_items = items.map((item) => {
      const product = PRODUCTS[item.id];
      if (!product) {
        throw new Error(`Unknown product: ${item.id}`);
      }
      const qty = Math.max(1, Math.min(99, parseInt(item.qty, 10) || 1));

      return {
        price_data: {
          currency: 'usd',
          product_data: { name: product.name },
          unit_amount: product.price,
        },
        quantity: qty,
      };
    });

    const origin = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
