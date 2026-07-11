import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { 
  MessageSquare, 
  Send, 
  Phone, 
  MapPin, 
  User, 
  Check, 
  CheckCheck, 
  Clock, 
  ArrowLeft, 
  AlertCircle, 
  Sparkles, 
  ShieldAlert,
  PhoneCall,
  PhoneOff,
  Volume2,
  VolumeX,
  Loader,
  Image,
  FileText,
  Mic,
  Square,
  Download,
  Eye,
  Trash2,
  Play,
  Pause,
  Paperclip,
  X,
  Map,
  Search,
  Filter,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  PhoneMissed
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface ChatModuleProps {
  initialRecipientId?: string; // If we want to auto-open chat with a specific user
  initialRideId?: string;      // Optional ride association
}

interface Participant {
  id: string;
  name: string;
  role: "passenger" | "driver" | "admin";
  phone?: string;
  village?: string;
  vehicleType?: string;
  vehicleNumber?: string;
}

interface LastMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  createdAt: Date | string;
}

interface Conversation {
  id: string;
  participants: string[];
  rideId?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  otherParticipant: Participant;
  lastMessage: LastMessage | null;
  unreadCount: number;
}

interface IAttachment {
  type: "image" | "document" | "location" | "voice";
  url?: string;
  name?: string;
  mimeType?: string;
  size?: number;
  latitude?: number;
  longitude?: number;
  address?: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: "passenger" | "driver" | "admin";
  text: string;
  createdAt: Date | string;
  readBy?: string[];
  attachments?: IAttachment[];
}

function AudioPlayer({ src, name }: { src: string; name?: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => console.error(err));
      setIsPlaying(true);
    }
  };

  const formatAudioTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="flex items-center gap-3 bg-slate-100 border border-slate-200 p-2.5 rounded-2xl w-full max-w-xs mt-1">
      <button
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current pl-0.5" />}
      </button>
      <div className="flex-grow min-w-0">
        <div className="text-[10px] text-slate-500 font-bold truncate">Voice Note</div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-grow bg-slate-300 h-1 rounded-full overflow-hidden relative">
            <div 
              className="bg-orange-600 h-full transition-all duration-100"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[9px] text-slate-500 font-mono flex-shrink-0">
            {formatAudioTime(currentTime)} / {formatAudioTime(duration || 0)}
          </span>
        </div>
      </div>
      <a
        href={src}
        download={name || "voice_note.webm"}
        title="Download voice note"
        className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

