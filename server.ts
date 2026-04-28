import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const db = new Database('amarous.db');
const JWT_SECRET = 'amarous-secret-key-123';

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    plainPassword TEXT,
    fullName TEXT,
    phone TEXT,
    role TEXT
  );
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    orderNumber TEXT UNIQUE,
    customerName TEXT,
    customerPhone TEXT,
    deliveryLocation TEXT,
    isPaid INTEGER,
    paymentMethod TEXT,
    isContacted INTEGER,
    notes TEXT,
    files TEXT,
    thumbnail TEXT,
    total REAL DEFAULT 0,
    shippingCost REAL DEFAULT 0,
    paidAmount REAL DEFAULT 0,
    productDetails TEXT,
    createdAt TEXT,
    type TEXT DEFAULT 'website'
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  CREATE TABLE IF NOT EXISTS user_activity (
    id TEXT PRIMARY KEY,
    userId TEXT,
    username TEXT,
    action TEXT,
    timestamp TEXT
  );
  CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    name TEXT,
    dataUrl TEXT,
    type TEXT,
    createdAt TEXT
  );
`);

// Migration: Add 'type' column to 'orders' if it doesn't exist
try {
  db.prepare("SELECT type FROM orders LIMIT 1").get();
} catch (e) {
  try {
    db.exec("ALTER TABLE orders ADD COLUMN type TEXT DEFAULT 'website'");
    console.log("Migration: Added 'type' column to 'orders' table");
  } catch (alterError) {
    console.error("Migration failed (type):", alterError);
  }
}

// Migration: Add 'isContacted' column to 'orders' if it doesn't exist
try {
  db.prepare("SELECT isContacted FROM orders LIMIT 1").get();
} catch (e) {
  try {
    db.exec("ALTER TABLE orders ADD COLUMN isContacted INTEGER DEFAULT 0");
    console.log("Migration: Added 'isContacted' column to 'orders' table");
  } catch (alterError) {
    console.error("Migration failed (isContacted):", alterError);
  }
}

// Migration: Add new columns if they don't exist
const migrate = () => {
  const columns = [
    { name: 'thumbnail', type: 'TEXT' },
    { name: 'total', type: 'REAL DEFAULT 0' },
    { name: 'shippingCost', type: 'REAL DEFAULT 0' },
    { name: 'paidAmount', type: 'REAL DEFAULT 0' },
    { name: 'productDetails', type: 'TEXT' },
    { name: 'paymentConfirmationImage', type: 'TEXT' },
    { name: 'isReady', type: 'INTEGER DEFAULT 0' }
  ];

  columns.forEach(col => {
    try {
      db.prepare(`SELECT ${col.name} FROM orders LIMIT 1`).get();
    } catch (e) {
      try {
        db.exec(`ALTER TABLE orders ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Migration: Added '${col.name}' column to 'orders' table`);
      } catch (alterError) {
        console.error(`Migration failed (${col.name}):`, alterError);
      }
    }
  });

  // User table migrations
  const userColumns = [
    { name: 'fullName', type: 'TEXT' },
    { name: 'phone', type: 'TEXT' },
    { name: 'plainPassword', type: 'TEXT' }
  ];

  userColumns.forEach(col => {
    try {
      db.prepare(`SELECT ${col.name} FROM users LIMIT 1`).get();
    } catch (e) {
      try {
        db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Migration: Added '${col.name}' column to 'users' table`);
      } catch (alterError) {
        console.error(`Migration failed (${col.name}):`, alterError);
      }
    }
  });
};

migrate();

