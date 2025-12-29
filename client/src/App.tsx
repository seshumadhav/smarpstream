import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import './App.css';
import axios from 'axios';

// Automatically determine API URL based on current location
const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  // In production, use the same hostname and port
  // In development, use localhost:5001
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;
  
  // If we're on localhost (development), use port 5001
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5001';
  }
  
  // In production, use the same hostname and protocol
  // If port 80 or 443, don't include port, otherwise use the same port
  if (port === '80' || port === '443' || !port) {
    return `${protocol}//${hostname}`;
  }
  
  return `${protocol}//${hostname}:${port}`;
};

const API_URL = getApiUrl();

// Home page component
function Home() {
  const [loading, setLoading] = useState(false);
  const [sessionLink, setSessionLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setSessionLink(null);
    try {
      const response = await axios.post(`${API_URL}/api/sessions`, {
        type: 'video' // Always video call
      });
      console.log('Session created:', response.data);
      if (response.data && response.data.sessionId) {
        const fullUrl = `${window.location.origin}/call/${response.data.sessionId}`;
        setSessionLink(fullUrl);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Error creating session:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create session';
      alert(`Failed to create session: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (sessionLink) {
      try {
        await navigator.clipboard.writeText(sessionLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        // Fallback for older browsers or if clipboard API fails
        const textArea = document.createElement('textarea');
        textArea.value = sessionLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (fallbackErr) {
          console.error('Failed to copy:', fallbackErr);
        }
        document.body.removeChild(textArea);
      }
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-heading">Smarp Stream</h1>
        <p className="page-caption">Audio and video calls made easy. Create your call link and start connecting instantly.</p>
      </div>
      
      <div className="home-content">
        <div className="card">
          <form onSubmit={createSession} className="session-form">
            <button type="submit" className="create-btn create-btn-highlighted" disabled={loading}>
              {loading ? 'Creating...' : 'Create Call'}
            </button>
          </form>
          
          <div className="session-link-container">
            {sessionLink && (
              <div className="session-link-wrapper">
                <span className="session-link-label">Your call link:</span>
                <span className="session-link-text-wrapper">
                  <a href={sessionLink} className="session-link-text">{sessionLink}</a>
                  <button
                    onClick={copyLink}
                    className="copy-link-icon-btn"
                    type="button"
                    title="Copy link"
                  >
                    {copied ? '✓' : '📋'}
                  </button>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="features">
          <div className="feature">
            <strong>Simplicity</strong>
            <p>No software to install, a simple browser is enough. No user account required.</p>
          </div>
          <div className="feature">
            <strong>Liberty</strong>
            <p>Accessible from any computer, tablet or smartphone equipped with a compatible browser.</p>
          </div>
          <div className="feature">
            <strong>Confidentiality</strong>
            <p>Your communications are protected by a mighty encryption process. We respect your personal data.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Session page component
function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }

    const fetchSession = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/call/${sessionId}`);
        setSession(response.data);
      } catch (error) {
        console.error('Error fetching session:', error);
        alert('Session not found or expired');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId, navigate]);

  if (loading) {
    return <div className="loading">Loading session...</div>;
  }

  if (!session) {
    return null;
  }

  return <SessionRoom sessionId={sessionId!} session={session} />;
}

// Confirmation Modal Component
function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void;
  title: string;
  message: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
        </div>
        <div className="modal-body">
          <p className="modal-message">{message}</p>
        </div>
        <div className="modal-footer">
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-btn modal-btn-confirm" onClick={onConfirm}>
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}

// Session Room component
function SessionRoom({ sessionId, session }: { sessionId: string; session: any }) {
  const navigate = useNavigate();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleHomeClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirm = () => {
    setShowConfirmModal(false);
    navigate('/');
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
  };

  return (
    <div className="session-room">
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title="Leave Call?"
        message="Are you sure you want to disconnect from the call and return to home?"
      />
      <div className="page-header">
        <h1 className="page-heading">
          <span className="home-link-header" onClick={handleHomeClick}>Smarp Stream</span>
        </h1>
        <p className="page-caption">Audio and video calls made easy. Create your call link and start connecting instantly.</p>
      </div>
      <div className="session-content">
        <VideoSection sessionId={sessionId} session={session} />
        <ChatSection sessionId={sessionId} />
      </div>
    </div>
  );
}

// Session Header
function SessionHeader({ session }: { session: any }) {
  const navigate = useNavigate();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleHomeClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirm = () => {
    setShowConfirmModal(false);
    navigate('/');
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
  };

  return (
    <>
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title="Leave Call?"
        message="Are you sure you want to disconnect from the call and return to home?"
      />
      <div className="session-header">
        <div className="header-content">
          <h2 className="session-title">
            <span className="home-link" onClick={handleHomeClick}>Smarp Stream</span>
            <span className="session-separator"> → </span>
            <span className="session-name">{session.title}</span>
          </h2>
        </div>
      </div>
    </>
  );
}