export default function ChatModule({ initialRecipientId, initialRideId }: ChatModuleProps) {
  const { user, token } = useAuth();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  
  // Presence and typing states
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [isTypingSent, setIsTypingSent] = useState<boolean>(false);

  // Media sharing & upload states
  const [attachmentQueue, setAttachmentQueue] = useState<IAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const recordingIntervalRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const selectedConversationRef = useRef<Conversation | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  // In-app voice calling states
  const [callState, setCallState] = useState<"idle" | "calling" | "incoming" | "connected" | "disconnected">("idle");
  const [callType, setCallType] = useState<"outgoing" | "incoming">("outgoing");
  const [callTimer, setCallTimer] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeaker, setIsSpeaker] = useState<boolean>(false);
  const [currentCallInfo, setCurrentCallInfo] = useState<{
    conversationId: string;
    partnerId: string;
    partnerName: string;
    partnerRole: string;
    sdp?: any;
    isSimulated?: boolean;
  } | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callTimerIntervalRef = useRef<any>(null);
  
  // Audio synthesis helper references for call tones
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);

  // Sync selected conversation ref
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Call History States and Refs
  const [sidebarTab, setSidebarTab] = useState<"chats" | "calls">("chats");
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [isLoadingCalls, setIsLoadingCalls] = useState<boolean>(false);
  const [callHistorySearch, setCallHistorySearch] = useState<string>("");
  const [callHistoryFilter, setCallHistoryFilter] = useState<"all" | "missed" | "incoming" | "outgoing">("all");

  const currentCallInfoRef = useRef<any>(null);
  const callStateRef = useRef<any>("idle");
  const callTypeRef = useRef<any>("outgoing");
  const callTimerRef = useRef<number>(0);

  useEffect(() => {
    currentCallInfoRef.current = currentCallInfo;
  }, [currentCallInfo]);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    callTypeRef.current = callType;
  }, [callType]);

  useEffect(() => {
    callTimerRef.current = callTimer;
  }, [callTimer]);

  const loadCallHistory = async () => {
    if (!token) return;
    try {
      setIsLoadingCalls(true);
      const res = await fetch("/api/calls", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCallHistory(data);
      }
    } catch (err) {
      console.error("Error loading call logs:", err);
    } finally {
      setIsLoadingCalls(false);
    }
  };

  const logCallRecord = async (
    status: "completed" | "missed" | "rejected" | "no-answer", 
    durationSec: number
  ) => {
    const info = currentCallInfoRef.current;
    const type = callTypeRef.current;
    if (!token || !info) return;
    try {
      const isCaller = type === "outgoing";
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          conversationId: info.conversationId,
          callerId: isCaller ? user?.id : info.partnerId,
          callerName: isCaller ? user?.name : info.partnerName,
          receiverId: isCaller ? info.partnerId : user?.id,
          receiverName: isCaller ? info.partnerName : user?.name,
          status,
          duration: durationSec
        })
      });
      if (res.ok) {
        loadCallHistory();
      }
    } catch (err) {
      console.error("Error logging call:", err);
    }
  };

  useEffect(() => {
    if (sidebarTab === "calls") {
      loadCallHistory();
    }
  }, [sidebarTab, token]);
  
  // Quick reply options by role
  const getQuickReplies = () => {
    if (!user) return [];
    if (user.role === "passenger") {
      return [
        "I'm at the pickup point.",
        "I am waiting near the main road.",
        "Please call me when you are close.",
        "This is an urgent health situation.",
        "How long will it take to reach?"
      ];
    } else if (user.role === "driver") {
      return [
        "I'm on my way.",
        "I have reached the pickup location.",
        "Please stand by the road for quick boarding.",
        "Traffic is heavy, will be there in 5 minutes.",
        "Ambulance is fully equipped and ready."
      ];
    } else {
      return [
        "How can I assist with your transport today?",
        "Your ride has been successfully prioritized.",
        "A dispatch officer is looking into this.",
        "Please confirm if you have reached safely.",
        "I am monitoring your active emergency trip."
      ];
    }
  };

  // 1. Establish Socket Connection (Only depends on token)
  useEffect(() => {
    if (!token || !user) return;

    const socket = io({
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1500,
      timeout: 10000
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsSocketConnected(true);
      console.log("[Chat] Connected to real-time server");
      
      // Notify server we are online
      socket.emit("user:online", {
        userId: user.id,
        userName: user.name,
        role: user.role
      });

      // Load initial online users presence list
      fetch("/api/chat/presence", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => {
        if (res.ok) return res.json();
        return [];
      })
      .then((data) => setOnlineUsers(data))
      .catch((err) => console.error("Error loading presence details:", err));
    });

    socket.on("disconnect", () => {
      setIsSocketConnected(false);
      console.log("[Chat] Disconnected from real-time server");
    });

    // Handle presence updates
    socket.on("presence:update", (data: { userId: string, status: "online" | "offline", lastSeen?: number }) => {
      setOnlineUsers((prev) => {
        if (data.status === "online") {
          if (prev.includes(data.userId)) return prev;
          return [...prev, data.userId];
        } else {
          return prev.filter((id) => id !== data.userId);
        }
      });
    });

    // Handle typing status updates
    socket.on("typing:status", (data: { conversationId: string; userId: string; userName: string; isTyping: boolean }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [`${data.conversationId}_${data.userId}`]: data.isTyping
      }));
    });

    // Handle read receipts
    socket.on("messages:read", (data: { conversationId: string; userId: string }) => {
      setMessages((prevMsgs) =>
        prevMsgs.map((m) => {
          if (m.senderId !== data.userId && m.conversationId === data.conversationId) {
            if (!m.readBy || !m.readBy.includes(data.userId)) {
              return { ...m, readBy: [...(m.readBy || []), data.userId] };
            }
          }
          return m;
        })
      );
    });

    // Handle new message arrival
    const handleNewMessage = (payload: { conversationId: string; message: Message }) => {
      const { conversationId, message } = payload;
      const currentSelected = selectedConversationRef.current;
      
      // Update conversations list in real-time (last message, update order, unread count)
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === conversationId);
        if (index === -1) {
          // If conversation doesn't exist, reload conversations
          loadConversations();
          return prev;
        }

        const updated = [...prev];
        const target = { ...updated[index] };
        
        target.lastMessage = {
          id: message.id,
          text: message.text,
          senderId: message.senderId,
          senderName: message.senderName,
          senderRole: message.senderRole,
          createdAt: message.createdAt
        };
        target.updatedAt = message.createdAt;
        
        // Increase unread count if we are NOT currently viewing this conversation
        if (!currentSelected || currentSelected.id !== conversationId) {
          if (message.senderId !== user?.id) {
            target.unreadCount += 1;
          }
        }

        updated[index] = target;
        // Re-sort conversations
        return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });

      // If this message belongs to the active conversation, append it
      if (currentSelected && currentSelected.id === conversationId) {
        setMessages((prevMsgs) => {
          // Guard against duplicate messages
          if (prevMsgs.some((m) => m.id === message.id)) {
            return prevMsgs;
          }
          return [...prevMsgs, message];
        });
        
        // Mark message as read via backend call and socket
        if (message.senderId !== user?.id) {
          socket.emit("message:read", {
            conversationId,
            userId: user?.id
          });
          fetch(`/api/chat/conversations/${conversationId}/messages`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch((err) => console.error("Error updating read status:", err));
        }
      }
    };

    socket.on("message:new", handleNewMessage);
    socket.on("Message New", handleNewMessage);

    // Socket Voice Calling Event Handlers
    socket.on("call:incoming", (data: { conversationId: string; callerId: string; callerName: string; sdp?: any }) => {
      console.log("[Calling] Incoming call from:", data.callerName);
      
      setConversations((prevConv) => {
        const conv = prevConv.find(c => c.id === data.conversationId) || prevConv.find(c => c.otherParticipant.id === data.callerId);
        const partnerRole = conv ? conv.otherParticipant.role : "dispatcher";
        
        setCurrentCallInfo({
          conversationId: data.conversationId,
          partnerId: data.callerId,
          partnerName: data.callerName,
          partnerRole: partnerRole,
          sdp: data.sdp,
          isSimulated: false
        });
        setCallType("incoming");
        setCallState("incoming");
        
        // Start playing ringtone audio
        startCallSound("ring");
        return prevConv;
      });
    });

    socket.on("call:accepted", async (data: { conversationId: string; receiverId: string; sdp?: any }) => {
      console.log("[Calling] Call accepted by recipient");
      stopCallSound();
      startCallSound("connect");
      setCallState("connected");
      setCallTimer(0);
      
      // Setup Call Timer interval
      if (callTimerIntervalRef.current) clearInterval(callTimerIntervalRef.current);
      callTimerIntervalRef.current = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
      
      if (peerConnectionRef.current && data.sdp) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
          console.log("[Calling] Handshake with recipient complete");
        } catch (err) {
          console.error("WebRTC SDP remote error:", err);
        }
      }
    });

    socket.on("call:rejected", () => {
      console.log("[Calling] Call rejected by recipient");
      logCallRecord("rejected", 0);
      setCallState("disconnected");
      cleanupCallMedia();
      setTimeout(() => {
        setCallState("idle");
        setCurrentCallInfo(null);
      }, 2000);
    });

    socket.on("call:ended", () => {
      console.log("[Calling] Call ended by other party");
      const state = callStateRef.current;
      const timer = callTimerRef.current;
      if (state === "connected") {
        logCallRecord("completed", timer);
      } else if (state === "incoming") {
        logCallRecord("missed", 0);
      } else if (state === "calling") {
        logCallRecord("no-answer", 0);
      }
      setCallState("disconnected");
      cleanupCallMedia();
      setTimeout(() => {
        setCallState("idle");
        setCurrentCallInfo(null);
      }, 2000);
    });

    socket.on("call:signal", async (data: { senderId: string; signalData: any }) => {
      if (peerConnectionRef.current && data.signalData) {
        try {
          if (data.signalData.candidate) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.signalData.candidate));
          } else if (data.signalData.sdp) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.signalData.sdp));
          }
        } catch (err) {
          console.error("Error setting signaling candidate:", err);
        }
      }
    });

    socket.on("call:failed", (data: { conversationId: string; error: string }) => {
      console.warn("[Calling] Call initiation failed:", data.error);
      // Run automatic interactive call simulation fallback
      startSimulatedCall();
    });

    return () => {
      socket.disconnect();
      cleanupCallMedia();
    };
  }, [token, user?.id]);

  // Join or notify read when selected conversation changes
  useEffect(() => {
    if (selectedConversation && socketRef.current && isSocketConnected) {
      socketRef.current.emit("join_conversation", selectedConversation.id);
      socketRef.current.emit("message:read", {
        conversationId: selectedConversation.id,
        userId: user?.id
      });
    }
  }, [selectedConversation?.id, isSocketConnected]);

  // Start Synthesized Ringing & Call tones
  function startCallSound(type: "ring" | "connect" | "disconnect-tone") {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      oscRef.current = osc;

      if (type === "ring") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        
        // Ringing rhythm pattern
        let time = ctx.currentTime;
        for (let i = 0; i < 15; i++) {
          gain.gain.setValueAtTime(0.08, time);
          gain.gain.setValueAtTime(0, time + 1.2);
          time += 3.0;
        }
        osc.start();
      } else if (type === "connect") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else if (type === "disconnect-tone") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(329.63, ctx.currentTime);
        osc.frequency.setValueAtTime(220.00, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch (e) {
      console.warn("Web Audio is restricted or unsupported on this device.", e);
    }
  }

  function stopCallSound() {
    try {
      if (oscRef.current) {
        oscRef.current.stop();
        oscRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    } catch (e) {
      console.warn(e);
    }
  }

  function cleanupCallMedia() {
    stopCallSound();
    if (callTimerIntervalRef.current) {
      clearInterval(callTimerIntervalRef.current);
      callTimerIntervalRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    remoteStreamRef.current = null;
  }

  function startSimulatedCall() {
    if (!selectedConversation) return;
    const partner = selectedConversation.otherParticipant;
    console.log("[Calling] Initializing interactive call simulation fallback.");
    
    stopCallSound();
    startCallSound("connect");

    setCurrentCallInfo({
      conversationId: selectedConversation.id,
      partnerId: partner.id,
      partnerName: partner.name,
      partnerRole: partner.role,
      isSimulated: true
    });
    setCallState("connected");
    setCallTimer(0);
    setIsMuted(false);
    setIsSpeaker(false);

    if (callTimerIntervalRef.current) clearInterval(callTimerIntervalRef.current);
    callTimerIntervalRef.current = setInterval(() => {
      setCallTimer(prev => prev + 1);
    }, 1000);
  }

  const initiateVoiceCall = async () => {
    if (!selectedConversation || !user) return;
    const partner = selectedConversation.otherParticipant;
    console.log("[Calling] Initiating voice call to:", partner.name);
    
    stopCallSound();
    startCallSound("ring");

    setCurrentCallInfo({
      conversationId: selectedConversation.id,
      partnerId: partner.id,
      partnerName: partner.name,
      partnerRole: partner.role,
      isSimulated: false
    });
    setCallType("outgoing");
    setCallState("calling");
    setCallTimer(0);
    setIsMuted(false);
    setIsSpeaker(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch((err) => {
        console.warn("Microphone access denied or error:", err);
        throw err;
      });
      
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }
        ]
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("call:signal", {
            conversationId: selectedConversation.id,
            targetId: partner.id,
            senderId: user.id,
            signalData: { candidate: event.candidate }
          });
        }
      };

      pc.ontrack = (event) => {
        console.log("[Calling] Received remote track");
        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          const remoteAudio = document.getElementById("remoteCallAudio") as HTMLAudioElement;
          if (remoteAudio) {
            remoteAudio.srcObject = event.streams[0];
            remoteAudio.play().catch(e => console.error("Error playing remote audio:", e));
          }
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socketRef.current) {
        socketRef.current.emit("call:initiate", {
          conversationId: selectedConversation.id,
          callerId: user.id,
          callerName: user.name,
          receiverId: partner.id,
          sdp: offer
        });
      }

      // If call is not accepted in 15 seconds, fallback to simulated interactive experience
      setTimeout(() => {
        setCallState((current) => {
          if (current === "calling") {
            console.log("[Calling] Call unanswered - running interactive simulation fallback.");
            startSimulatedCall();
          }
          return current;
        });
      }, 15000);

    } catch (err) {
      console.warn("Could not start real WebRTC call. Starting interactive call simulation instead.", err);
      startSimulatedCall();
    }
  };

  const acceptVoiceCall = async () => {
    if (!currentCallInfo || !user) return;
    console.log("[Calling] Accepting voice call...");
    
    stopCallSound();
    startCallSound("connect");
    setCallState("connected");
    setCallTimer(0);

    if (callTimerIntervalRef.current) clearInterval(callTimerIntervalRef.current);
    callTimerIntervalRef.current = setInterval(() => {
      setCallTimer(prev => prev + 1);
    }, 1000);

    if (currentCallInfo.sdp && !currentCallInfo.isSimulated) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch((err) => {
          console.warn("Mic access failed on accepting call, proceeding in voice-simulated channel:", err);
          return null;
        });

        if (stream) {
          localStreamRef.current = stream;
        }

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });
        peerConnectionRef.current = pc;

        if (stream) {
          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
          });
        }

        pc.onicecandidate = (event) => {
          if (event.candidate && socketRef.current) {
            socketRef.current.emit("call:signal", {
              conversationId: currentCallInfo.conversationId,
              targetId: currentCallInfo.partnerId,
              senderId: user.id,
              signalData: { candidate: event.candidate }
            });
          }
        };

        pc.ontrack = (event) => {
          console.log("[Calling] Accepted call remote track");
          if (event.streams && event.streams[0]) {
            remoteStreamRef.current = event.streams[0];
            const remoteAudio = document.getElementById("remoteCallAudio") as HTMLAudioElement;
            if (remoteAudio) {
              remoteAudio.srcObject = event.streams[0];
              remoteAudio.play().catch(e => console.error(e));
            }
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(currentCallInfo.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (socketRef.current) {
          socketRef.current.emit("call:accept", {
            conversationId: currentCallInfo.conversationId,
            callerId: currentCallInfo.partnerId,
            receiverId: user.id,
            sdp: answer
          });
        }

      } catch (err) {
        console.warn("WebRTC connection failed on answer. Continuing in simulated channel", err);
        setCurrentCallInfo(prev => prev ? { ...prev, isSimulated: true } : null);
      }
    } else {
      setCurrentCallInfo(prev => prev ? { ...prev, isSimulated: true } : null);
    }
  };

  const rejectVoiceCall = () => {
    if (!currentCallInfo) return;
    console.log("[Calling] Rejecting call");
    
    stopCallSound();
    startCallSound("disconnect-tone");

    // Log the rejected call
    logCallRecord("rejected", 0);

    if (socketRef.current) {
      socketRef.current.emit("call:reject", {
        conversationId: currentCallInfo.conversationId,
        callerId: currentCallInfo.partnerId,
        receiverId: user?.id
      });
    }

    setCallState("disconnected");
    cleanupCallMedia();
    setTimeout(() => {
      setCallState("idle");
      setCurrentCallInfo(null);
    }, 2000);
  };

  const endVoiceCall = (notifyOtherParty = true) => {
    if (!currentCallInfo) return;
    console.log("[Calling] Ending call");

    stopCallSound();
    startCallSound("disconnect-tone");

    // Log the ended call
    if (callState === "connected") {
      logCallRecord("completed", callTimer);
    } else if (callState === "calling") {
      logCallRecord("no-answer", 0);
    } else {
      logCallRecord("missed", 0);
    }

    if (notifyOtherParty && socketRef.current) {
      socketRef.current.emit("call:end", {
        conversationId: currentCallInfo.conversationId,
        otherUserId: currentCallInfo.partnerId
      });
    }

    setCallState("disconnected");
    cleanupCallMedia();
    setTimeout(() => {
      setCallState("idle");
      setCurrentCallInfo(null);
    }, 2000);
  };

  const formatCallTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // 2. Fetch conversations
  const loadConversations = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await fetch("/api/chat/conversations", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Could not load chats.");
      const data = await res.json();
      setConversations(data);
      
      // Auto open if we have an initial recipient
      if (initialRecipientId && data.length > 0) {
        const found = data.find((c: Conversation) => c.otherParticipant.id === initialRecipientId);
        if (found) {
          setSelectedConversation(found);
        } else {
          // Initiate a conversation if none exists
          initiateDirectConversation(initialRecipientId, initialRideId);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [token, initialRecipientId]);

  // Scroll to bottom on messages load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initiate direct conversation with a recipient
  const initiateDirectConversation = async (recipientId: string, rideId?: string) => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ participantId: recipientId, rideId })
      });
      if (!res.ok) throw new Error("Could not start chat.");
      const newConv = await res.json();
      
      setConversations((prev) => {
        if (prev.some((c) => c.id === newConv.id)) return prev;
        return [newConv, ...prev];
      });
      setSelectedConversation(newConv);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Select/Open a conversation
  const selectConversation = async (conv: Conversation) => {
    if (!token) return;
    setSelectedConversation(conv);
    setMessagesLoading(true);
    
    // Join Socket room
    if (socketRef.current && isSocketConnected) {
      socketRef.current.emit("join_conversation", conv.id);
    }

    try {
      const res = await fetch(`/api/chat/conversations/${conv.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Could not retrieve messages.");
      const msgs = await res.json();
      setMessages(msgs);
      
      // Reset unread count locally
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err: any) {
      console.error(err);
    } finally {
      setMessagesLoading(false);
    }
  };

  // Exit/Close conversation (for mobile back button)
  const closeConversation = () => {
    if (selectedConversation && socketRef.current) {
      socketRef.current.emit("leave_conversation", selectedConversation.id);
    }
    setSelectedConversation(null);
    setMessages([]);
  };

  // Format file size
  const formatSize = (bytes?: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Upload file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !token) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        try {
          setIsUploading(true);
          const res = await fetch("/api/chat/upload", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              filename: file.name,
              fileData: base64data
            })
          });
          if (!res.ok) throw new Error("Upload failed");
          const uploaded = await res.json();
          
          const isImage = file.type.startsWith("image/");
          setAttachmentQueue(prev => [...prev, {
            type: isImage ? "image" : "document",
            url: uploaded.url,
            name: uploaded.name,
            size: uploaded.size,
            mimeType: file.type
          }]);
        } catch (err) {
          console.error("Upload error:", err);
          alert(`Failed to upload ${file.name}`);
        } finally {
          setIsUploading(false);
        }
      };
    }
    // reset input
    e.target.value = "";
  };

  // Share coordinates/location
  const handleSendLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setAttachmentQueue(prev => [...prev, {
            type: "location",
            latitude,
            longitude,
            name: `Location Coord: (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            address: "Live GPS Coordinates"
          }]);
        },
        (error) => {
          console.warn("Geolocation failed, falling back to manual coordinate modal:", error);
          const latStr = prompt("GPS blocked or unavailable. Enter Latitude manually (e.g. 25.5788):", "25.5788");
          const lngStr = prompt("Enter Longitude manually (e.g. 83.5770):", "83.5770");
          if (latStr && lngStr) {
            const lat = parseFloat(latStr);
            const lng = parseFloat(lngStr);
            if (!isNaN(lat) && !isNaN(lng)) {
              setAttachmentQueue(prev => [...prev, {
                type: "location",
                latitude: lat,
                longitude: lng,
                name: `Location Coord: (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                address: "Manually Typed Coordinates"
              }]);
            }
          }
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  // Start Voice Note Recording
  const startRecording = async () => {
    setRecordingError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          try {
            setIsUploading(true);
            const res = await fetch("/api/chat/upload", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                filename: `voice_note_${Date.now()}.webm`,
                fileData: base64data
              })
            });
            if (!res.ok) throw new Error("Voice Note upload failed");
            const uploaded = await res.json();
            setAttachmentQueue(prev => [...prev, {
              type: "voice",
              url: uploaded.url,
              name: uploaded.name,
              size: uploaded.size
            }]);
          } catch (err: any) {
            console.error("Audio upload error:", err);
            alert("Failed to upload recorded voice note.");
          } finally {
            setIsUploading(false);
          }
        };

        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      setRecordingError("Microphone access denied or unsupported on this browser.");
    }
  };

  // Stop Voice Note Recording
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  // Typing event trigger
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    if (!socketRef.current || !isSocketConnected || !selectedConversation) return;

    if (!isTypingSent) {
      setIsTypingSent(true);
      socketRef.current.emit("typing:start", {
        conversationId: selectedConversation.id,
        userId: user?.id,
        userName: user?.name
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current && isSocketConnected && selectedConversation) {
        socketRef.current.emit("typing:stop", {
          conversationId: selectedConversation.id,
          userId: user?.id
        });
      }
      setIsTypingSent(false);
    }, 2000);
  };

  // Dispatch message
  const handleSendMessage = async (textToSend?: string) => {
    const textValue = textToSend || inputText;
    const messageText = textValue.trim();
    if (!selectedConversation || !token) return;
    if (!messageText && attachmentQueue.length === 0) return;

    if (!textToSend) setInputText(""); // Clear composer if it's manual typing

    // Clear typing timeout and emit typing stop
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (socketRef.current && isSocketConnected) {
      socketRef.current.emit("typing:stop", {
        conversationId: selectedConversation.id,
        userId: user?.id
      });
    }
    setIsTypingSent(false);

    try {
      const res = await fetch(`/api/chat/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          text: messageText,
          attachments: attachmentQueue 
        })
      });
      
      if (!res.ok) throw new Error("Message could not be dispatched.");
      const newMsg = await res.json();
      setAttachmentQueue([]);
      
      // Append to local messages state immediately
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // Update conversations last message
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversation.id
            ? {
                ...c,
                lastMessage: {
                  id: newMsg.id,
                  text: newMsg.text,
                  senderId: newMsg.senderId,
                  senderName: newMsg.senderName,
                  senderRole: newMsg.senderRole,
                  createdAt: newMsg.createdAt
                },
                updatedAt: newMsg.createdAt
              }
            : c
        ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      );
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (dateStr: Date | string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div id="gramgo-chat-module" className="bg-white border border-slate-150 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[650px] lg:h-[700px]">
      {/* Upper bar indicating overall health of the real-time server */}
      <div className="bg-slate-900 px-6 py-3.5 text-white flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-orange-600 rounded-lg">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider">GramGo Village Transport Chat</h3>
            <p className="text-[10px] text-slate-400 font-bold">Secure connection with drivers, passengers & panchayat staff</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
          <span className={`w-2 h-2 rounded-full ${isSocketConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-ping"}`} />
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">
            {isSocketConnected ? "Sync Connected" : "Connecting..."}
          </span>
        </div>
      </div>

      <div className="flex-grow flex overflow-hidden relative">
        {/* LEFT SIDEBAR: List of conversations / Call logs */}
        <div className={`w-full lg:w-1/3 border-r border-slate-100 flex flex-col h-full bg-slate-50/50 ${
          selectedConversation ? "hidden lg:flex" : "flex"
        }`}>
          {/* Header containing switcher */}
          <div className="border-b border-slate-100 bg-white flex flex-col">
            <div className="p-4 pb-2 flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                Community Hub
              </h4>
            </div>
            
            {/* Tab switchers */}
            <div className="flex border-t border-slate-100 bg-slate-50">
              <button 
                onClick={() => setSidebarTab("chats")}
                className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
                  sidebarTab === "chats" 
                    ? "border-orange-600 text-orange-600 bg-white" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chats ({conversations.length})</span>
              </button>
              <button 
                onClick={() => setSidebarTab("calls")}
                className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
                  sidebarTab === "calls" 
                    ? "border-orange-600 text-orange-600 bg-white" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Calls</span>
              </button>
            </div>
          </div>

          {sidebarTab === "chats" ? (
            <div className="flex-grow overflow-y-auto p-2 space-y-1">
              {isLoading && conversations.length === 0 ? (
                <div className="py-24 text-center space-y-3">
                  <Loader className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto text-orange-500" />
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Retrieving community channels...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="py-24 text-center px-4 space-y-4">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-700 uppercase tracking-wider">No Conversations Found</p>
                    <p className="text-[11px] text-slate-400 font-medium">When you book emergency ambulance transit, a real-time driver chat channel will automatically launch here.</p>
                  </div>
                  {user?.role !== "admin" && (
                    <button 
                      onClick={() => initiateDirectConversation("admin")}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      Contact Support Dispatch
                    </button>
                  )}
                </div>
              ) : (
                conversations.map((conv) => {
                  const isSelected = selectedConversation?.id === conv.id;
                  const roleColors: Record<string, string> = {
                    passenger: "bg-orange-100 text-orange-800 border-orange-200",
                    driver: "bg-emerald-100 text-emerald-800 border-emerald-200",
                    admin: "bg-indigo-100 text-indigo-800 border-indigo-200"
                  };

                  const isOnline = onlineUsers.includes(conv.otherParticipant.id);

                  return (
                    <button
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={`w-full flex items-start gap-3 p-3.5 rounded-2xl text-left border transition cursor-pointer ${
                        isSelected
                          ? "bg-white border-orange-200 shadow-sm"
                          : "bg-transparent border-transparent hover:bg-white hover:border-slate-100"
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl flex items-center justify-center text-sm font-black uppercase">
                          {conv.otherParticipant.name.substring(0, 2)}
                        </div>
                        <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                          isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                        }`} />
                      </div>
                      
                      <div className="flex-grow min-w-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-slate-900 truncate">
                            {conv.otherParticipant.name}
                          </span>
                          {conv.lastMessage && (
                            <span className="text-[9px] text-slate-400 font-bold">
                              {formatTime(conv.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.2 text-[8px] uppercase font-black tracking-wider rounded border ${
                            roleColors[conv.otherParticipant.role] || "bg-slate-100 text-slate-700"
                          }`}>
                            {conv.otherParticipant.role}
                          </span>
                          {conv.otherParticipant.village && (
                            <span className="text-[9px] text-slate-400 font-bold truncate">
                              📍 {conv.otherParticipant.village}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 font-medium truncate pt-0.5">
                          {conv.lastMessage ? (
                            conv.lastMessage.senderId === user?.id ? (
                              `You: ${conv.lastMessage.text}`
                            ) : (
                              conv.lastMessage.text
                            )
                          ) : (
                            <span className="italic text-slate-400 font-normal">Channel established</span>
                          )}
                        </p>
                      </div>

                      {conv.unreadCount > 0 && (
                        <span className="w-5 h-5 bg-orange-600 text-white rounded-full flex items-center justify-center text-[9px] font-black uppercase flex-shrink-0 animate-pulse mt-1">
                          {conv.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            /* CALL HISTORY TAB */
            <div className="flex-grow flex flex-col overflow-hidden">
              {/* Search bar */}
              <div className="p-3 border-b border-slate-100 bg-white">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search caller name..."
                    value={callHistorySearch}
                    onChange={(e) => setCallHistorySearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Filter tabs */}
              <div className="p-2 border-b border-slate-100 bg-slate-50/55 flex items-center gap-1 overflow-x-auto scrollbar-none">
                {[
                  { id: "all", label: "All" },
                  { id: "missed", label: "Missed", icon: PhoneMissed },
                  { id: "incoming", label: "Incoming", icon: ArrowDownLeft },
                  { id: "outgoing", label: "Outgoing", icon: ArrowUpRight }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCallHistoryFilter(tab.id as any)}
                    className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shrink-0 cursor-pointer ${
                      callHistoryFilter === tab.id
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {tab.icon && <tab.icon className="w-2.5 h-2.5" />}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Call list scrollable area */}
              <div className="flex-grow overflow-y-auto p-2 space-y-2">
                {isLoadingCalls ? (
                  <div className="py-24 text-center space-y-3">
                    <Loader className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto text-orange-500" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Retrieving call history...</p>
                  </div>
                ) : (() => {
                  const filteredCalls = callHistory.filter((call) => {
                    const searchLower = callHistorySearch.toLowerCase();
                    const isOutgoing = call.callerId === user?.id;
                    const partnerName = isOutgoing ? call.receiverName : call.callerName;
                    const matchesSearch = partnerName.toLowerCase().includes(searchLower);
                    if (!matchesSearch) return false;

                    if (callHistoryFilter === "all") return true;
                    if (callHistoryFilter === "missed") {
                      return call.receiverId === user?.id && (call.status === "missed" || call.status === "rejected" || call.status === "no-answer");
                    }
                    if (callHistoryFilter === "incoming") {
                      return call.receiverId === user?.id && call.status === "completed";
                    }
                    if (callHistoryFilter === "outgoing") {
                      return call.callerId === user?.id;
                    }
                    return true;
                  });

                  if (filteredCalls.length === 0) {
                    return (
                      <div className="py-20 text-center px-4 space-y-3 bg-white border border-slate-100 rounded-2xl m-1">
                        <PhoneCall className="w-10 h-10 text-slate-300 mx-auto" />
                        <div className="space-y-1">
                          <p className="text-[11px] font-black text-slate-700 uppercase tracking-wider">No Call Records Found</p>
                          <p className="text-[10px] text-slate-400 font-medium">Any secure calling activity in GramGo will show up here.</p>
                        </div>
                      </div>
                    );
                  }

                  const formatDuration = (seconds: number) => {
                    if (!seconds || seconds === 0) return "0s";
                    const m = Math.floor(seconds / 60);
                    const s = seconds % 60;
                    return m > 0 ? `${m}m ${s}s` : `${s}s`;
                  };

                  return filteredCalls.map((call) => {
                    const isOutgoing = call.callerId === user?.id;
                    const partnerName = isOutgoing ? call.receiverName : call.callerName;
                    const matchingConv = conversations.find(c => c.id === call.conversationId || c.otherParticipant.id === (isOutgoing ? call.receiverId : call.callerId));

                    let statusIcon = null;
                    let statusText = "";
                    let statusColor = "";
                    
                    if (call.status === "completed") {
                      if (isOutgoing) {
                        statusIcon = <ArrowUpRight className="w-3 h-3 text-indigo-500" />;
                        statusText = "Outgoing Answered";
                        statusColor = "text-slate-600";
                      } else {
                        statusIcon = <ArrowDownLeft className="w-3 h-3 text-emerald-500" />;
                        statusText = "Incoming Answered";
                        statusColor = "text-slate-600";
                      }
                    } else if (call.status === "rejected") {
                      statusIcon = <PhoneMissed className="w-3 h-3 text-rose-500" />;
                      statusText = isOutgoing ? "Call Declined" : "Declined By Me";
                      statusColor = "text-rose-500 font-bold";
                    } else if (call.status === "no-answer") {
                      statusIcon = <PhoneMissed className="w-3 h-3 text-amber-500" />;
                      statusText = "No Answer";
                      statusColor = "text-amber-500 font-bold";
                    } else {
                      statusIcon = <PhoneMissed className="w-3 h-3 text-rose-500" />;
                      statusText = isOutgoing ? "Unanswered" : "Missed Call";
                      statusColor = "text-rose-500 font-bold";
                    }

                    const callDate = new Date(call.createdAt);

                    return (
                      <div 
                        key={call.id}
                        className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl transition shadow-xs gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative flex-shrink-0">
                            <div className="w-8 h-8 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg flex items-center justify-center font-black text-xs uppercase">
                              {partnerName.substring(0, 2)}
                            </div>
                          </div>
                          
                          <div className="min-w-0">
                            <p className="font-extrabold text-[11px] text-slate-900 truncate">
                              {partnerName}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              {statusIcon}
                              <span className={`text-[9px] ${statusColor}`}>
                                {statusText}
                              </span>
                              <span className="text-[8px] text-slate-400 font-bold">
                                • {callDate.toLocaleDateString([], { month: "short", day: "numeric" })} {callDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="text-[8px] text-slate-500 font-bold mt-0.5 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-slate-400" />
                              <span>Duration: {formatDuration(call.duration)}</span>
                            </p>
                          </div>
                        </div>

                        {matchingConv && (
                          <button
                            onClick={() => {
                              selectConversation(matchingConv);
                              setSidebarTab("chats");
                              setTimeout(() => {
                                initiateVoiceCall();
                              }, 350);
                            }}
                            className="p-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg transition cursor-pointer shrink-0"
                            title={`Call ${partnerName} back`}
                          >
                            <Phone className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT AREA: Conversation Chat Box */}
        <div className={`w-full lg:w-2/3 flex flex-col h-full bg-white ${
          selectedConversation ? "flex" : "hidden lg:flex"
        }`}>
          {selectedConversation ? (
            <>
              {/* Active Conversation Header */}
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={closeConversation}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition lg:hidden"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 bg-slate-200 border border-slate-300 text-slate-800 rounded-xl flex items-center justify-center font-black text-xs uppercase">
                      {selectedConversation.otherParticipant.name.substring(0, 2)}
                    </div>
                    <span className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border border-white ${
                      onlineUsers.includes(selectedConversation.otherParticipant.id) ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                    }`} />
                  </div>
                  
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-xs text-slate-900 truncate">
                      {selectedConversation.otherParticipant.name}
                    </h4>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-1.5 py-0.5 text-[8px] uppercase font-black tracking-wider rounded border flex items-center gap-1 ${
                        onlineUsers.includes(selectedConversation.otherParticipant.id)
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          onlineUsers.includes(selectedConversation.otherParticipant.id) ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                        }`} />
                        {onlineUsers.includes(selectedConversation.otherParticipant.id) ? "Online" : "Offline"}
                      </span>
                      {selectedConversation.otherParticipant.phone && (
                        <span className="text-[9px] text-slate-400 font-bold">
                          ☎️ {selectedConversation.otherParticipant.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* In-App Voice Call Button */}
                  <button 
                    onClick={initiateVoiceCall}
                    className="p-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    title="Start in-app high-quality voice call"
                  >
                    <Phone className="w-3.5 h-3.5 text-white animate-bounce" />
                    <span>In-App Call</span>
                  </button>

                  {selectedConversation.otherParticipant.phone && (
                    <a 
                      href={`tel:${selectedConversation.otherParticipant.phone}`}
                      className="p-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1.5"
                      title="Direct cellular dialer backup"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="hidden sm:inline">Cellular Backup</span>
                    </a>
                  )}
                  {selectedConversation.rideId && (
                    <span className="text-[9px] bg-slate-100 text-slate-700 font-extrabold uppercase px-2 py-1.5 rounded-xl border border-slate-200 hidden md:inline">
                      Ride ID: {selectedConversation.rideId.slice(0, 8)}...
                    </span>
                  )}
                </div>
              </div>

              {/* Informative participant panel details inside chat block */}
              {selectedConversation.otherParticipant.role === "driver" && (
                <div className="bg-orange-50/30 px-5 py-2.5 border-b border-orange-100 flex items-center justify-between text-[11px] text-slate-600">
                  <div className="flex items-center gap-2 font-bold">
                    <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                    <span>Driver Village: {selectedConversation.otherParticipant.village || "Ghazipur HQ"}</span>
                  </div>
                  {selectedConversation.otherParticipant.vehicleType && (
                    <div className="font-black text-slate-800">
                      🚚 {selectedConversation.otherParticipant.vehicleType} • {selectedConversation.otherParticipant.vehicleNumber || "UP-61-PANCHAYAT"}
                    </div>
                  )}
                </div>
              )}

              {/* Message Lists container */}
              <div className="flex-grow overflow-y-auto p-5 space-y-4 bg-slate-50/30">
                {messagesLoading ? (
                  <div className="py-24 text-center space-y-3">
                    <Loader className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto text-orange-500" />
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Retrieving message history...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Start of Conversation</p>
                      <p className="text-[11px] text-slate-400 font-bold">Type your text below or choose a quick template reply.</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isSelf = msg.senderId === user?.id;
                    const hasRead = msg.readBy && msg.readBy.length > 1;

                    return (
                      <div 
                        key={msg.id || index}
                        className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                      >
                        <div className="max-w-[85%] sm:max-w-[70%] space-y-1">
                          {/* Name on bubble */}
                          {!isSelf && (
                            <span className="text-[9px] text-slate-400 font-black block pl-1.5 uppercase">
                              {msg.senderName} ({msg.senderRole})
                            </span>
                          )}
                          
                          {/* Bubble text */}
                          {msg.text && (
                            <div className={`p-3.5 rounded-3xl text-xs font-semibold leading-relaxed shadow-sm ${
                              isSelf
                                ? "bg-slate-900 text-white rounded-tr-none"
                                : "bg-white border border-slate-100 text-slate-800 rounded-tl-none"
                            }`}>
                              <p>{msg.text}</p>
                            </div>
                          )}

                          {/* Render message attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="space-y-2 mt-1.5 flex flex-col">
                              {msg.attachments.map((att: any, attIdx: number) => {
                                if (att.type === "image") {
                                  return (
                                    <div key={attIdx} className={`relative group rounded-2xl overflow-hidden border border-slate-150 max-w-sm shadow-sm bg-white ${isSelf ? 'self-end' : 'self-start'}`}>
                                      <img src={att.url} alt={att.name || "Image"} className="w-full max-h-48 object-cover" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <button
                                          onClick={() => setActivePreviewImage(att.url)}
                                          className="p-2 bg-white/90 hover:bg-white text-slate-800 rounded-xl transition shadow flex items-center justify-center cursor-pointer"
                                          title="Preview Image"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                        <a
                                          href={att.url}
                                          download={att.name || "image.png"}
                                          className="p-2 bg-white/90 hover:bg-white text-slate-800 rounded-xl transition shadow flex items-center justify-center cursor-pointer"
                                          title="Download Image"
                                        >
                                          <Download className="w-4 h-4" />
                                        </a>
                                      </div>
                                    </div>
                                  );
                                } else if (att.type === "voice") {
                                  return (
                                    <div key={attIdx} className={`${isSelf ? 'self-end' : 'self-start'}`}>
                                      <AudioPlayer src={att.url || ""} name={att.name} />
                                    </div>
                                  );
                                } else if (att.type === "location") {
                                  return (
                                    <div key={attIdx} className={`bg-white border border-slate-200 p-3 rounded-2xl max-w-xs shadow-sm space-y-2 text-left ${isSelf ? 'self-end' : 'self-start'}`}>
                                      <div className="flex items-start gap-2.5">
                                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl flex-shrink-0">
                                          <MapPin className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Shared Location</span>
                                          <span className="text-[11px] font-bold text-slate-700 block truncate">{att.address || "Live Coordinates"}</span>
                                          <span className="text-[9px] text-slate-400 font-semibold block">{att.latitude?.toFixed(4)}, {att.longitude?.toFixed(4)}</span>
                                        </div>
                                      </div>
                                      <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${att.latitude},${att.longitude}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                                      >
                                        <Map className="w-3.5 h-3.5" />
                                        <span>Open in Maps</span>
                                      </a>
                                    </div>
                                  );
                                } else {
                                  // Generic Document
                                  return (
                                    <div key={attIdx} className={`bg-white border border-slate-200 p-3 rounded-2xl max-w-xs shadow-sm flex items-center justify-between gap-3 text-left ${isSelf ? 'self-end' : 'self-start'}`}>
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl flex-shrink-0">
                                          <FileText className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                          <span className="text-[11px] font-extrabold text-slate-700 block truncate" title={att.name}>{att.name || "Document"}</span>
                                          <span className="text-[9px] text-slate-400 font-bold block uppercase">{formatSize(att.size)}</span>
                                        </div>
                                      </div>
                                      <a
                                        href={att.url}
                                        download={att.name || "document"}
                                        className="p-2 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-xl border border-slate-100 transition-all flex-shrink-0 flex items-center justify-center cursor-pointer"
                                        title="Download Document"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                  );
                                }
                              })}
                            </div>
                          )}

                          {/* Date and Read status */}
                          <div className={`flex items-center gap-1.5 text-[9px] text-slate-400 font-bold px-1.5 justify-end`}>
                            <Clock className="w-2.5 h-2.5" />
                            <span>{formatTime(msg.createdAt)}</span>
                            {isSelf && (
                              hasRead ? (
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-slate-300" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                
                {/* Typing indicator inside scrolling chat area */}
                {typingUsers[`${selectedConversation.id}_${selectedConversation.otherParticipant.id}`] && (
                  <div className="flex justify-start items-center gap-2 pl-2 py-1 text-[11px] text-slate-500 font-bold animate-pulse">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                    <span>{selectedConversation.otherParticipant.name} is typing...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick replies buttons */}
              <div className="px-4 py-2 border-t border-slate-100 bg-white overflow-x-auto whitespace-nowrap flex items-center gap-1.5 scrollbar-none">
                <span className="text-[8px] font-black uppercase text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-orange-500" />
                  Quick:
                </span>
                {getQuickReplies().map((replyText, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(replyText)}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-orange-50 text-slate-600 hover:text-orange-700 border border-slate-150 hover:border-orange-200 text-[10px] font-black uppercase rounded-full cursor-pointer transition flex-shrink-0"
                  >
                    {replyText}
                  </button>
                ))}
              </div>

              {/* Uploading progress indicator */}
              {isUploading && (
                <div className="px-5 py-2 bg-orange-50 text-orange-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-2 border-t border-slate-100">
                  <Loader className="w-3.5 h-3.5 animate-spin text-orange-600 flex-shrink-0" />
                  <span>Processing and uploading attachment...</span>
                </div>
              )}

              {/* Attachment Queue Grid Preview */}
              {attachmentQueue.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-2.5">
                  {attachmentQueue.map((att, idx) => (
                    <div key={idx} className="relative bg-white border border-slate-200 p-2 rounded-xl flex items-center gap-2 max-w-xs group shadow-sm">
                      {att.type === "image" ? (
                        <img src={att.url} alt="thumbnail" className="w-8 h-8 rounded-lg object-cover" />
                      ) : att.type === "voice" ? (
                        <Mic className="w-8 h-8 p-1.5 bg-orange-100 text-orange-600 rounded-lg" />
                      ) : att.type === "location" ? (
                        <MapPin className="w-8 h-8 p-1.5 bg-emerald-100 text-emerald-600 rounded-lg" />
                      ) : (
                        <FileText className="w-8 h-8 p-1.5 bg-indigo-100 text-indigo-600 rounded-lg" />
                      )}
                      <div className="min-w-0 pr-6">
                        <p className="text-[10px] font-black uppercase text-slate-700 truncate">{att.name || att.type}</p>
                        <p className="text-[9px] text-slate-400 font-bold">{formatSize(att.size)}</p>
                      </div>
                      <button
                        onClick={() => {
                          setAttachmentQueue(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="absolute top-1 right-1 p-0.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-md transition cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Text composer bar */}
              <div className="p-4 border-t border-slate-100 bg-white flex flex-col gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  className="hidden"
                />

                <div className="flex items-center gap-2">
                  {/* Attach Files Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach image or document"
                    className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-2xl transition cursor-pointer flex items-center justify-center flex-shrink-0"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {/* Geolocation Coordinates Button */}
                  <button
                    onClick={handleSendLocation}
                    title="Send current location coordinates"
                    className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-2xl transition cursor-pointer flex items-center justify-center flex-shrink-0"
                  >
                    <MapPin className="w-4 h-4" />
                  </button>

                  {/* Voice Note Button */}
                  {isRecording ? (
                    <button
                      onClick={stopRecording}
                      title="Stop recording voice note"
                      className="p-3 bg-red-100 text-red-600 hover:bg-red-200 rounded-2xl transition cursor-pointer flex items-center justify-center gap-1.5 flex-shrink-0 animate-pulse font-black text-[10px] uppercase tracking-wider"
                    >
                      <Square className="w-4 h-4 text-red-600 fill-current" />
                      <span>{recordingTime}s</span>
                    </button>
                  ) : (
                    <button
                      onClick={startRecording}
                      title="Record voice note"
                      className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-2xl transition cursor-pointer flex items-center justify-center flex-shrink-0"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  )}

                  {recordingError && (
                    <span className="text-[9px] text-red-500 font-bold max-w-[150px] truncate" title={recordingError}>
                      {recordingError}
                    </span>
                  )}

                  <div className="flex-grow relative">
                    <input
                      type="text"
                      placeholder={isRecording ? "Recording voice note..." : "Type message..."}
                      disabled={isRecording}
                      value={inputText}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSendMessage();
                      }}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white disabled:opacity-50 text-xs font-semibold px-4 py-3 rounded-2xl outline-none transition"
                    />
                  </div>
                  
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputText.trim() && attachmentQueue.length === 0}
                    className={`p-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white rounded-2xl transition shadow-sm cursor-pointer flex items-center justify-center`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 border border-slate-100 text-slate-300 rounded-3xl flex items-center justify-center shadow-inner">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">No Active Conversation</h4>
                <p className="text-[11px] text-slate-400 font-bold">Select a chat on the left side to review logs, coordinates, and converse in real-time.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Modal Overlay */}
      {activePreviewImage && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-4"
          onClick={() => setActivePreviewImage(null)}
        >
          <button 
            onClick={() => setActivePreviewImage(null)}
            className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          
          <img 
            src={activePreviewImage} 
            alt="Preview" 
            className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          
          <div className="mt-4 flex gap-3">
            <a 
              href={activePreviewImage} 
              download="preview_image.png"
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="w-4 h-4" />
              <span>Download Full Image</span>
            </a>
            <button 
              onClick={() => setActivePreviewImage(null)}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Real-time Voice Call Screen Overlay */}
      {callState !== "idle" && (
        <div id="voice-call-overlay" className="fixed inset-0 z-[150] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-between p-8 md:p-12 text-white select-none animate-fade-in font-sans">
          
          {/* Hidden audio tag for WebRTC stream */}
          <audio id="remoteCallAudio" autoPlay className="hidden" />

          {/* Top Status Header */}
          <div className="w-full flex flex-col items-center gap-1.5 mt-4">
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span className={`w-2 h-2 rounded-full ${
                callState === "connected" ? "bg-emerald-500 animate-pulse" : "bg-orange-500 animate-ping"
              }`} />
              <span>{currentCallInfo?.isSimulated ? "Simulated Emergency Channel" : "Direct Voice Link"}</span>
            </div>
            {currentCallInfo?.isSimulated && (
              <span className="text-[9px] text-orange-400 font-extrabold uppercase tracking-wide">
                Interactive Simulator Fallback Active
              </span>
            )}
          </div>

          {/* Central Call Card / Avatar Pulse */}
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="relative flex items-center justify-center">
              {/* Radar pulse rings */}
              <div className={`absolute w-36 h-36 rounded-full bg-orange-500/20 border border-orange-500/30 animate-ping ${
                callState === "connected" ? "duration-1000" : "duration-700"
              }`} />
              <div className="absolute w-48 h-48 rounded-full bg-slate-500/5 border border-slate-500/10 animate-pulse" />
              
              <div className="relative w-28 h-28 bg-slate-800 border-2 border-orange-500/40 rounded-3xl flex items-center justify-center shadow-2xl overflow-hidden">
                <div className="text-3xl font-black uppercase text-slate-100">
                  {currentCallInfo?.partnerName?.substring(0, 2) || "VC"}
                </div>
              </div>
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-black tracking-tight text-white">
                {currentCallInfo?.partnerName || "Lifeline Agent"}
              </h3>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {currentCallInfo?.partnerRole || "Responder"}
              </p>
            </div>

            {/* Timer & Connection Status Text */}
            <div className="text-center py-2">
              {callState === "calling" && (
                <div className="space-y-1">
                  <p className="text-sm font-black text-orange-400 uppercase tracking-widest animate-pulse">DIALING RECIPIENT...</p>
                  <p className="text-[10px] text-slate-400 font-bold">Waiting for answer or satellite backup...</p>
                </div>
              )}
              {callState === "incoming" && (
                <div className="space-y-1">
                  <p className="text-sm font-black text-emerald-400 uppercase tracking-widest animate-bounce">INCOMING CALL</p>
                  <p className="text-[10px] text-slate-400 font-bold">Answer to connect secure real-time audio channel</p>
                </div>
              )}
              {callState === "connected" && (
                <div className="space-y-2">
                  <div className="text-4xl font-mono font-bold tracking-wider text-white">
                    {formatCallTime(callTimer)}
                  </div>
                  <p className="text-[10px] text-emerald-400 font-black uppercase tracking-wider">Active Voice Connection</p>
                </div>
              )}
              {callState === "disconnected" && (
                <div className="space-y-1">
                  <p className="text-sm font-black text-red-500 uppercase tracking-widest">CALL ENDED</p>
                  <p className="text-[10px] text-slate-400 font-bold">Releasing radio frequencies...</p>
                </div>
              )}
            </div>
          </div>

          {/* Lower Interactive Controls panel */}
          <div className="w-full max-w-sm flex flex-col items-center gap-8 mb-6">
            
            {/* Connected call features: Mute & Speaker */}
            {callState === "connected" && (
              <div className="flex items-center gap-12">
                {/* Mute button */}
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className={`flex flex-col items-center gap-2 cursor-pointer transition group`}
                >
                  <div className={`p-4 rounded-2xl border transition ${
                    isMuted 
                      ? "bg-red-500/20 border-red-500 text-red-400" 
                      : "bg-white/5 border-white/10 text-white hover:bg-white/15"
                  }`}>
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {isMuted ? "Muted" : "Mute"}
                  </span>
                </button>

                {/* Speaker button */}
                <button 
                  onClick={() => setIsSpeaker(!isSpeaker)}
                  className={`flex flex-col items-center gap-2 cursor-pointer transition group`}
                >
                  <div className={`p-4 rounded-2xl border transition ${
                    isSpeaker 
                      ? "bg-orange-500/20 border-orange-500 text-orange-400" 
                      : "bg-white/5 border-white/10 text-white hover:bg-white/15"
                  }`}>
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {isSpeaker ? "Speaker On" : "Speaker"}
                  </span>
                </button>
              </div>
            )}

            {/* Accept / Decline buttons block */}
            <div className="w-full flex items-center justify-center gap-8">
              {callState === "incoming" ? (
                <>
                  {/* Decline Call Button */}
                  <button 
                    onClick={rejectVoiceCall}
                    className="flex flex-col items-center gap-2.5 group cursor-pointer"
                  >
                    <div className="w-16 h-16 bg-red-600 hover:bg-red-700 hover:scale-105 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg transition">
                      <PhoneOff className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-400">Decline</span>
                  </button>

                  {/* Accept Call Button */}
                  <button 
                    onClick={acceptVoiceCall}
                    className="flex flex-col items-center gap-2.5 group cursor-pointer"
                  >
                    <div className="w-16 h-16 bg-emerald-600 hover:bg-emerald-700 hover:scale-105 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg transition animate-pulse">
                      <Phone className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Accept</span>
                  </button>
                </>
              ) : (
                /* End Call Button for Outgoing / Connected / Disconnecting states */
                <button 
                  onClick={() => endVoiceCall(true)}
                  disabled={callState === "disconnected"}
                  className="flex flex-col items-center gap-2.5 group cursor-pointer disabled:opacity-40"
                >
                  <div className="w-16 h-16 bg-red-600 hover:bg-red-700 hover:scale-105 active:scale-95 text-white rounded-full flex items-center justify-center shadow-2xl transition">
                    <PhoneOff className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-400">End Call</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
