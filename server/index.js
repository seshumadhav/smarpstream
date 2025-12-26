const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

// Catchy word lists for generating session IDs
const adjectives = [
  'Swift', 'Bright', 'Sharp', 'Bold', 'Quick', 'Smart', 'Fast', 'Cool',
  'Fresh', 'Prime', 'Elite', 'Noble', 'Royal', 'Grand', 'Super', 'Ultra',
  'Mega', 'Turbo', 'Flash', 'Blaze', 'Storm', 'Thunder', 'Lightning', 'Rocket',
  'Apex', 'Peak', 'Summit', 'Zenith', 'Crown', 'Star', 'Nova', 'Cosmic',
  'Epic', 'Legend', 'Mythic', 'Divine', 'Sacred', 'Ancient', 'Eternal', 'Infinite'
];

const nouns = [
  'Tiger', 'Eagle', 'Shark', 'Lion', 'Wolf', 'Bear', 'Falcon', 'Hawk',
  'Phoenix', 'Dragon', 'Jaguar', 'Panther', 'Leopard', 'Cobra', 'Viper',
  'Arrow', 'Blade', 'Sword', 'Shield', 'Crown', 'Star', 'Moon', 'Sun',
  'Comet', 'Asteroid', 'Nebula', 'Galaxy', 'Orbit', 'Nova', 'Pulse', 'Wave',
  'Vortex', 'Quantum', 'Matrix', 'Nexus', 'Prism', 'Crystal', 'Oracle', 'Sage'
];

// Single long catchy words
const longWords = [
  'Thunderbolt', 'Lightning', 'Firestorm', 'Blizzard', 'Hurricane', 'Tornado',
  'Avalanche', 'Volcano', 'Tsunami', 'Earthquake', 'Supernova', 'Blackhole',
  'MilkyWay', 'Andromeda', 'Constellation', 'Meteorite', 'Asteroid', 'Comet',
  'Phantom', 'Shadow', 'Mystic', 'Enigma', 'Riddle', 'Puzzle', 'Cipher',
  'Vortex', 'Quantum', 'Matrix', 'Nexus', 'Prism', 'Crystal', 'Oracle',
  'Sage', 'Wizard', 'Sorcerer', 'Mage', 'Warlock', 'Druid', 'Shaman'
];

// Generate catchy session ID (2 words or 1 long word)
function generateSessionId() {
  // 70% chance of two words, 30% chance of one long word
  if (Math.random() < 0.7) {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj}${noun}`;
  } else {
    return longWords[Math.floor(Math.random() * longWords.length)];
  }
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// In-memory session store (can be replaced with Redis/database)
const sessions = new Map();

// Create a new session
app.post('/api/sessions', (req, res) => {
  try {
    const { type } = req.body;
    let sessionId = generateSessionId();
    
    // Ensure uniqueness (very unlikely collision, but just in case)
    while (sessions.has(sessionId)) {
      sessionId = generateSessionId();
    }
    
    const session = {
      id: sessionId,
      title: sessionId, // Use the catchy ID as title
      type: type || 'video', // 'video' or 'audio'
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      participants: []
    };
    
    sessions.set(sessionId, session);
    console.log(`Created session: ${sessionId}`);
    res.json({ sessionId, url: `/call/${sessionId}` });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get session info
app.get('/api/call/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  if (new Date() > session.expiresAt) {
    sessions.delete(sessionId);
    return res.status(404).json({ error: 'Session expired' });
  }
  
  res.json(session);
});

// Upload image
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.filename });
});

// Fetch link preview
app.post('/api/link-preview', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const preview = {
      url: url,
      title: $('meta[property="og:title"]').attr('content') || $('title').text() || '',
      description: $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '',
      image: $('meta[property="og:image"]').attr('content') || '',
      siteName: $('meta[property="og:site_name"]').attr('content') || ''
    };
    
    res.json(preview);
  } catch (error) {
    console.error('Error fetching link preview:', error);
    res.status(500).json({ error: 'Failed to fetch link preview' });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Join a session
  socket.on('join-session', ({ sessionId, userId }) => {
    const session = sessions.get(sessionId);
    if (!session) {
      socket.emit('error', { message: 'Session not found' });
      return;
    }
    
    socket.join(sessionId);
    if (!session.participants.includes(userId)) {
      session.participants.push(userId);
    }
    
    // Notify others in the session
    socket.to(sessionId).emit('user-joined', { userId, socketId: socket.id });
    
    // Send list of existing participants
    socket.emit('session-joined', {
      sessionId,
      participants: session.participants.filter(p => p !== userId)
    });
  });
  
  // WebRTC signaling
  socket.on('offer', ({ sessionId, offer, targetId }) => {
    socket.to(sessionId).emit('offer', { offer, from: socket.id, targetId });
  });
  
  socket.on('answer', ({ sessionId, answer, targetId }) => {
    socket.to(sessionId).emit('answer', { answer, from: socket.id, targetId });
  });
  
  socket.on('ice-candidate', ({ sessionId, candidate, targetId }) => {
    socket.to(sessionId).emit('ice-candidate', { candidate, from: socket.id, targetId });
  });
  
  // Chat messages
  socket.on('chat-message', ({ sessionId, message, userId, type, data }) => {
    io.to(sessionId).emit('chat-message', {
      message,
      userId,
      type, // 'text', 'image', 'link'
      data,
      timestamp: new Date().toISOString()
    });
  });
  
  // Leave session
  socket.on('leave-session', ({ sessionId, userId }) => {
    socket.leave(sessionId);
    const session = sessions.get(sessionId);
    if (session) {
      session.participants = session.participants.filter(p => p !== userId);
      socket.to(sessionId).emit('user-left', { userId });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Clean up expired sessions periodically
setInterval(() => {
  const now = new Date();
  for (const [sessionId, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(sessionId);
      console.log(`Deleted expired session: ${sessionId}`);
    }
  }
}, 60 * 60 * 1000); // Check every hour

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Create uploads directory if it doesn't exist
  const fs = require('fs');
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
});