// Video Section
function VideoSection({ sessionId, session }: { sessionId: string; session: any }) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [peers, setPeers] = useState<Map<string, RTCPeerConnection>>(new Map());
  const peersRef = React.useRef<Map<string, RTCPeerConnection>>(new Map());
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const remoteVideosRef = React.useRef<HTMLDivElement>(null);
  const socketRef = React.useRef<any>(null);
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const userIdRef = React.useRef<string>(`user-${Date.now()}`);

  useEffect(() => {
    const socket = io(API_URL);
    socketRef.current = socket;

    const userId = userIdRef.current;
    const pcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    // Initialize local stream
    const initLocalStream = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          video: true,
          audio: true
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        // Enable audio by default, disable video by default
        stream.getVideoTracks().forEach(track => {
          track.enabled = false;
        });
        stream.getAudioTracks().forEach(track => {
          track.enabled = true; // Enable audio by default
        });
        setIsAudioEnabled(true); // Set audio state to enabled
        localStreamRef.current = stream;
        setLocalStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Failed to access camera/microphone. Please check permissions.');
      }
    };

    initLocalStream();

    // Join session
    socket.emit('join-session', { sessionId, userId });

    // Handle new user joining
    socket.on('user-joined', async ({ socketId }: { socketId: string }) => {
      if (socketId === socket.id) return;

      const pc = new RTCPeerConnection(pcConfig);
      peersRef.current.set(socketId, pc);
      setPeers(new Map(peersRef.current));

      // Add local stream tracks to peer connection
      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      }

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('Received remote track from', socketId, event.streams);
        if (event.streams && event.streams.length > 0) {
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.set(socketId, event.streams[0]);
            console.log('Updated remote streams:', Array.from(newMap.keys()));
            return newMap;
          });
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', {
            sessionId,
            candidate: event.candidate,
            targetId: socketId
          });
        }
      };

      // Create and send offer
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', {
          sessionId,
          offer,
          targetId: socketId
        });
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    });

    // Handle offer
    socket.on('offer', async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
      if (from === socket.id) return;

      const pc = new RTCPeerConnection(pcConfig);
      peersRef.current.set(from, pc);
      setPeers(new Map(peersRef.current));

      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      }

      pc.ontrack = (event) => {
        console.log('Received remote track from', from, event.streams);
        if (event.streams && event.streams.length > 0) {
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.set(from, event.streams[0]);
            console.log('Updated remote streams:', Array.from(newMap.keys()));
            return newMap;
          });
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', {
            sessionId,
            candidate: event.candidate,
            targetId: from
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', {
        sessionId,
        answer,
        targetId: from
      });
    });

    // Handle answer
    socket.on('answer', async ({ answer, from }: { answer: RTCSessionDescriptionInit; from: string }) => {
      const pc = peersRef.current.get(from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    // Handle ICE candidate
    socket.on('ice-candidate', async ({ candidate, from }: { candidate: RTCIceCandidateInit; from: string }) => {
      const pc = peersRef.current.get(from);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // Handle user left
    socket.on('user-left', ({ userId, socketId: leftSocketId }: { userId: string; socketId?: string }) => {
      console.log('User left:', userId, 'socketId:', leftSocketId);
      const socketIdToRemove = leftSocketId || userId;
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(socketIdToRemove);
        return newMap;
      });
      const pc = peersRef.current.get(socketIdToRemove);
      if (pc) {
        pc.close();
        peersRef.current.delete(socketIdToRemove);
        setPeers(new Map(peersRef.current));
      }
    });

    return () => {
      // Cleanup
      socket.emit('leave-session', { sessionId, userId });
      socket.disconnect();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      peersRef.current.forEach(pc => pc.close());
      peersRef.current.clear();
    };
  }, [sessionId]);

  // Update remote videos
  useEffect(() => {
    if (remoteVideosRef.current) {
      // Clear existing videos
      while (remoteVideosRef.current.firstChild) {
        remoteVideosRef.current.removeChild(remoteVideosRef.current.firstChild);
      }
      
      // Add new video elements for each remote stream
      remoteStreams.forEach((stream, socketId) => {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = false; // Unmute remote videos to hear audio
        video.className = 'remote-video';
        video.setAttribute('data-socket-id', socketId);
        
        // Add event listeners for debugging
        video.onloadedmetadata = () => {
          video.play().catch(err => console.error('Error playing remote video:', err));
        };
        
        remoteVideosRef.current?.appendChild(video);
      });
    }
  }, [remoteStreams]);

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  const copyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers or if clipboard API fails
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Failed to copy:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="video-section">
      <div className="video-container">
        <div className="remote-video-container">
          <div className="remote-videos" ref={remoteVideosRef}></div>
        </div>
        <div className="local-video-container">
          <div className="local-video-wrapper">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="local-video"
            />
          </div>
        </div>
      </div>
      <div className="video-controls">
        <button
          onClick={copyLink}
          className="copy-link-control-btn"
        >
          {copied ? '✓ Copied!' : '📋 Copy Link'}
        </button>
        <button
          onClick={toggleVideo}
          className={`control-btn ${!isVideoEnabled ? 'disabled' : ''}`}
          title={isVideoEnabled ? 'Turn off video' : 'Turn on video'}
        >
          {isVideoEnabled ? '🎥' : '🎥🚫'}
        </button>
        <button
          onClick={toggleAudio}
          className={`control-btn ${!isAudioEnabled ? 'disabled' : ''}`}
          title={isAudioEnabled ? 'Turn off audio' : 'Turn on audio'}
        >
          {isAudioEnabled ? '🎤' : '🎤🚫'}
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="leave-btn-control"
        >
          Leave
        </button>
      </div>
    </div>
  );
}

