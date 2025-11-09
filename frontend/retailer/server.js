const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.static("public"));
app.use(express.json());

// JWT Secret (in production, use environment variable)
const JWT_SECRET = "your-super-secret-jwt-key-here";

// Mock database (in production, use a real database)
let retailers = [
  {
    id: 1,
    username: "retailer1",
    email: "retailer1@example.com",
    password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
    business_name: "Fresh Groceries",
    created_at: new Date().toISOString()
  }
];

let products = [
  { 
    id: 1, 
    retailer_id: 1,
    name: "Organic Tomatoes", 
    price: 40,
    quantity: 25,
    category: "Vegetables",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  { 
    id: 2, 
    retailer_id: 1,
    name: "Fresh Onions", 
    price: 30,
    quantity: 15,
    category: "Vegetables",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  { 
    id: 3, 
    retailer_id: 1,
    name: "Premium Potatoes", 
    price: 25,
    quantity: 8,
    category: "Vegetables",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

let notifications = [
  { 
    id: 1, 
    retailer_id: 1,
    message: "Order #101 placed for Organic Tomatoes", 
    type: "order",
    is_read: false,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
  },
  { 
    id: 2, 
    retailer_id: 1,
    message: "Stock low for Fresh Onions (only 15 left)", 
    type: "stock",
    is_read: false,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
  },
  { 
    id: 3, 
    retailer_id: 1,
    message: "New customer review received", 
    type: "review",
    is_read: true,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
  }
];

let orders = [
  { 
    id: 201, 
    retailer_id: 1,
    product_id: 1,
    product_name: "Organic Tomatoes", 
    quantity: 5, 
    user_id: "user123", 
    user_name: "John Doe",
    status: "pending",
    total_price: 200,
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  },
  { 
    id: 202, 
    retailer_id: 1,
    product_id: 2,
    product_name: "Fresh Onions", 
    quantity: 3, 
    user_id: "user456", 
    user_name: "Jane Smith",
    status: "accepted",
    total_price: 90,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  { 
    id: 203, 
    retailer_id: 1,
    product_id: 1,
    product_name: "Organic Tomatoes", 
    quantity: 2, 
    user_id: "user789", 
    user_name: "Bob Wilson",
    status: "pending",
    total_price: 80,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  }
];

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, retailer) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.retailer = retailer;
    next();
  });
};

// Utility function to generate IDs
let nextId = {
  product: Math.max(...products.map(p => p.id), 0) + 1,
  notification: Math.max(...notifications.map(n => n.id), 0) + 1,
  order: Math.max(...orders.map(o => o.id), 0) + 1
};

// Routes

// Retailer Authentication
app.post("/api/retailer/register", async (req, res) => {
  try {
    const { username, email, password, business_name } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required" });
    }

    // Check if retailer already exists
    const existingRetailer = retailers.find(r => r.username === username || r.email === email);
    if (existingRetailer) {
      return res.status(409).json({ error: "Retailer with this username or email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new retailer
    const newRetailer = {
      id: retailers.length + 1,
      username,
      email,
      password: hashedPassword,
      business_name: business_name || `${username}'s Store`,
      created_at: new Date().toISOString()
    };

    retailers.push(newRetailer);

    // Generate JWT token
    const token = jwt.sign(
      { id: newRetailer.id, username: newRetailer.username }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: "Retailer registered successfully",
      retailer: {
        id: newRetailer.id,
        username: newRetailer.username,
        email: newRetailer.email,
        business_name: newRetailer.business_name
      },
      token
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error during registration" });
  }
});

app.post("/api/retailer/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    // Find retailer
    const retailer = retailers.find(r => r.username === username);
    if (!retailer) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, retailer.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: retailer.id, username: retailer.username }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({
      message: "Login successful",
      retailer: {
        id: retailer.id,
        username: retailer.username,
        email: retailer.email,
        business_name: retailer.business_name
      },
      token
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error during login" });
  }
});

app.get("/api/retailer/resolve-id/:username", (req, res) => {
  try {
    const { username } = req.params;
    const retailer = retailers.find(r => r.username === username);
    
    if (!retailer) {
      return res.status(404).json({ error: "Retailer not found" });
    }

    res.json({ retailer_id: retailer.id });
  } catch (error) {
    console.error("Resolve ID error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Products/Inventory
app.get("/api/retailer/inventory/:retailerId", authenticateToken, (req, res) => {
  try {
    const { retailerId } = req.params;
    
    // Verify retailer has access
    if (req.retailer.id !== parseInt(retailerId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const retailerProducts = products.filter(p => p.retailer_id === parseInt(retailerId));
    res.json(retailerProducts);
  } catch (error) {
    console.error("Inventory fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/retailer/inventory/update", authenticateToken, (req, res) => {
  try {
    const { retailer_id, product_id, product_name, price, new_qty, category } = req.body;

    // Verify retailer has access
    if (req.retailer.id !== parseInt(retailer_id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    let product;
    
    if (product_id) {
      // Update existing product
      product = products.find(p => p.id === product_id && p.retailer_id === parseInt(retailer_id));
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      if (new_qty !== undefined) product.quantity = new_qty;
      if (price !== undefined) product.price = price;
      if (product_name) product.name = product_name;
      if (category) product.category = category;
      product.updated_at = new Date().toISOString();

      res.json({ 
        message: "Product updated successfully",
        product 
      });

    } else {
      // Add new product
      if (!product_name || price === undefined || new_qty === undefined) {
        return res.status(400).json({ error: "Product name, price, and quantity are required" });
      }

      const newProduct = {
        id: nextId.product++,
        retailer_id: parseInt(retailer_id),
        name: product_name,
        price: parseFloat(price),
        quantity: parseInt(new_qty),
        category: category || "Uncategorized",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      products.push(newProduct);

      // Create stock notification if quantity is low
      if (newProduct.quantity < 10) {
        const notification = {
          id: nextId.notification++,
          retailer_id: parseInt(retailer_id),
          message: `Low stock alert for ${newProduct.name} (${newProduct.quantity} left)`,
          type: "stock",
          is_read: false,
          created_at: new Date().toISOString()
        };
        notifications.push(notification);
      }

      res.status(201).json({ 
        message: "Product added successfully",
        product: newProduct 
      });
    }

  } catch (error) {
    console.error("Inventory update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Notifications
app.get("/api/retailer/notifications/:retailerId", authenticateToken, (req, res) => {
  try {
    const { retailerId } = req.params;
    
    // Verify retailer has access
    if (req.retailer.id !== parseInt(retailerId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const retailerNotifications = notifications
      .filter(n => n.retailer_id === parseInt(retailerId))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Most recent first

    res.json(retailerNotifications);
  } catch (error) {
    console.error("Notifications fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/retailer/notifications/read/:id", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const notification = notifications.find(n => n.id === parseInt(id));
    
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Verify retailer has access
    if (req.retailer.id !== notification.retailer_id) {
      return res.status(403).json({ error: "Access denied" });
    }

    notification.is_read = true;
    res.json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    console.error("Notification read error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Orders
app.get("/api/retailer/orders/:retailerId", authenticateToken, (req, res) => {
  try {
    const { retailerId } = req.params;
    
    // Verify retailer has access
    if (req.retailer.id !== parseInt(retailerId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const retailerOrders = orders
      .filter(o => o.retailer_id === parseInt(retailerId))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Most recent first

    res.json(retailerOrders);
  } catch (error) {
    console.error("Orders fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/retailer/orders/update", authenticateToken, (req, res) => {
  try {
    const { order_id, status } = req.body;

    if (!order_id || !status) {
      return res.status(400).json({ error: "Order ID and status are required" });
    }

    const order = orders.find(o => o.id === parseInt(order_id));
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Verify retailer has access
    if (req.retailer.id !== order.retailer_id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Update order status
    const oldStatus = order.status;
    order.status = status;
    order.updated_at = new Date().toISOString();

    // Create notification for status change
    const notification = {
      id: nextId.notification++,
      retailer_id: order.retailer_id,
      message: `Order #${order.id} status changed from ${oldStatus} to ${status}`,
      type: "order",
      is_read: false,
      created_at: new Date().toISOString()
    };
    notifications.push(notification);

    res.json({ 
      success: true, 
      message: `Order status updated to ${status}`,
      order 
    });
  } catch (error) {
    console.error("Order update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Dashboard Statistics
app.get("/api/retailer/dashboard/stats/:retailerId", authenticateToken, (req, res) => {
  try {
    const { retailerId } = req.params;
    
    // Verify retailer has access
    if (req.retailer.id !== parseInt(retailerId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const retailerProducts = products.filter(p => p.retailer_id === parseInt(retailerId));
    const retailerOrders = orders.filter(o => o.retailer_id === parseInt(retailerId));
    const retailerNotifications = notifications.filter(n => n.retailer_id === parseInt(retailerId));

    const totalProducts = retailerProducts.length;
    const lowStockProducts = retailerProducts.filter(p => p.quantity < 10).length;
    const totalInventoryValue = retailerProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const pendingOrders = retailerOrders.filter(o => o.status === 'pending').length;
    const totalRevenue = retailerOrders
      .filter(o => o.status === 'accepted')
      .reduce((sum, o) => sum + o.total_price, 0);
    const unreadNotifications = retailerNotifications.filter(n => !n.is_read).length;

    res.json({
      total_products: totalProducts,
      low_stock_products: lowStockProducts,
      total_inventory_value: totalInventoryValue,
      pending_orders: pendingOrders,
      total_revenue: totalRevenue,
      unread_notifications: unreadNotifications,
      average_product_price: totalProducts > 0 ? totalInventoryValue / totalProducts : 0
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Something went wrong!" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 Enhanced Server running at http://localhost:${PORT}`);
  console.log(`📊 Retailer Dashboard API available`);
  console.log(`🔐 Authentication endpoints: /api/retailer/login, /api/retailer/register`);
  console.log(`📦 Inventory endpoints: /api/retailer/inventory/:retailerId`);
  console.log(`🔔 Notification endpoints: /api/retailer/notifications/:retailerId`);
  console.log(`📋 Order endpoints: /api/retailer/orders/:retailerId`);
  console.log(`📈 Dashboard endpoints: /api/retailer/dashboard/stats/:retailerId`);
});
