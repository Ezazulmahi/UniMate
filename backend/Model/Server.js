const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Atlas connected'))
.catch((err) => console.error('MongoDB connection error:', err));
// Middleware
const cors = require('cors');
app.use(cors()); // Allow all origins (for dev)


// Test route
app.get('/', (req, res) => {
  res.send('Hello from backend!');
});

// Start server
// GET /api/message
app.get('/api/message', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
