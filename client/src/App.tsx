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

// Format timestamp to PT timezone
const formatDeploymentTime = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.toLocaleString('en-US', { 
        timeZone: 'America/Los_Angeles',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).replace(',', '') + ' PT';
    }
  } catch (e) {
    console.error('Error parsing timestamp:', e);
  }
  // Fallback
  const now = new Date();
  return now.toLocaleString('en-US', { 
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(',', '') + ' PT';
};

// Home page component
function Home() {
  const [loading, setLoading] = useState(false);
  const [sessionLink, setSessionLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deploymentTime, setDeploymentTime] = useState<string>('Loading...');
  
  // Fetch deployment time from server (for production) or use build time
  useEffect(() => {
    const fetchDeploymentTime = async () => {
      // In production, fetch from server
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        try {
          const response = await axios.get(`${API_URL}/api/deployment-time`);
          if (response.data && response.data.deploymentTime) {
            setDeploymentTime(formatDeploymentTime(response.data.deploymentTime));
            return;
          }
        } catch (error) {
          console.error('Failed to fetch deployment time:', error);
        }
      }
      
      // Fallback: use build time if available, otherwise current time
      if (process.env.REACT_APP_BUILD_TIME) {
        setDeploymentTime(formatDeploymentTime(process.env.REACT_APP_BUILD_TIME));
      } else {
        // Local dev: update every minute
        const updateTime = () => {
          setDeploymentTime(formatDeploymentTime(new Date().toISOString()));
        };
        updateTime();
        const interval = setInterval(updateTime, 60000); // Update every minute
        return () => clearInterval(interval);
      }
    };
    
    fetchDeploymentTime();
  }, []);

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
      <div className="deployment-info">Last deployed: {deploymentTime}</div>
      <div className="page-header">
        <h1 className="page-heading">Smarp Stream</h1>
        <p className="page-caption">Audio/Video and Text chatting made easy. Just click the 'Start Session' link and start connecting instantly.</p>
      </div>
      
      <div className="home-content">
        <div className="card">
          <form onSubmit={createSession} className="session-form">
            <button type="submit" className="create-btn create-btn-highlighted" disabled={loading}>
              {loading ? 'Creating...' : 'Start Session'}
            </button>
          </form>
          
            <div className="session-link-container">
            {sessionLink && (
              <div className="session-link-wrapper">
                <span className="session-link-label">Your session link:</span>
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
  const [videoMinimized, setVideoMinimized] = useState(false);
  const [videoMaximized, setVideoMaximized] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [chatMaximized, setChatMaximized] = useState(false);

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

  const handleViewChange = (view: 'video' | 'chat' | 'split') => {
    if (view === 'video') {
      setVideoMaximized(true);
      setVideoMinimized(false);
      setChatMinimized(true);
      setChatMaximized(false);
    } else if (view === 'chat') {
      setChatMaximized(true);
      setChatMinimized(false);
      setVideoMinimized(true);
      setVideoMaximized(false);
    } else { // split
      setVideoMinimized(false);
      setVideoMaximized(false);
      setChatMinimized(false);
      setChatMaximized(false);
    }
  };

  // Keep old handlers for backward compatibility with panel controls
  const handleVideoMinimize = () => handleViewChange('chat');
  const handleVideoMaximize = () => handleViewChange('video');
  const handleVideoRestore = () => handleViewChange('split');
  const handleChatMinimize = () => handleViewChange('video');
  const handleChatMaximize = () => handleViewChange('chat');
  const handleChatRestore = () => handleViewChange('split');

  return (
    <div className="session-room">
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title="Leave Call?"
        message="Sure you want to disconnect the call and return to home?"
      />
      <div className="page-header">
        <div className="header-content-wrapper">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
            <h1 className="page-heading">Smarp Stream</h1>
            <button 
              onClick={handleHomeClick}
              className="back-button"
              title="Go back to home"
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5"></path>
                <path d="M12 19l-7-7 7-7"></path>
              </svg>
            </button>
      </div>
          <div className="view-control-panel-above-chat-header">
            <button
              onClick={() => handleViewChange('video')}
              className={`view-control-btn ${videoMaximized && !chatMaximized ? 'active' : ''}`}
              title="Video View"
              type="button"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 7l-7 5 7 5V7z"></path>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
            </button>
            <button
              onClick={() => handleViewChange('split')}
              className={`view-control-btn ${!videoMaximized && !chatMaximized && !videoMinimized && !chatMinimized ? 'active' : ''}`}
              title="Split View"
              type="button"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="9" height="18" rx="1"></rect>
                <rect x="12" y="3" width="9" height="18" rx="1"></rect>
              </svg>
            </button>
            <button
              onClick={() => handleViewChange('chat')}
              className={`view-control-btn ${chatMaximized && !videoMaximized ? 'active' : ''}`}
              title="Chat View"
              type="button"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div className={`session-content ${videoMaximized ? 'video-maximized' : ''} ${chatMaximized ? 'chat-maximized' : ''} ${videoMinimized ? 'video-minimized' : ''} ${chatMinimized ? 'chat-minimized' : ''}`}>
        <VideoSection 
          sessionId={sessionId} 
          session={session}
          minimized={videoMinimized}
          maximized={videoMaximized}
          onMinimize={handleVideoMinimize}
          onMaximize={handleVideoMaximize}
          onRestore={handleVideoRestore}
          otherPanelMinimized={chatMinimized}
          onRestoreOtherPanel={handleChatRestore}
          onDisconnect={handleHomeClick}
        />
        <div className="chat-section-wrapper">
          <ChatSection 
            sessionId={sessionId}
            minimized={chatMinimized}
            maximized={chatMaximized}
            onMinimize={handleChatMinimize}
            onMaximize={handleChatMaximize}
            onRestore={handleChatRestore}
            otherPanelMinimized={videoMinimized}
            onRestoreOtherPanel={handleVideoRestore}
          />
        </div>
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
        message="Sure you want to disconnect the call and return to home?"
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

// Helper function to play sound using Web Audio API
const playSound = (frequency: number, duration: number, type: 'sine' | 'square' = 'sine') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    console.error('Error playing sound:', error);
  }
};

// Play join sound (higher pitch, ascending)
const playJoinSound = () => {
  playSound(800, 0.1, 'sine');
  setTimeout(() => playSound(1000, 0.1, 'sine'), 50);
};

// Play leave sound (lower pitch, descending)
const playLeaveSound = () => {
  playSound(600, 0.15, 'square');
  setTimeout(() => playSound(400, 0.15, 'square'), 80);
};


// Video Section
function VideoSection({ 
  sessionId, 
  session,
  minimized,
  maximized,
  onMinimize,
  onMaximize,
  onRestore,
  otherPanelMinimized,
  onRestoreOtherPanel,
  onDisconnect
}: { 
  sessionId: string; 
  session: any;
  minimized: boolean;
  maximized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onRestore: () => void;
  otherPanelMinimized: boolean;
  onRestoreOtherPanel: () => void;
  onDisconnect: () => void;
}) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [peers, setPeers] = useState<Map<string, RTCPeerConnection>>(new Map());
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [remoteAudioLevels, setRemoteAudioLevels] = useState<Map<string, number>>(new Map());
  const peersRef = React.useRef<Map<string, RTCPeerConnection>>(new Map());
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const remoteVideosRef = React.useRef<HTMLDivElement>(null);
  const socketRef = React.useRef<any>(null);
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);
  const userIdRef = React.useRef<string>(`user-${Date.now()}`);
  const userIdToSocketIdRef = React.useRef<Map<string, string>>(new Map());
  const lastSoundTimeRef = React.useRef<{ type: string; time: number }>({ type: '', time: 0 });
  // Perfect Negotiation pattern: track if we're making an offer
  const makingOfferRef = React.useRef<Map<string, boolean>>(new Map());
  // Track ICE restart attempts to prevent infinite loops
  const iceRestartAttemptsRef = React.useRef<Map<string, number>>(new Map());
  const initLocalStreamRef = React.useRef<(() => Promise<void>) | null>(null);

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
        // IMPORTANT: Keep tracks enabled initially so they're included in SDP negotiation
        // We'll disable them AFTER adding to peer connections
        setIsAudioEnabled(false); // Set audio state to disabled
        setIsVideoEnabled(false); // Set video state to disabled
        localStreamRef.current = stream;
        setLocalStream(stream);
        
        // Disable video track by default
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = false;
        }
        
        // Disable audio track by default
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = false;
        }
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.style.display = 'none'; // Hide video by default
        }
        
        // Setup audio level monitoring
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          audioContextRef.current = audioContext;
          
          // Resume audio context if suspended (required by some browsers)
          if (audioContext.state === 'suspended') {
            audioContext.resume().catch(err => {
              console.error('Error resuming audio context:', err);
            });
          }
          
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.3; // Lower smoothing for more responsive updates
          analyserRef.current = analyser;
          
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);
          
          // Start monitoring audio levels
          const monitorAudioLevel = () => {
            if (!analyserRef.current) return;
            
            // Use time domain data for more accurate amplitude representation
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteTimeDomainData(dataArray);
            
            // Calculate RMS (Root Mean Square) for accurate volume measurement
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              const normalized = (dataArray[i] - 128) / 128; // Normalize to -1 to 1
              sum += normalized * normalized;
            }
            const rms = Math.sqrt(sum / dataArray.length);
            
            // Convert to logarithmic scale (decibels) for better human perception
            // Then normalize to 0-100 range with better sensitivity
            const db = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
            // Map from typical range (-60dB to 0dB) to 0-100
            // Only show fill if audio is above threshold (around -50dB or higher)
            let normalizedLevel = 0;
            if (db > -50) {
              // Map from -50dB to 0dB range to 0-100
              normalizedLevel = Math.max(0, Math.min(100, ((db + 50) / 50) * 100));
              // Amplify for better visibility - multiply by 2.5 to make changes more noticeable
              normalizedLevel = Math.min(100, normalizedLevel * 2.5);
            } else {
              // Below threshold - no fill
              normalizedLevel = 0;
            }
            
            // Check if audio track is still active, if not, try to recover
            const audioTrack = localStreamRef.current?.getAudioTracks()[0];
            if (audioTrack && audioTrack.readyState === 'ended' && isAudioEnabled) {
              console.warn('Audio track ended unexpectedly during monitoring, attempting recovery...');
              // Try to reinitialize the stream
              if (initLocalStreamRef.current) {
                initLocalStreamRef.current();
              }
              return;
            }
            
            setLocalAudioLevel(normalizedLevel);
            
            // Send audio level to other users
            if (socketRef.current) {
              socketRef.current.emit('audio-level', { sessionId, level: normalizedLevel, userId });
            }
            
            animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
          };
          
          // Start monitoring immediately - it works even when track is disabled
          monitorAudioLevel();
        } catch (error) {
          console.error('Error setting up audio level monitoring:', error);
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Failed to access camera/microphone. Please check permissions.');
      }
    };
    
    // Store initLocalStream in ref so it can be accessed from other functions
    initLocalStreamRef.current = initLocalStream;

    initLocalStream();

    // Join session
    socket.emit('join-session', { sessionId, userId });

    // Handle new user joining
    socket.on('user-joined', async ({ socketId, userId: joinedUserId }: { socketId: string; userId?: string }) => {
      if (socketId === socket.id) return;
      
      console.log('User joined:', socketId, 'userId:', joinedUserId);
      
      // Check if this is a reconnection (user with same userId but different socketId)
      if (joinedUserId) {
        const existingSocketId = userIdToSocketIdRef.current.get(joinedUserId);
        if (existingSocketId && existingSocketId !== socketId) {
          console.log('User reconnected with new socketId:', socketId, 'old socketId:', existingSocketId);
          // Clean up old connection
          const oldPc = peersRef.current.get(existingSocketId);
          if (oldPc) {
            oldPc.getSenders().forEach(sender => {
              if (sender.track) {
                sender.track.stop();
              }
            });
            oldPc.close();
            peersRef.current.delete(existingSocketId);
            setPeers(new Map(peersRef.current));
          }
          // Clean up old stream
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            const oldStream = newMap.get(existingSocketId);
            if (oldStream) {
              oldStream.getTracks().forEach(track => {
                track.stop();
              });
            }
            newMap.delete(existingSocketId);
            return newMap;
          });
          // Clean up old video element
          if (remoteVideosRef.current) {
            const oldVideo = remoteVideosRef.current.querySelector(`[data-socket-id="${existingSocketId}"]`) as HTMLVideoElement;
            if (oldVideo) {
              if (oldVideo.srcObject instanceof MediaStream) {
                oldVideo.srcObject.getTracks().forEach(track => {
                  track.stop();
                });
              }
              oldVideo.srcObject = null;
              oldVideo.remove();
            }
          }
          // Clean up refs
          makingOfferRef.current.delete(existingSocketId);
          iceRestartAttemptsRef.current.delete(existingSocketId);
        }
        // Update userId to socketId mapping
        userIdToSocketIdRef.current.set(joinedUserId, socketId);
      }
      
      // Play join sound locally (when someone else joins)
      playJoinSound();

      const pc = new RTCPeerConnection(pcConfig);
      peersRef.current.set(socketId, pc);
      setPeers(new Map(peersRef.current));

      // Add local stream tracks to peer connection
      // CRITICAL: Add tracks ENABLED - they must be in the SDP for negotiation
      // We control mute/unmute via track.enabled property, but tracks must exist in connection
      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach(track => {
          // Add track enabled - this ensures it's included in SDP
          pc.addTrack(track, stream);
          console.log('Added track to peer connection:', track.kind, 'track.enabled:', track.enabled, 'socketId:', socketId);
        });
      }
      
      // Perfect Negotiation: Handle negotiation needed
      makingOfferRef.current.set(socketId, false);
      pc.onnegotiationneeded = async () => {
        const makingOffer = makingOfferRef.current.get(socketId);
        if (makingOffer) {
          console.log('Already making offer for:', socketId);
          return;
        }
        
        try {
          makingOfferRef.current.set(socketId, true);
          console.log('Negotiation needed for:', socketId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', {
            sessionId,
            offer,
            targetId: socketId
          });
          console.log('Negotiation offer sent to:', socketId);
        } catch (err) {
          console.error('Error in negotiation needed:', err);
        } finally {
          makingOfferRef.current.set(socketId, false);
        }
      };

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('=== RECEIVED REMOTE TRACK (USER-JOINED) ===');
        console.log('From socketId:', socketId);
        console.log('Track kind:', event.track.kind);
        console.log('Track enabled:', event.track.enabled);
        console.log('Track ID:', event.track.id);
        console.log('Track readyState:', event.track.readyState);
        console.log('Streams:', event.streams);
        
        if (event.streams && event.streams.length > 0) {
          const stream = event.streams[0];
          console.log('Stream ID:', stream.id);
          console.log('Stream tracks:', stream.getTracks().map(t => ({ 
            kind: t.kind, 
            enabled: t.enabled, 
            id: t.id,
            readyState: t.readyState
          })));
          
          // Check if tracks are active
          const activeTracks = stream.getTracks().filter(track => track.readyState === 'live');
          if (activeTracks.length === 0) {
            console.warn('No active tracks in stream for socketId:', socketId);
            return;
          }
          
          // Enable all remote tracks by default so we can see/hear them
          stream.getTracks().forEach(track => {
            if (track.readyState === 'live') {
              track.enabled = true;
              console.log('Enabled remote track:', track.kind, track.id, 'socketId:', socketId);
              
              // For audio tracks, ensure they're not muted
              if (track.kind === 'audio') {
                console.log('Audio track enabled for socketId:', socketId, 'track ID:', track.id);
              }
            } else {
              console.warn('Track not live, skipping enable:', track.kind, track.id, 'readyState:', track.readyState, 'socketId:', socketId);
            }
          });
          
          // Log audio track status
          const audioTracks = stream.getAudioTracks();
          const videoTracks = stream.getVideoTracks();
          console.log('Stream tracks summary for socketId:', socketId, {
            audioTracks: audioTracks.length,
            videoTracks: videoTracks.length,
            audioEnabled: audioTracks.filter(t => t.enabled).length,
            videoEnabled: videoTracks.filter(t => t.enabled).length
          });
          
          // Replace existing stream for this socketId (handles reconnection)
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            // Stop old stream tracks if they exist
            const oldStream = newMap.get(socketId);
            if (oldStream && oldStream !== stream) {
              oldStream.getTracks().forEach(track => {
                track.stop();
              });
            }
            newMap.set(socketId, stream);
            console.log('Updated remote streams map. Keys:', Array.from(newMap.keys()));
            return newMap;
          });
        } else {
          console.warn('No streams in ontrack event (user-joined)!');
        }
      };
      
      // Add connection state logging
      pc.onconnectionstatechange = () => {
        console.log('Peer connection state:', socketId, pc.connectionState);
        if (pc.connectionState === 'failed') {
          const attempts = iceRestartAttemptsRef.current.get(socketId) || 0;
          if (attempts < 3) {
            console.error('Peer connection failed for:', socketId, '- attempting to restart ICE (attempt', attempts + 1, ')');
            iceRestartAttemptsRef.current.set(socketId, attempts + 1);
            // Try to recover by restarting ICE
            (async () => {
              try {
                const offer = await pc.createOffer({ iceRestart: true });
                await pc.setLocalDescription(offer);
                socket.emit('offer', {
                  sessionId,
                  offer,
                  targetId: socketId
                });
                console.log('ICE restart offer sent for:', socketId);
              } catch (err) {
                console.error('Error restarting ICE:', err);
              }
            })();
          } else {
            console.error('Peer connection failed for:', socketId, '- max restart attempts reached, giving up');
          }
        } else if (pc.connectionState === 'connected') {
          // Reset restart attempts on successful connection
          iceRestartAttemptsRef.current.set(socketId, 0);
        } else if (pc.connectionState === 'disconnected') {
          console.log('Peer connection disconnected:', socketId);
        }
      };
      
      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', socketId, pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') {
          const attempts = iceRestartAttemptsRef.current.get(socketId) || 0;
          if (attempts < 3) {
            console.error('ICE connection failed for:', socketId, '- attempting to restart ICE (attempt', attempts + 1, ')');
            iceRestartAttemptsRef.current.set(socketId, attempts + 1);
            // Try to recover by restarting ICE
            (async () => {
              try {
                const offer = await pc.createOffer({ iceRestart: true });
                await pc.setLocalDescription(offer);
                socket.emit('offer', {
                  sessionId,
                  offer,
                  targetId: socketId
                });
                console.log('ICE restart offer sent (ICE failed) for:', socketId);
              } catch (err) {
                console.error('Error restarting ICE (ICE failed):', err);
              }
            })();
          } else {
            console.error('ICE connection failed for:', socketId, '- max restart attempts reached, giving up');
          }
        } else if (pc.iceConnectionState === 'connected') {
          // Reset restart attempts on successful connection
          iceRestartAttemptsRef.current.set(socketId, 0);
        }
      };
      
      pc.onicegatheringstatechange = () => {
        console.log('ICE gathering state:', socketId, pc.iceGatheringState);
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

      // Create and send initial offer
      try {
        makingOfferRef.current.set(socketId, true);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', {
          sessionId,
          offer,
          targetId: socketId
        });
        console.log('Initial offer sent to:', socketId);
        makingOfferRef.current.set(socketId, false);
      } catch (error) {
        console.error('Error creating initial offer:', error);
        makingOfferRef.current.set(socketId, false);
      }
    });

    // Handle offer
    socket.on('offer', async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
      if (from === socket.id) return;

      // Check if peer connection already exists (renegotiation) or create new one
      let pc = peersRef.current.get(from);
      const isRenegotiation = !!pc;

      if (!pc) {
        // Create new peer connection
        pc = new RTCPeerConnection(pcConfig);
      peersRef.current.set(from, pc);
      setPeers(new Map(peersRef.current));

      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach(track => {
            // Ensure track is enabled when adding to peer connection (for SDP negotiation)
            const wasEnabled = track.enabled;
            track.enabled = true;
            pc!.addTrack(track, stream);
            // Now disable if user hasn't enabled it yet
            if (!isAudioEnabled && track.kind === 'audio') {
              track.enabled = false;
            }
            if (!isVideoEnabled && track.kind === 'video') {
              track.enabled = false;
            }
            console.log('Added track to peer connection (offer handler):', track.kind, 'track.enabled:', track.enabled, 'from:', from);
          });
        }
        
        // Perfect Negotiation: Handle negotiation needed
        makingOfferRef.current.set(from, false);
        const peerConnForNegotiation = pc; // Capture for closure
        peerConnForNegotiation.onnegotiationneeded = async () => {
          const makingOffer = makingOfferRef.current.get(from);
          if (makingOffer) {
            console.log('Already making offer for:', from);
            return;
          }
          
          try {
            makingOfferRef.current.set(from, true);
            console.log('Negotiation needed for:', from);
            const offer = await peerConnForNegotiation.createOffer();
            await peerConnForNegotiation.setLocalDescription(offer);
            socket.emit('offer', {
              sessionId,
              offer,
              targetId: from
            });
            console.log('Negotiation offer sent to:', from);
          } catch (err) {
            console.error('Error in negotiation needed:', err);
          } finally {
            makingOfferRef.current.set(from, false);
          }
        };

        const peerConnection = pc; // Capture for event handlers
        peerConnection.ontrack = (event) => {
          console.log('=== RECEIVED REMOTE TRACK (OFFER HANDLER) ===');
          console.log('From socketId:', from);
          console.log('Track kind:', event.track.kind);
          console.log('Track enabled:', event.track.enabled);
          console.log('Track ID:', event.track.id);
          console.log('Streams:', event.streams);
          
          if (event.streams && event.streams.length > 0) {
            const stream = event.streams[0];
            console.log('Stream ID:', stream.id);
            console.log('Stream tracks:', stream.getTracks().map(t => ({ 
              kind: t.kind, 
              enabled: t.enabled, 
              id: t.id,
              readyState: t.readyState
            })));
            
            // Enable all remote tracks by default so we can see/hear them
            stream.getTracks().forEach(track => {
              track.enabled = true;
              console.log('Enabled remote track:', track.kind, track.id);
            });
            
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
              newMap.set(from, stream);
              console.log('Updated remote streams map. Keys:', Array.from(newMap.keys()));
          return newMap;
        });
          } else {
            console.warn('No streams in ontrack event (offer handler)!');
          }
        };
        
        // Add connection state logging with retry limit
        peerConnection.onconnectionstatechange = () => {
          console.log('Peer connection state:', from, peerConnection.connectionState);
          if (peerConnection.connectionState === 'failed') {
            const attempts = iceRestartAttemptsRef.current.get(from) || 0;
            if (attempts < 3) {
              console.error('Peer connection failed for:', from, '- attempting to restart ICE (attempt', attempts + 1, ')');
              iceRestartAttemptsRef.current.set(from, attempts + 1);
              // Try to recover by restarting ICE
              (async () => {
                try {
                  const offer = await peerConnection.createOffer({ iceRestart: true });
                  await peerConnection.setLocalDescription(offer);
                  socket.emit('offer', {
                    sessionId,
                    offer,
                    targetId: from
                  });
                  console.log('ICE restart offer sent for:', from);
                } catch (err) {
                  console.error('Error restarting ICE:', err);
                }
              })();
            } else {
              console.error('Peer connection failed for:', from, '- max restart attempts reached, giving up');
            }
          } else if (peerConnection.connectionState === 'connected') {
            // Reset restart attempts on successful connection
            iceRestartAttemptsRef.current.set(from, 0);
          }
        };
        
        peerConnection.oniceconnectionstatechange = () => {
          console.log('ICE connection state:', from, peerConnection.iceConnectionState);
          if (peerConnection.iceConnectionState === 'failed') {
            const attempts = iceRestartAttemptsRef.current.get(from) || 0;
            if (attempts < 3) {
              console.error('ICE connection failed for:', from, '- attempting to restart ICE (attempt', attempts + 1, ')');
              iceRestartAttemptsRef.current.set(from, attempts + 1);
              // Try to recover by restarting ICE
              (async () => {
                try {
                  const offer = await peerConnection.createOffer({ iceRestart: true });
                  await peerConnection.setLocalDescription(offer);
                  socket.emit('offer', {
                    sessionId,
                    offer,
                    targetId: from
                  });
                  console.log('ICE restart offer sent (ICE failed) for:', from);
                } catch (err) {
                  console.error('Error restarting ICE (ICE failed):', err);
                }
              })();
            } else {
              console.error('ICE connection failed for:', from, '- max restart attempts reached, giving up');
            }
          } else if (peerConnection.iceConnectionState === 'connected') {
            // Reset restart attempts on successful connection
            iceRestartAttemptsRef.current.set(from, 0);
          }
        };

        peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', {
            sessionId,
            candidate: event.candidate,
            targetId: from
          });
        }
      };
      }
      
      // Perfect Negotiation: Handle offer with collision detection
      if (pc) {
        try {
          const makingOffer = makingOfferRef.current.get(from) || false;
          const offerCollision = (offer.type === 'offer') && 
                                 (makingOffer || pc.signalingState !== 'stable');
          
          if (offerCollision) {
            console.log('Offer collision detected for:', from, '- rolling back');
            await Promise.all([
              pc.setLocalDescription({ type: 'rollback' }),
              pc.setRemoteDescription(new RTCSessionDescription(offer))
            ]);
          } else {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
          }
          
          if (offer.type === 'offer') {
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', {
        sessionId,
        answer,
        targetId: from
      });
            console.log('Answer sent to:', from);
          }
        } catch (error) {
          console.error('Error handling offer:', error);
        }
      }
    });

    // Handle answer - Perfect Negotiation pattern
    socket.on('answer', async ({ answer, from }: { answer: RTCSessionDescriptionInit; from: string }) => {
      const pc = peersRef.current.get(from);
      if (pc) {
        try {
          console.log('Received answer from:', from, 'signaling state:', pc.signalingState);
          // Perfect Negotiation: Only set if we're expecting an answer
          if (pc.signalingState === 'have-local-offer' || pc.signalingState === 'have-local-pranswer') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('Set remote description (answer) for:', from);
          } else if (pc.signalingState === 'stable') {
            // Connection already stable - this is a late/duplicate answer, safe to ignore
            console.log('Answer received but connection already stable - ignoring (this is OK):', from);
          } else {
            console.warn('Cannot set remote answer - unexpected signaling state:', pc.signalingState, 'from:', from);
          }
        } catch (error) {
          console.error('Error setting remote description (answer):', error, 'from:', from, 'state:', pc.signalingState);
        }
      } else {
        console.warn('Received answer but no peer connection found for:', from);
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
      
      // Play leave sound locally
      playLeaveSound();
      
      // Notify others to play leave sound
      socket.emit('play-sound', { sessionId, soundType: 'leave' });
      
      const socketIdToRemove = leftSocketId || userId;
      
      // Clean up video element from DOM immediately
      if (remoteVideosRef.current) {
        const videoElement = remoteVideosRef.current.querySelector(`[data-socket-id="${socketIdToRemove}"]`) as HTMLVideoElement;
        if (videoElement) {
          // Stop all tracks before removing
          if (videoElement.srcObject instanceof MediaStream) {
            videoElement.srcObject.getTracks().forEach(track => {
              track.stop();
            });
          }
          videoElement.srcObject = null;
          videoElement.remove();
          console.log('Removed video element for socketId:', socketIdToRemove);
        }
      }
      
      // Clean up remote streams
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        const stream = newMap.get(socketIdToRemove);
        if (stream) {
          // Stop all tracks in the stream
          stream.getTracks().forEach(track => {
            track.stop();
          });
        }
        newMap.delete(socketIdToRemove);
        return newMap;
      });
      
      // Clean up peer connection
      const pc = peersRef.current.get(socketIdToRemove);
      if (pc) {
        // Close all tracks in senders
        pc.getSenders().forEach(sender => {
          if (sender.track) {
            sender.track.stop();
          }
        });
        pc.close();
        peersRef.current.delete(socketIdToRemove);
        setPeers(new Map(peersRef.current));
        console.log('Closed and removed peer connection for socketId:', socketIdToRemove);
      }
      
      // Clean up refs
      makingOfferRef.current.delete(socketIdToRemove);
      iceRestartAttemptsRef.current.delete(socketIdToRemove);
      userIdToSocketIdRef.current.delete(userId);
    });

    // Handle remote audio levels
    socket.on('audio-level', ({ userId: remoteUserId, level }: { userId: string; level: number }) => {
      if (remoteUserId !== userId) {
        // Map userId to socketId for display
        const socketIdForUser = userIdToSocketIdRef.current.get(remoteUserId);
        const key = socketIdForUser || remoteUserId;
        setRemoteAudioLevels(prev => {
          const newMap = new Map(prev);
          newMap.set(key, level);
          return newMap;
        });
      }
    });
    
    // Handle remote sound notifications
    socket.on('play-sound', ({ soundType }: { soundType: 'join' | 'leave' }) => {
      // Prevent duplicate sounds within 500ms
      const now = Date.now();
      if (lastSoundTimeRef.current.type === soundType && 
          now - lastSoundTimeRef.current.time < 500) {
        console.log('Ignoring duplicate sound:', soundType);
        return;
      }
      
      lastSoundTimeRef.current = { type: soundType, time: now };
      console.log('Received play-sound event:', soundType);
      
      if (soundType === 'join') {
        playJoinSound();
      } else if (soundType === 'leave') {
        playLeaveSound();
      }
    });

    return () => {
      // Cleanup
      socket.emit('leave-session', { sessionId, userId });
      socket.disconnect();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      peersRef.current.forEach(pc => pc.close());
      peersRef.current.clear();
    };
  }, [sessionId]);

  // Update remote videos
  useEffect(() => {
    if (remoteVideosRef.current) {
      // First, remove video elements for streams that no longer exist
      const existingVideos = remoteVideosRef.current.querySelectorAll('[data-socket-id]');
      existingVideos.forEach((videoEl) => {
        const socketId = videoEl.getAttribute('data-socket-id');
        if (socketId && !remoteStreams.has(socketId)) {
          // Stream no longer exists, remove this video element
          const video = videoEl as HTMLVideoElement;
          if (video.srcObject instanceof MediaStream) {
            video.srcObject.getTracks().forEach(track => {
              track.stop();
            });
          }
          video.srcObject = null;
          video.remove();
          console.log('Removed stale video element for socketId:', socketId);
        }
      });
      
      // Add or update video elements for each remote stream
      remoteStreams.forEach((stream, socketId) => {
        // Check if video already exists for this socketId
        const existingVideo = remoteVideosRef.current?.querySelector(`[data-socket-id="${socketId}"]`) as HTMLVideoElement;
        
        if (existingVideo) {
          // Check if stream tracks are still active
          const tracks = stream.getTracks();
          const hasActiveTracks = tracks.some(track => track.readyState === 'live');
          
          if (!hasActiveTracks) {
            console.warn('Stream has no active tracks for socketId:', socketId);
            // Remove the video element if tracks are ended
            if (existingVideo.srcObject instanceof MediaStream) {
              existingVideo.srcObject.getTracks().forEach(track => {
                track.stop();
              });
            }
            existingVideo.srcObject = null;
            existingVideo.remove();
            return;
          }
          
          // Update existing video srcObject if stream changed
          if (existingVideo.srcObject !== stream) {
            // Stop old tracks
            if (existingVideo.srcObject instanceof MediaStream) {
              existingVideo.srcObject.getTracks().forEach(track => {
                track.stop();
              });
            }
            existingVideo.srcObject = stream;
            console.log('Updated video srcObject for socketId:', socketId);
          }
          
          // Ensure tracks are enabled
          stream.getTracks().forEach(track => {
            if (track.readyState === 'live') {
              track.enabled = true;
            }
          });
          
          // Try to play if not already playing
          if (existingVideo.paused) {
            existingVideo.play().catch(err => console.error('Error playing existing video:', err));
          }
          
          return; // Skip creating new element
        }
        
        // Create new video element
        const tracks = stream.getTracks();
        const hasActiveTracks = tracks.some(track => track.readyState === 'live');
        
        if (!hasActiveTracks) {
          console.warn('Cannot create video element - stream has no active tracks for socketId:', socketId);
          return;
        }
        
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = false; // Unmute remote videos to hear audio
        video.className = 'participant-video remote-participant-video';
        video.setAttribute('data-socket-id', socketId);
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        
        // Ensure all tracks are enabled (both audio and video)
        stream.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.enabled = true;
            console.log('Enabled track for new video element:', track.kind, track.id, 'socketId:', socketId);
          }
        });
        
        // Force play immediately
        const playVideo = () => {
          video.play().then(() => {
            console.log('Remote video started playing for', socketId);
          }).catch(err => {
            console.error('Error playing remote video:', err, 'socketId:', socketId);
            // Retry after a short delay
            setTimeout(() => {
              video.play().catch(e => console.error('Retry play failed:', e));
            }, 500);
          });
        };
        
        // Add event listeners for debugging and playback
        video.onloadedmetadata = () => {
          console.log('Remote video metadata loaded for', socketId);
          playVideo();
        };
        
        video.oncanplay = () => {
          console.log('Remote video can play for', socketId);
          playVideo();
        };
        
        video.onplay = () => {
          console.log('Remote video started playing for', socketId);
        };
        
        video.onerror = (err) => {
          console.error('Remote video error for', socketId, err);
        };
        
        // Handle track ended events
        stream.getTracks().forEach(track => {
          track.onended = () => {
            console.warn('Track ended for socketId:', socketId, 'kind:', track.kind);
            // If all tracks are ended, remove the video element
            const allTracksEnded = stream.getTracks().every(t => t.readyState === 'ended');
            if (allTracksEnded && video.parentNode) {
              video.srcObject = null;
              video.remove();
              console.log('Removed video element - all tracks ended for socketId:', socketId);
            }
          };
        });
        
        remoteVideosRef.current?.appendChild(video);
        console.log('Created new video element for socketId:', socketId, 'tracks:', stream.getTracks().length);
        
        // Try to play immediately if metadata is already loaded
        if (video.readyState >= 2) { // HAVE_CURRENT_DATA or higher
          playVideo();
        }
      });
    }
  }, [remoteStreams]);

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const newState = !isVideoEnabled;
        videoTrack.enabled = newState;
        setIsVideoEnabled(newState);
        console.log('Video track enabled:', newState, 'Track ID:', videoTrack.id);
        
        // Show/hide video element based on state and ensure it plays
        if (videoRef.current) {
          if (newState) {
            videoRef.current.style.display = 'block';
            // Ensure video plays when enabled
            videoRef.current.play().catch(err => {
              console.error('Error playing video:', err);
            });
          } else {
            videoRef.current.style.display = 'none';
          }
        }
        
        // Update all peer connections - ensure tracks are in senders
        peersRef.current.forEach((pc, socketId) => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender && sender.track) {
            // Track is already in sender, just update enabled state
            sender.track.enabled = newState;
            console.log('Video track sender found for:', socketId, 'track enabled:', newState);
          } else {
            // Sender not found - this can happen if peer connection was created before tracks were added
            // Try to add the track now
            console.warn('Video track sender NOT found for:', socketId, '- adding track now');
            try {
              pc.addTrack(videoTrack, stream);
              console.log('Added video track to peer connection:', socketId);
            } catch (err) {
              console.error('Failed to add video track to peer connection:', socketId, err);
            }
          }
        });
      }
    }
  };

  // Helper function to get audio fill percentage (0-100)
  const getAudioFillPercentage = (level: number): number => {
    if (!isAudioEnabled) return 0;
    // Level is already normalized 0-100, use it directly
    // Add a minimum threshold - only show fill if level is above 5
    if (level < 5) return 0;
    return Math.min(100, Math.max(0, level));
  };
  
  // Helper function to get blue color intensity based on audio level
  const getBlueFillColor = (level: number): string => {
    if (!isAudioEnabled) return '#3b82f6'; // Default blue when muted
    
    const fillPercent = getAudioFillPercentage(level);
    
    // Create vivid blue gradient: light blue -> medium blue -> bright blue -> cyan
    if (fillPercent < 25) {
      // Quiet: Light blue
      return '#60a5fa'; // blue-400
    } else if (fillPercent < 50) {
      // Low: Medium blue
      return '#3b82f6'; // blue-500
    } else if (fillPercent < 75) {
      // Moderate: Bright blue
      return '#2563eb'; // blue-600
    } else {
      // Loud: Vivid cyan-blue
      return '#0ea5e9'; // sky-500 (more vivid)
    }
  };

  const toggleAudio = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        // Check if track is still active, if not, get a fresh reference
        if (audioTrack.readyState === 'ended') {
          console.warn('Audio track ended, reinitializing stream...');
          if (initLocalStreamRef.current) {
            initLocalStreamRef.current();
          }
          return;
        }
        
        const newState = !isAudioEnabled;
        audioTrack.enabled = newState;
        setIsAudioEnabled(newState);
        console.log('Audio track enabled:', newState, 'Track ID:', audioTrack.id, 'ReadyState:', audioTrack.readyState);
        
        // Update all peer connections - ensure tracks are in senders
        peersRef.current.forEach((pc, socketId) => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
          if (sender && sender.track) {
            // Track is already in sender, just update enabled state
            sender.track.enabled = newState;
            console.log('Audio track sender found for:', socketId, 'track enabled:', newState);
          } else {
            // Sender not found - this can happen if peer connection was created before tracks were added
            // Try to add the track now
            console.warn('Audio track sender NOT found for:', socketId, '- adding track now');
            try {
              pc.addTrack(audioTrack, stream);
              console.log('Added audio track to peer connection:', socketId);
            } catch (err) {
              console.error('Failed to add audio track to peer connection:', socketId, err);
            }
          }
        });
      } else {
        console.warn('No audio track found in stream, reinitializing...');
        if (initLocalStreamRef.current) {
          initLocalStreamRef.current();
        }
      }
    } else {
      console.warn('No local stream found, reinitializing...');
      if (initLocalStreamRef.current) {
        initLocalStreamRef.current();
      }
    }
  };

  const copyLink = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const url = window.location.href;
    
    try {
      // Try modern clipboard API first (works best on desktop)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
          console.log('Link copied to clipboard:', url);
          return;
        } catch (clipboardErr) {
          console.log('Clipboard API failed, trying fallback:', clipboardErr);
        }
      }
      
      // Fallback for older browsers or when clipboard API fails
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.style.opacity = '0';
      textArea.style.pointerEvents = 'none';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      
      // For iOS
      if (navigator.userAgent.match(/ipad|ipod|iphone/i)) {
        const range = document.createRange();
        range.selectNodeContents(textArea);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        textArea.setSelectionRange(0, 999999);
      } else {
        textArea.select();
        textArea.setSelectionRange(0, 999999);
      }
      
      const successful = document.execCommand('copy');
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        console.log('Link copied to clipboard (fallback):', url);
      } else {
        console.error('execCommand copy failed');
        alert('Failed to copy link. Please copy manually: ' + url);
      }
      
      document.body.removeChild(textArea);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy link. Please copy manually: ' + url);
    }
  };

  return (
    <div className={`video-section ${minimized ? 'minimized' : ''} ${maximized ? 'maximized' : ''}`}>
      {!minimized && (
        <>
      <div className="video-header">Video</div>
      <div className="video-container-split">
        {/* Local video - top half */}
        <div className="video-participant local-participant">
          <div className="video-participant-wrapper">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="participant-video local-participant-video"
              style={{ display: isVideoEnabled ? 'block' : 'none' }}
            />
            <div className="participant-label">You</div>
          </div>
        </div>
        
        {/* Remote video - right half */}
        <div className="video-participant remote-participant">
          <div className="video-participant-wrapper">
            <div className="remote-videos" ref={remoteVideosRef}></div>
            {remoteStreams.size === 0 && (
              <div className="no-participant-message">Waiting for participant...</div>
            )}
      </div>
        </div>
      </div>
      
      <div className="video-controls">
        <button
          onClick={(e) => copyLink(e)}
          className="control-btn-icon"
          title="Copy link"
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
        </button>
        <button
          onClick={toggleVideo}
          className={`control-btn-icon ${!isVideoEnabled ? 'disabled' : ''}`}
          title={isVideoEnabled ? 'Turn off video' : 'Turn on video'}
        >
          {isVideoEnabled ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z"></path>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
          )}
        </button>
        <button
          onClick={toggleAudio}
          className={`control-btn-icon audio-btn ${!isAudioEnabled ? 'disabled' : ''}`}
          title={isAudioEnabled ? 'Turn off audio' : 'Turn on audio'}
        >
          {isAudioEnabled ? (
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#60a5fa" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{
                transition: 'all 0.15s ease',
              }}
            >
              <defs>
                <clipPath id={`mic-fill-clip-${sessionId}`}>
                  {getAudioFillPercentage(localAudioLevel) > 0 && (
                    <rect 
                      x="0" 
                      y={24 - (getAudioFillPercentage(localAudioLevel) / 100) * 24} 
                      width="24" 
                      height={Math.max(0.1, (getAudioFillPercentage(localAudioLevel) / 100) * 24)} 
                    />
                  )}
                </clipPath>
              </defs>
              {/* Base mic outline */}
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
              {/* Blue fill that fills from bottom to top based on audio intensity */}
              <g clipPath={`url(#mic-fill-clip-${sessionId})`}>
                <path 
                  d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v4 M8 23h8" 
                  fill={getBlueFillColor(localAudioLevel)}
                  stroke="none"
                  style={{
                    transition: 'fill 0.15s ease',
                    filter: localAudioLevel > 20 ? `drop-shadow(0 0 ${4 + (localAudioLevel / 100) * 8}px ${getBlueFillColor(localAudioLevel)}dd)` : 'none',
                  }}
                />
              </g>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23"></line>
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          )}
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDisconnect();
          }}
          className="control-btn-icon leave-btn"
          title="Disconnect"
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
        </button>
      </div>
      </>
      )}
    </div>
  );
}

