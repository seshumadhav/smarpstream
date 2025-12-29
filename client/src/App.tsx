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
      <div className="deployment-info">Last deployed: 2025-12-29 8:30 PT</div>
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
      <div className="deployment-info">Last deployed: 2025-12-29 8:30 PT</div>
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
function VideoSection({ sessionId, session }: { sessionId: string; session: any }) {
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
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        // Setup audio level monitoring
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          audioContextRef.current = audioContext;
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.8;
          analyserRef.current = analyser;
          
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);
          
          // Start monitoring audio levels
          const monitorAudioLevel = () => {
            if (!analyserRef.current) return;
            
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            
            // Calculate average volume
            const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
            const level = Math.min(100, (average / 255) * 100);
            
            setLocalAudioLevel(level);
            
            // Send audio level to other users
            if (socketRef.current) {
              socketRef.current.emit('audio-level', { sessionId, level, userId });
            }
            
            animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
          };
          
          monitorAudioLevel();
        } catch (error) {
          console.error('Error setting up audio level monitoring:', error);
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
    socket.on('user-joined', async ({ socketId, userId: joinedUserId }: { socketId: string; userId?: string }) => {
      if (socketId === socket.id) return;
      
      // Store mapping if userId is provided
      if (joinedUserId) {
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
      // Clear existing videos
      while (remoteVideosRef.current.firstChild) {
        remoteVideosRef.current.removeChild(remoteVideosRef.current.firstChild);
      }
      
      // Add new video elements for each remote stream
      remoteStreams.forEach((stream, socketId) => {
        // Check if video already exists for this socketId
        const existingVideo = remoteVideosRef.current?.querySelector(`[data-socket-id="${socketId}"]`) as HTMLVideoElement;
        if (existingVideo) {
          // Update existing video srcObject if stream changed
          if (existingVideo.srcObject !== stream) {
            existingVideo.srcObject = stream;
          }
          return; // Skip if already exists
        }
        
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = false; // Unmute remote videos to hear audio
        video.className = 'participant-video remote-participant-video';
        video.setAttribute('data-socket-id', socketId);
        
        // Ensure tracks are enabled
        stream.getTracks().forEach(track => {
          track.enabled = true;
        });
        
        // Add event listeners for debugging and playback
        video.onloadedmetadata = () => {
          console.log('Remote video metadata loaded for', socketId);
          video.play().catch(err => console.error('Error playing remote video:', err));
        };
        
        video.onplay = () => {
          console.log('Remote video started playing for', socketId);
        };
        
        video.onerror = (err) => {
          console.error('Remote video error for', socketId, err);
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
        const newState = !isVideoEnabled;
        videoTrack.enabled = newState;
        setIsVideoEnabled(newState);
        console.log('Video track enabled:', newState, 'Track ID:', videoTrack.id);
        
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

  // Helper function to get audio button color based on intensity
  const getAudioButtonColor = (level: number): string => {
    if (level === 0) return '#60a5fa'; // Light blue
    if (level < 30) return '#3b82f6'; // Blue
    if (level < 60) return '#2563eb'; // Medium blue
    if (level < 80) return '#1d4ed8'; // Dark blue
    return '#1e40af'; // Very dark blue (high intensity)
  };

  const toggleAudio = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const newState = !isAudioEnabled;
        audioTrack.enabled = newState;
        setIsAudioEnabled(newState);
        console.log('Audio track enabled:', newState, 'Track ID:', audioTrack.id);
        
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
      }
    }
  };

  const copyLink = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const url = window.location.href;
    
    // Try modern clipboard API first (works best on desktop)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        console.error('execCommand copy failed');
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    } finally {
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="video-section">
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
              stroke={getAudioButtonColor(localAudioLevel)} 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{
                filter: localAudioLevel > 0 ? `drop-shadow(0 0 ${4 + (localAudioLevel / 100) * 4}px ${getAudioButtonColor(localAudioLevel)}80)` : 'none',
                transition: 'stroke 0.2s ease, filter 0.2s ease'
              }}
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
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
          onClick={() => window.location.href = '/'}
          className="control-btn-icon leave-btn"
          title="Disconnect"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
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
    // Focus back on textarea after sending
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
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
