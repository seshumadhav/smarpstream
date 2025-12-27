# SmarpStream

A WebRTC-based video and audio calling application with chat, image uploads, and link previews - similar to Linkello.

## Features

- 🎥 **Video & Audio Calls**: Create video or audio-only sessions
- 💬 **Real-time Chat**: Text messaging with WebSocket
- 📷 **Image Uploads**: Share images in chat
- 🔗 **Link Previews**: Automatic preview cards for shared URLs
- 🔒 **Secure**: WebRTC encryption for peer-to-peer connections
- 🌐 **Browser-based**: No software installation required
- ⏰ **24-hour Sessions**: Links expire after 24 hours

## Tech Stack

### Backend
- Node.js + Express
- Socket.io for WebSocket signaling
- Multer for file uploads
- Cheerio for link preview parsing

### Frontend
- React + TypeScript
- Socket.io-client for real-time communication
- WebRTC API for peer-to-peer video/audio
- React Router for navigation

## Installation

1. **Install backend dependencies:**
   ```bash
   npm install
   ```

2. **Install frontend dependencies:**
   ```bash
   cd client
   npm install
   cd ..
   ```

   Or use the convenience script:
   ```bash
   npm run install-all
   ```

## Running the Application

### Development Mode

Run both backend and frontend concurrently:
```bash
npm run dev
```

Or run them separately:

**Backend (Terminal 1):**
```bash
npm run server
```

**Frontend (Terminal 2):**
```bash
npm run client
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Production Build

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Start the server:
   ```bash
   npm run server
   ```

The server will serve the built frontend from the `/client/build` directory.

## Usage

1. **Create a Session:**
   - Visit the home page
   - Choose video or audio call type
   - Enter a title for your call
   - Click "Create"

2. **Join a Session:**
   - Share the generated link with participants
   - Click the link to join the session
   - Allow camera/microphone permissions when prompted

3. **During the Call:**
   - Toggle video/audio using the control buttons
   - Send text messages in the chat
   - Upload images by clicking the camera icon
   - Share links - they'll automatically show previews

## Project Structure

```
smarpstream/
├── server/
│   ├── index.js          # Express server + Socket.io
│   └── uploads/          # Uploaded images (created automatically)
├── client/
│   ├── src/
│   │   ├── App.tsx       # Main application component
│   │   └── App.css       # Styles
│   └── public/
└── package.json
```

## API Endpoints

- `POST /api/sessions` - Create a new session
- `GET /api/sessions/:sessionId` - Get session info
- `POST /api/upload` - Upload an image
- `POST /api/link-preview` - Fetch link preview metadata

## WebSocket Events

### Client → Server
- `join-session` - Join a session
- `leave-session` - Leave a session
- `offer` - WebRTC offer
- `answer` - WebRTC answer
- `ice-candidate` - ICE candidate
- `chat-message` - Send chat message

### Server → Client
- `user-joined` - New user joined
- `user-left` - User left
- `session-joined` - Session join confirmation
- `offer` - Receive WebRTC offer
- `answer` - Receive WebRTC answer
- `ice-candidate` - Receive ICE candidate
- `chat-message` - Receive chat message

## Environment Variables

Create a `.env` file in the root directory:

```
PORT=5000
REACT_APP_API_URL=http://localhost:5000
```

## Notes

- Sessions are stored in-memory and will be lost on server restart
- For production, consider using Redis or a database for session storage
- STUN servers are used for NAT traversal (Google's public STUN servers)
- For production, you may want to add TURN servers for better connectivity
- Image uploads are limited to 10MB
- Sessions automatically expire after 24 hours

## AWS Production Deployment

### Instance Details
- **Public IPv4 Address**: 44.223.20.123
- **Public DNS**: ec2-44-223-20-123.compute-1.amazonaws.com
- **Instance Name**: smarpstream-prod
- **Security Group**: smarpstream-sg

### Access
- SSH: `ssh -i ~/.keys/smarpstream-key.pem ubuntu@44.223.20.123`
- Web: `http://44.223.20.123` or `http://ec2-44-223-20-123.compute-1.amazonaws.com`

## License

MIT

