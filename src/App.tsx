import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  Activity, 
  Twitter, 
  Map as MapIcon, 
  Users, 
  FileText, 
  RefreshCw, 
  Clock,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Info,
  LogIn,
  LogOut,
  Bookmark,
  BrainCircuit
} from 'lucide-react';
import { ConflictData, BreakingEvent, XPost, ThreatLevel, ConfidenceLevel } from './types';
import { fetchConflictData, fetchDeepAnalysis } from './services/geminiService';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, setDoc, doc, getDoc } from 'firebase/firestore';

// --- Components ---

function Badge({ children, color }: { children: React.ReactNode, color: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${color}`}>
      {children}
    </span>
  );
}

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const colors = {
    verified: "bg-green-500/20 text-green-400 border border-green-500/30",
    unverified: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    rumor: "bg-red-500/20 text-red-400 border border-red-500/30"
  };
  return <Badge color={colors[level]}>{level}</Badge>;
}

function ThreatIndicator({ level }: { level: ThreatLevel }) {
  const colors = {
    LOW: "text-green-500",
    MEDIUM: "text-yellow-500",
    HIGH: "text-orange-500",
    CRITICAL: "text-red-500"
  };
  
  const bgColors = {
    LOW: "bg-green-500/10",
    MEDIUM: "bg-yellow-500/10",
    HIGH: "bg-orange-500/10",
    CRITICAL: "bg-red-500/10"
  };

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border border-white/5 ${bgColors[level]}`}>
      <ShieldAlert className={`w-8 h-8 ${colors[level]}`} />
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] opacity-50 font-bold">Current Threat Level</div>
        <div className={`text-2xl font-black tracking-tighter ${colors[level]}`}>{level}</div>
      </div>
    </div>
  );
}