// Chat Section
function ChatSection({ 
  sessionId,
  minimized,
  maximized,
  onMinimize,
  onMaximize,
  onRestore,
  otherPanelMinimized,
  onRestoreOtherPanel
}: { 
  sessionId: string;
  minimized: boolean;
  maximized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onRestore: () => void;
  otherPanelMinimized: boolean;
  onRestoreOtherPanel: () => void;
}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const emojiPickerRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const userIdRef = React.useRef<string>(`user-${Date.now()}`);

  useEffect(() => {
    const newSocket = io(API_URL);
    setSocket(newSocket);

    const userId = userIdRef.current;
    newSocket.emit('join-session', { sessionId, userId });

    // Handle session joined - receive chat history
    newSocket.on('session-joined', (data: any) => {
      console.log('Session joined, received chat history:', data.messages?.length || 0, 'messages');
      if (data.messages && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    });

    newSocket.on('chat-message', (data: any) => {
      console.log('Received chat message:', data);
      setMessages(prev => [...prev, data]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea based on content (with max height constraint)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 150; // Match CSS max-height
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      // Only show scrollbar if content exceeds max height
      textareaRef.current.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
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
    if (!message.trim()) {
      console.log('Message is empty, not sending');
      return;
    }
    
    if (!socket) {
      console.error('Socket not connected, cannot send message');
      alert('Connection lost. Please refresh the page.');
      return;
    }

    const messageToSend = message.trim();
    console.log('Sending message:', messageToSend, 'Socket connected:', socket.connected);

    // Check if message contains a base64 data URI image
    const dataUriRegex = /data:image\/[^;]+;base64,[^\s]+/i;
    const dataUriMatch = messageToSend.match(dataUriRegex);
    
    if (dataUriMatch) {
      const dataUri = dataUriMatch[0];
      // Send as image preview
      socket.emit('chat-message', {
        sessionId,
        message: messageToSend,
        userId: userIdRef.current,
        type: 'image-url',
        data: { url: dataUri }
      });
      setMessage('');
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
      return;
    }

    // Check if message contains a URL
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = messageToSend.match(urlRegex);

    if (urls && urls.length > 0) {
      const url = urls[0];
      
      // Check if URL is an image
      const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i;
      const isImageUrl = imageExtensions.test(url);
      
      if (isImageUrl) {
        // Send as image preview
        socket.emit('chat-message', {
          sessionId,
          message: messageToSend,
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
            message: messageToSend,
            userId: userIdRef.current,
            type: 'link',
            data: previewResponse.data
          });
        } catch (error) {
          console.error('Link preview failed, sending as text:', error);
          // Send as regular text if preview fails
          socket.emit('chat-message', {
            sessionId,
            message: messageToSend,
            userId: userIdRef.current,
            type: 'text'
          });
        }
      }
    } else {
      socket.emit('chat-message', {
        sessionId,
        message: messageToSend,
        userId: userIdRef.current,
        type: 'text'
      });
    }

    setMessage('');
    // Focus back on textarea after sending
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socket) {
      // Reset file input
      if (e.target) {
        e.target.value = '';
      }
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      if (e.target) {
        e.target.value = '';
      }
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000 // 30 second timeout
      });

      socket.emit('chat-message', {
        sessionId,
        message: '',
        userId: userIdRef.current,
        type: 'image',
        data: { url: response.data.url }
      });
      
      // Reset file input after successful upload
      if (e.target) {
        e.target.value = '';
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to upload image';
      alert(`Failed to upload image: ${errorMsg}`);
      // Reset file input on error
      if (e.target) {
        e.target.value = '';
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={`chat-section ${minimized ? 'minimized' : ''} ${maximized ? 'maximized' : ''}`}>
      {!minimized && (
        <div className="chat-header">
          <span>Chat</span>
        </div>
      )}
      {!minimized && (
        <>
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
          ref={fileInputRef}
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
      </>
      )}
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