// Initialize Users
const setupUsers = () => {
  const users = [
    { id: '1', username: 'bego', password: '992023', role: 'admin' },
    { id: '2', username: 'kota', password: '123', role: 'manager' },
    { id: '3', username: 'stock', password: '123', role: 'stock_keeper' }
  ];

  users.forEach(u => {
    const user: any = db.prepare('SELECT * FROM users WHERE username = ?').get(u.username);
    if (!user) {
      const hashedPassword = bcrypt.hashSync(u.password, 10);
      db.prepare('INSERT INTO users (id, username, password, plainPassword, role) VALUES (?, ?, ?, ?, ?)').run(u.id, u.username, hashedPassword, u.password, u.role);
      console.log(`User ${u.username} created with role ${u.role}`);
    } else {
      // Only update role if it changed, don't overwrite password automatically
      if (user.role !== u.role) {
        db.prepare('UPDATE users SET role = ? WHERE id = ?').run(u.role, user.id);
        console.log(`User ${u.username} role updated to ${u.role}`);
      }
      // Update plainPassword if it's missing
      if (!user.plainPassword) {
        db.prepare('UPDATE users SET plainPassword = ? WHERE id = ?').run(u.password, user.id);
      }
    }
  });
  
  // 3. Ensure default logo and background exist
  const logo: any = db.prepare('SELECT value FROM settings WHERE key = ?').get('logo');
  if (!logo) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('logo', 'https://i.ibb.co/6c2Y6y2/logo.jpg');
  }
  const background: any = db.prepare('SELECT value FROM settings WHERE key = ?').get('background');
  if (!background) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('background', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop');
  }
};
setupUsers();

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        console.error('JWT Verification Error:', err.message);
        return res.status(403).json({ message: 'Invalid or expired token' });
      }
      req.user = user;
      next();
    });
  };

  // Auth Routes
  app.post('/api/login', (req, res) => {
    const { username, password, role } = req.body;
    const user: any = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (user && bcrypt.compareSync(password, user.password)) {
      if (role && user.role !== role) {
        return res.status(401).json({ message: 'Role mismatch' });
      }
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
      
      // Record login activity
      const activityId = Math.random().toString(36).substr(2, 9);
      db.prepare('INSERT INTO user_activity (id, userId, username, action, timestamp) VALUES (?, ?, ?, ?, ?)')
        .run(activityId, user.id, user.username, 'Login', new Date().toISOString());
      
      res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  });

  app.get('/api/users', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const users = db.prepare('SELECT id, username, plainPassword, fullName, phone, role FROM users').all();
    res.json(users);
  });

  app.post('/api/users', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const { username, password, role, fullName, phone } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    const hashedPassword = bcrypt.hashSync(password, 10);
    try {
      db.prepare('INSERT INTO users (id, username, password, plainPassword, role, fullName, phone) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, username, hashedPassword, password, role, fullName, phone);
      res.status(201).json({ id, username, plainPassword: password, role, fullName, phone });
    } catch (err: any) {
      res.status(400).json({ message: 'Username already exists' });
    }
  });

  app.delete('/api/users/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const { id } = req.params;
    if (id === req.user.id) return res.status(400).json({ message: 'Cannot delete yourself' });
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.status(204).send();
  });

  app.put('/api/users/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const { id } = req.params;
    const { username, password, role, fullName, phone } = req.body;
    
    try {
      if (password) {
        const hashedPassword = bcrypt.hashSync(password, 10);
        db.prepare('UPDATE users SET username = ?, password = ?, plainPassword = ?, role = ?, fullName = ?, phone = ? WHERE id = ?').run(username, hashedPassword, password, role, fullName, phone, id);
      } else {
        db.prepare('UPDATE users SET username = ?, role = ?, fullName = ?, phone = ? WHERE id = ?').run(username, role, fullName, phone, id);
      }
      const updatedUser: any = db.prepare('SELECT id, username, plainPassword, role, fullName, phone FROM users WHERE id = ?').get(id);
      res.json(updatedUser);
    } catch (err: any) {
      res.status(400).json({ message: 'Username already exists' });
    }
  });

  app.get('/api/media', authenticateToken, (req, res) => {
    const media = db.prepare('SELECT * FROM media ORDER BY createdAt DESC').all();
    res.json(media);
  });

  app.post('/api/media', authenticateToken, (req, res) => {
    const { name, dataUrl, type } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    const createdAt = new Date().toISOString();
    db.prepare('INSERT INTO media (id, name, dataUrl, type, createdAt) VALUES (?, ?, ?, ?, ?)').run(id, name, dataUrl, type, createdAt);
    res.status(201).json({ id, name, dataUrl, type, createdAt });
  });

  app.delete('/api/media/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM media WHERE id = ?').run(id);
    res.status(204).send();
  });

  app.get('/api/activity', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const activities = db.prepare('SELECT * FROM user_activity ORDER BY timestamp DESC LIMIT 100').all();
    res.json(activities);
  });

  // API Routes (Protected)
  app.get('/api/orders', authenticateToken, (req, res) => {
    const orders = db.prepare('SELECT * FROM orders ORDER BY createdAt DESC').all();
    res.json(orders.map((o: any) => ({
      ...o,
      isPaid: Boolean(o.isPaid),
      isContacted: Boolean(o.isContacted),
      isReady: Boolean(o.isReady),
      pdfFiles: JSON.parse(o.files || '[]'),
      productDetails: JSON.parse(o.productDetails || '[]'),
      thumbnail: o.thumbnail,
      paymentConfirmationImage: o.paymentConfirmationImage,
      type: o.type || 'website'
    })));
  });

  app.post('/api/orders', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const order = req.body;
    try {
      const orderNumber = (order.orderNumber || '').toString().trim();
      
      // Check for duplicate order number
      const existing = db.prepare('SELECT id FROM orders WHERE LOWER(TRIM(orderNumber)) = LOWER(?)').get(orderNumber);
      if (existing) {
        return res.status(400).json({ message: 'رقم الفاتورة موجود بالفعل' });
      }

      // Automatic isPaid logic
      const total = Number(order.total) || 0;
      const paidAmount = Number(order.paidAmount) || 0;
      const isPaid = paidAmount >= total ? 1 : 0;

      const stmt = db.prepare(`
        INSERT INTO orders (id, orderNumber, customerName, customerPhone, deliveryLocation, isPaid, paymentMethod, isContacted, notes, files, thumbnail, total, shippingCost, paidAmount, productDetails, createdAt, type, isReady, paymentConfirmationImage)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        order.id,
        orderNumber,
        order.customerName,
        order.customerPhone,
        order.deliveryLocation,
        isPaid,
        order.paymentMethod,
        order.isContacted ? 1 : 0,
        order.notes,
        JSON.stringify(order.pdfFiles || []),
        order.thumbnail || null,
        total,
        order.shippingCost || 0,
        paidAmount,
        JSON.stringify(order.productDetails || []),
        order.createdAt || new Date().toISOString(),
        order.type || 'website',
        order.isReady ? 1 : 0,
        order.paymentConfirmationImage || null
      );
      
      const newOrder = { ...order, isPaid: Boolean(isPaid), isContacted: Boolean(order.isContacted), isReady: Boolean(order.isReady) };
      io.emit('order:created', newOrder);
      res.status(201).json(newOrder);
    } catch (err: any) {
      console.error('Database error during order creation:', err);
      res.status(500).json({ message: err.message || 'Failed to save order to database' });
    }
  });

  app.put('/api/orders/:id', authenticateToken, (req: any, res) => {
    const { id } = req.params;
    const order = req.body;
    if (req.user.role !== 'admin' && req.user.role !== 'stock_keeper') return res.status(403).json({ message: 'Forbidden' });
    
    try {
      const orderNumber = (order.orderNumber || '').toString().trim();

      // Check for duplicate order number (excluding current order)
      const existing = db.prepare('SELECT id FROM orders WHERE LOWER(TRIM(orderNumber)) = LOWER(?) AND id != ?').get(orderNumber, id);
      if (existing) {
        return res.status(400).json({ message: 'رقم الفاتورة موجود بالفعل' });
      }

      // Automatic isPaid logic
      const total = Number(order.total) || 0;
      const paidAmount = Number(order.paidAmount) || 0;
      const isPaid = paidAmount >= total ? 1 : 0;

      if (req.user.role === 'admin') {
        db.prepare(`
          UPDATE orders SET 
            orderNumber = ?, customerName = ?, customerPhone = ?, deliveryLocation = ?, 
            isPaid = ?, paymentMethod = ?, isContacted = ?, notes = ?, files = ?, 
            thumbnail = ?, total = ?, shippingCost = ?, paidAmount = ?, 
            productDetails = ?, type = ?, isReady = ?, paymentConfirmationImage = ?
          WHERE id = ?
        `).run(
          orderNumber, order.customerName, order.customerPhone, order.deliveryLocation, 
          isPaid, order.paymentMethod, order.isContacted ? 1 : 0, order.notes, JSON.stringify(order.pdfFiles || []), 
          order.thumbnail, total, Number(order.shippingCost) || 0, paidAmount, JSON.stringify(order.productDetails || []), 
          order.type, order.isReady ? 1 : 0, order.paymentConfirmationImage || null, id
        );
      } else if (req.user.role === 'stock_keeper') {
        db.prepare(`
          UPDATE orders SET productDetails = ?, isReady = ? WHERE id = ?
        `).run(JSON.stringify(order.productDetails || []), order.isReady ? 1 : 0, id);
      }
      
      const updatedOrder = { ...order, isPaid: Boolean(isPaid), isContacted: Boolean(order.isContacted), isReady: Boolean(order.isReady) };
      io.emit('order:updated', updatedOrder);
      res.json(updatedOrder);
    } catch (err: any) {
      console.error('Database error during order update:', err);
      res.status(500).json({ message: err.message || 'Failed to update order' });
    }
  });

  app.patch('/api/orders/:id/status', authenticateToken, (req: any, res) => {
    const { id } = req.params;
    const { isPaid, isContacted, isReady } = req.body;
    
    try {
      if (isPaid !== undefined) {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
        if (isPaid) {
          // If marked as paid, set paidAmount to total
          db.prepare('UPDATE orders SET isPaid = 1, paidAmount = total WHERE id = ?').run(id);
        } else {
          // If marked as unpaid, set paidAmount to 0
          db.prepare('UPDATE orders SET isPaid = 0, paidAmount = 0 WHERE id = ?').run(id);
        }
      }
      if (isContacted !== undefined) {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
        db.prepare('UPDATE orders SET isContacted = ? WHERE id = ?').run(isContacted ? 1 : 0, id);
      }
      if (isReady !== undefined) {
        if (req.user.role !== 'admin' && req.user.role !== 'stock_keeper') return res.status(403).json({ message: 'Forbidden' });
        db.prepare('UPDATE orders SET isReady = ? WHERE id = ?').run(isReady ? 1 : 0, id);
      }
      
      const order: any = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
      if (!order) return res.status(404).json({ message: 'Order not found' });
      
      const formattedOrder = {
        ...order,
        isPaid: Boolean(order.isPaid),
        isContacted: Boolean(order.isContacted),
        isReady: Boolean(order.isReady),
        pdfFiles: JSON.parse(order.files || '[]'),
        productDetails: JSON.parse(order.productDetails || '[]'),
        thumbnail: order.thumbnail,
        paymentConfirmationImage: order.paymentConfirmationImage
      };
      
      io.emit('order:updated', formattedOrder);
      res.json(formattedOrder);
    } catch (err: any) {
      console.error('Database error during status update:', err);
      res.status(500).json({ message: err.message || 'Failed to update status' });
    }
  });

  app.delete('/api/orders/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM orders WHERE id = ?').run(id);
    io.emit('order:deleted', id);
    res.status(204).send();
  });

  app.get('/api/settings/logo', (req, res) => {
    const row: any = db.prepare('SELECT value FROM settings WHERE key = ?').get('logo');
    res.json({ logo: row ? row.value : null });
  });

  app.post('/api/settings/logo', authenticateToken, (req, res) => {
    const { logo } = req.body;
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('logo', logo);
    io.emit('logo:updated', logo);
    res.json({ success: true });
  });

  app.get('/api/settings/background', (req, res) => {
    const row: any = db.prepare('SELECT value FROM settings WHERE key = ?').get('background');
    res.json({ background: row ? row.value : null });
  });

  app.post('/api/settings/background', authenticateToken, (req, res) => {
    const { background } = req.body;
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('background', background);
    io.emit('background:updated', background);
    res.json({ success: true });
  });

  // Catch-all for unmatched API routes
  app.all('/api/*', (req, res) => {
    res.status(404).json({ message: `API route not found: ${req.method} ${req.url}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  const PORT = 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
