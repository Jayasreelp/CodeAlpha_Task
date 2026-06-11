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

// Project Model
const Project = mongoose.model('Project', {
  name: String,
  description: String,
  owner: String,
  ownerId: String,
  members: { type: Array, default: [] },
  date: { type: Date, default: Date.now }
});

// Task Model
const Task = mongoose.model('Task', {
  title: String,
  description: String,
  status: { type: String, default: 'todo' },
  assignedTo: { type: String, default: 'Unassigned' },
  projectId: String,
  date: { type: Date, default: Date.now }
});

// Comment Model
const Comment = mongoose.model('Comment', {
  text: String,
  author: String,
  taskId: String,
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

// Get all projects
app.get('/projects', async (req, res) => {
  const projects = await Project.find().sort({ date: -1 });
  res.json(projects);
});

// Create project
app.post('/projects', async (req, res) => {
  const { name, description, owner, ownerId } = req.body;
  const project = new Project({ name, description, owner, ownerId });
  await project.save();
  res.json({ message: 'Project created!', project });
});

// Delete project
app.delete('/projects/:id', async (req, res) => {
  await Project.findByIdAndDelete(req.params.id);
  await Task.deleteMany({ projectId: req.params.id });
  res.json({ message: 'Project deleted!' });
});

// Get tasks by project
app.get('/tasks/:projectId', async (req, res) => {
  const tasks = await Task.find({ projectId: req.params.projectId });
  const tasksWithComments = await Promise.all(tasks.map(async (task) => {
    const comments = await Comment.find({ taskId: task._id });
    return { ...task._doc, comments };
  }));
  res.json(tasksWithComments);
});

// Create task
app.post('/tasks', async (req, res) => {
  const { title, description, projectId, assignedTo } = req.body;
  const task = new Task({ title, description, projectId, assignedTo });
  await task.save();
  res.json({ message: 'Task created!', task });
});

// Update task status
app.put('/tasks/:id', async (req, res) => {
  const { status } = req.body;
  await Task.findByIdAndUpdate(req.params.id, { status });
  res.json({ message: 'Task updated!' });
});

// Delete task
app.delete('/tasks/:id', async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.json({ message: 'Task deleted!' });
});

// Add comment to task
app.post('/tasks/:id/comment', async (req, res) => {
  const { text, author } = req.body;
  const comment = new Comment({ text, author, taskId: req.params.id });
  await comment.save();
  res.json({ message: 'Comment added!', comment });
});

// Get all users
app.get('/users', async (req, res) => {
  const users = await User.find({}, 'name _id');
  res.json(users);
});

// Serve pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/project', (req, res) => res.sendFile(path.join(__dirname, 'project.html')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));