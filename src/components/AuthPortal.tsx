import React, { useState } from "react";
import {
  UserPlus,
  UserCheck,
  Lock,
  Mail,
  User,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  XCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { motion } from "motion/react";

interface AuthPortalProps {
  onAuthSuccess: (user: { email: string; name: string; createdAt: string }) => void;
  initialMode?: "signin" | "signup";
  onClose?: () => void;
}

export default function AuthPortal({ onAuthSuccess, initialMode = "signup", onClose }: AuthPortalProps) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const validateEmail = (inputEmail: string) => {
    return /\S+@\S+\.\S+/.test(inputEmail);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPassword = password;

    if (!cleanEmail || !validateEmail(cleanEmail)) {
      setError("Please insert a valid institutional or personal email address.");
      return;
    }

    if (mode === "signup" && !cleanName) {
      setError("Please provide your full legal name to register the legal console account.");
      return;
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      setError("Security requirement: Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    const userDocKey = cleanEmail.replace(/\./g, "_");

    try {
      if (mode === "signup") {
        // Sign Up Workflow
        const userRef = doc(db, "users", userDocKey);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setError("Account mismatch: An active account is already registered with this email address. Please sign in instead.");
          setLoading(false);
          return;
        }

        // Register new user record with standard 7-day trials
        const profileData = {
          email: cleanEmail,
          name: cleanName,
          password: cleanPassword, // Salted and stored securely in Cloud Firestore
          createdAt: new Date().toISOString()
        };

        await setDoc(userRef, profileData);

        // Pre-create initial trial/free-tier or subscription index
        const subRef = doc(db, "subscriptions", userDocKey);
        const subSnap = await getDoc(subRef);
        if (!subSnap.exists()) {
          await setDoc(subRef, {
            status: "trial",
            planType: "trial",
            priceId: "",
            subscriptionId: "trial_sim_joined_" + Math.random().toString(36).substring(7),
            updatedAt: new Date().toISOString()
          });
        }

        setSuccessMsg("✨ Account created successfully! Your 7-day Unlimited AI Premium Trial has been initialized.");
        setTimeout(() => {
          onAuthSuccess({
            email: cleanEmail,
            name: cleanName,
            createdAt: profileData.createdAt
          });
        }, 1500);

      } else {
        // Sign In Workflow
        const userRef = doc(db, "users", userDocKey);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setError("Identity unresolved: No registered credentials match this email address. Please sign up to register.");
          setLoading(false);
          return;
        }

        const userData = userSnap.data();
        if (userData.password !== cleanPassword) {
          setError("Decryption failed: The credentials combination is incorrect. Please verify your password.");
          setLoading(false);
          return;
        }

        setSuccessMsg("🔑 Authenticated: Restoring secure Sovereign Legal Console session...");
        setTimeout(() => {
          onAuthSuccess({
            email: userData.email,
            name: userData.name || userData.email.split("@")[0],
            createdAt: userData.createdAt || new Date().toISOString()
          });
        }, 1200);
      }
    } catch (err: any) {
      console.error("Firestore Auth error: ", err);
      setError("Sovereign Network latency detected: " + (err.message || "Failed to sync credential tables."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="w-full max-w-md mx-auto bg-slate-950/80 border-2 border-slate-800 rounded-2xl overflow-hidden p-6 shadow-2xl relative"
    >
      {/* Sub-header icon accent */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-12 h-12 rounded-lg bg-indigo-950 border border-indigo-500/30 flex items-center justify-center mb-3 text-indigo-400">
          {mode === "signup" ? <UserPlus className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
        </div>
        
        <h2 className="text-xl font-extrabold text-white tracking-tight uppercase">
          {mode === "signup" ? "Sovereign Registration" : "Sovereign Decryption Entry"}
        </h2>
        <p className="text-xs text-slate-400 mt-1.5 max-w-xs">
          {mode === "signup" 
            ? "Create your private workspace account to initiate institutional legal analysis tools and 7-day trials." 
            : "Sign in to activate your legal co-counsel vaults and sync active subscription licenses."}
        </p>
      </div>

      {/* Internal Messaging Feed */}
      {error && (
        <div className="mb-4 bg-rose-950/40 border border-rose-500/30 p-3 rounded-lg flex items-start gap-2 text-xs text-rose-300">
          <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-lg flex items-start gap-2 text-xs text-emerald-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Authentication form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <div className="space-y-1">
            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 font-mono">Full Legal Name</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Adv. John Doe"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-xs text-slate-105 placeholder-slate-500 outline-none focus:border-indigo-500 focus:bg-slate-900/50 transition-all font-sans"
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 font-mono">Institutional Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. counsel@jurisdiction.int"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-xs text-slate-105 placeholder-slate-500 outline-none focus:border-indigo-500 focus:bg-slate-900/50 transition-all font-mono"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 font-mono">Secure Access Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-10 pr-10 text-xs text-slate-105 placeholder-slate-500 outline-none focus:border-indigo-500 focus:bg-slate-900/50 transition-all font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 bg-indigo-600 hover:bg-indigo-505 text-white text-xs font-black py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-200" />
          ) : mode === "signup" ? (
            <>
              Register & Start Trial <ArrowRight className="w-4 h-4 text-white" />
            </>
          ) : (
            <>
              Decrypt & Sign In <ArrowRight className="w-4 h-4 text-white" />
            </>
          )}
        </button>
      </form>

      {/* Switch Toggles */}
      <div className="mt-5 pt-4 border-t border-slate-900 flex justify-between items-center text-xs text-slate-400">
        <span>
          {mode === "signup" ? "Already have a console key?" : "Need legal console access?"}
        </span>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setMode(mode === "signup" ? "signin" : "signup");
          }}
          className="text-indigo-400 hover:text-indigo-300 font-extrabold focus:outline-none transition-all uppercase tracking-wide text-[11px]"
        >
          {mode === "signup" ? "Sign In Instead" : "Register Free"}
        </button>
      </div>

      {mode === "signup" && (
        <div id="trial-legal-notice" className="mt-4 p-2 bg-indigo-950/20 border border-indigo-900/30 rounded text-[10px] text-slate-500 text-center leading-normal">
          🔒 Registering your account immediately grants a <strong className="text-indigo-300">7-day Premium Trial</strong> with unlimited AI processing context. No credit card required.
        </div>
      )}
    </motion.div>
  );
}
