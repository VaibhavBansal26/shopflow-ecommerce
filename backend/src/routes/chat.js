const router = require('express').Router();
const Anthropic = require('@anthropic-ai/sdk');
const { query } = require('../config/database');
const { cache } = require('../config/redis');
const { authenticate } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { emitChatMessage } = require('../websocket');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Tool definitions — Claude uses these to take real actions
const TOOLS = [
  {
    name: 'search_products',
    description: 'Search for products in the store by name, category, or description. Returns a list of matching products with prices.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term or product name' },
        category: { type: 'string', description: 'Optional product category filter' },
        max_price: { type: 'number', description: 'Optional maximum price filter' },
      },
      required: ['query'],
    },
  },
  {
    name: 'add_to_cart',
    description: 'Add a product to the customer\'s shopping cart.',
    input_schema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'UUID of the product to add' },
        quantity: { type: 'number', description: 'Number of items to add (default 1)' },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'get_cart',
    description: 'Retrieve the current contents of the customer\'s shopping cart with totals.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'remove_from_cart',
    description: 'Remove an item from the customer\'s cart.',
    input_schema: {
      type: 'object',
      properties: {
        cart_item_id: { type: 'string', description: 'UUID of the cart item to remove' },
      },
      required: ['cart_item_id'],
    },
  },
  {
    name: 'get_order_status',
    description: 'Get the current status and location of an order.',
    input_schema: {
      type: 'object',
      properties: {
        order_id: { type: 'string', description: 'Order ID or order number (e.g. SF-ABC123)' },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'get_order_history',
    description: 'Get the customer\'s past orders.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of orders to return (default 5)' },
      },
    },
  },
  {
    name: 'get_recommendations',
    description: 'Get AI-powered product recommendations for the customer based on their history and region.',
    input_schema: {
      type: 'object',
      properties: {
        context: { type: 'string', description: 'Optional context, e.g. "groceries for the week"' },
      },
    },
  },
  {
    name: 'apply_discount',
    description: 'Apply a discount coupon code to the cart.',
    input_schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Discount coupon code' },
      },
      required: ['code'],
    },
  },
];

// Execute tool calls
const executeTool = async (toolName, toolInput, userId) => {
  switch (toolName) {
    case 'search_products': {
      const { query: q, category, max_price } = toolInput;
      let sql = `SELECT id, name, slug, price, compare_at_price, default_image_url,
                        average_rating, review_count, short_description
                 FROM products WHERE is_active = true AND (name ILIKE $1 OR description ILIKE $1)`;
      const params = [`%${q}%`];
      if (category) { sql += ` AND category_id IN (SELECT id FROM categories WHERE name ILIKE $${params.length + 1})`; params.push(`%${category}%`); }
      if (max_price) { sql += ` AND price <= $${params.length + 1}`; params.push(max_price); }
      sql += ' ORDER BY sold_count DESC LIMIT 6';
      const { rows } = await query(sql, params);
      return { products: rows, count: rows.length };
    }

    case 'add_to_cart': {
      const { product_id, quantity = 1 } = toolInput;
      const { rows: prod } = await query('SELECT id, name, price, quantity FROM products WHERE id = $1 AND is_active = true', [product_id]);
      if (!prod.length) return { success: false, error: 'Product not found' };
      if (prod[0].quantity < quantity) return { success: false, error: 'Insufficient stock' };

      // Get or create cart
      let { rows: cart } = await query('SELECT id FROM carts WHERE user_id = $1', [userId]);
      if (!cart.length) {
        const r = await query('INSERT INTO carts (user_id) VALUES ($1) RETURNING id', [userId]);
        cart = r.rows;
      }

      // Upsert cart item
      await query(`
        INSERT INTO cart_items (cart_id, product_id, quantity, price)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = cart_items.quantity + $3`,
        [cart[0].id, product_id, quantity, prod[0].price]);

      return { success: true, message: `Added ${quantity}× ${prod[0].name} (₹${prod[0].price}) to cart` };
    }

    case 'get_cart': {
      const { rows } = await query(`
        SELECT ci.id AS cart_item_id, p.id AS product_id, p.name, p.default_image_url,
               ci.quantity, ci.price, (ci.quantity * ci.price) AS line_total
        FROM carts c
        JOIN cart_items ci ON ci.cart_id = c.id
        JOIN products p ON p.id = ci.product_id
        WHERE c.user_id = $1`, [userId]);
      const total = rows.reduce((s, r) => s + parseFloat(r.line_total), 0);
      return { items: rows, total: total.toFixed(2), count: rows.length };
    }

    case 'remove_from_cart': {
      const { rows } = await query('DELETE FROM cart_items WHERE id = $1 RETURNING *', [toolInput.cart_item_id]);
      return rows.length ? { success: true } : { success: false, error: 'Item not found' };
    }

    case 'get_order_status': {
      const id = toolInput.order_id;
      const { rows } = await query(`
        SELECT o.id, o.order_number, o.status, o.payment_status, o.total, o.estimated_delivery,
               o.delivered_at, o.created_at, o.delivery_address,
               u.name AS rider_name, rl.coordinates AS rider_location
        FROM orders o
        LEFT JOIN users u ON u.id = o.rider_id
        LEFT JOIN LATERAL (
          SELECT coordinates FROM rider_locations WHERE rider_id = o.rider_id ORDER BY created_at DESC LIMIT 1
        ) rl ON true
        WHERE (o.id = $1 OR o.order_number = $1) AND o.user_id = $2`, [id, userId]);
      if (!rows.length) return { error: 'Order not found' };
      return rows[0];
    }

    case 'get_order_history': {
      const limit = toolInput.limit || 5;
      const { rows } = await query(`
        SELECT o.id, o.order_number, o.status, o.total, o.created_at,
               json_agg(oi.product_name) AS item_names
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.user_id = $1 GROUP BY o.id ORDER BY o.created_at DESC LIMIT $2`, [userId, limit]);
      return { orders: rows };
    }

    case 'get_recommendations': {
      const { rows: user } = await query('SELECT region, city FROM users WHERE id = $1', [userId]);
      const region = user[0]?.region || 'general';
      const { rows } = await query(`
        SELECT p.id, p.name, p.price, p.default_image_url, p.average_rating
        FROM products p
        WHERE p.is_active = true AND ($1 = ANY(p.region_tags) OR p.is_featured = true)
        AND p.id NOT IN (
          SELECT DISTINCT product_id FROM user_product_interactions WHERE user_id = $2 AND action = 'purchase'
        )
        ORDER BY p.sold_count DESC LIMIT 6`, [region, userId]);
      return { recommendations: rows, region };
    }

    case 'apply_discount': {
      const { rows } = await query(
        `SELECT id, type, value, min_order_amount, max_discount_amount FROM discounts
         WHERE code = $1 AND is_active = true AND (valid_until IS NULL OR valid_until > NOW())`,
        [toolInput.code]);
      if (!rows.length) return { success: false, error: 'Invalid or expired discount code' };
      return { success: true, discount: rows[0], message: `Code applied! ${rows[0].type === 'percentage' ? rows[0].value + '% off' : '₹' + rows[0].value + ' off'}` };
    }

    default:
      return { error: 'Unknown tool' };
  }
};

