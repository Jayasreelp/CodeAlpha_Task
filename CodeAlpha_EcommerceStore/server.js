const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected!'))
  .catch(err => console.log(err));

// User Model
const User = mongoose.model('User', {
  name: String,
  email: String,
  password: String
});

// Product Model
const Product = mongoose.model('Product', {
  name: String,
  price: Number,
  description: String,
  image: String
});

// Order Model
const Order = mongoose.model('Order', {
  user: String,
  products: Array,
  total: Number,
  date: { type: Date, default: Date.now }
});

// Register
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ name, email, password: hashed });
  await user.save();
  res.json({ message: 'Registered successfully!' });
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.json({ message: 'User not found!' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.json({ message: 'Wrong password!' });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  res.json({ token, name: user.name });
});

// Get all products
app.get('/products', async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

// Add sample products (run once)
app.get('/seed', async (req, res) => {
  await Product.deleteMany();
  await Product.insertMany([
    { name: 'Laptop', price: 45000, description: 'High performance laptop', image: 'https://via.placeholder.com/200' },
    { name: 'Phone', price: 15000, description: 'Latest smartphone', image: 'https://via.placeholder.com/200' },
    { name: 'Headphones', price: 2000, description: 'Wireless headphones', image: 'https://via.placeholder.com/200' },
    { name: 'Watch', price: 3000, description: 'Smart watch', image: 'https://via.placeholder.com/200' },
    { name: 'Tablet', price: 25000, description: 'Android tablet', image: 'https://via.placeholder.com/200' },
    { name: 'Camera', price: 35000, description: 'DSLR Camera', image: 'https://via.placeholder.com/200' }
  ]);
  res.json({ message: 'Products added!' });
});

// Place order
app.post('/order', async (req, res) => {
  const { user, products, total } = req.body;
  const order = new Order({ user, products, total });
  await order.save();
  res.json({ message: 'Order placed successfully!' });
});

// Serve HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/cart', (req, res) => res.sendFile(path.join(__dirname, 'cart.html')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));