function LiveTicker({ events }: { events: BreakingEvent[] }) {
  return (
    <div className="bg-black/40 border-y border-white/5 py-2 overflow-hidden whitespace-nowrap relative">
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-black to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black to-transparent z-10" />
      <motion.div 
        className="inline-block"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      >
        {events.map((event, i) => (
          <span key={i} className="mx-8 text-xs font-medium text-white/70">
            <span className="text-[#E24B4A] font-bold mr-2">BREAKING:</span>
            {event.headline}
            <span className="mx-4 opacity-30">|</span>
          </span>
        ))}
        {/* Duplicate for seamless loop */}
        {events.map((event, i) => (
          <span key={`dup-${i}`} className="mx-8 text-xs font-medium text-white/70">
            <span className="text-[#E24B4A] font-bold mr-2">BREAKING:</span>
            {event.headline}
            <span className="mx-4 opacity-30">|</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

function BreakingNewsCard({ event, user }: { event: BreakingEvent, user: User | null }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!user) return alert("Please sign in to save events.");
    setSaving(true);
    try {
      await addDoc(collection(db, 'bookmarks'), {
        userId: user.uid,
        headline: event.headline,
        detail: event.detail,
        category: event.category,
        source: event.source,
        source_url: event.source_url || "",
        timestamp: event.timestamp,
        confidence: event.confidence,
        savedAt: serverTimestamp()
      });
      setSaved(true);
    } catch (err) {
      console.error("Error saving bookmark:", err);
      alert("Failed to save bookmark.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#E24B4A]/50 transition-colors group relative"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex gap-2">
          <ConfidenceBadge level={event.confidence} />
          <Badge color="bg-white/10 text-white/60">{event.category.replace('_', ' ')}</Badge>
        </div>
        <span className="text-[10px] font-mono text-white/40">{new Date(event.timestamp).toLocaleTimeString()}</span>
      </div>
      <h3 className="text-sm font-bold text-white mb-1 group-hover:text-[#E24B4A] transition-colors pr-8">{event.headline}</h3>
      <p className="text-xs text-white/60 leading-relaxed mb-3">{event.detail}</p>
      <div className="flex justify-between items-center pt-3 border-t border-white/5">
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{event.source}</span>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSave}
            disabled={saving || saved}
            className="text-[10px] flex items-center gap-1 text-white/60 hover:text-white transition-colors disabled:opacity-50"
          >
            <Bookmark className={`w-3 h-3 ${saved ? 'fill-white' : ''}`} />
            {saved ? 'SAVED' : 'SAVE'}
          </button>
          <a 
            href={event.source_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[10px] text-[#E24B4A] hover:underline flex items-center gap-1"
          >
            SOURCE <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

function XPostCard({ post }: { post: XPost }) {
  return (
    <div className="p-3 rounded-lg bg-white/5 border border-white/5 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <Twitter className="w-3 h-3 text-sky-400" />
        <span className="text-xs font-bold text-white/80">@{post.username}</span>
        {post.verified_account && <div className="w-2 h-2 bg-sky-400 rounded-full" />}
      </div>
      <p className="text-xs text-white/60 leading-snug">{post.content}</p>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [data, setData] = useState<ConflictData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState(60);
  const [user, setUser] = useState<User | null>(null);
  const [deepAnalysis, setDeepAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Ensure user document exists
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            email: currentUser.email,
            role: 'user',
            createdAt: serverTimestamp()
          });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Sign in error:", err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const handleDeepAnalysis = async () => {
    if (!data) return;
    setAnalyzing(true);
    try {
      const context = JSON.stringify(data);
      const analysis = await fetchDeepAnalysis(context);
      setDeepAnalysis(analysis);
    } catch (err) {
      console.error("Deep analysis error:", err);
      alert("Failed to generate deep analysis.");
    } finally {
      setAnalyzing(false);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchConflictData();
      setData(result);
      setRefreshCountdown(60);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch intelligence data. Retrying...");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          loadData();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="mb-6"
        >
          <RefreshCw className="w-12 h-12 text-[#E24B4A]" />
        </motion.div>
        <h1 className="text-2xl font-black tracking-tighter mb-2">INITIALIZING INTEL AGGREGATOR</h1>
        <p className="text-white/40 text-sm font-mono animate-pulse">SCRAPING GLOBAL FEEDS...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[#E24B4A]/30">
      {/* Header */}
      <header className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#E24B4A] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(226,75,74,0.3)]">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter leading-none">IRAN CONFLICT LIVE TRACKER</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">v1.0.0-BETA</span>
              <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono text-green-500 uppercase tracking-widest">LIVE INTEL FEED</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-4 border-r border-white/10 pr-4">
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Next Refresh</div>
            <div className="flex items-center gap-2 text-sm font-bold font-mono">
              <Clock className="w-4 h-4 text-[#E24B4A]" />
              {refreshCountdown}s
            </div>
          </div>
          
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Analyst</div>
                <div className="text-xs font-bold text-white/80">{user.email}</div>
              </div>
              <button onClick={handleSignOut} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <LogOut className="w-4 h-4 text-white/60" />
              </button>
            </div>
          ) : (
            <button onClick={handleSignIn} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E24B4A]/20 text-[#E24B4A] hover:bg-[#E24B4A]/30 transition-colors text-xs font-bold uppercase tracking-widest">
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          )}

          <button 
            onClick={loadData}
            disabled={loading}
            className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all disabled:opacity-50 ml-2"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Live Ticker */}
      {data && <LiveTicker events={data.breaking_events} />}

      <main className="p-6 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Summary & Events */}
        <div className="lg:col-span-8 space-y-6">
          {/* Situation Summary */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 p-6 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <FileText className="w-24 h-24" />
              </div>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#E24B4A] mb-3">Situation Summary (BLUF)</h2>
              <p className="text-lg font-medium leading-relaxed text-white/90">
                {data?.situation_summary}
              </p>
            </div>
            <div className="space-y-4">
              {data && <ThreatIndicator level={data.threat_level} />}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] uppercase tracking-[0.2em] opacity-50 font-bold mb-2">Last Updated</div>
                <div className="text-sm font-mono font-bold text-white/80">{data?.last_updated}</div>
              </div>
            </div>
          </section>

          {/* Breaking Events Feed */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-sm font-black tracking-widest uppercase">
                <AlertTriangle className="w-4 h-4 text-[#E24B4A]" />
                Breaking Intelligence Feed
              </h2>
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                {data?.breaking_events.length} ACTIVE EVENTS
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {data?.breaking_events.map((event, i) => (
                  <BreakingNewsCard key={i} event={event} user={user} />
                ))}
              </AnimatePresence>
            </div>
          </section>
        </div>

        {/* Right Column: Social & Analysis */}
        <div className="lg:col-span-4 space-y-6">
          {/* X Panel */}
          <section className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col h-[500px]">
            <h2 className="flex items-center gap-2 text-sm font-black tracking-widest uppercase mb-4">
              <Twitter className="w-4 h-4 text-sky-400" />
              Social Intelligence (X.com)
            </h2>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {data?.x_posts.map((post, i) => (
                <XPostCard key={i} post={post} />
              ))}
            </div>
          </section>

          {/* Actor Tracker */}
          <section className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h2 className="flex items-center gap-2 text-sm font-black tracking-widest uppercase mb-4">
              <Users className="w-4 h-4 text-purple-400" />
              Key Actors Tracker
            </h2>
            <div className="flex flex-wrap gap-2">
              {data?.key_actors.map((actor, i) => (
                <div key={i} className="px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-xs font-bold text-white/70 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                  {actor}
                </div>
              ))}
            </div>
          </section>

          {/* Analyst Assessment */}
          <section className="p-6 rounded-2xl bg-[#E24B4A]/10 border border-[#E24B4A]/20">
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-2 text-sm font-black tracking-widest uppercase text-[#E24B4A]">
                <TrendingUp className="w-4 h-4" />
                Analyst Assessment
              </h2>
              <button 
                onClick={handleDeepAnalysis}
                disabled={analyzing}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[#E24B4A]/20 hover:bg-[#E24B4A]/30 text-[#E24B4A] text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                <BrainCircuit className={`w-3 h-3 ${analyzing ? 'animate-pulse' : ''}`} />
                {analyzing ? 'Thinking...' : 'Deep Analysis'}
              </button>
            </div>
            <p className="text-xs text-white/80 leading-relaxed italic">
              "{data?.analyst_assessment}"
            </p>
            
            <AnimatePresence>
              {deepAnalysis && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-[#E24B4A]/20"
                >
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#E24B4A] mb-2 flex items-center gap-2">
                    <BrainCircuit className="w-3 h-3" /> Strategic Projection (Gemini 3.1 Pro)
                  </h3>
                  <div className="text-xs text-white/90 leading-relaxed whitespace-pre-wrap font-serif">
                    {deepAnalysis}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-4 pt-4 border-t border-[#E24B4A]/20">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Next 24h Watch</h3>
              <p className="text-xs font-bold text-white/90">{data?.next_24h_watch}</p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-8 border-t border-white/5 text-center">
        <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.5em]">
          End of Intelligence Report | AI-Generated Content | Verify all sources
        </p>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(226, 75, 74, 0.5);
        }
      `}</style>
    </div>
  );
}