// Chat Section
function ChatSection({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const emojiPickerRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const userIdRef = React.useRef<string>(`user-${Date.now()}`);

  useEffect(() => {
    const newSocket = io(API_URL);
    setSocket(newSocket);

    const userId = userIdRef.current;
    newSocket.emit('join-session', { sessionId, userId });

    newSocket.on('chat-message', (data: any) => {
      setMessages(prev => [...prev, data]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !socket) return;

    // Check if message contains a URL
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = message.match(urlRegex);

    if (urls && urls.length > 0) {
      const url = urls[0];
      
      // Check if URL is an image
      const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i;
      const isImageUrl = imageExtensions.test(url);
      
      if (isImageUrl) {
        // Send as image preview
        socket.emit('chat-message', {
          sessionId,
          message,
          userId: userIdRef.current,
          type: 'image-url',
          data: { url: url }
        });
      } else {
        // Fetch link preview for HTML pages
        try {
          const previewResponse = await axios.post(`${API_URL}/api/link-preview`, {
            url: url
          });
          socket.emit('chat-message', {
            sessionId,
            message,
            userId: userIdRef.current,
            type: 'link',
            data: previewResponse.data
          });
        } catch (error) {
          // Send as regular text if preview fails
          socket.emit('chat-message', {
            sessionId,
            message,
            userId: userIdRef.current,
            type: 'text'
          });
        }
      }
    } else {
      socket.emit('chat-message', {
        sessionId,
        message,
        userId: userIdRef.current,
        type: 'text'
      });
    }

    setMessage('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socket) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      socket.emit('chat-message', {
        sessionId,
        message: '',
        userId: userIdRef.current,
        type: 'image',
        data: { url: response.data.url }
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    }
  };

  return (
    <div className="chat-section">
      <div className="chat-header">Chat</div>
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.userId === userIdRef.current ? 'own' : ''}`}>
            {msg.type === 'image' && (
              <img src={`${API_URL}${msg.data.url}`} alt="Uploaded" className="chat-image" />
            )}
            {msg.type === 'image-url' && msg.data && (
              <div className="image-url-preview">
                <img src={msg.data.url} alt="Image preview" className="chat-image" onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }} />
                <a href={msg.data.url} target="_blank" rel="noopener noreferrer" className="image-url-link">
                  {msg.data.url}
                </a>
              </div>
            )}
            {msg.type === 'link' && msg.data && (
              <a 
                href={msg.data.url}
          target="_blank"
          rel="noopener noreferrer"
                className="link-preview clickable"
              >
                {msg.data.image && (
                  <img src={msg.data.image} alt={msg.data.title} className="preview-image" />
                )}
                <div className="preview-content">
                  <div className="preview-title">
                    <strong>{msg.data.title || msg.data.url}</strong>
                  </div>
                  {msg.data.description && <p>{msg.data.description}</p>}
                  {msg.data.siteName && <span className="site-name">{msg.data.siteName}</span>}
                </div>
              </a>
            )}
            {msg.message && <div className="message-text">{msg.message}</div>}
            <div className="message-time">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form ref={formRef} onSubmit={sendMessage} className="chat-input-form">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="file-input"
          id="image-upload"
        />
        <label htmlFor="image-upload" className="upload-btn">📎</label>
        <div className="emoji-picker-container" ref={emojiPickerRef}>
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="emoji-btn"
          >
            😀
          </button>
          {showEmojiPicker && (
            <div className="emoji-picker-wrapper">
              <EmojiPicker
                onEmojiClick={onEmojiClick}
                autoFocusSearch={false}
                theme={Theme.DARK}
              />
            </div>
          )}
        </div>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          placeholder="Type a message..."
          className="chat-input"
          rows={1}
        />
        <button type="submit" className="send-btn">Send</button>
      </form>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/call/:sessionId" element={<SessionPage />} />
      </Routes>
    </Router>
  );
}

export default App;