// POST /api/chat/message
router.post('/message', authenticate, async (req, res) => {
  const { message, session_id, history = [] } = req.body;
  if (!message?.trim()) throw new AppError('Message required.', 400);

  const sessionId = session_id || `chat_${req.user.id}_${Date.now()}`;

  // Fetch user context
  const { rows: userRows } = await query(
    'SELECT name, region, city FROM users WHERE id = $1', [req.user.id]);
  const user = userRows[0];

  // Save user message
  await query(
    'INSERT INTO chat_messages (session_id, user_id, role, content) VALUES ($1,$2,$3,$4)',
    [sessionId, req.user.id, 'user', message]);

  const systemPrompt = `You are ShopFlow's AI shopping assistant for ${user.name || 'the customer'}.
You help customers browse products, manage their cart, place orders, and track deliveries.
The customer is in ${user.city || 'their area'}, ${user.region || 'India'}.

Be friendly, concise, and proactive. When a customer mentions needing something:
1. Search for relevant products
2. Show them options with prices
3. Offer to add items to cart
4. Suggest related items they might like

Use tools to take real actions — don't just describe what you could do, do it.
Always confirm before placing a full order. For adding to cart, you can proceed directly.
Format prices in Indian Rupees (₹). Keep responses short and helpful.`;

  // Build messages array from history
  const messages = [
    ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ];

  // Agentic loop with tool use
  let response;
  let loopMessages = [...messages];
  const MAX_ITERATIONS = 5;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOLS,
      messages: loopMessages,
    });

    if (response.stop_reason !== 'tool_use') break;

    // Process tool calls
    const toolUses = response.content.filter(b => b.type === 'tool_use');
    const toolResults = await Promise.all(
      toolUses.map(async tu => ({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: JSON.stringify(await executeTool(tu.name, tu.input, req.user.id)),
      }))
    );

    loopMessages = [
      ...loopMessages,
      { role: 'assistant', content: response.content },
      { role: 'user', content: toolResults },
    ];
  }

  // Extract final text
  const assistantText = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');

  // Save assistant message
  await query(
    'INSERT INTO chat_messages (session_id, user_id, role, content) VALUES ($1,$2,$3,$4)',
    [sessionId, req.user.id, 'assistant', assistantText]);

  // Extract any product suggestions from tool results
  const toolUses = response.content.filter(b => b.type === 'tool_use');

  // Emit via WebSocket
  await emitChatMessage(sessionId, { role: 'assistant', content: assistantText });

  res.json({
    session_id: sessionId,
    message: assistantText,
    tool_calls: toolUses.map(t => t.name),
  });
});

// GET /api/chat/history/:sessionId
router.get('/history/:sessionId', authenticate, async (req, res) => {
  const { rows } = await query(
    'SELECT role, content, created_at FROM chat_messages WHERE session_id = $1 AND user_id = $2 ORDER BY created_at ASC',
    [req.params.sessionId, req.user.id]);
  res.json(rows);
});

// GET /api/chat/sessions
router.get('/sessions', authenticate, async (req, res) => {
  const { rows } = await query(`
    SELECT session_id, MAX(created_at) AS last_message,
           (SELECT content FROM chat_messages m2 WHERE m2.session_id = m.session_id ORDER BY created_at DESC LIMIT 1) AS last_content
    FROM chat_messages m WHERE user_id = $1
    GROUP BY session_id ORDER BY last_message DESC LIMIT 20`, [req.user.id]);
  res.json(rows);
});

module.exports = router;
