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
  password: String,
  bio: { type: String, default: 'Hello! I am using SocialApp' },
  followers: { type: Array, default: [] },
  following: { type: Array, default: [] }
});

// Post Model
const Post = mongoose.model('Post', {
  text: String,
  author: String,
  authorId: String,
  likes: { type: Array, default: [] },
  date: { type: Date, default: Date.now }
});

// Comment Model
const Comment = mongoose.model('Comment', {
  text: String,
  author: String,
  postId: String,
  date: { type: Date, default: Date.now }
});

// Register
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.json({ message: 'Email already exists!' });
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
  const token = jwt.sign({ id: user._id, name: user.name }, process.env.JWT_SECRET);
  res.json({ token, name: user.name, userId: user._id });
});

// Get all posts
app.get('/posts', async (req, res) => {
  const posts = await Post.find().sort({ date: -1 });
  const postsWithComments = await Promise.all(posts.map(async (post) => {
    const comments = await Comment.find({ postId: post._id });
    return { ...post._doc, comments };
  }));
  res.json(postsWithComments);
});

// Create post
app.post('/posts', async (req, res) => {
  const { text, author, authorId } = req.body;
  const post = new Post({ text, author, authorId });
  await post.save();
  res.json({ message: 'Post created!', post });
});

// Like post
app.post('/posts/:id/like', async (req, res) => {
  const { userId } = req.body;
  const post = await Post.findById(req.params.id);
  if (post.likes.includes(userId)) {
    post.likes = post.likes.filter(id => id !== userId);
  } else {
    post.likes.push(userId);
  }
  await post.save();
  res.json({ likes: post.likes.length });
});

// Add comment
app.post('/posts/:id/comment', async (req, res) => {
  const { text, author } = req.body;
  const comment = new Comment({ text, author, postId: req.params.id });
  await comment.save();
  res.json({ message: 'Comment added!', comment });
});

// Get user profile
app.get('/profile/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  const posts = await Post.find({ authorId: req.params.id });
  res.json({ user, posts });
});

// Follow user
app.post('/follow', async (req, res) => {
  const { userId, followId } = req.body;
  await User.findByIdAndUpdate(userId, { $push: { following: followId } });
  await User.findByIdAndUpdate(followId, { $push: { followers: userId } });
  res.json({ message: 'Followed!' });
});

// Get all users
app.get('/users', async (req, res) => {
  const users = await User.find({}, 'name _id bio');
  res.json(users);
});

// Serve pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'profile.html')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));