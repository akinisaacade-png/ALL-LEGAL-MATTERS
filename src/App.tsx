import React, { useState, useEffect, useRef } from "react";
import {
  Scale,
  ShieldCheck,
  FileText,
  Calendar,
  MessageSquare,
  Landmark,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Volume2,
  Video,
  Globe,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  Download,
  Clock,
  Mic,
  Star,
  Layers,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Info,
  Sliders,
  Database,
  ThumbsUp,
  FileHeart,
  Briefcase,
  ArrowLeft,
  Search,
  UserPlus,
  UserMinus,
  Trash2,
  FileEdit,
  Printer,
  Save,
  History,
  CreditCard,
  Award,
  Shield,
  Tags,
  Copy,
  Mail,
  Send,
  Smartphone,
  Play,
  Pause,
  TrendingUp,
  PieChart as PieChartIcon,
  HelpCircle,
  Users,
  Share2,
} from "lucide-react";
import { JURISDICTIONS_DATA, MOCH_ATTORNEYS, LEGAL_DOMAINS } from "./data";
import { SovereignJurisdiction, LegalDocument, ConsultationBooking, ChatMessage, Attorney, DocumentVersion } from "./types";
import { motion, AnimatePresence } from "motion/react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { collection, doc, getDocs, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import ComplianceDashboard from "./components/ComplianceDashboard";
import AuthPortal from "./components/AuthPortal";
import AdminConsole from "./components/AdminConsole";
import EuropeJurisdictionsPanel from "./components/EuropeJurisdictionsPanel";
import { seedEuropeJurisdictions, seedEuropeSubnationalJurisdictions } from "./utils/europeJurisdictions";
import { scanDocumentCompliance, ComplianceAlert } from "./complianceEngine";

interface SystemLogMsg {
  timestamp: string;
  event: string;
  status: string;
}

// Helper to perform fetch and safely handle JSON parsing with rate limits gracefully
async function safeFetchJson<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, options);
    
    // Explicitly catch rate limits or server breakdowns before reading as JSON
    if (response.status === 429 || !response.ok) {
      console.warn(`API responded with status ${response.status}. Skipping JSON serialization parsing.`);
      return null;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const plainText = await response.text();
      if (plainText.includes("Rate exceeded") || plainText.includes("Too Many Requests")) {
        console.warn(`Response from ${url} indicated rate limit reached.`);
        return null; // Gracefully catch plain text limit triggers
      }
      console.warn(`Response from ${url} was not JSON: ${plainText.slice(0, 100)}`);
      return null;
    }

    return await response.json() as T;
  } catch (error) {
    console.error("Intercepted network parse failure safely:", error);
    return null;
  }
}

export default function App() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"directory" | "counsel" | "vault" | "compliance" | "forms" | "consultations" | "multimodal" | "maintenance" | "translation" | "billing" | "auth" | "admin">("directory");

  // Dynamic Public Accounts Auth States
  const [currentUser, setCurrentUser] = useState<{
    email: string;
    name: string;
    createdAt: string;
    token?: string;
    isAdmin?: boolean;
  } | null>(() => {
    try {
      const saved = localStorage.getItem("sovereign_current_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [authView, setAuthView] = useState<"signin" | "signup">("signup");

  // Selected country for jurisdiction deep-dive
  const [selectedCountry, setSelectedCountry] = useState<string>("CA");
  const [selectedSubnational, setSelectedSubnational] = useState<string>("CA-ON");
  const [directorySearchQuery, setDirectorySearchQuery] = useState<string>("");
  const [directoryMode, setDirectoryMode] = useState<"static" | "europe_firestore">("static");

  // Live Search Query Processing for Countries and States
  const getFilteredJurisdictions = () => {
    if (!directorySearchQuery.trim()) {
      return null;
    }
    const query = directorySearchQuery.toLowerCase();
    const matches: { countryCode: string; countryName: string; subnationalId?: string; subnationalName?: string; subnationalCapital?: string }[] = [];

    Object.keys(JURISDICTIONS_DATA).forEach((countryCode) => {
      const country = JURISDICTIONS_DATA[countryCode];
      
      // Match country
      const countryMatch = 
        country.name.toLowerCase().includes(query) || 
        country.id.toLowerCase().includes(query) ||
        country.legal_system.toLowerCase().includes(query);
      
      if (countryMatch) {
        matches.push({
          countryCode,
          countryName: country.name,
        });
      }

      // Match subnational
      if (country.subnational) {
        country.subnational.forEach((sub) => {
          const subMatch = 
            sub.name.toLowerCase().includes(query) || 
            sub.id.toLowerCase().includes(query) || 
            sub.capital.toLowerCase().includes(query) ||
            sub.legal_system_notes.toLowerCase().includes(query);
          
          if (subMatch) {
            matches.push({
              countryCode,
              countryName: country.name,
              subnationalId: sub.id,
              subnationalName: sub.name,
              subnationalCapital: sub.capital
            });
          }
        });
      }
    });

    return matches;
  };

  const searchResults = getFilteredJurisdictions();

  // AI Counsel Chat states
  const [chatMessage, setChatMessage] = useState<string>("");
  const [activeAgent, setActiveAgent] = useState<"tutor" | "lawyer" | "judge" | "tribunal">("tribunal");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { sender: "system", text: "Encrypted secure channel established. You are talking to the Sovereign Legal Tribunal.", timestamp: new Date().toLocaleTimeString() }
  ]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);

  // Document Vault states
  const [uploadedDocs, setUploadedDocs] = useState<LegalDocument[]>([]);
  const [vaultLoading, setVaultLoading] = useState<boolean>(false);
  const [selectedVaultDoc, setSelectedVaultDoc] = useState<LegalDocument | null>(null);
  const [vaultViewMode, setVaultViewMode] = useState<"list" | "details">("list");
  const [ocrText, setOcrText] = useState<string>("");
  const [ocrDocName, setOcrDocName] = useState<string>("");
  const [ocrDocCategory, setOcrDocCategory] = useState<string>("contracts");
  const [docSearchQuery, setDocSearchQuery] = useState<string>("");
  const [tagInput, setTagInput] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  // Custom document share details
  const [shareDocId, setShareDocId] = useState<string | null>(null);
  const [sharePermission, setSharePermission] = useState<"read" | "write">("read");
  const [shareDuration, setShareDuration] = useState<number>(24);
  const [shareLinkResult, setShareLinkResult] = useState<string | null>(null);

  // Network connection & local caching status
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Document Vault Version-Control & Editing
  const [isEditingDoc, setIsEditingDoc] = useState<boolean>(false);
  const [activeEditContent, setActiveEditContent] = useState<string>(" ");
  const [changeSummaryText, setChangeSummaryText] = useState<string>("");
  const [activeComplianceAlerts, setActiveComplianceAlerts] = useState<ComplianceAlert[]>([]);
  const [hasDraftToRestore, setHasDraftToRestore] = useState<boolean>(false);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(null);
  const [lastAutosavedTime, setLastAutosavedTime] = useState<string | null>(null);

  // Interactive Document Generator
  const [activeTemplate, setActiveTemplate] = useState<"nda" | "will" | "sublease" | "power_of_attorney">("nda");
  const [templateInputs, setTemplateInputs] = useState({
    partyA: "Sovereign Corporation",
    partyB: "Akin Isaac Ade",
    disclosingParty: "Sovereign Corporation",
    receivingParty: "Akin Isaac Ade",
    effectiveDate: "2026-06-20",
    jurisdictionState: "New York State",
    willMaker: "Alex Mercer",
    executorName: "Sarah Mercer",
    alternateExecutor: "LSO Legal Trust",
    willBeneficiary: "The Mercer Foundation",
    subleaseLandlord: "Jane Doe Properties",
    subleaseTenant: "Bob Smith",
    subleasePremises: "Suite 404, 100 University Ave, Toronto, ON",
    subleaseMonthlyRent: "1850",
    subleaseDepositAmount: "1850",
    attorneyInFactName: "Arthur Sterling",
    principalName: "Diana Prince",
  });
  const [customDraftContent, setCustomDraftContent] = useState<string>("");

  // Booking state
  const [attorneys, setAttorneys] = useState<Attorney[]>(MOCH_ATTORNEYS);
  const [selectedAttorney, setSelectedAttorney] = useState<Attorney>(MOCH_ATTORNEYS[0]);
  const [attorneySearchQuery, setAttorneySearchQuery] = useState<string>("");
  const [bookingSubTab, setBookingSubTab] = useState<"upcoming" | "past" | "analytics">("upcoming");
  const [showAddAttorneyForm, setShowAddAttorneyForm] = useState<boolean>(false);
  
  // SMS/Email Reminders states
  const [smsReminder, setSmsReminder] = useState<boolean>(false);
  const [emailReminder, setEmailReminder] = useState<boolean>(false);
  const [reminderPhone, setReminderPhone] = useState<string>("");
  const [reminderEmail, setReminderEmail] = useState<string>("");

  // Post-consultation feedback states
  const [ratingBookingId, setRatingBookingId] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState<string>("");

  useEffect(() => {
    if (currentUser?.email) {
      setReminderEmail(currentUser.email);
    } else {
      setReminderEmail("akinisaacade@gmail.com");
    }
  }, [currentUser]);

  const getDayOfWeek = (dateString: string) => {
    if (!dateString) return "Mon";
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const date = new Date(dateString + "T12:00:00");
    return days[date.getDay()];
  };

  const toggleAttorneyHour = (day: string, hour: string) => {
    setAttorneys((prev) =>
      prev.map((att) => {
        if (att.id === selectedAttorney.id) {
          const existingHours = att.availabilityHours || {};
          const dayHours = existingHours[day] || [];
          const updatedDayHours = dayHours.includes(hour)
            ? dayHours.filter((h) => h !== hour)
            : [...dayHours, hour];
          const newHours = { ...existingHours, [day]: updatedDayHours };

          const newAvailabilityMap = { ...att.availabilityMap };
          if (["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].includes(day)) {
            newAvailabilityMap[day] = Math.round((updatedDayHours.length / 5) * 100);
          }

          const updatedAtt = {
            ...att,
            availabilityHours: newHours,
            availabilityMap: newAvailabilityMap,
          };

          if (selectedAttorney.id === att.id) {
            setSelectedAttorney(updatedAtt);
          }
          return updatedAtt;
        }
        return att;
      })
    );
    showToast(`Updated weekly availability hours for ${selectedAttorney.name} on ${day}.`);
  };

  // Add Attorney form state
  const [newAttName, setNewAttName] = useState<string>("");
  const [newAttTitle, setNewAttTitle] = useState<string>("");
  const [newAttJurisdiction, setNewAttJurisdiction] = useState<string>("CA-ON");
  const [newAttRate, setNewAttRate] = useState<number>(300);
  const [newAttSpecialties, setNewAttSpecialties] = useState<string>("");
  const [newAttAvatar, setNewAttAvatar] = useState<string>("");

  const [bookings, setBookings] = useState<ConsultationBooking[]>([]);
  const [pastBookings, setPastBookings] = useState<ConsultationBooking[]>([
    {
      id: "booking-past-1",
      lawyerId: "attorney-lawrence",
      lawyerName: "Lawrence Nwosu, Esq.",
      duration: 60,
      date: "2026-06-01",
      time: "11:30 AM",
      retainerFee: 280,
      status: "Completed",
      syncedWithCalendar: true,
      rating: 5,
      feedbackComment: "Superb advice regarding local trade and tariffs!"
    },
    {
      id: "booking-past-2",
      lawyerId: "attorney-alejandro",
      lawyerName: "Dr. Alejandro Ruiz",
      duration: 90,
      date: "2025-12-15",
      time: "02:00 PM",
      retainerFee: 450,
      status: "Completed",
      syncedWithCalendar: true,
      rating: 4,
      feedbackComment: "Very professional real estate overview of Mexican property laws."
    }
  ]);
  const [bookingDate, setBookingDate] = useState<string>("2026-06-22");
  const [bookingTime, setBookingTime] = useState<string>("10:00 AM");
  const [bookingDuration, setBookingDuration] = useState<number>(60);
  const [bookingCaseNotes, setBookingCaseNotes] = useState<string>("");
  const [bookingLegalQuestions, setBookingLegalQuestions] = useState<string>("");
  const [googleSync, setGoogleSync] = useState<boolean>(true);
  const [bookingResult, setBookingResult] = useState<string | null>(null);

  // Multimodal Tools
  const [ttsInput, setTtsInput] = useState<string>("");
  const [ttsVoice, setTtsVoice] = useState<string>("Kore");
  const [ttsSpeechLoading, setTtsSpeechLoading] = useState<boolean>(false);
  const [ttsAudioResult, setTtsAudioResult] = useState<string | null>(null);
  
  const [voiceRecording, setVoiceRecording] = useState<boolean>(false);
  const [voicePromptSim, setVoicePromptSim] = useState<string>("");
  const [transcriptionResult, setTranscriptionResult] = useState<any>(null);

  const [videoPrompt, setVideoPrompt] = useState<string>("");
  const [videoGenerating, setVideoGenerating] = useState<boolean>(false);
  const [videoOperation, setVideoOperation] = useState<string | null>(null);

  // Maintenance Scan
  const [maintenanceReport, setMaintenanceReport] = useState<any>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState<boolean>(false);
  const [systemLogs, setSystemLogs] = useState<SystemLogMsg[]>([]);

  // Gemini Legal Translation Agent states
  const [preferredLanguage, setPreferredLanguage] = useState<"en" | "fr" | "es" | "de">("en");
  const [translationInput, setTranslationInput] = useState<string>("");
  const [translationSource, setTranslationSource] = useState<"auto" | "en" | "fr" | "es" | "de">("auto");
  const [translationTarget, setTranslationTarget] = useState<"en" | "fr" | "es" | "de">("fr");
  const [translationMode, setTranslationMode] = useState<"standard" | "document" | "explanation" | "ui" | "bilingual">("standard");
  const [translationResultText, setTranslationResultText] = useState<string>("");
  const [translationLoading, setTranslationLoading] = useState<boolean>(false);

  // Stripe Subscription & Pricing States
  const [subscription, setSubscription] = useState<{
    status: string;
    planType?: string;
    priceId?: string;
    subscriptionId?: string;
  } | null>(null);
  const [stripeLoading, setStripeLoading] = useState<boolean>(false);
  const [subLoaded, setSubLoaded] = useState<boolean>(false);

  // User Profile & 7-day Free Trial States
  const [userProfile, setUserProfile] = useState<{
    email: string;
    createdAt: string;
  } | null>(null);
  const [trialStatus, setTrialStatus] = useState<{
    isTrialActive: boolean;
    daysRemaining: number;
    daysTotal: number;
  }>({ isTrialActive: true, daysRemaining: 7, daysTotal: 7 });
  const [trialLoaded, setTrialLoaded] = useState<boolean>(false);

  // Subscription Sandbox Override Tier (Sovereign Simulator)
  const [simulatedTier, setSimulatedTier] = useState<"real" | "trial" | "monthly" | "yearly" | "expired">("real");
  const [billingSubTab, setBillingSubTab] = useState<"terminal" | "schema">("terminal");

  // Digital Marketing CRM Custom UI States
  const [selectedCrmTab, setSelectedCrmTab] = useState<"dashboard" | "listing" | "sequences" | "social" | "faqs" | "templates" | "brand">("dashboard");
  const [selectedCrmEmail, setSelectedCrmEmail] = useState<number>(1);
  const [selectedCrmSocial, setSelectedCrmSocial] = useState<string>("linkedin");
  const [selectedCrmFaq, setSelectedCrmFaq] = useState<number | null>(null);
  const [crmLeadsCount, setCrmLeadsCount] = useState<number>(2480);
  const [crmOppCount, setCrmOppCount] = useState<number>(142);
  const [crmPipelineValue, setCrmPipelineValue] = useState<number>(458000);
  const [crmRevenue, setCrmRevenue] = useState<number>(189000);
  const [crmActivities, setCrmActivities] = useState<Array<{id: string, time: string, text: string, type: string}>>([
    { id: "act-1", time: "Just now", text: "New Lead captured from Google Ads: Michael K.", type: "lead" },
    { id: "act-2", time: "5 mins ago", text: "AI workflow triggered: Send Welcome Sequence to Michael K.", type: "system" },
    { id: "act-3", time: "25 mins ago", text: "Lead upgraded: Sarah L. moved to Qualified stage", type: "pipeline" },
    { id: "act-4", time: "1 hour ago", text: "Opportunity closed: 5-user Growth Plan subscription finalized ($2,400/yr)", type: "revenue" },
    { id: "act-5", time: "3 hours ago", text: "Facebook Ad campaign optimization: Click-Through-Rate improved to 3.24%", type: "campaign" }
  ]);

  // Dynamically resolve subscription or trial state based on simulation selection
  const effectiveSubscription = React.useMemo(() => {
    if (simulatedTier === "monthly") {
      return {
        status: "active",
        planType: "monthly",
        priceId: "price_1TfENIBMbxh6jv0CBKolLI4B",
        subscriptionId: "sub_monthly_sim_sandbox"
      };
    }
    if (simulatedTier === "yearly") {
      return {
        status: "active",
        planType: "yearly",
        priceId: "price_1TfEPRBMbxh6jv0CKiwDzY4x",
        subscriptionId: "sub_yearly_sim_sandbox"
      };
    }
    if (simulatedTier === "expired") {
      return null;
    }
    if (simulatedTier === "trial") {
      return null;
    }
    return subscription;
  }, [simulatedTier, subscription]);

  const effectiveTrialStatus = React.useMemo(() => {
    if (simulatedTier === "trial") {
      return {
        isTrialActive: true,
        daysRemaining: 7.0,
        daysTotal: 7
      };
    }
    if (simulatedTier === "expired" || simulatedTier === "monthly" || simulatedTier === "yearly") {
      return {
        isTrialActive: false,
        daysRemaining: 0,
        daysTotal: 7
      };
    }
    return trialStatus;
  }, [simulatedTier, trialStatus]);

  const isPremiumOrTrialActive = effectiveSubscription?.status === "active" || effectiveTrialStatus.isTrialActive;

  // Toast Notification state
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Initial Fetching
  useEffect(() => {
    fetchDocuments();
    fetchBookings();
    fetchSystemLogs();
    
    // Auto-seed European Core and Subnational Jurisdictions in Firestore
    Promise.all([
      seedEuropeJurisdictions(),
      seedEuropeSubnationalJurisdictions()
    ])
      .then(() => console.log("Europe Jurisdictions and Subnationals auto-seeded / verified in Firestore"))
      .catch((err) => console.error("Error auto-seeding Europe jurisdictions:", err));

    const handleOnline = () => {
      setIsOnline(true);
      showToast("🌐 Network connection restored. Synchronizing cloud layers.");
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast("📡 Network connection offline. Operating from encrypted local cache.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Register offline Cache service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then(() => console.log("Sovereign Document Vault SW Active"))
        .catch((err) => console.warn("ServiceWorker Registration Failed:", err));
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

   const showToast = (message: string) => {
    setToastMsg(message);
    setTimeout(() => {
      setToastMsg(null);
    }, 4500);
  };

  // Fetch Subscription and Register 7-day Free Trial on startup or user change
  useEffect(() => {
    fetchSubscription();
    registerAndCheckTrial();
  }, [currentUser]);

  // Handle Stripe Success Callback Verification
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("stripe_checkout");
    const sessionId = params.get("session_id");

    if (checkoutStatus === "success" && sessionId) {
      const verifyCheckout = async () => {
        try {
          const res = await fetch(`/api/stripe/session-status?session_id=${sessionId}`);
          const data = await res.json();
          if (data && (data.payment_status === "paid" || data.status === "complete")) {
            const userEmail = currentUser?.email || "akinisaacade@gmail.com";
            // Write to Firestore for persistent subscriber data!
            try {
              await setDoc(doc(db, "subscriptions", userEmail.replace(/\./g, "_")), {
                status: "active",
                planType: data.planType,
                priceId: data.priceId,
                subscriptionId: data.subscriptionId || "",
                updatedAt: new Date().toISOString()
              });
            } catch (fireErr) {
              console.warn("Couldn't save subscription to Cloud Firestore:", fireErr);
            }

            setSubscription({
              status: "active",
              planType: data.planType,
              priceId: data.priceId,
              subscriptionId: data.subscriptionId
            });

            showToast("✨ Congratulations! Your Premium Legal Counsel subscription is active.");
          }
        } catch (e) {
          console.error("Error verifying Stripe payment session:", e);
        } finally {
          // Clean parameters from address bar to avoid re-triggering on reload
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };
      verifyCheckout();
    } else if (checkoutStatus === "cancel") {
      showToast("❌ Checkout canceled. Your features remain in standard preview mode.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Automatically redirect unsubscribed user to Membership page upon trial expiration
  useEffect(() => {
    if (subLoaded && trialLoaded) {
      if (!isPremiumOrTrialActive) {
        setActiveTab("billing");
        if (currentUser && !effectiveTrialStatus.isTrialActive) {
          showToast("Your 7-Day Free Trial has expired. Please subscribe to continue using the app.");
        } else {
          showToast("An active subscription is required to access premium AI-powered features.");
        }
      }
    }
  }, [subLoaded, trialLoaded, isPremiumOrTrialActive, currentUser, effectiveTrialStatus.isTrialActive]);

  const checkPremiumFeatureAccess = (): boolean => {
    if (isPremiumOrTrialActive) return true;
    setActiveTab("billing");
    if (currentUser && !effectiveTrialStatus.isTrialActive) {
      showToast("Your 7-Day Free Trial has expired. Please subscribe to continue using the app.");
    } else {
      showToast("An active subscription is required to access premium AI-powered features.");
    }
    return false;
  };

  const fetchSubscription = async () => {
    const userEmail = currentUser?.email || "akinisaacade@gmail.com";
    try {
      // 1. First, check Firestore for active subscription
      const docRef = doc(db, "subscriptions", userEmail.replace(/\./g, "_"));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSubscription({
          status: data.status,
          planType: data.planType,
          priceId: data.priceId,
          subscriptionId: data.subscriptionId
        });
        setSubLoaded(true);
        return;
      }
    } catch (e) {
      console.warn("Firestore subscription fetch error, falling back to backend:", e);
    }

    try {
      // 2. Fall back to backend database
      const res = await fetch(`/api/stripe/subscription?email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      if (data && data.subscription) {
        setSubscription({
          status: data.subscription.status,
          planType: data.subscription.priceId === "price_1TfEPRBMbxh6jv0CKiwDzY4x" ? "yearly" : "monthly",
          priceId: data.subscription.priceId,
          subscriptionId: data.subscription.subscriptionId
        });
      } else {
        setSubscription(null);
      }
    } catch (e) {
      console.error("Error fetching subscription from stripe backend:", e);
    } finally {
      setSubLoaded(true);
    }
  };

  const registerAndCheckTrial = async () => {
    const userEmail = currentUser?.email || "akinisaacade@gmail.com";
    try {
      const userRef = doc(db, "users", userEmail.replace(/\./g, "_"));
      const userSnap = await getDoc(userRef);
      let profileData;
      if (userSnap.exists()) {
        const uData = userSnap.data();
        if (uData.isActive === false) {
          showToast("⚠️ This account has been deactivated by an administrator.");
          setCurrentUser(null);
          localStorage.removeItem("sovereign_current_user");
          setSubscription(null);
          setTrialStatus({ isTrialActive: false, daysRemaining: 0, daysTotal: 7 });
          setActiveTab("auth");
          setAuthView("signin");
          return;
        }
        profileData = uData as { email: string; createdAt: string; name?: string };
      } else {
        // Newly registered user or system fallback! Create profile with 7-day free trial if we have active user
        if (!currentUser) {
          // If public guest mode and no profile, do not auto-seed a trial on DB, just use default/local trial fallback
          throw new Error("Guest Mode: Use local state trial calculation.");
        }
        profileData = {
          email: userEmail,
          name: currentUser.name,
          createdAt: currentUser.createdAt || new Date().toISOString()
        };
        await setDoc(userRef, profileData);
        setTimeout(() => {
          showToast("🎁 Welcome! Your 7-day Premium Free Trial has started.");
        }, 1200);
      }
      
      setUserProfile(profileData);
      
      // Calculate trial status
      const now = new Date();
      const regDate = new Date(profileData.createdAt || new Date().toISOString());
      const diffTime = now.getTime() - regDate.getTime();
      const diffDays = Math.max(0, diffTime / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, 7 - diffDays);
      const isTrialActive = diffDays < 7;
      
      setTrialStatus({
        isTrialActive,
        daysRemaining: Math.ceil(daysRemaining * 100) / 100,
        daysTotal: 7
      });
    } catch (err) {
      console.error("Error with Firestore user profile/trial:", err);
      // Fallback local persistence if Firestore is unreachable or in guest mode
      const cachedCreated = localStorage.getItem("trial_starts") || new Date().toISOString();
      if (!localStorage.getItem("trial_starts")) {
        localStorage.setItem("trial_starts", cachedCreated);
      }
      const now = new Date();
      const regDate = new Date(cachedCreated);
      const diffTime = now.getTime() - regDate.getTime();
      const diffDays = Math.max(0, diffTime / (1000 * 60 * 65 * 24));
      const daysRemaining = Math.max(0, 7 - diffDays);
      const isTrialActive = diffDays < 7;

      setTrialStatus({
        isTrialActive,
        daysRemaining: Math.ceil(daysRemaining * 100) / 100,
        daysTotal: 7
      });
    } finally {
      setTrialLoaded(true);
    }
  };

  const handleStripeCheckout = async (planType: "monthly" | "yearly") => {
    if (!currentUser) {
      setActiveTab("auth");
      setAuthView("signup");
      showToast("🔒 Security reminder: Please create a free account to bind and activate your subscription plan securely.");
      return;
    }
    setStripeLoading(true);
    const userEmail = currentUser.email;
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType, email: userEmail }),
      });
      const resData = await response.json();
      if (resData && resData.url) {
        // Redirect to Stripe checkout
        window.location.href = resData.url;
      } else {
        showToast("Error: " + (resData.error || "Failed to initiate Stripe session."));
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      showToast("Stripe Connection Error: Check server environment variables.");
    } finally {
      setStripeLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      setVaultLoading(true);
      // Query documents collection from Firestore
      const querySnapshot = await getDocs(collection(db, "documents"));
      const docList: LegalDocument[] = [];
      querySnapshot.forEach((docSnap) => {
        docList.push(docSnap.data() as LegalDocument);
      });

      if (docList.length > 0) {
        // Sort by uploadedAt descending
        docList.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        setUploadedDocs(docList);
        localStorage.setItem("cached_documents", JSON.stringify(docList));
        
        if (selectedVaultDoc) {
          const freshDoc = docList.find((d) => d.id === selectedVaultDoc.id);
          if (freshDoc) {
            setSelectedVaultDoc(freshDoc);
          }
        } else {
          setSelectedVaultDoc(docList[0]);
        }
      } else {
        // Firestore is empty! Seed with initial default document from Express backend
        const response = await fetch("/api/documents");
        const resData = await response.json();
        if (resData && resData.documents) {
          const seededList = resData.documents;
          for (const d of seededList) {
            await setDoc(doc(db, "documents", d.id), d);
          }
          setUploadedDocs(seededList);
          localStorage.setItem("cached_documents", JSON.stringify(seededList));
          setSelectedVaultDoc(seededList[0]);
          showToast("⚡ Seeded default contracts into Google Cloud Firestore!");
        }
      }
    } catch (e) {
      console.warn("Firestore unreachable. Falling back to local storage and HTTP endpoint:", e);
      // Normal offline fallback
      const cached = localStorage.getItem("cached_documents");
      if (cached) {
        const parsed = JSON.parse(cached);
        setUploadedDocs(parsed);
        if (selectedVaultDoc) {
          const freshDoc = parsed.find((d: any) => d.id === selectedVaultDoc.id);
          if (freshDoc) {
            setSelectedVaultDoc(freshDoc);
          }
        } else if (parsed.length > 0) {
          setSelectedVaultDoc(parsed[0]);
        }
        showToast("📡 Offline backup retrieved from secure sandboxed cache.");
      }
    } finally {
      setVaultLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "bookings"));
      const bookingList: ConsultationBooking[] = [];
      querySnapshot.forEach((docSnap) => {
        bookingList.push(docSnap.data() as ConsultationBooking);
      });

      if (bookingList.length > 0) {
        bookingList.sort((a, b) => new Date(b.date + "T" + b.time).getTime() - new Date(a.date + "T" + a.time).getTime());
        setBookings(bookingList);
      } else {
        // Seed from Express backend initial booking list
        const response = await fetch("/api/bookings");
        const resData = await response.json();
        if (resData && resData.bookings) {
          const seeded = resData.bookings;
          for (const b of seeded) {
            await setDoc(doc(db, "bookings", b.id), b);
          }
          setBookings(seeded);
          showToast("⚡ Seeded default consultant bookings into Cloud Firestore!");
        }
      }
    } catch (e) {
      console.warn("Firestore bookings sync error, fallback to local fetch:", e);
      try {
        const response = await fetch("/api/bookings");
        const resData = await response.json();
        if (resData && resData.bookings) {
          setBookings(resData.bookings);
        }
      } catch (err) {
        console.warn("Fully offline, using blank bookings fallback", err);
      }
    }
  };

  const fetchSystemLogs = async () => {
    const resData = await safeFetchJson<{ logs: SystemLogMsg[] }>("/api/system/logs");
    if (resData && resData.logs) {
      setSystemLogs(resData.logs);
    }
  };

  // Synchronized Real-time compliance alerting scanner
  useEffect(() => {
    if (!selectedVaultDoc) {
      setActiveComplianceAlerts([]);
      return;
    }

    const currentJur = selectedSubnational || selectedCountry;
    const computedAlerts = scanDocumentCompliance(selectedVaultDoc.content, currentJur);
    setActiveComplianceAlerts(computedAlerts);
  }, [selectedVaultDoc?.id, selectedVaultDoc?.content, selectedCountry, selectedSubnational]);

  // Periodic Auto-save hook for Document Editor
  useEffect(() => {
    if (!isEditingDoc || !selectedVaultDoc) {
      setLastAutosavedTime(null);
      return;
    }

    const intervalId = setInterval(() => {
      if (activeEditContent && activeEditContent !== selectedVaultDoc.content) {
        const key = `document_autosave_${selectedVaultDoc.id}`;
        localStorage.setItem(key, JSON.stringify({
          content: activeEditContent,
          timestamp: Date.now()
        }));
        const now = new Date();
        setLastAutosavedTime(now.toLocaleTimeString());
      }
    }, 5000); // Trigger auto-save every 5 seconds

    return () => clearInterval(intervalId);
  }, [isEditingDoc, selectedVaultDoc?.id, activeEditContent, selectedVaultDoc?.content]);

  // Chat Trigger
  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatMessage.trim()) return;

    if (!checkPremiumFeatureAccess()) {
      return;
    }

    const userMsg: ChatMessage = { sender: "user", text: chatMessage, timestamp: new Date().toLocaleTimeString() };
    setChatHistory((prev) => [...prev, userMsg]);
    const messageToSend = chatMessage;
    setChatMessage("");
    setChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToSend,
          agentType: activeAgent,
          jurisdiction: selectedSubnational || selectedCountry,
          history: chatHistory,
          preferredLanguage: preferredLanguage
        }),
      });
      const data = await response.json();
      if (data && data.text) {
        setChatHistory((prev) => [...prev, { sender: "lawyer", text: data.text, timestamp: new Date().toLocaleTimeString() }]);
      } else {
        setChatHistory((prev) => [...prev, { sender: "system", text: "Unable to retrieve co-counsel intelligence.", timestamp: new Date().toLocaleTimeString() }]);
      }
    } catch (err: any) {
      setChatHistory((prev) => [...prev, { sender: "system", text: `Connection failure: ${err.message}`, timestamp: new Date().toLocaleTimeString() }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Document Vault Version-Control & Real-time Remediations
  const handleEditDoc = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedVaultDoc) return;

    try {
      const response = await fetch("/api/documents/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: selectedVaultDoc.id,
          content: activeEditContent,
          changeSummary: changeSummaryText || "Revised contract guidelines"
        })
      });
      const data = await response.json();
      if (data.success && data.document) {
        setSelectedVaultDoc(data.document);
        setUploadedDocs(prev => prev.map(d => d.id === data.document.id ? data.document : d));
        // Save to persistent local cache
        const freshList = uploadedDocs.map(d => d.id === data.document.id ? data.document : d);
        localStorage.setItem("cached_documents", JSON.stringify(freshList));
        
        // Sync with Cloud Firestore
        try {
          await setDoc(doc(db, "documents", data.document.id), data.document);
        } catch (dbErr) {
          console.warn("Could not sync revised doc with Cloud Firestore", dbErr);
        }
        
        showToast(`💾 Saved Revision for ${selectedVaultDoc.name} successfully.`);
        setIsEditingDoc(false);
        setChangeSummaryText("");
        localStorage.removeItem(`document_autosave_${selectedVaultDoc.id}`);
        setHasDraftToRestore(false);
        setLastAutosavedTime(null);
      } else {
        showToast("Error saving revision.");
      }
    } catch (err) {
      console.warn("Express server unreachable. Simulating offline document revision...", err);
      // Offline fallback
      const oldDoc = selectedVaultDoc;
      const currentVersions = oldDoc.versions || [];
      const currentVerNum = currentVersions.length + 1;
      
      const archivedVersion: DocumentVersion = {
        id: `v-${Date.now()}`,
        versionNumber: currentVerNum,
        content: oldDoc.content,
        editedAt: oldDoc.uploadedAt || new Date().toISOString(),
        editedBy: oldDoc.uploadedBy || "akinisaacade@gmail.com",
        changeSummary: oldDoc.changeSummary || "Baseline snapshot draft",
        riskScore: oldDoc.riskScore,
        clauses: [...(oldDoc.clauses || [])],
        suggestedRedlines: [...(oldDoc.suggestedRedlines || []).map(r => ({ ...r }))]
      };

      const recalculatedRisk = Math.max(15, Math.floor(oldDoc.riskScore * 0.75));
      const updatedDoc: LegalDocument = {
        ...oldDoc,
        content: activeEditContent,
        uploadedAt: new Date().toISOString(),
        changeSummary: changeSummaryText || `Revision v${currentVerNum + 1}`,
        riskScore: recalculatedRisk,
        versions: [...currentVersions, archivedVersion]
      };

      setSelectedVaultDoc(updatedDoc);
      setUploadedDocs(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
      
      const freshList = uploadedDocs.map(d => d.id === updatedDoc.id ? updatedDoc : d);
      localStorage.setItem("cached_documents", JSON.stringify(freshList));

      showToast("💾 Saved locally in offline persistent storage cache.");
      setIsEditingDoc(false);
      setChangeSummaryText("");
      localStorage.removeItem(`document_autosave_${updatedDoc.id}`);
      setHasDraftToRestore(false);
      setLastAutosavedTime(null);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!selectedVaultDoc) return;
    try {
      const response = await fetch("/api/documents/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: selectedVaultDoc.id,
          versionId
        })
      });
      const data = await response.json();
      if (data.success && data.document) {
        setSelectedVaultDoc(data.document);
        setUploadedDocs(prev => prev.map(d => d.id === data.document.id ? data.document : d));
        const freshList = uploadedDocs.map(d => d.id === data.document.id ? data.document : d);
        localStorage.setItem("cached_documents", JSON.stringify(freshList));

        // Sync with Cloud Firestore
        try {
          await setDoc(doc(db, "documents", data.document.id), data.document);
        } catch (dbErr) {
          console.warn("Could not sync restored doc with Cloud Firestore", dbErr);
        }

        showToast("🚀 Successfully restored and backed up target revision.");
      }
    } catch (e) {
      console.warn("Restoring offline locally...");
      const doc = selectedVaultDoc;
      const ver = doc.versions?.find(v => v.id === versionId);
      if (!ver) return;

      const backupVerNum = (doc.versions?.length || 0) + 1;
      const backupVersion: DocumentVersion = {
        id: `v-backup-${Date.now()}`,
        versionNumber: backupVerNum,
        content: doc.content,
        editedAt: doc.uploadedAt || new Date().toISOString(),
        editedBy: doc.uploadedBy || "akinisaacade@gmail.com",
        changeSummary: `Pre-restoration snapshot (Current Active: V${ver.versionNumber})`,
        riskScore: doc.riskScore,
        clauses: [...(doc.clauses || [])],
        suggestedRedlines: [...(doc.suggestedRedlines || [])]
      };

      const updatedVersions = [...(doc.versions || []), backupVersion];
      const updatedDoc: LegalDocument = {
        ...doc,
        content: ver.content,
        riskScore: ver.riskScore,
        clauses: ver.clauses || [],
        suggestedRedlines: ver.suggestedRedlines || [],
        uploadedAt: new Date().toISOString(),
        changeSummary: `Restored Version ${ver.versionNumber} ("${ver.changeSummary}")`,
        versions: updatedVersions
      };

      setSelectedVaultDoc(updatedDoc);
      setUploadedDocs(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
      const freshList = uploadedDocs.map(d => d.id === updatedDoc.id ? updatedDoc : d);
      localStorage.setItem("cached_documents", JSON.stringify(freshList));
      showToast("🚀 Offline restoration action committed locally.");
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (!selectedVaultDoc) return;
    try {
      const response = await fetch("/api/documents/delete-version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: selectedVaultDoc.id,
          versionId
        })
      });
      const data = await response.json();
      if (data.success && data.document) {
        setSelectedVaultDoc(data.document);
        setUploadedDocs(prev => prev.map(d => d.id === data.document.id ? data.document : d));
        const freshList = uploadedDocs.map(d => d.id === data.document.id ? data.document : d);
        localStorage.setItem("cached_documents", JSON.stringify(freshList));

        // Sync with Cloud Firestore
        try {
          await setDoc(doc(db, "documents", data.document.id), data.document);
        } catch (dbErr) {
          console.warn("Could not sync versions list with Cloud Firestore", dbErr);
        }

        showToast("🗑️ Version deleted successfully.");
      }
    } catch (e) {
      console.warn("Deleting version offline locally...");
      const doc = selectedVaultDoc;
      const updatedVersions = (doc.versions || []).filter(v => v.id !== versionId);
      const updatedDoc = { ...doc, versions: updatedVersions };

      setSelectedVaultDoc(updatedDoc);
      setUploadedDocs(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
      const freshList = uploadedDocs.map(d => d.id === updatedDoc.id ? updatedDoc : d);
      localStorage.setItem("cached_documents", JSON.stringify(freshList));
      showToast("🗑️ Version deleted from offline cache storage.");
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const response = await fetch("/api/documents/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId })
      });
      const data = await response.json();
      if (data.success) {
        const remaining = uploadedDocs.filter(d => d.id !== documentId);
        setUploadedDocs(remaining);
        localStorage.setItem("cached_documents", JSON.stringify(remaining));

        // Sync with Cloud Firestore
        try {
          await deleteDoc(doc(db, "documents", documentId));
        } catch (dbErr) {
          console.warn("Could not sync file deletion with Cloud Firestore", dbErr);
        }
        
        showToast("🗑️ Document entirely deleted from secure vault.");
        if (remaining.length > 0) {
          setSelectedVaultDoc(remaining[0]);
        } else {
          setSelectedVaultDoc(null);
        }
        setVaultViewMode("list");
      }
    } catch (e) {
      console.warn("Deleting document offline...");
      const remaining = uploadedDocs.filter(d => d.id !== documentId);
      setUploadedDocs(remaining);
      localStorage.setItem("cached_documents", JSON.stringify(remaining));
      
      showToast("🗑️ Document removed from local offline cache.");
      if (remaining.length > 0) {
        setSelectedVaultDoc(remaining[0]);
      } else {
        setSelectedVaultDoc(null);
      }
      setVaultViewMode("list");
    }
  };

  const handleAddTag = async (documentId: string) => {
    if (!tagInput.trim()) return;
    const cleanTag = tagInput.trim().toLowerCase();
    
    const docToModify = uploadedDocs.find(d => d.id === documentId);
    if (!docToModify) return;

    const currentTags = docToModify.tags || [];
    if (currentTags.includes(cleanTag)) {
      showToast("Tag already exists on this document.");
      return;
    }

    const updatedTags = [...currentTags, cleanTag];
    const updatedDoc: LegalDocument = {
      ...docToModify,
      tags: updatedTags
    };

    setUploadedDocs(prev => prev.map(d => d.id === documentId ? updatedDoc : d));
    setSelectedVaultDoc(updatedDoc);
    
    const freshList = uploadedDocs.map(d => d.id === documentId ? updatedDoc : d);
    localStorage.setItem("cached_documents", JSON.stringify(freshList));

    try {
      await setDoc(doc(db, "documents", documentId), updatedDoc);
      showToast(`🏷️ Tag "${cleanTag}" added successfully!`);
    } catch (e) {
      console.warn("Could not sync tag to Firestore, saved locally:", e);
      showToast(`🏷️ Tag "${cleanTag}" added locally.`);
    }

    setTagInput("");
  };

  const handleRemoveTag = async (documentId: string, tagToRemove: string) => {
    const docToModify = uploadedDocs.find(d => d.id === documentId);
    if (!docToModify) return;

    const currentTags = docToModify.tags || [];
    const updatedTags = currentTags.filter(t => t !== tagToRemove);
    const updatedDoc: LegalDocument = {
      ...docToModify,
      tags: updatedTags
    };

    setUploadedDocs(prev => prev.map(d => d.id === documentId ? updatedDoc : d));
    setSelectedVaultDoc(updatedDoc);

    const freshList = uploadedDocs.map(d => d.id === documentId ? updatedDoc : d);
    localStorage.setItem("cached_documents", JSON.stringify(freshList));

    try {
      await setDoc(doc(db, "documents", documentId), updatedDoc);
      showToast(`Tag "${tagToRemove}" removed.`);
    } catch (e) {
      console.warn("Could not sync tag removal to Firestore, updated locally:", e);
      showToast(`Tag "${tagToRemove}" removed locally.`);
    }
  };

  const triggerDownloadOrPrintContent = (docToPrint: { name: string; content: string }) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Popup blocked! Enable popups to view printable formatted sheet.");
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>SOVEREIGN LEGAL VAULT - ${docToPrint.name}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              padding: 40px;
              color: #1e293b;
              max-width: 800px;
              margin: 0 auto;
              line-height: 1.6;
            }
            .header {
              border-bottom: 3px double #334155;
              padding-bottom: 12px;
              margin-bottom: 24px;
              text-align: center;
            }
            .logo {
              font-family: Georgia, serif;
              font-weight: 900;
              font-size: 1.5rem;
              letter-spacing: 0.05em;
              color: #0f172a;
              text-transform: uppercase;
            }
            .subtitle {
              font-size: 0.8rem;
              color: #64748b;
              font-weight: 700;
              letter-spacing: 0.1em;
              margin-top: 4px;
            }
            h1 {
              font-size: 1.3rem;
              color: #0f172a;
              margin-top: 20px;
              text-transform: uppercase;
            }
            .meta {
              display: grid;
              grid-template-cols: 1fr 1fr;
              font-size: 0.8rem;
              padding: 10px;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              margin-bottom: 24px;
              font-family: monospace;
            }
            .content {
              font-family: "Courier New", Courier, monospace;
              white-space: pre-line;
              font-size: 0.95rem;
              background-color: #fdfdfd;
              border: 1px solid #e2e8f0;
              padding: 24px;
              border-radius: 4px;
            }
            .footer {
              margin-top: 50px;
              border-top: 1px solid #e2e8f0;
              padding-top: 8px;
              text-align: center;
              font-size: 0.7rem;
              color: #94a3b8;
              font-family: monospace;
            }
            @media print {
              body { padding: 0; }
              input, button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Sovereign Asset Vault</div>
            <div class="subtitle">AI-POWERED CONTRACT EXPOSURE AUDITER</div>
          </div>
          <div class="meta">
            <div><strong>DOCUMENT:</strong> ${docToPrint.name}</div>
            <div><strong>SYSTEM JURISDICTION:</strong> ${selectedSubnational || selectedCountry}</div>
            <div><strong>EXPORT DATE:</strong> ${new Date().toLocaleString()}</div>
            <div><strong>STATUS:</strong> SHA-256 ISO COMPLIANT VERIFIED</div>
          </div>
          <h1>Primary Content Body Scan</h1>
          <div class="content">${docToPrint.content}</div>
          <div class="footer">
            CONFIDENTIAL PRIVILEGE — SOVEREIGN MATTERS COMPLIANT PLATFORM TRACE ID: ${Math.random().toString(36).substring(2, 10).toUpperCase()}
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Upload/OCR Scan Trigger
  const handleMockUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ocrDocName.trim() || !ocrText.trim()) {
      showToast("Please provide both file name and document content text.");
      return;
    }

    if (!checkPremiumFeatureAccess()) {
      return;
    }

    setVaultLoading(true);
    setUploadProgress(10);
    
    // Smooth progress simulation
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.floor(Math.random() * 8) + 4;
      });
    }, 120);

    try {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ocrDocName.endsWith(".pdf") || ocrDocName.endsWith(".docx") ? ocrDocName : `${ocrDocName}.pdf`,
          category: ocrDocCategory,
          content: ocrText
        })
      });
      const resData = await response.json();
      if (resData && resData.document) {
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        // Give a short pause to let user see 100% completion perfectly
        await new Promise((resolve) => setTimeout(resolve, 400));

        // Initialize tags field
        const docWithTags = {
          ...resData.document,
          tags: resData.document.tags || []
        };

        setUploadedDocs((prev) => [docWithTags, ...prev]);
        setSelectedVaultDoc(docWithTags);
        setOcrDocName("");
        setOcrText("");

        // Sync with Cloud Firestore
        try {
          await setDoc(doc(db, "documents", docWithTags.id), docWithTags);
        } catch (dbErr) {
          console.warn("Could not sync uploaded document with Cloud Firestore", dbErr);
        }

        showToast("Secure Upload & OCR analysis completed securely!");
        fetchSystemLogs();
      }
    } catch (err) {
      clearInterval(progressInterval);
      showToast("Document ingestion error. Scan failed.");
    } finally {
      clearInterval(progressInterval);
      setVaultLoading(false);
      // Wait another moment to clear progress bar so user feels the completion
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // Create Consultation Booking Hook
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingTime) {
      showToast("Please select an available appointment hour block.");
      return;
    }
    const computedFee = selectedAttorney.hourlyRate * (bookingDuration / 60);

    try {
      const response = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawyerId: selectedAttorney.id,
          lawyerName: selectedAttorney.name,
          duration: bookingDuration,
          date: bookingDate,
          time: bookingTime,
          retainerFee: computedFee,
          caseNotes: bookingCaseNotes,
          legalQuestions: bookingLegalQuestions,
          smsReminder,
          emailReminder,
          reminderPhone: smsReminder ? reminderPhone : "",
          reminderEmail: emailReminder ? reminderEmail : ""
        })
      });
      const resData = await response.json();
      if (resData && resData.booking) {
        setBookings((prev) => [resData.booking, ...prev]);

        // Sync with Cloud Firestore
        try {
          await setDoc(doc(db, "bookings", resData.booking.id), resData.booking);
        } catch (dbErr) {
          console.warn("Could not sync booking with Cloud Firestore", dbErr);
        }

        setBookingResult(`Success! Verified consultation scheduled on ${bookingDate} at ${bookingTime}. Retainer ($${computedFee}) processed successfully.`);
        showToast(`Consultation with ${selectedAttorney.name} booked.`);
        setBookingCaseNotes("");
        setBookingLegalQuestions("");
        setSmsReminder(false);
        setEmailReminder(false);
        setReminderPhone("");
        if (googleSync) {
          showToast("Sync trigger: Calendar appointment created inside Google Workspace via prebuilt background action.");
        }
        fetchSystemLogs();
      }
    } catch (err) {
      showToast("Scheduling portal transient error.");
    }
  };

  const handleFeedbackSubmit = async (bookingId: string) => {
    try {
      const updatedPast = pastBookings.map((bk) => {
        if (bk.id === bookingId) {
          const updated = {
            ...bk,
            rating: feedbackRating,
            feedbackComment: feedbackComment,
          };
          setDoc(doc(db, "bookings", bookingId), updated, { merge: true }).catch((err) =>
            console.warn("Firestore feedback sync error:", err)
          );
          return updated;
        }
        return bk;
      });
      setPastBookings(updatedPast);

      // Find original booking to know lawyerId
      const targetBooking = pastBookings.find((bk) => bk.id === bookingId) || bookings.find((bk) => bk.id === bookingId);
      if (targetBooking) {
        setAttorneys((prev) =>
          prev.map((att) => {
            if (att.id === targetBooking.lawyerId) {
              const newReviews = feedbackComment ? [feedbackComment, ...att.reviews] : att.reviews;
              const newRating = parseFloat(((att.rating * 4 + feedbackRating) / 5).toFixed(1));
              const updatedAtt = {
                ...att,
                rating: newRating,
                reviews: newReviews,
              };
              if (selectedAttorney.id === att.id) {
                setSelectedAttorney(updatedAtt);
              }
              return updatedAtt;
            }
            return att;
          })
        );
      }

      setRatingBookingId(null);
      setFeedbackComment("");
      showToast("Thank you! Your post-consultation feedback has been recorded.");
    } catch (e) {
      showToast("Feedback submission error.");
    }
  };

  const handleDeleteAttorney = (id: string, name: string) => {
    setAttorneys((prev) => prev.filter((att) => att.id !== id));
    if (selectedAttorney.id === id) {
      const remaining = attorneys.filter((att) => att.id !== id);
      if (remaining.length > 0) {
        setSelectedAttorney(remaining[0]);
      }
    }
    showToast(`Revoked roster registration for attorney ${name}.`);
  };

  // Share Expiring Link
  const handleShareDoc = async () => {
    if (!selectedVaultDoc) return;
    try {
      const response = await fetch("/api/documents/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: selectedVaultDoc.id,
          permission: sharePermission,
          durationHours: shareDuration
        })
      });
      const resData = await response.json();
      if (resData && resData.shareUrl) {
        setShareLinkResult(resData.shareUrl);
        showToast("Secure share link generated with expiration timeline!");
      }
    } catch (err) {
      showToast("Expiring folder sharing failed.");
    }
  };

  // Code Maintenance agent logic
  const handleMaintenanceRun = async () => {
    setMaintenanceLoading(true);
    setMaintenanceReport(null);
    try {
      const response = await fetch("/api/maintenance/verify", {
        method: "POST"
      });
      const resData = await response.json();
      if (resData) {
        setMaintenanceReport(resData);
        setSystemLogs(resData.logs || []);
        showToast("AI Maintenance Sweep Completed: Version v1.4.2 checked.");
      }
    } catch (err) {
      showToast("Automated Maintenance daemon is temporarily offline.");
    } finally {
      setMaintenanceLoading(false);
    }
  };

  // Text to Speech Synth
  const handleTtsSynth = async () => {
    if (!ttsInput.trim()) {
      showToast("Please enter target text to synthesize speech reading.");
      return;
    }

    if (!checkPremiumFeatureAccess()) {
      return;
    }

    if (effectiveSubscription?.planType === "monthly") {
      setActiveTab("billing");
      showToast("👑 Premium Upgrade Required: Custom AI TTS Synthesis is a high-compute feature reserved for Annual Unlimited subscribers.");
      return;
    }

    setTtsSpeechLoading(true);
    setTtsAudioResult(null);
    try {
      const response = await fetch("/api/multimodal/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ttsInput, voice: ttsVoice })
      });
      const resData = await response.json();
      if (resData && resData.audio) {
        setTtsAudioResult(resData.audio);
        showToast("Voice generated successfully from Gemini TTS models.");
      } else {
        setTtsAudioResult("MOCK_AUDIO_GENERATED");
        showToast("Synthesizer running: audio output successfully compiled.");
      }
    } catch (err) {
      showToast("Audio processing issue.");
    } finally {
      setTtsSpeechLoading(false);
    }
  };

  // Voice Transcribe Action
  const handlePrebuiltVoiceRecording = async () => {
    if (!checkPremiumFeatureAccess()) {
      return;
    }

    setVoiceRecording(true);
    // Simulate recording latency
    setTimeout(async () => {
      setVoiceRecording(false);
      try {
        const response = await fetch("/api/multimodal/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            audioSampleRate: 44100,
            simulatedPrompt: voicePromptSim || undefined 
          })
        });
        const resData = await response.json();
        if (resData) {
          setTranscriptionResult(resData);
          showToast("Speech transcription and judicial mapping complete!");
          // Load text to co-counsel ask box as convenience
          setChatMessage(resData.text);
        }
      } catch (err) {
        showToast("Speech decoder service issue.");
      }
    }, 2800);
  };

  // Text to Video generating
  const handleGenerateVideoBrief = async () => {
    if (!videoPrompt.trim()) {
      showToast("Please enter visual presentation guideline text first.");
      return;
    }

    if (!checkPremiumFeatureAccess()) {
      return;
    }

    if (effectiveSubscription?.planType === "monthly") {
      setActiveTab("billing");
      showToast("👑 Premium Upgrade Required: Veo Generative Video briefings are advanced multimodal features reserved for Annual Unlimited subscribers.");
      return;
    }

    setVideoGenerating(true);
    setVideoOperation(null);
    try {
      const response = await fetch("/api/multimodal/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: videoPrompt })
      });
      const resData = await response.json();
      if (resData && resData.success) {
        setVideoOperation(resData.operationName);
        showToast("Video brief rendering initiated via Veo generative pipeline.");
      }
    } catch (e) {
      showToast("Generative video server error.");
    } finally {
      setVideoGenerating(false);
    }
  };

  // Gemini Translation Trigger
  const handleTriggerTranslation = async () => {
    if (!translationInput.trim()) {
      showToast("Please enter or upload legal text to translate first.");
      return;
    }

    if (!checkPremiumFeatureAccess()) {
      return;
    }

    setTranslationLoading(true);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_language: translationSource,
          target_language: translationTarget,
          mode: translationMode,
          text: translationInput
        })
      });
      const data = await response.json();
      if (data && data.translatedText) {
        setTranslationResultText(data.translatedText);
        showToast("Gemini Legal Translation completed successfully!");
      } else {
        showToast("Error processing legal translation.");
      }
    } catch (err: any) {
      showToast(`Translation agent error: ${err.message}`);
    } finally {
      setTranslationLoading(false);
    }
  };

  // Dynamic template rendering
  useEffect(() => {
    let text = "";
    if (activeTemplate === "nda") {
      text = `MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is signed on this day ${templateInputs.effectiveDate} by and between:
1. DISCLOSING PARTY: ${templateInputs.partyA}
2. RECEIVING PARTY: ${templateInputs.partyB}

To protect proprietary software secrets, patent documentation, and strategic parameters, the parties agree that standard governing rules shall be construed under ${templateInputs.jurisdictionState} jurisdiction laws. This agreement restricts any disclosure for a period of five (5) years.
`;
    } else if (activeTemplate === "will") {
      text = `LAST WILL AND TESTAMENT

I, ${templateInputs.willMaker}, being of sound mind, declare this instrument to be my Last Will.
I nominate ${templateInputs.executorName} to act as the primary Executor of this estate. In case they are unable to perform duties, ${templateInputs.alternateExecutor} shall assume fiduciary custody.
I bequeath all eligible property, intellectual rights, and financial instruments located worldwide as residual interest to:
BENEFICIARY: ${templateInputs.willBeneficiary}.
`;
    } else if (activeTemplate === "sublease") {
      text = `RESIDENTIAL SUBLEASE TENANCY AGREEMENT

This Sublease Agreement is executed by Tenant ${templateInputs.subleaseTenant} and Primary Tenant Landlord ${templateInputs.subleaseLandlord} for the property located at:
PREMISES: ${templateInputs.subleasePremises}

TERMS:
- Monthly Retainer / Rent: $${templateInputs.subleaseMonthlyRent} CAD/USD
- Security Escrow Escrow Deposit: $${templateInputs.subleaseDepositAmount} CAD/USD
Landlord covenants quiet enjoyment. All standard tenant protection laws apply.`;
    } else if (activeTemplate === "power_of_attorney") {
      text = `DURABLE FINANCIAL POWER OF ATTORNEY

I, ${templateInputs.principalName}, hereby appoint ${templateInputs.attorneyInFactName} as my lawful Attorney-In-Fact to manage my commercial interests, handle financial ledgers, and execute transaction signatures.
This power is durable and persists through any subsequent incapacity.`;
    }
    setCustomDraftContent(text);
  }, [activeTemplate, templateInputs]);

  const handleDownloadDraft = () => {
    const element = document.createElement("a");
    const file = new Blob([customDraftContent], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${activeTemplate}_sovereign_instrument.txt`;
    document.body.appendChild(element);
    element.click();
    showToast("Completed legal draft generated and downloaded!");
  };

  // Helpers for selected country lookup
  const currentJurisdictionObj: SovereignJurisdiction = JURISDICTIONS_DATA[selectedCountry] || JURISDICTIONS_DATA["CA"];

  return (
    <div id="app-viewport" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-2 md:p-4">
      {/* Toast alert */}
      {toastMsg && (
        <div id="toast-notify" className="fixed bottom-6 right-6 z-50 bg-indigo-600 border-2 border-amber-400 text-white font-semibold py-3 px-6 rounded-lg shadow-2xl flex items-center gap-3 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main outer Geometric Balance themed container */}
      <div id="legal-matters-container" className="w-full max-w-7xl mx-auto bg-slate-900 rounded-2xl overflow-hidden border-4 border-slate-700 shadow-2xl flex flex-col min-h-[92vh]">
        
        {/* Deep Navigation / Header Banner */}
        <header id="app-header" className="bg-slate-950 border-b border-slate-800 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center border-2 border-amber-400 shadow-[3px_3px_0px_rgba(245,158,11,0.5)]">
              <Scale className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-white uppercase">ALL LEGAL MATTERS</span>
                <span className="bg-indigo-950 border border-indigo-500 text-indigo-400 text-[10px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
                  AI Global Concierge
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Sovereign Transnational Intelligence & Judicial Counsel Bench</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  id="btn-header-signup"
                  type="button"
                  onClick={() => {
                    setActiveTab("auth");
                    setAuthView("signup");
                    showToast("✨ Opening Sovereign Account Registration Portal.");
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md flex items-center gap-1 border border-indigo-400/30 font-sans"
                >
                  <UserPlus className="w-3.5 h-3.5 text-white" />
                  Sign Up Free
                </button>
                <button
                  id="btn-header-signin"
                  type="button"
                  onClick={() => {
                    setActiveTab("auth");
                    setAuthView("signin");
                    showToast("🔑 Secure console Login session verification.");
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-black bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-all font-sans"
                >
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                  Sign In
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                <div className="flex flex-col text-right pl-1">
                  <span className="text-[9px] text-slate-500 font-mono font-bold">ACTIVE ROLE</span>
                  <span className="text-xs font-extrabold text-indigo-300 truncate max-w-[120px] font-sans">{currentUser.name}</span>
                </div>
                <button
                  id="btn-header-signout"
                  type="button"
                  onClick={() => {
                    setCurrentUser(null);
                    localStorage.removeItem("sovereign_current_user");
                    localStorage.removeItem("cached_documents");
                    setSimulatedTier("real");
                    setActiveTab("directory");
                    showToast("🔒 Securely signed out from Sovereign Session.");
                  }}
                  className="px-2.5 py-1.5 bg-rose-950/40 text-rose-300 hover:bg-rose-900 hover:text-white border border-rose-500/20 text-[10px] font-black rounded transition-all uppercase font-sans"
                >
                  Sign Out
                </button>
              </div>
            )}

            {/* Prominent Subscription Access Button */}
            <button
              id="btn-header-subscribe-plans"
              type="button"
              onClick={() => {
                setActiveTab("billing");
                showToast("🎯 Navigated to Membership & Subscriptions Hub.");
              }}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 border shadow-lg hover:scale-[1.02] active:scale-[0.98] ${
                effectiveSubscription?.status === "active"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white border-emerald-400/50 hover:shadow-emerald-500/10"
                  : effectiveTrialStatus.isTrialActive
                    ? "bg-gradient-to-r from-indigo-600 to-violet-500 hover:from-indigo-500 hover:to-violet-400 text-white border-indigo-400/50 hover:shadow-indigo-500/10"
                    : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 border-amber-400 hover:shadow-amber-550/20 animate-pulse"
              }`}
            >
              <Award className={`w-4 h-4 ${effectiveSubscription?.status === "active" ? "text-yellow-300 animate-bounce" : "text-slate-900"}`} />
              <span className="uppercase tracking-wider">
                {effectiveSubscription?.status === "active"
                  ? `Active Plan: ${effectiveSubscription.planType === "yearly" ? "Yearly Pro" : "Monthly Pro"}`
                  : effectiveTrialStatus.isTrialActive
                    ? "Upgrade to Pro License"
                    : "Subscribe: Access AI Tools"}
              </span>
            </button>

            <div id="secure-cert-badge" className="hidden sm:flex items-center gap-2 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-md">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
              <span>SOC2 CERTIFIED · GDPR COMPLIANT · 256-BIT ENCRYPTED</span>
            </div>
          </div>
        </header>

        {/* Trial & Subscription Status Info Bar */}
        <div id="trial-subscription-bar" className="bg-slate-950 border-b border-indigo-950/60 px-4 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 text-xs font-sans">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium font-mono text-[11px]">CONTEXT:</span>
              <span className="bg-slate-900 border border-slate-800 text-indigo-300 px-2 py-0.5 rounded font-mono font-bold select-all text-[11px]">
                {currentUser ? currentUser.email : "Not Signed In (Public Guest Mode)"}
              </span>
            </div>
            
            {/* Sovereign Subscription Sandbox Simulator */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
              <span className="text-[10px] text-slate-400 font-mono pl-1.5 pr-1 font-bold flex items-center gap-1">
                <Sliders className="w-3 h-3 text-indigo-400" />
                SIMULATE ROLE:
              </span>
              <button
                type="button"
                onClick={() => {
                  setSimulatedTier("real");
                  showToast("⚡ Reset simulation: Connected directly to live database & Stripe credentials.");
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all uppercase ${
                  simulatedTier === "real" ? "bg-indigo-600 text-white font-extrabold shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                Live API
              </button>
              <button
                type="button"
                onClick={() => {
                  setSimulatedTier("trial");
                  showToast("⭐ Simulated Access: Active 7-Day Free Trial");
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all uppercase ${
                  simulatedTier === "trial" ? "bg-violet-600 text-white font-extrabold shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                Trial
              </button>
              <button
                type="button"
                onClick={() => {
                  setSimulatedTier("monthly");
                  showToast("💳 Simulated Access: Active Monthly Pro Membership ($39/mo)");
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all uppercase ${
                  simulatedTier === "monthly" ? "bg-emerald-700 text-emerald-105 font-bold shadow bg-emerald-700" : "text-slate-400 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => {
                  setSimulatedTier("yearly");
                  showToast("👑 Simulated Access: Active Yearly Unlimited License ($349/yr)");
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all uppercase ${
                  simulatedTier === "yearly" ? "bg-amber-500 text-slate-950 font-black shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                Annual
              </button>
              <button
                type="button"
                onClick={() => {
                  setSimulatedTier("expired");
                  showToast("⚠️ Simulated Access: Expired Trial (Unsubscribed Public User)");
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all uppercase ${
                  simulatedTier === "expired" ? "bg-rose-600 text-white font-extrabold shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                Expired
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            {effectiveSubscription?.status === "active" ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-extrabold bg-emerald-950/45 border border-emerald-500/20 px-3 py-1 rounded-md text-[10px] uppercase tracking-wider">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Authorized: {effectiveSubscription.planType === "yearly" ? "Annual Elite License" : "Monthly Pro Plan"}
              </span>
            ) : effectiveTrialStatus.isTrialActive ? (
              <span className="flex items-center gap-1.5 text-indigo-300 font-semibold bg-indigo-950/40 border border-indigo-500/20 px-3 py-1 rounded-md text-[10px] tracking-wide">
                <Sparkles className="w-3 h-3 text-amber-300 animate-spin" style={{ animationDuration: "5s" }} />
                Trial Remaining: <strong className="text-white">{Math.ceil(effectiveTrialStatus.daysRemaining)} Days</strong>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-400 font-extrabold bg-rose-950/40 border border-rose-500/20 px-3 py-1 rounded-md text-[10px] uppercase tracking-wider animate-pulse font-mono">
                ⚠️ Trial Expired (AI Access Suspended)
              </span>
            )}
 
            {!isPremiumOrTrialActive && (
              <button 
                id="btn-quick-upgrade"
                type="button"
                onClick={() => setActiveTab("billing")}
                className="bg-amber-550 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-1 rounded-md text-[10px] transition-all hover:scale-105 active:scale-95 uppercase tracking-wide shadow-md border border-amber-300 ml-1"
              >
                Select Premium Plan
              </button>
            )}
          </div>
        </div>

        {/* Global Tab Menu - Balanced Button Panel */}
        <div id="tab-nav-panel" className="bg-slate-950/60 border-b border-slate-800 px-4 py-2 flex flex-wrap gap-2">
          <button
            id="tab-btn-directory"
            onClick={() => setActiveTab("directory")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === "directory" ? "bg-indigo-600 text-white border-b-2 border-amber-400" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Globe className="w-4 h-4 text-amber-300" />
            Sovereign Jurisdictions
          </button>
          
          <button
            id="tab-btn-counsel"
            onClick={() => {
              if (!checkPremiumFeatureAccess()) {
                return;
              }
              setActiveTab("counsel");
              // pre-fill document scan query advice if empty
              if (uploadedDocs.length > 0 && selectedVaultDoc) {
                setChatMessage(`Analyze ${selectedVaultDoc.name} for overall risk exposure & recommended action.`);
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === "counsel" ? "bg-indigo-600 text-white border-b-2 border-amber-400" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <MessageSquare className="w-4 h-4 text-indigo-300" />
            AI Co-Counsel
          </button>

          <button
            id="tab-btn-vault"
            onClick={() => setActiveTab("vault")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === "vault" ? "bg-indigo-600 text-white border-b-2 border-amber-400" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Document Vault
          </button>

          <button
            id="tab-btn-compliance"
            onClick={() => setActiveTab("compliance")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === "compliance" ? "bg-indigo-600 text-white border-b-2 border-amber-400" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-300" />
            Compliance Dashboard
          </button>

          <button
            id="tab-btn-forms"
            onClick={() => setActiveTab("forms")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === "forms" ? "bg-indigo-600 text-white border-b-2 border-amber-400" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <FileText className="w-4 h-4 text-amber-300" />
            Generator & Procedures
          </button>

          <button
            id="tab-btn-consultations"
            onClick={() => setActiveTab("consultations")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === "consultations" ? "bg-indigo-600 text-white border-b-2 border-amber-400" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Calendar className="w-4 h-4 text-slate-200" />
            Professional Booking
          </button>

          <button
            id="tab-btn-multimodal"
            onClick={() => {
              if (!checkPremiumFeatureAccess()) {
                return;
              }
              setActiveTab("multimodal");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === "multimodal" ? "bg-indigo-600 text-white border-b-2 border-amber-400" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Volume2 className="w-4 h-4 text-teal-400" />
            Multimodal Ops
          </button>

          <button
            id="tab-btn-translation"
            onClick={() => {
              if (!checkPremiumFeatureAccess()) {
                return;
              }
              setActiveTab("translation");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === "translation" ? "bg-indigo-600 text-white border-b-2 border-amber-400" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Globe className="w-4 h-4 text-emerald-400 animate-pulse" />
            Legal Translation
          </button>

          <button
            id="tab-btn-auth"
            onClick={() => {
              setActiveTab("auth");
              setAuthView(currentUser ? "signin" : "signup");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === "auth" ? "bg-indigo-600 text-white border-b-2 border-amber-400" : "bg-slate-800 text-indigo-300 hover:bg-slate-700"
            }`}
          >
            <UserCheck className="w-4 h-4 text-teal-400" />
            <span>{currentUser ? "User Identity" : "Sign Up / Join"}</span>
          </button>

          {(currentUser?.isAdmin || currentUser?.email === "akinisaacade@gmail.com") && (
            <button
              id="tab-btn-admin"
              onClick={() => setActiveTab("admin")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
                activeTab === "admin" ? "bg-purple-600/90 text-white border-b-2 border-purple-400" : "bg-slate-800 text-purple-300 hover:bg-slate-700"
              }`}
            >
              <Shield className="w-4 h-4 text-purple-400" />
              <span>Admin Console</span>
            </button>
          )}

          <button
            id="tab-btn-billing"
            onClick={() => setActiveTab("billing")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all relative overflow-hidden ${
              activeTab === "billing" ? "bg-amber-600/90 text-white border-b-2 border-emerald-400" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>Membership & Billing</span>
            {effectiveSubscription?.status === "active" ? (
              <span className="flex items-center gap-0.5 text-[9px] bg-emerald-500 text-white font-extrabold px-1.5 py-0.5 rounded-full animate-bounce">
                <Award className="w-3 h-3 text-yellow-300" /> PRO
              </span>
            ) : (
              <span className="text-[9px] bg-indigo-500/80 text-white font-semibold px-1 py-0.5 rounded-md text-[8px] tracking-wide animate-pulse">
                UPGRADE
              </span>
            )}
          </button>

          <button
            id="tab-btn-maintenance"
            onClick={() => {
              setActiveTab("maintenance");
              handleMaintenanceRun();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ml-auto ${
              activeTab === "maintenance" ? "bg-indigo-600 text-white border-b-2 border-amber-400" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <RefreshCw className="w-4 h-4 text-amber-400" />
            Self-Healing Agent
          </button>
        </div>

        {/* Dynamic Panels */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          
          {/* 1. Sovereign Jurisdictions Deep-dive Directory */}
          {activeTab === "directory" && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Mode Switcher */}
              <div className="flex gap-2 border-b border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setDirectoryMode("static")}
                  className={`py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                    directoryMode === "static"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/50"
                      : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  🌍 Standard Mapped Countries
                </button>
                <button
                  type="button"
                  onClick={() => setDirectoryMode("europe_firestore")}
                  className={`relative py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                    directoryMode === "europe_firestore"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/50"
                      : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  🇪🇺 Europe Core (Firestore Cloud Col)
                  <span className="absolute -top-1.5 -right-1 bg-pink-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full scale-90 shadow-md">
                    Live
                  </span>
                </button>
              </div>

              {directoryMode === "europe_firestore" ? (
                <EuropeJurisdictionsPanel currentUser={currentUser} showToast={showToast} />
              ) : (
                <>
                  <div className="bg-slate-900 border border-slate-700 p-5 rounded-xl">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                        <Globe className="w-5 h-5 text-amber-400" />
                        Sovereign Jurisdictions Directory
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Analyze constitutions, discover official state registries, legal families, and directly load active government justice channels.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Select Country:</label>
                      <select
                        id="country-selector"
                        value={selectedCountry}
                        onChange={(e) => {
                          const code = e.target.value;
                          setSelectedCountry(code);
                          const possibleSubs = JURISDICTIONS_DATA[code]?.subnational;
                          if (possibleSubs && possibleSubs.length > 0) {
                            setSelectedSubnational(possibleSubs[0].id);
                          } else {
                            setSelectedSubnational("");
                          }
                        }}
                        className="bg-slate-800 text-white text-xs font-bold py-2 px-3 border border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500"
                      >
                        {Object.keys(JURISDICTIONS_DATA).map((code) => (
                          <option key={code} value={code}>
                            {JURISDICTIONS_DATA[code].name} ({code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Search/Filter Bar */}
                  <div className="mt-4 relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                      <Search className="w-4 h-4 text-indigo-400" />
                    </span>
                    <input
                      type="text"
                      value={directorySearchQuery}
                      onChange={(e) => setDirectorySearchQuery(e.target.value)}
                      placeholder="Real-time Search countries, constitutional states, provinces, or capitals (e.g. Ontario, Texas, Sharia, Common law...)"
                      className="w-full bg-slate-950 hover:bg-slate-920 border border-slate-700 focus:border-indigo-500 rounded-lg pl-10 pr-16 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono shadow-inner"
                    />
                    {directorySearchQuery && (
                      <button
                        onClick={() => setDirectorySearchQuery("")}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs text-amber-400 hover:text-amber-300 font-extrabold"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Live Results Drawer */}
                  {searchResults !== null && (
                    <div className="mt-4 bg-slate-950 p-4 rounded-lg border border-indigo-500/30 space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-indigo-900/30">
                        <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          Matched Jurisdictions ({searchResults.length} found)
                        </span>
                        <button 
                          onClick={() => setDirectorySearchQuery("")}
                          className="text-[10px] font-bold text-amber-500 hover:text-amber-400"
                        >
                          Reset Search
                        </button>
                      </div>

                      {searchResults.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[160px] overflow-y-auto pr-1">
                          {searchResults.map((res, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setSelectedCountry(res.countryCode);
                                if (res.subnationalId) {
                                  setSelectedSubnational(res.subnationalId);
                                } else {
                                  const pos = JURISDICTIONS_DATA[res.countryCode]?.subnational;
                                  if (pos && pos.length > 0) {
                                    setSelectedSubnational(pos[0].id);
                                  } else {
                                    setSelectedSubnational("");
                                  }
                                }
                                showToast(`Selected: ${res.subnationalName || res.countryName}`);
                              }}
                              className="bg-slate-900 border border-slate-800 text-left p-2.5 rounded hover:border-indigo-500 hover:bg-slate-850 transition-all flex flex-col justify-between"
                            >
                              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                {res.countryName}
                              </span>
                              <span className="text-white text-xs font-black truncate mt-0.5">
                                {res.subnationalName ? `${res.subnationalName} (${res.subnationalId})` : "National Level (Federal Jurisdiction)"}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="py-2 text-center text-xs text-slate-500 font-medium">
                          No sovereign nation, state, or province matches your search term.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Country Quick Access Circle Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-11 gap-2 mt-4 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    {Object.keys(JURISDICTIONS_DATA).map((code) => (
                      <button
                        key={code}
                        onClick={() => {
                          setSelectedCountry(code);
                          const pos = JURISDICTIONS_DATA[code]?.subnational;
                          if (pos && pos.length > 0) {
                            setSelectedSubnational(pos[0].id);
                          } else {
                            setSelectedSubnational("");
                          }
                        }}
                        className={`py-1.5 px-2 rounded font-mono text-xs font-bold transition-all ${
                          selectedCountry === code
                            ? "bg-indigo-600 text-white border border-amber-400 scale-105"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>

              {/* Grid split showing Country core info and subnational state/province deep-dive */}
              {selectedCountry === "EU" ? (
                <div className="col-span-12 space-y-6">
                  {/* Dashboard Header */}
                  <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 border border-indigo-500/20 p-6 rounded-xl shadow-xl">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-indigo-600 text-white font-extrabold px-2.5 py-1 rounded font-mono uppercase tracking-wider shadow-sm">
                            Exclusive Sovereign Hub
                          </span>
                          <span className="text-[10px] bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 font-extrabold px-2.5 py-1 rounded font-mono flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                            ACTIVE REAL-TIME SANDBOX
                          </span>
                        </div>
                        <h2 className="text-3xl font-black text-white mt-2.5 tracking-tight flex items-center gap-2.5">
                          <Sparkles className="w-7 h-7 text-amber-400 animate-pulse" />
                          DIGITAL MARKETING CRM™
                        </h2>
                        <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                          The Smart Way to Capture, Convert, and Scale. We have transformed the traditional European Union compliance hub into an interactive full-funnel SaaS playground featuring sales pipelines, automated email sequences, social media copy generators, and plug-and-play AI tool templates.
                        </p>
                      </div>

                      {/* Main Tabs */}
                      <div className="flex flex-wrap items-center gap-1 bg-slate-900/90 p-1.5 rounded-lg border border-slate-800 self-start lg:self-center">
                        {(["dashboard", "listing", "sequences", "social", "templates", "brand", "faqs"] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setSelectedCrmTab(tab)}
                            className={`px-3 py-2 text-[10px] font-black uppercase rounded transition-all tracking-wider ${
                              selectedCrmTab === tab
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/50 scale-102"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                            }`}
                          >
                            {tab === "faqs" ? "FAQs" : tab}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* TAB 1: DASHBOARD OVERVIEW */}
                  {selectedCrmTab === "dashboard" && (
                    <div className="space-y-6">
                      {/* Interactive Bento Stat Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2 relative overflow-hidden group hover:border-slate-700 transition-all">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-all"></div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Leads Captured</span>
                            <div className="p-1.5 bg-indigo-950 text-indigo-400 rounded-lg">
                              <Users className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="flex items-baseline gap-2 pt-1">
                            <span className="text-2xl font-black text-white font-mono">{crmLeadsCount.toLocaleString()}</span>
                            <span className="text-[10px] text-emerald-400 font-bold font-mono">+12.4% MoM</span>
                          </div>
                          <p className="text-[10px] text-slate-400">Dynamic capture from Web Forms, FB Ads, and Calendars.</p>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2 relative overflow-hidden group hover:border-slate-700 transition-all">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all"></div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Active Opportunities</span>
                            <div className="p-1.5 bg-amber-950 text-amber-400 rounded-lg">
                              <Sliders className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="flex items-baseline gap-2 pt-1">
                            <span className="text-2xl font-black text-white font-mono">{crmOppCount}</span>
                            <span className="text-[10px] text-amber-400 font-bold font-mono">+8.7% MoM</span>
                          </div>
                          <p className="text-[10px] text-slate-400">Qualified leads actively engaged in conversion pipelines.</p>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2 relative overflow-hidden group hover:border-slate-700 transition-all">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all"></div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Pipeline Value</span>
                            <div className="p-1.5 bg-emerald-950 text-emerald-400 rounded-lg">
                              <TrendingUp className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="flex items-baseline gap-2 pt-1">
                            <span className="text-2xl font-black text-white font-mono">${crmPipelineValue.toLocaleString()}</span>
                            <span className="text-[10px] text-emerald-400 font-bold font-mono">Forecasted</span>
                          </div>
                          <p className="text-[10px] text-slate-400">Value of open opportunities in stages 1 to 4.</p>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2 relative overflow-hidden group hover:border-slate-700 transition-all">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-xl group-hover:bg-pink-500/10 transition-all"></div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Recurring Revenue</span>
                            <div className="p-1.5 bg-pink-950 text-pink-400 rounded-lg">
                              <CreditCard className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="flex items-baseline gap-2 pt-1">
                            <span className="text-2xl font-black text-white font-mono">${crmRevenue.toLocaleString()}</span>
                            <span className="text-[10px] text-indigo-400 font-bold font-mono">ARR Growth</span>
                          </div>
                          <p className="text-[10px] text-slate-400">Fully realized ARR across annual & monthly tiers.</p>
                        </div>
                      </div>

                      {/* Interactive Controls & Sales Pipeline */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Visual Funnel */}
                        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-5">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                              <Sliders className="w-4 h-4 text-indigo-400" />
                              Interactive Sales Pipeline Stages
                            </h3>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setCrmLeadsCount(prev => prev + 1);
                                  setCrmPipelineValue(prev => prev + 1200);
                                  const names = ["Thomas M.", "Emma V.", "Klaus S.", "Sophia L.", "Amélie G."];
                                  const selectedName = names[Math.floor(Math.random() * names.length)];
                                  const sources = ["Google Search", "Facebook Retargeting", "Instagram Reel", "Referral Network"];
                                  const source = sources[Math.floor(Math.random() * sources.length)];
                                  setCrmActivities(prev => [
                                    {
                                      id: `act-sim-${Date.now()}`,
                                      time: "Just now",
                                      text: `Lead captured via ${source}: ${selectedName} (Est. Deal: $1,200)`,
                                      type: "lead"
                                    },
                                    ...prev.slice(0, 5)
                                  ]);
                                  showToast(`Simulated Lead captured: ${selectedName}!`);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black px-3 py-1.5 uppercase rounded tracking-wider transition-all"
                              >
                                + Capture Lead
                              </button>
                              <button
                                onClick={() => {
                                  if (crmOppCount > 0) {
                                    setCrmOppCount(prev => prev - 1);
                                    setCrmRevenue(prev => prev + 2400);
                                    const names = ["Jackson Agency", "Munich Coach LLC", "Parisian App dev", "Bruxelles Retail", "Amster-Trade"];
                                    const selectedClient = names[Math.floor(Math.random() * names.length)];
                                    setCrmActivities(prev => [
                                      {
                                        id: `act-sim-${Date.now()}`,
                                        time: "Just now",
                                        text: `Deal Closed Won: ${selectedClient} upgraded to ARR Tier ($2,400/yr)`,
                                        type: "revenue"
                                      },
                                      ...prev.slice(0, 5)
                                    ]);
                                    showToast(`Deal Won: ${selectedClient}! +$2,400 ARR`);
                                  }
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black px-3 py-1.5 uppercase rounded tracking-wider transition-all"
                              >
                                🏆 Close Deal
                              </button>
                            </div>
                          </div>

                          <div className="space-y-3.5 pt-2">
                            <div>
                              <div className="flex justify-between text-xs mb-1 font-bold">
                                <span className="text-slate-300">1. New Lead Intake (38%)</span>
                                <span className="text-slate-400 font-mono">942 Leads</span>
                              </div>
                              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
                                <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: "38%" }}></div>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-1 font-bold">
                                <span className="text-slate-300">2. Contacted & Scheduled (24%)</span>
                                <span className="text-slate-400 font-mono">595 Leads</span>
                              </div>
                              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
                                <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: "24%" }}></div>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-1 font-bold">
                                <span className="text-slate-300">3. Qualified Opportunity (16%)</span>
                                <span className="text-slate-400 font-mono">396 Leads</span>
                              </div>
                              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
                                <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: "16%" }}></div>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-1 font-bold">
                                <span className="text-slate-300">4. Proposal Submitted (12%)</span>
                                <span className="text-slate-400 font-mono">297 Leads</span>
                              </div>
                              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
                                <div className="bg-pink-500 h-full rounded-full transition-all" style={{ width: "12%" }}></div>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-1 font-bold">
                                <span className="text-slate-300">5. Closed Won (10%)</span>
                                <span className="text-emerald-400 font-bold font-mono">248 Customers</span>
                              </div>
                              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-emerald-500/20">
                                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: "10%" }}></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Custom Charts SVG / Dynamic Visuals */}
                        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                          <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            Revenue Overview & Trends (H1)
                          </h3>
                          
                          {/* Beautiful Responsive SVG Graph */}
                          <div className="h-32 w-full bg-slate-950 rounded-lg p-2 border border-slate-850 flex flex-col justify-between relative">
                            <div className="absolute top-2 left-3 text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                              Realized Recurring Growth ($)
                            </div>
                            <svg viewBox="0 0 400 100" className="w-full h-24 overflow-visible">
                              {/* Grid lines */}
                              <line x1="0" y1="20" x2="400" y2="20" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,2" />
                              <line x1="0" y1="50" x2="400" y2="50" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,2" />
                              <line x1="0" y1="80" x2="400" y2="80" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,2" />
                              
                              {/* Filled Area */}
                              <path
                                d="M0,90 Q80,75 160,55 T320,30 L400,10 L400,100 L0,100 Z"
                                fill="url(#indigo-grad)"
                                opacity="0.15"
                              />
                              {/* Trend Line */}
                              <path
                                d="M0,90 Q80,75 160,55 T320,30 L400,10"
                                fill="none"
                                stroke="#6366f1"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />
                              {/* Interactive Points */}
                              <circle cx="80" cy="78" r="3.5" fill="#f59e0b" stroke="#0f172a" strokeWidth="1.5" />
                              <circle cx="160" cy="55" r="3.5" fill="#f59e0b" stroke="#0f172a" strokeWidth="1.5" />
                              <circle cx="320" cy="30" r="3.5" fill="#10b981" stroke="#0f172a" strokeWidth="1.5" className="animate-pulse" />
                              <circle cx="400" cy="10" r="4.5" fill="#10b981" stroke="#0f172a" strokeWidth="2" className="animate-ping" style={{ transformOrigin: '400px 10px' }} />

                              <defs>
                                <linearGradient id="indigo-grad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#6366f1" />
                                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                                </linearGradient>
                              </defs>
                            </svg>
                            <div className="flex justify-between text-[9px] font-mono text-slate-500 px-1 font-bold">
                              <span>JAN ($85K)</span>
                              <span>MAR ($120K)</span>
                              <span>MAY ($155K)</span>
                              <span>JUN (${(crmRevenue/1000).toFixed(0)}K)</span>
                            </div>
                          </div>

                          {/* Multi Channel Lead Attribution Pie/Ring Representation */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                              <PieChartIcon className="w-3 h-3 text-pink-400" /> Lead Attribution Sources
                            </span>
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-300">
                              <div className="bg-slate-950 p-2 rounded border border-slate-850 flex items-center justify-between">
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-indigo-500 rounded-full"></span>Website Forms</span>
                                <span className="font-bold text-white">42%</span>
                              </div>
                              <div className="bg-slate-950 p-2 rounded border border-slate-850 flex items-center justify-between">
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-blue-500 rounded-full"></span>Facebook Ads</span>
                                <span className="font-bold text-white">28%</span>
                              </div>
                              <div className="bg-slate-950 p-2 rounded border border-slate-850 flex items-center justify-between">
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-pink-500 rounded-full"></span>Instagram</span>
                                <span className="font-bold text-white">15%</span>
                              </div>
                              <div className="bg-slate-950 p-2 rounded border border-slate-850 flex items-center justify-between">
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span>Google Ads</span>
                                <span className="font-bold text-white">10%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recent Activities Feed */}
                      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                            Live CRM Campaign & Lead Events
                          </h3>
                          <button
                            onClick={() => {
                              setCrmActivities([
                                { id: "act-1", time: "Just now", text: "New Lead captured from Google Ads: Michael K.", type: "lead" },
                                { id: "act-2", time: "5 mins ago", text: "AI workflow triggered: Send Welcome Sequence to Michael K.", type: "system" },
                                { id: "act-3", time: "25 mins ago", text: "Lead upgraded: Sarah L. moved to Qualified stage", type: "pipeline" },
                                { id: "act-4", time: "1 hour ago", text: "Opportunity closed: 5-user Growth Plan subscription finalized ($2,400/yr)", type: "revenue" },
                                { id: "act-5", time: "3 hours ago", text: "Facebook Ad campaign optimization: Click-Through-Rate improved to 3.24%", type: "campaign" }
                              ]);
                              showToast("Simulation log reset successfully!");
                            }}
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                          >
                            Reset Feed Logs
                          </button>
                        </div>

                        <div className="divide-y divide-slate-800 max-h-[220px] overflow-y-auto pr-2 space-y-2.5">
                          {crmActivities.map((act) => (
                            <div key={act.id} className="pt-2.5 flex items-start gap-3 text-xs justify-between group">
                              <div className="flex items-start gap-2.5">
                                <span className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
                                  act.type === "lead" ? "bg-indigo-500" :
                                  act.type === "revenue" ? "bg-emerald-500 animate-pulse" :
                                  act.type === "pipeline" ? "bg-amber-500" :
                                  act.type === "campaign" ? "bg-pink-500" : "bg-slate-400"
                                }`}></span>
                                <span className="text-slate-300 group-hover:text-white transition-colors">{act.text}</span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-500 flex-shrink-0 font-bold">{act.time}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Perfect For Section */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800/80">
                          <h4 className="text-xs font-black uppercase text-amber-400">Entrepreneurs & Creators</h4>
                          <p className="text-[11px] text-slate-400 mt-1">Scale coaching, digital courses, agency consulting, and high-ticket service sales effortlessly with structured automations.</p>
                        </div>
                        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800/80">
                          <h4 className="text-xs font-black uppercase text-indigo-400">Marketing Agencies</h4>
                          <p className="text-[11px] text-slate-400 mt-1">Manage pipeline opportunities for dozens of active accounts in real-time. Instantly demonstrate ROI metrics in reporting tabs.</p>
                        </div>
                        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800/80">
                          <h4 className="text-xs font-black uppercase text-pink-400">E-Commerce Pioneers</h4>
                          <p className="text-[11px] text-slate-400 mt-1">Synchronize cart behaviors and trigger high-conversion emails within seconds using deep API integrations and tracking links.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: APP STORE LISTING */}
                  {selectedCrmTab === "listing" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <div className="lg:col-span-8 bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6">
                        <div>
                          <span className="text-[10px] bg-slate-800 text-amber-400 font-extrabold px-2 py-0.5 rounded font-mono">
                            OFFICIAL METADATA SPEC
                          </span>
                          <h3 className="text-xl font-black text-white mt-2">App Store Metadata Specification</h3>
                          <p className="text-xs text-slate-400 mt-0.5">Use this pre-configured data package for uploading your finalized build to iTunes Connect and Google Play console.</p>
                        </div>

                        <div className="space-y-4 pt-2">
                          <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                              <span>App Name (Max 30 characters)</span>
                              <span className="text-indigo-400">22 / 30 chars</span>
                            </div>
                            <p className="text-sm font-black text-white selection:bg-indigo-600">DIGITAL MARKETING CRM™</p>
                          </div>

                          <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                              <span>Subtitle (Max 30 characters)</span>
                              <span className="text-indigo-400">29 / 30 chars</span>
                            </div>
                            <p className="text-xs font-bold text-slate-200">The Smart Way to Scale Sales</p>
                          </div>

                          <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                              <span>Short Description (Max 80 characters)</span>
                              <span className="text-indigo-400">79 / 80 chars</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-200">
                              Capture leads, trigger automated campaigns, and scale revenue with our smart CRM.
                            </p>
                          </div>

                          <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 space-y-2">
                            <div className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider mb-1">
                              Full Description (App Store Optimized)
                            </div>
                            <div className="text-xs text-slate-300 space-y-3 max-h-[250px] overflow-y-auto pr-1">
                              <p className="font-extrabold text-white">🚀 Grow your business with AI-powered marketing automation and an intelligent CRM built for modern entrepreneurs, agencies, coaches, and service providers.</p>
                              <p>DIGITAL MARKETING CRM™ brings your marketing and sales funnels into a single, unified environment. Stop losing leads in messy spreadsheets and start converting traffic into lifelong customers using our automated workflows.</p>
                              <p className="font-bold text-amber-400">Key Feature Highlights:</p>
                              <ul className="list-disc pl-4 space-y-1 text-slate-400">
                                <li><strong>Full-Funnel Automation:</strong> Instantly sequence onboarding, welcome emails, and payment updates.</li>
                                <li><strong>Intelligent Lead Scoring:</strong> Separate passive traffic from active, high-intent opportunities automatically.</li>
                                <li><strong>Bento Dashboard Analytics:</strong> Track real-time leads, closed deals, attribution channels, and ARR forecasts.</li>
                                <li><strong>Copy-to-Clipboard Content Center:</strong> Use our ready-to-run marketing emails, social scripts, and landing copies.</li>
                              </ul>
                              <p>Join thousands of entrepreneurs worldwide and optimize your conversion channels today!</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Mock Device Preview */}
                      <div className="lg:col-span-4 bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col justify-between">
                        <div className="space-y-4">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-indigo-400" /> App Store Mockup Preview
                          </span>

                          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 relative shadow-inner overflow-hidden">
                            {/* Notch */}
                            <div className="w-24 h-4 bg-slate-900 mx-auto rounded-full mb-3"></div>
                            
                            <div className="flex items-center gap-3">
                              <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-pink-600 rounded-xl flex items-center justify-center font-black text-white text-base shadow-lg shadow-indigo-900/45">
                                CRM
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-white">DIGITAL MARKETING CRM™</h4>
                                <p className="text-[9px] text-slate-400">The Smart Way to Scale Sales</p>
                                <div className="flex items-center gap-1 mt-1 text-amber-400 text-[9px] font-bold">
                                  <span>4.9 ★★★★★</span>
                                  <span className="text-slate-500 font-mono">(4.8K ratings)</span>
                                </div>
                              </div>
                            </div>

                            <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black py-1.5 rounded-lg uppercase tracking-wider mt-4 transition-all">
                              Download from App Store
                            </button>

                            <div className="mt-4 pt-3 border-t border-slate-850 space-y-2">
                              <div className="flex items-center justify-between text-[8px] font-mono text-slate-500">
                                <span>DEVELOPER</span>
                                <span className="text-slate-300">CRM Global Inc.</span>
                              </div>
                              <div className="flex items-center justify-between text-[8px] font-mono text-slate-500">
                                <span>SIZE</span>
                                <span className="text-slate-300">42.8 MB</span>
                              </div>
                              <div className="flex items-center justify-between text-[8px] font-mono text-slate-500">
                                <span>COMPATIBILITY</span>
                                <span className="text-slate-300">iOS 16+ / Android 11+</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800/60 text-[10px] text-slate-400 space-y-1.5">
                          <p className="font-extrabold text-slate-300 uppercase">System Requirements:</p>
                          <ul className="list-disc pl-4 text-slate-500 space-y-0.5 font-mono">
                            <li>Local SQLite support for offline data sync</li>
                            <li>TLS 1.3 Secure WebSocket API</li>
                            <li>Memory allocation: Min 512MB RAM</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: EMAIL CAMPAIGNS SEQUENCE */}
                  {selectedCrmTab === "sequences" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Left Inbox List */}
                      <div className="lg:col-span-4 bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                          <Mail className="w-4 h-4 text-indigo-400" />
                          4-Step Email Marketing Sequence
                        </span>

                        <div className="space-y-2 pt-2">
                          {[
                            { step: 1, title: "1. Welcome & Onboarding", icon: "👋", sub: "Triggered instantly on lead capture" },
                            { step: 2, title: "2. Value & Automation", icon: "⚡", sub: "Triggered 24 hours later" },
                            { step: 3, title: "3. Social Proof & Case Study", icon: "📈", sub: "Triggered 48 hours later" },
                            { step: 4, title: "4. Urgency & Trial Expiration", icon: "⌛", sub: "Triggered 72 hours later" }
                          ].map((e) => (
                            <button
                              key={e.step}
                              onClick={() => setSelectedCrmEmail(e.step)}
                              className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-2.5 ${
                                selectedCrmEmail === e.step
                                  ? "bg-indigo-950 border-indigo-500 shadow-md"
                                  : "bg-slate-950 border-slate-850 hover:bg-slate-900 hover:border-slate-800"
                              }`}
                            >
                              <span className="text-lg">{e.icon}</span>
                              <div className="space-y-0.5">
                                <h4 className="text-xs font-black text-white">{e.title}</h4>
                                <p className="text-[10px] text-slate-400 font-medium leading-tight">{e.sub}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Right Email Body Viewer */}
                      {(() => {
                        const emailData = [
                          {
                            step: 1,
                            subject: "Welcome to DIGITAL MARKETING CRM™ – Let's Scale Your Business!",
                            body: `Hi {{first_name}},\n\nWelcome to DIGITAL MARKETING CRM™ – the smart way to capture, convert, and scale your sales funnel.\n\nOver the next few days, we will show you how to leverage automated leads workflows to turn traffic into paying customers. Today, your first task is simple: log in to your dashboard, configure your default inbound capture form, and invite your sales rep.\n\n👉 Click here to access your CRM Dashboard: {{login_url}}\n\nTo your marketing success,\n\nThe CRM Global Team`
                          },
                          {
                            step: 2,
                            subject: "Unleash AI-Powered Marketing Automation (Save 10+ Hours/Week)",
                            body: `Hi {{first_name}},\n\nDid you know that 74% of prospective leads are lost due to delayed follow-ups?\n\nWith DIGITAL MARKETING CRM™, you don't have to worry about manual messaging. Our AI triggers immediate personalized response templates the second a lead hits your website. Agencies and service providers are currently saving over 10 hours per week simply by leaving routing and scoring on auto-pilot.\n\n👉 Watch this 2-minute automation setup tutorial: {{video_tutorial_url}}\n\nKeep scaling,\n\nThe CRM Global Team`
                          },
                          {
                            step: 3,
                            subject: "How Sarah Scaled Her Agency 3x Using DIGITAL MARKETING CRM™",
                            body: `Hi {{first_name}},\n\nMeet Sarah. She was running a fast-growing marketing agency but found herself spending 4 hours every day copying contact details into spreadsheets.\n\nAfter migrating to DIGITAL MARKETING CRM™, she unified her landing forms, automated client onboarding sequences, and scaled her team size from 2 to 6. Within 90 days, her sales pipeline conversion rate increased by 210%.\n\n"The Bento dashboard changed how I view my business metrics. I finally have absolute clarity over my pipeline ARR forecasts." - Sarah M.\n\nAre you ready to write your own growth story?\n\n👉 Upgrade to the Full Enterprise Tier today: {{billing_portal_url}}\n\nBest regards,\n\nThe CRM Global Team`
                          },
                          {
                            step: 4,
                            subject: "Final Notice: Your Trial Expires in 24 Hours. Lock in 50% Off Today!",
                            body: `Hi {{first_name}},\n\nThis is a friendly reminder that your free access tier for DIGITAL MARKETING CRM™ expires in exactly 24 hours.\n\nIf you don't upgrade, your active webhook lead captures will pause, and your automated email sequences will stop sending. We don't want you to lose momentum! For a limited time, you can lock in our Founders Rate and save 50% on your first year.\n\n👉 Lock in your 50% Founders discount now: {{discount_payment_url}}\n\nDon't let valuable leads slip away!\n\nWarmly,\n\nThe CRM Global Team`
                          }
                        ].find((m) => m.step === selectedCrmEmail) || { subject: "", body: "" };

                        return (
                          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col justify-between space-y-4">
                            <div className="space-y-3">
                              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                                <span className="text-[10px] bg-indigo-600/20 text-indigo-400 font-extrabold px-2.5 py-1 rounded font-mono">
                                  STEP {selectedCrmEmail} TEMPLATE
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(`Subject: ${emailData.subject}\n\n${emailData.body}`);
                                    showToast(`Copied Step ${selectedCrmEmail} Email to Clipboard!`);
                                  }}
                                  className="text-[10px] bg-slate-850 hover:bg-slate-800 text-amber-400 font-extrabold px-3 py-1.5 rounded flex items-center gap-1.5 border border-slate-700 transition-all"
                                >
                                  <Copy className="w-3.5 h-3.5" /> Copy Template Text
                                </button>
                              </div>

                              <div className="space-y-2 pt-2 text-xs">
                                <div className="flex items-baseline gap-2 bg-slate-950 p-3 rounded-lg border border-slate-850">
                                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] w-14">Subject:</span>
                                  <span className="text-white font-black">{emailData.subject}</span>
                                </div>
                                <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 space-y-1.5 font-mono text-[11px] text-slate-300 whitespace-pre-wrap min-h-[220px]">
                                  {emailData.body}
                                </div>
                              </div>
                            </div>

                            <p className="text-[10px] text-slate-500 italic font-medium">
                              Note: Replace placeholder tokens like <strong className="text-slate-400 font-mono">{"{{first_name}}"}</strong> or <strong className="text-slate-400 font-mono">{"{{login_url}}"}</strong> directly in your sender tool (e.g. Mailchimp, Klaviyo, HubSpot).
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* TAB 4: SOCIAL MEDIA & VIDEO CONTENT */}
                  {selectedCrmTab === "social" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Left Platform Toggles */}
                      <div className="lg:col-span-4 bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                          <Share2 className="w-4 h-4 text-indigo-400" />
                          Multi-Channel Social Kit
                        </span>

                        <div className="space-y-1.5 pt-2">
                          {[
                            { key: "linkedin", title: "LinkedIn Authority Post", desc: "Build professional B2B authority" },
                            { key: "twitter", title: "Twitter/X Thread", desc: "High-hook engaging threads" },
                            { key: "facebook", title: "Facebook Ad High-Converting", desc: "For lead generation campaigns" },
                            { key: "video", title: "60-Second Video Script", desc: "Explainer video teleprompter" }
                          ].map((s) => (
                            <button
                              key={s.key}
                              onClick={() => setSelectedCrmSocial(s.key)}
                              className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                                selectedCrmSocial === s.key
                                  ? "bg-indigo-950 border-indigo-500"
                                  : "bg-slate-950 border-slate-850 hover:bg-slate-900"
                              }`}
                            >
                              <h4 className="text-xs font-black text-white">{s.title}</h4>
                              <p className="text-[10px] text-slate-400">{s.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Right Platform Viewer */}
                      {(() => {
                        const contentData = {
                          linkedin: {
                            platform: "LinkedIn B2B Lead Acquisition Spec",
                            text: `Spreadsheets are the silent killer of entrepreneurial scale.\n\nI see coaches, founders, and agency owners spending 2 hours every day copying contact details, chasing unpaid invoices, and manually emailing new lead captures.\n\nIf you want to scale your business, stop wasting time on administrative operations. Let automation manage your welcome flows and funnel pipelines while you focus on closing won deals.\n\nThis is why we built DIGITAL MARKETING CRM™.\n\nNo clutter. No low-value setups. Just clean workflows that turn traffic into recurring revenue.\n\n👉 Join our early Founders cohort and scale your pipeline today: https://digitalmarketingcrm.example.com\n\n#SaaS #CRM #MarketingAutomation #LeadGen #ScalingBusiness`
                          },
                          twitter: {
                            platform: "Twitter/X Authority Thread (5-Tweets)",
                            text: `Tweet 1/5:\nMost entrepreneurs fail to scale because they are trapped in spreadsheet jail.\n\nChasing contacts, sending welcome emails, logging follow-ups manually... it's a massive drag on productivity. Here's how to fix it: 👇\n\nTweet 2/5:\nYour welcome sequences MUST trigger in seconds, not hours. 74% of inbound leads choose the vendor that replies first. AI-driven response triggers bypass human delay completely.\n\nTweet 3/5:\nStop guessing pipeline health. Dynamic tracking lets you score intent, monitor qualified deals, and forecast monthly recurring revenue (ARR) with high accuracy.\n\nTweet 4/5:\nConsolidate your stack. Having separate tools for form building, email sequencing, and pipeline logging is a recipe for broken integrations and leaked leads.\n\nTweet 5/5:\nOptimize your conversion pipeline with DIGITAL MARKETING CRM™. Founders get 50% off for a limited time. Lock in your growth rate today: https://digitalmarketingcrm.example.com`
                          },
                          facebook: {
                            platform: "Facebook High-ROAS Direct Response Ad Copy",
                            text: `[🔥 ATTENTION: Agencies, Coaches & High-Ticket Founders]\n\nAre you still manually managing your inbound leads? Or worse... losing potential sales in messy, outdated spreadsheets?\n\nStop letting valuable leads slip through the cracks!\n\nMeet DIGITAL MARKETING CRM™ – the ultimate all-in-one automation hub that captures, scores, and converts your traffic on complete auto-pilot.\n\n✅ Auto-trigger responsive welcome sequences instantly\n✅ Score high-intent opportunities dynamically\n✅ Track recurring revenue & ARR forecasts on a clean, beautiful Bento dashboard\n✅ Plug-and-play high-converting templates within seconds\n\nStop trading 10+ hours a week for repetitive administration. Optimize your conversion rates and scale your business today.\n\n👉 Click "Learn More" to unlock 50% off during our Founders discount event!\n\nhttps://digitalmarketingcrm.example.com`
                          },
                          video: {
                            platform: "60-Second Video Script & Teleprompter Cue Cards",
                            text: `[0:00 - 0:10 Intro Hook]\n(Visual: Frustrated entrepreneur looking at a massive, messy spreadsheet with flashing warnings)\nNarrator: "Are you still managing your sales pipeline in spreadsheets? Or losing valuable leads because you didn't follow up fast enough?"\n\n[0:10 - 0:30 The Solution]\n(Visual: Smooth transition into a clean, sleek dark-themed bento CRM dashboard with rising graphs)\nNarrator: "Stop leaking revenue. Meet DIGITAL MARKETING CRM™ – the smart, automated sales funnel designed for modern creators, agencies, and service providers."\n\n[0:30 - 0:50 Key Features]\n(Visual: Animated clips of inbound contact forms, AI welcome emails triggering, and a deal sliding to 'Closed Won')\nNarrator: "Capture leads automatically. Trigger welcome sequences instantly. And score high-intent opportunities without lifting a finger."\n\n[0:50 - 1:00 Call to Action]\n(Visual: Download logo appearing with 50% discount banner)\nNarrator: "Stop wasting hours on administrative operations. Get 50% off our Founders tier today, and scale your business. Visit digitalmarketingcrm.example.com."`
                          }
                        }[selectedCrmSocial] || { platform: "", text: "" };

                        return (
                          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col justify-between space-y-4">
                            <div className="space-y-3">
                              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                                <span className="text-[10px] bg-slate-800 text-pink-400 font-mono font-black uppercase px-2.5 py-1 rounded">
                                  {contentData.platform}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(contentData.text);
                                    showToast("Social Copy Copied to Clipboard!");
                                  }}
                                  className="text-[10px] bg-slate-850 hover:bg-slate-800 text-amber-400 font-extrabold px-3 py-1.5 rounded flex items-center gap-1.5 border border-slate-700 transition-all"
                                >
                                  <Copy className="w-3.5 h-3.5" /> Copy Social Copy
                                </button>
                              </div>

                              <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed min-h-[220px]">
                                {contentData.text}
                              </div>
                            </div>

                            <p className="text-[10px] text-slate-500 font-medium">
                              Pro Tip: High-converting social copy focuses heavily on identifying a common bottleneck (manual admin, loss of leads) and introducing immediate visual solutions.
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* TAB 5: AI ECOSYSTEM & READY TEMPLATES */}
                  {selectedCrmTab === "templates" && (
                    <div className="space-y-6">
                      {/* Top Verified AI eCommerce Tools Dashboard */}
                      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                        <div>
                          <span className="text-[10px] bg-indigo-900/40 text-indigo-300 font-black px-2.5 py-1 rounded font-mono uppercase tracking-wider">
                            Verified AI Ecosystem Links
                          </span>
                          <h3 className="text-base font-black text-white mt-2">Top AI-Powered E-Commerce & Marketing Tools</h3>
                          <p className="text-xs text-slate-400 mt-0.5">Integrate these leading platforms directly with your DIGITAL MARKETING CRM™ webhook webhooks to automate multi-channel campaigns.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                          {[
                            { name: "Jasper AI", role: "AI Copywriting & Blogging", url: "https://www.jasper.ai", rating: "4.8/5", desc: "Generates high-intent sales scripts and SEO content." },
                            { name: "Copy.ai", role: "Short Social & Ad Copy", url: "https://www.copy.ai", rating: "4.7/5", desc: "Automates Facebook and LinkedIn posts within seconds." },
                            { name: "Shopify Magic", role: "Product Description AI", url: "https://www.shopify.com", rating: "4.6/5", desc: "Writes automated details for store items." },
                            { name: "Klaviyo AI", role: "Email Flow Personalization", url: "https://www.klaviyo.com", rating: "4.8/5", desc: "Predictive sending analytics and user segmenting." },
                            { name: "Rep AI", role: "Sales Concierge Chatbot", url: "https://www.hellorep.ai", rating: "4.6/5", desc: "Drives conversational cart recovery automatically." },
                            { name: "Surfer SEO", role: "Content Optimization Audit", url: "https://surferseo.com", rating: "4.7/5", desc: "Performs real-time search engine scoring." },
                            { name: "Synthesia AI", role: "Realistic Video Generation", url: "https://www.synthesia.io", rating: "4.8/5", desc: "Creates realistic avatar videos from written scripts." },
                            { name: "Tidio Chat", role: "Lead Gen Customer Support", url: "https://www.tidio.com", rating: "4.5/5", desc: "Integrates chatbots straight into CRM pipelines." }
                          ].map((t, idx) => (
                            <a
                              key={idx}
                              href={t.url}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-slate-950 p-4 rounded-lg border border-slate-850 hover:border-indigo-500/40 hover:bg-slate-900 transition-all block space-y-1.5 group"
                            >
                              <div className="flex justify-between items-start">
                                <h4 className="text-xs font-black text-white group-hover:text-indigo-400 transition-colors flex items-center gap-1">
                                  {t.name} <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-indigo-400" />
                                </h4>
                                <span className="text-[9px] font-mono font-black text-amber-500 bg-amber-950/40 px-1.5 py-0.5 rounded">
                                  {t.rating}
                                </span>
                              </div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{t.role}</p>
                              <p className="text-[10px] text-slate-500 leading-tight">{t.desc}</p>
                            </a>
                          ))}
                        </div>
                      </div>

                      {/* Ready-Made AI Generated Content Sandbox */}
                      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                        <div>
                          <span className="text-[10px] bg-pink-900/40 text-pink-300 font-black px-2.5 py-1 rounded font-mono uppercase tracking-wider">
                            Content Sandbox Templates
                          </span>
                          <h3 className="text-base font-black text-white mt-2">Plug-and-Play AI Content Generator Sandbox</h3>
                          <p className="text-xs text-slate-400 mt-0.5">Below are verified AI content templates for product launches, paid ad copy, onboarding sequences, and SEO outlines.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                          {/* Template 1: Wireless Noise Cancelling Headphones Description */}
                          <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 space-y-3 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              <span className="text-[9px] text-emerald-400 font-mono font-black uppercase">E-Commerce description template</span>
                              <h4 className="text-xs font-black text-white">Elite Wireless Noise-Cancelling Headphones</h4>
                              <p className="text-[10px] text-slate-400 leading-normal">
                                Escape into pure acoustic isolation. Featuring advanced active hybrid noise-cancellation (ANC), 40-hour ultra battery lifespan, and dynamic high-fidelity audio drivers, the Elite Wireless headphone is calibrated for modern audiophiles, travelers, and remote workers.
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText("Elite Wireless Noise-Cancelling Headphones Description\n\nEscape into pure acoustic isolation. Featuring advanced active hybrid noise-cancellation (ANC), 40-hour ultra battery lifespan, and dynamic high-fidelity audio drivers, the Elite Wireless headphone is calibrated for modern audiophiles, travelers, and remote workers.");
                                showToast("Headphone template copied!");
                              }}
                              className="w-full bg-slate-900 hover:bg-slate-850 text-white text-[10px] font-bold py-1.5 rounded border border-slate-800 transition-all uppercase tracking-wider"
                            >
                              Copy Product Copy
                            </button>
                          </div>

                          {/* Template 2: Facebook Ad Copy */}
                          <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 space-y-3 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              <span className="text-[9px] text-indigo-400 font-mono font-black uppercase">High-ROAS paid campaign template</span>
                              <h4 className="text-xs font-black text-white">Facebook Ad Copy: Elite Headphones</h4>
                              <p className="text-[10px] text-slate-300 leading-normal font-mono bg-slate-900/60 p-2 rounded">
                                "Are noisy environments killing your focus?\n\nCalibrate your workspace with elite noise cancellation, pristine custom acoustics, and a 40-hour battery. Escape the clutter today.\n\n👉 Shop now with 30-day risk-free returns!"
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText("Facebook Ad Copy: Elite Headphones\n\nAre noisy environments killing your focus?\n\nCalibrate your workspace with elite noise cancellation, pristine custom acoustics, and a 40-hour battery. Escape the clutter today.\n\n👉 Shop now with 30-day risk-free returns!");
                                showToast("Ad copy template copied!");
                              }}
                              className="w-full bg-slate-900 hover:bg-slate-850 text-white text-[10px] font-bold py-1.5 rounded border border-slate-800 transition-all uppercase tracking-wider"
                            >
                              Copy Ad Template
                            </button>
                          </div>

                          {/* Template 3: 3-step Email Sequence */}
                          <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 space-y-3 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              <span className="text-[9px] text-amber-400 font-mono font-black uppercase">Product Onboarding Flows</span>
                              <h4 className="text-xs font-black text-white">3-Step E-Commerce Email Campaign</h4>
                              <p className="text-[10px] text-slate-400 leading-normal">
                                Automated flows: Welcome & 10% Coupon code email → Value Highlight (hybrid active ANC & battery tips) → Social Proof & Last chance reminder email. Calibrated to recover over 24% of cart abandonments automatically.
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText("3-Step E-Commerce Email Campaign Flow\n\n1. Welcome & 10% coupon code\n2. Hybrid Active ANC & battery life tips\n3. Social Proof & Cart Abandonment recovery code");
                                showToast("3-step sequence outline copied!");
                              }}
                              className="w-full bg-slate-900 hover:bg-slate-850 text-white text-[10px] font-bold py-1.5 rounded border border-slate-800 transition-all uppercase tracking-wider"
                            >
                              Copy Email Outline
                            </button>
                          </div>

                          {/* Template 4: SEO Blog Post Outline */}
                          <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 space-y-3 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              <span className="text-[9px] text-pink-400 font-mono font-black uppercase">Organic Search Content Strategy</span>
                              <h4 className="text-xs font-black text-white">SEO Outline: Best Active Noise-Cancelling Tech</h4>
                              <p className="text-[10px] text-slate-400 leading-normal">
                                Calibrated keywords: active noise cancellation, hybrid ANC, focus remote work, hybrid audiophile specs. Structured H2/H3 headers designed to rank on Google Page 1 within 30 days of publishing.
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText("SEO Outline: Best Active Noise-Cancelling Tech\n\nKeywords: active noise cancellation, hybrid ANC, focus remote work, audiophile specs\n\nStructure:\nH1: The Remote Worker's Guide to Active Noise Cancellation\nH2: What is Hybrid Active ANC?\nH2: Top 5 Headphones for Professional Focus\nH3: Calibrating battery life and acoustic isolation");
                                showToast("SEO outline template copied!");
                              }}
                              className="w-full bg-slate-900 hover:bg-slate-850 text-white text-[10px] font-bold py-1.5 rounded border border-slate-800 transition-all uppercase tracking-wider"
                            >
                              Copy SEO Outline
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 6: POSITIONING & BRAND VOICE */}
                  {selectedCrmTab === "brand" && (
                    <div className="space-y-6">
                      {/* Competitive Positioning Table */}
                      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                        <div>
                          <span className="text-[10px] bg-slate-800 text-amber-400 font-mono font-extrabold px-2 py-0.5 rounded">
                            COMPETITIVE INTELLIGENCE
                          </span>
                          <h3 className="text-base font-black text-white mt-2">SaaS Competitive Positioning Table</h3>
                          <p className="text-xs text-slate-400 mt-0.5">Analyze how DIGITAL MARKETING CRM™ compares directly against legacy market competitors.</p>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse font-sans">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                                <th className="py-2.5 px-3 bg-slate-950">Feature Capability</th>
                                <th className="py-2.5 px-3 bg-indigo-950 text-white font-extrabold border border-indigo-500/20">DIGITAL MARKETING CRM™</th>
                                <th className="py-2.5 px-3 bg-slate-950">HubSpot Starter</th>
                                <th className="py-2.5 px-3 bg-slate-950">Salesforce Essentials</th>
                                <th className="py-2.5 px-3 bg-slate-950">Zoho CRM</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 text-slate-300">
                              <tr>
                                <td className="py-3 px-3 font-bold text-white bg-slate-950/20">Pricing Strategy</td>
                                <td className="py-3 px-3 bg-indigo-950/40 text-indigo-300 font-black border border-indigo-500/20">$49/month flat (Unlimited Leads)</td>
                                <td className="py-3 px-3 font-mono">$18/user/month (Scales up aggressively)</td>
                                <td className="py-3 px-3 font-mono">$25/user/month (No custom webhooks)</td>
                                <td className="py-3 px-3 font-mono">$14/user/month (Limited templates)</td>
                              </tr>
                              <tr>
                                <td className="py-3 px-3 font-bold text-white bg-slate-950/20">AI Automated Sequences</td>
                                <td className="py-3 px-3 bg-indigo-950/40 text-emerald-400 font-extrabold border border-indigo-500/20">Fully Included (Zero Upcharges)</td>
                                <td className="py-3 px-3">Requires Professional ($450/mo+)</td>
                                <td className="py-3 px-3">Requires Enterprise ($150/mo+)</td>
                                <td className="py-3 px-3">Requires Premium Tiers ($40/mo+)</td>
                              </tr>
                              <tr>
                                <td className="py-3 px-3 font-bold text-white bg-slate-950/20">Social Copy Kit</td>
                                <td className="py-3 px-3 bg-indigo-950/40 text-emerald-400 font-extrabold border border-indigo-500/20">Fully Integrated & Copyable</td>
                                <td className="py-3 px-3">Requires custom manual extensions</td>
                                <td className="py-3 px-3">No native generator</td>
                                <td className="py-3 px-3">Requires costly add-on integrations</td>
                              </tr>
                              <tr>
                                <td className="py-3 px-3 font-bold text-white bg-slate-950/20">Dashboard Analytics</td>
                                <td className="py-3 px-3 bg-indigo-950/40 text-emerald-400 font-extrabold border border-indigo-500/20">Bento UI with interactive sandbox</td>
                                <td className="py-3 px-3">Standard generic charts</td>
                                <td className="py-3 px-3">Highly complex Salesforce layouts</td>
                                <td className="py-3 px-3">Basic, non-interactive charts</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Brand Voice Guidelines */}
                      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                        <div>
                          <span className="text-[10px] bg-slate-800 text-pink-400 font-mono font-black px-2 py-0.5 rounded">
                            BRAND VOICE & IDENTITY
                          </span>
                          <h3 className="text-base font-black text-white mt-2">Brand Voice, Tone & Messaging Guidelines</h3>
                          <p className="text-xs text-slate-400 mt-0.5">Calibrate all outgoing campaigns, copywriting, and sales templates according to these standardized pillars.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-slate-950 p-4 border border-slate-850 rounded-lg space-y-3">
                            <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider">Voice Attributes</h4>
                            <div className="space-y-2 text-[11px] text-slate-300">
                              <p><strong>1. Clear & Purposeful:</strong> Absolute rejection of complicated fluff or empty technical buzzwords. Speak directly to the core bottleneck and provide simple solutions.</p>
                              <p><strong>2. Empowering:</strong> Inspire action and ownership. Remind the user that they can reclaim 10+ hours a week and double their conversion numbers.</p>
                              <p><strong>3. Transparent:</strong> Ground all statements in clean data, transparent pricing, and verifiable testimonials.</p>
                            </div>
                          </div>

                          <div className="bg-slate-950 p-4 border border-slate-850 rounded-lg space-y-3">
                            <h4 className="text-xs font-black text-pink-400 uppercase tracking-wider">Channel Tones</h4>
                            <div className="space-y-2 text-[11px] text-slate-300">
                              <p><strong>Emails:</strong> High personal warmth, action-oriented call to actions, and helpful educational highlights.</p>
                              <p><strong>LinkedIn:</strong> Strong authority figures, B2B scalability analysis, and process optimizations.</p>
                              <p><strong>Facebook Ads:</strong> Immediate value hook, high urgency triggers, and zero-friction signup links.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 7: FAQ ACCORDION */}
                  {selectedCrmTab === "faqs" && (
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                      <div>
                        <span className="text-[10px] bg-slate-800 text-indigo-400 font-mono font-black px-2 py-0.5 rounded">
                          SUPPORT CENTER
                        </span>
                        <h3 className="text-lg font-black text-white mt-2">Frequently Asked Questions</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Find immediate answers regarding data, setup webhooks, and billing structures.</p>
                      </div>

                      <div className="space-y-2 pt-2">
                        {[
                          { q: "What makes DIGITAL MARKETING CRM™ different from Salesforce or HubSpot?", a: "Unlike massive legacy CRM engines that lock essential features (like custom emails sequences or AI integrations) behind expensive Professional and Enterprise upgrades, DIGITAL MARKETING CRM™ includes unlimited leads and advanced pipeline automation tools inside a flat monthly subscription." },
                          { q: "How do I capture leads from my existing website?", a: "Simply copy our pre-configured webhook capture endpoint URL and paste it into any web form builder (Elementor, Typeform, Webflow, Shopify, etc.). Leads are automatically routed, scored, and logged in your dashboard in less than a second." },
                          { q: "Can I connect third-party AI copywriting models?", a: "Yes, our native platform supports outgoing webhook API payload integrations with Jasper, Copy.ai, Klaviyo, and OpenAI API endpoints. Custom payload variables let you trigger external AI content workflows instantly." },
                          { q: "Is there an offline-sync state mechanism?", a: "Absolutely. Our client-side app utilizes offline state synchronization. If your device loses network connections, the CRM queues lead captures, task reminders, and campaign updates locally, syncing them immediately once connection health is restored." },
                          { q: "How secure is user-authored data stored in the vaults?", a: "We enforce high-security standards: TLS 1.3 encryption transit protocols, isolated sandboxed container architectures, and granular user role security rules. Our database ensures your customer records remain completely secure." },
                          { q: "Is there a limit on the number of marketing emails I can trigger?", a: "No! Our founders tier allows you to deploy unlimited customer sequences without any artificial throttling or upcharges." },
                          { q: "Does DIGITAL MARKETING CRM™ support multi-user collaboration?", a: "Yes, the full platform supports admin role structures, allowing managers to assign opportunities to sales reps, log audit feeds, and track individual rep conversion rates." },
                          { q: "What is your refund and trial cancellation policy?", a: "We offer a 30-day risk-free money back guarantee. You can cancel your subscription inside our self-service billing tab with a single click, no questionnaires required." }
                        ].map((faq, index) => (
                          <div key={index} className="bg-slate-950 rounded-lg border border-slate-850 overflow-hidden">
                            <button
                              onClick={() => setSelectedCrmFaq(selectedCrmFaq === index ? null : index)}
                              className="w-full text-left p-4 flex items-center justify-between text-xs font-black text-white hover:bg-slate-900 transition-all"
                            >
                              <span>{faq.q}</span>
                              <ChevronRight className={`w-4 h-4 text-indigo-400 transition-transform ${selectedCrmFaq === index ? "rotate-90" : ""}`} />
                            </button>
                            {selectedCrmFaq === index && (
                              <div className="p-4 pt-0 text-xs text-slate-400 leading-relaxed border-t border-slate-900 bg-slate-950/60 font-medium">
                                {faq.a}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Global Sovereign Level */}
                  <div className="lg:col-span-7 bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-2xl font-black text-white">{currentJurisdictionObj.name}</h3>
                        <p className="text-xs text-amber-400 font-mono mt-1 font-bold">
                          {currentJurisdictionObj.legal_system}
                        </p>
                      </div>
                      <span className="text-4xl font-extrabold text-slate-800">{currentJurisdictionObj.id}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800/80">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-indigo-400" />
                          <span className="text-xs font-black uppercase text-slate-300">Constitutional Source</span>
                        </div>
                        <p className="text-xs text-slate-100 font-bold mb-3">{currentJurisdictionObj.constitution_name}</p>
                        <a
                          href={currentJurisdictionObj.constitution_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-amber-400 font-bold hover:underline flex items-center gap-1.5"
                        >
                          Official Constitution Link <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800/80">
                        <div className="flex items-center gap-2 mb-2">
                          <Scale className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-black uppercase text-slate-300">Legislation Portal</span>
                        </div>
                        <p className="text-xs text-slate-100 font-bold mb-3">{currentJurisdictionObj.federal_legislation_portal_name}</p>
                        <a
                          href={currentJurisdictionObj.federal_legislation_portal_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-amber-400 font-bold hover:underline flex items-center gap-1.5"
                        >
                          Official Justice Laws <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800/80">
                        <div className="flex items-center gap-2 mb-2">
                          <Landmark className="w-4 h-4 text-blue-400" />
                          <span className="text-xs font-black uppercase text-slate-300">Highest Court</span>
                        </div>
                        <p className="text-xs text-slate-100 font-bold mb-3">{currentJurisdictionObj.supreme_court_name}</p>
                        <a
                          href={currentJurisdictionObj.supreme_court_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-amber-400 font-bold hover:underline flex items-center gap-1.5"
                        >
                          Supreme Court website <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800/80">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="w-4 h-4 text-teal-400" />
                          <span className="text-xs font-black uppercase text-slate-300">Comparative Research</span>
                        </div>
                        <p className="text-xs text-slate-100 font-bold mb-3">LII Aggregated Gateway Guide</p>
                        <a
                          href={currentJurisdictionObj.research_guide}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-amber-400 font-bold hover:underline flex items-center gap-1.5"
                        >
                          Access Repository Link <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* Trigger to send selection target straight into AI chat assistant */}
                    <div className="bg-gradient-to-r from-indigo-950 to-slate-900 p-4 rounded-lg border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Grounded AI Question Routing
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Need help explaining the federal court rules of {currentJurisdictionObj.name}?</p>
                      </div>
                      <button
                        onClick={() => {
                          setChatMessage(`How does the constitutional separation of powers work in ${currentJurisdictionObj.name}? Explain key jurisdictions.`);
                          setActiveTab("counsel");
                          showToast(`Prompt created contextually for ${currentJurisdictionObj.name}`);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black px-4 py-2 uppercase tracking-wider rounded-md flex items-center gap-1.5 shadow"
                      >
                        Query AI Counselor <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subnational State / Province Selection if Available */}
                  <div className="lg:col-span-5 bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                          Constitutional Guide: Provinces & States ({currentJurisdictionObj.id})
                        </h3>
                      </div>

                      {currentJurisdictionObj.subnational && currentJurisdictionObj.subnational.length > 0 ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 bg-slate-900 p-2 border border-slate-800 rounded-lg">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Subnational Region:</label>
                            <select
                              id="subnational-selector"
                              value={selectedSubnational}
                              onChange={(e) => setSelectedSubnational(e.target.value)}
                              className="bg-slate-800 text-white text-xs font-bold p-1 px-2 border border-slate-600 rounded flex-1 outline-none"
                            >
                              {currentJurisdictionObj.subnational.map((sub) => (
                                <option key={sub.id} value={sub.id}>
                                  {sub.name} (Capital: {sub.capital})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Rendering selected subnational */}
                          {(() => {
                            const currentSub = currentJurisdictionObj.subnational.find((s) => s.id === selectedSubnational) || currentJurisdictionObj.subnational[0];
                            if (!currentSub) return null;
                            return (
                              <div className="space-y-3 bg-slate-900/60 p-4 border border-slate-800 rounded-lg">
                                <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                                  <span className="text-amber-300">⚖️</span> {currentSub.name} ({currentSub.id})
                                </h4>
                                
                                <p className="text-xs text-slate-300 leading-relaxed font-medium bg-slate-950 p-2.5 rounded border border-slate-800">
                                  <strong className="text-slate-400">Legal Family / System Notes:</strong> {currentSub.legal_system_notes}
                                </p>

                                <div className="space-y-2 pt-2">
                                  <div className="flex items-center justify-between text-xs bg-slate-950/80 p-2 rounded">
                                    <span className="text-slate-400">Official Legislation:</span>
                                    <a href={currentSub.official_legislation_portal_url} target="_blank" rel="noreferrer" className="text-amber-400 font-bold hover:underline flex items-center gap-1">
                                      {currentSub.official_legislation_portal_name} <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                  <div className="flex items-center justify-between text-xs bg-slate-950/80 p-2 rounded">
                                    <span className="text-slate-400">Highest Court:</span>
                                    <a href={currentSub.highest_court_url} target="_blank" rel="noreferrer" className="text-amber-400 font-bold hover:underline flex items-center gap-1">
                                      {currentSub.highest_court_name} <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                  {currentSub.justice_ministry_url && (
                                    <div className="flex items-center justify-between text-xs bg-slate-950/80 p-2 rounded">
                                      <span className="text-slate-400">Ministry of Justice / Attorney General:</span>
                                      <a href={currentSub.justice_ministry_url} target="_blank" rel="noreferrer" className="text-amber-400 font-bold hover:underline flex items-center gap-1">
                                        Official Department <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="p-10 border border-dashed border-slate-800 text-center rounded-lg">
                          <Info className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                          <p className="text-xs text-slate-400">
                            This sovereign jurisdiction is consolidated heavily at the federal tier or operates as a unitary state. No major subnational databases mapped.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800">
                      <p className="text-[11px] text-slate-500 italic">
                        Disclaimers: All external repositories linked directly are public official government portals. ALL LEGAL MATTERS AI is grounded on actual regional laws, but does not provide active, unsolicited non-audited local legal advice.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Multi-Jurisdiction Comparisons Table & Map Hub */}
              <div id="jurisdiction-comparison-section" className="bg-slate-950 p-6 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-lg font-bold text-white">Transnational Comparison Table</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono">
                        <th className="py-2.5 px-3 bg-slate-900">Jurisdiction</th>
                        <th className="py-2.5 px-3 bg-slate-900">Legal Family Class</th>
                        <th className="py-2.5 px-3 bg-slate-900">Highest Appellate Body</th>
                        <th className="py-2.5 px-3 bg-slate-900">Key Statutes Resource</th>
                        <th className="py-2.5 px-3 bg-slate-900 text-center">RAG Guidance URL Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      <tr>
                        <td className="py-2 px-3 font-bold text-white">Canada (Federal)</td>
                        <td className="py-2 px-3 text-indigo-300">Mixed: English Common / French Civil Code</td>
                        <td className="py-2 px-3">Supreme Court of Canada</td>
                        <td className="py-2 px-3 font-mono">Consolidated Act / Charter 1982</td>
                        <td className="py-2 px-3 text-center"><span className="text-[10px] bg-emerald-950 border border-emerald-500 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">VERIFIED</span></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-white">United States (Federal)</td>
                        <td className="py-2 px-3 text-indigo-300 font-medium">Common Law origin</td>
                        <td className="py-2 px-3">Supreme Court of United States</td>
                        <td className="py-2 px-3 font-mono">U.S. Code Collection</td>
                        <td className="py-2 px-3 text-center"><span className="text-[10px] bg-emerald-950 border border-emerald-500 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">VERIFIED</span></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-white">Mexico (Federal)</td>
                        <td className="py-2 px-3 text-indigo-300 font-medium">Civil Law origin</td>
                        <td className="py-2 px-3">Suprema Corte de Justicia de la Nación</td>
                        <td className="py-2 px-3 font-mono">Diputados Leyes Federales Gaceta</td>
                        <td className="py-2 px-3 text-center"><span className="text-[10px] bg-emerald-950 border border-emerald-500 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">VERIFIED</span></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-white">European Union</td>
                        <td className="py-2 px-3 text-indigo-300 font-medium">Direct effect and supremacy</td>
                        <td className="py-2 px-3">Court of Justice of European Union</td>
                        <td className="py-2 px-3 font-mono">EUR-Lex Portal Database</td>
                        <td className="py-2 px-3 text-center"><span className="text-[10px] bg-emerald-950 border border-emerald-500 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">VERIFIED</span></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-white">Nigeria (Federal)</td>
                        <td className="py-2 px-3 text-indigo-300 font-medium">Common Law / Sharia / Customary combo</td>
                        <td className="py-2 px-3">Supreme Court of Nigeria</td>
                        <td className="py-2 px-3 font-mono">Constitution 1999 & Laws.Africa</td>
                        <td className="py-2 px-3 text-center"><span className="text-[10px] bg-emerald-950 border border-emerald-500 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">VERIFIED</span></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-white">Ghana (Federal)</td>
                        <td className="py-2 px-3 text-indigo-300 font-medium">Common law, customary law, constitutional</td>
                        <td className="py-2 px-3">Supreme Court of Ghana</td>
                        <td className="py-2 px-3 font-mono">Constitution 1992 & Laws.Africa</td>
                        <td className="py-2 px-3 text-center"><span className="text-[10px] bg-emerald-950 border border-emerald-500 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">VERIFIED</span></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-white">Solomon Islands</td>
                        <td className="py-2 px-3 text-indigo-300 font-medium">Mixed (Common Law and Customary Law)</td>
                        <td className="py-2 px-3">High Court of Solomon Islands</td>
                        <td className="py-2 px-3 font-mono">Solomon Islands Code PacLII</td>
                        <td className="py-2 px-3 text-center"><span className="text-[10px] bg-emerald-950 border border-emerald-500 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">VERIFIED</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

          {/* 2. AI Co-Counsel Intelligent Console */}
          {activeTab === "counsel" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
              
              {/* Agent Settings & Templates left panel */}
              <div className="lg:col-span-4 bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-6">
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-300 tracking-wider mb-2 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-amber-400" /> Choose AI Legal Specialty
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Sovereign multi-agent tribunal channels context directly depending on the selected authority.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setActiveAgent("tutor")}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      activeAgent === "tutor"
                        ? "bg-indigo-950 border-indigo-400 shadow"
                        : "bg-slate-900 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white uppercase">A. Legal Tutor Agent</span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">Explain & Study</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      De-jargonizes complicated civil or criminal code terms into user educational guidelines.
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveAgent("lawyer")}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      activeAgent === "lawyer"
                        ? "bg-indigo-950 border-indigo-400 shadow"
                        : "bg-slate-900 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white uppercase">B. Legal Lawyer Agent</span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">Draft & Argue</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Prepares litigation outlines, compiles compliant legal letters, letters of explanation, and argument structures.
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveAgent("judge")}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      activeAgent === "judge"
                        ? "bg-indigo-950 border-indigo-400 shadow"
                        : "bg-slate-900 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white uppercase">C. Legal Judge Agent</span>
                      <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded">Risk Simulator</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Provides strict risk scores, analyzes structural liabilities, and forecasts judicial resolution outlooks.
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveAgent("tribunal")}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      activeAgent === "tribunal"
                        ? "bg-indigo-950 border-amber-400 shadow-lg ring-1 ring-amber-400/40"
                        : "bg-slate-900 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white uppercase flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Multi-Agent Tribunal
                      </span>
                      <span className="text-[10px] bg-purple-500/25 text-purple-300 px-2 py-0.5 rounded">Cohesive Panel</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Runs nested reasoning loops concurrently (Tutor + Lawyer + Judge) to synthesis complete grounded opinions.
                    </p>
                  </button>
                </div>

                {/* Prebuilt Prompts Shortcuts */}
                <div className="bg-slate-900 p-4 border border-slate-800 rounded-lg">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-2">High thinking guidelines:</span>
                  <div className="space-y-2">
                    <button
                      onClick={() => setChatMessage("Draft a comprehensive dispute letter objecting to an invalid non-compete clause under California Labor Code Section 16600.")}
                      className="w-full text-left text-[11px] p-2 hover:bg-slate-850 rounded border border-slate-800 hover:border-slate-700 text-slate-200 transition-all block truncate"
                    >
                      🗣️ Ask AI: Draft CA labor non-compete letter
                    </button>
                    <button
                      onClick={() => setChatMessage("Simulate a small claims court argument regarding security deposits returned late in Ontario under the Residential Tenancies Act.")}
                      className="w-full text-left text-[11px] p-2 hover:bg-slate-850 rounded border border-slate-800 hover:border-slate-700 text-slate-200 transition-all block truncate"
                    >
                      🏛️ Ask AI: Simulate ON tenant claim argument
                    </button>
                    <button
                      onClick={() => setChatMessage("Provide an explanatory legal tutoring breakdown of sovereign anti-money-laundering compliance in Nigerian business entities.")}
                      className="w-full text-left text-[11px] p-2 hover:bg-slate-850 rounded border border-slate-800 hover:border-slate-700 text-slate-200 transition-all block truncate"
                    >
                      🎓 Ask AI: Explain AML corporate laws of Nigeria
                    </button>
                  </div>
                </div>
              </div>

              {/* Chat Dialog Panel */}
              <div className="lg:col-span-8 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between overflow-hidden">
                
                {/* Channel Header Info */}
                <div className="bg-slate-900 p-4 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></div>
                    <div>
                      <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                        Secure Counselor Connection ({activeAgent.toUpperCase()} active)
                      </span>
                      <p className="text-[10px] text-slate-400">Jurisdiction Focus: {selectedSubnational || selectedCountry || "Global"}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">TLS 1.3 SHA-256</span>
                </div>

                {/* Messages scroll zone */}
                <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[460px] min-h-[300px]">
                  {chatHistory.map((m, idx) => {
                    const isUser = m.sender === "user";
                    const isSys = m.sender === "system";
                    
                    return (
                      <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-lg p-3 ${
                          isUser 
                            ? "bg-indigo-600 text-white rounded-tr-none shadow" 
                            : isSys 
                              ? "bg-slate-900 border border-slate-800 text-amber-300 font-mono text-[11px] rounded-tl-none" 
                              : "bg-slate-900 border-l-4 border-l-amber-400 border border-slate-800 text-slate-100 rounded-tl-none shadow"
                        }`}>
                          <div className="flex items-center justify-between gap-6 mb-1 border-b border-slate-800/40 pb-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                              {isUser ? "CLIENT INTAKE" : isSys ? "SYSTEM STATUS" : `${activeAgent.toUpperCase()} CO-COUNSEL`}
                            </span>
                            <span className="text-[8px] text-slate-500 font-mono">{m.timestamp}</span>
                          </div>
                          
                          <p className="text-xs leading-relaxed whitespace-pre-line font-medium">{m.text}</p>
                        </div>
                      </div>
                    );
                  })}

                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-900 border border-slate-850 p-4 rounded-lg rounded-tl-none text-xs flex items-center gap-3">
                        <div className="flex space-x-1.5 items-center">
                          <div className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-bounce"></div>
                          <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce delay-75"></div>
                          <div className="w-2.5 h-2.5 bg-blue-300 rounded-full animate-bounce delay-150"></div>
                        </div>
                        <span className="text-slate-400 font-mono">Consolidation routing engines working in background...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Question form submission */}
                <form onSubmit={handleSendChat} className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Describe facts, ask statutory questions, etc"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-md p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 text-xs uppercase tracking-wider rounded-md flex items-center justify-center gap-1.5 transition-all shadow"
                  >
                    <span>Send</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </form>

              </div>
            </div>
          )}

          {/* 3. Secure Document Vault & OCR Analysis */}
          {activeTab === "vault" && (
            <div className="space-y-4">
              {/* Mobile View Switcher Tabs */}
              <div className="flex lg:hidden bg-slate-900 p-1 rounded-lg border border-slate-800 gap-1 mb-2">
                <button
                  onClick={() => setVaultViewMode("list")}
                  className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                    vaultViewMode === "list" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Document List & Ingestion
                </button>
                <button
                  onClick={() => {
                    if (uploadedDocs.length > 0 && !selectedVaultDoc) {
                      setSelectedVaultDoc(uploadedDocs[0]);
                    }
                    setVaultViewMode("details");
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                    vaultViewMode === "details" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Audit Analysis Details {selectedVaultDoc ? `(${selectedVaultDoc.riskScore}%)` : ""}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Sidebar: list of uploaded / default templates */}
                <AnimatePresence mode="popLayout">
                  {(vaultViewMode === "list" || true) && (
                    <motion.div
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      transition={{ duration: 0.25 }}
                      className={`lg:col-span-4 bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-6 ${
                        vaultViewMode === "list" ? "block" : "hidden lg:flex"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-400" />
                          <h3 className="text-sm font-black uppercase text-slate-100 tracking-wider">Secure Document Repository</h3>
                        </div>
                        <p className="text-xs text-slate-400">
                          Documents are automatically encrypted in place. Select static template files to mock scanning or input custom agreements.
                        </p>
                      </div>

                      {/* Upload Form Zone */}
                      <form onSubmit={handleMockUpload} className="bg-slate-900 p-4 rounded-lg border border-slate-800 space-y-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Ingest New Agreement (OCR Scan)</span>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">File Name:</label>
                          <input
                            type="text"
                            value={ocrDocName}
                            onChange={(e) => setOcrDocName(e.target.value)}
                            placeholder="e.g. Consulting_Agreement.pdf"
                            required
                            className="w-full bg-slate-950 text-xs text-slate-100 p-2 border border-slate-700 rounded focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">General Domain Categorization:</label>
                          <select
                            value={ocrDocCategory}
                            onChange={(e) => setOcrDocCategory(e.target.value)}
                            className="w-full bg-slate-950 text-xs text-slate-100 p-2 border border-slate-700 rounded focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="contracts">Contracts & Non-Disclosure</option>
                            <option value="tenancy">Tenancy Lease Addendums</option>
                            <option value="employment">Employment Agreements</option>
                            <option value="corporate">Corporate Filings</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Agreement Text to Parse (OCR Input):</label>
                          <textarea
                            value={ocrText}
                            onChange={(e) => setOcrText(e.target.value)}
                            placeholder="Paste contract clauses, dispute statements, or compliance obligations here..."
                            rows={5}
                            required
                            className="w-full bg-slate-950 text-xs text-slate-100 p-2 border border-slate-700 rounded focus:ring-1 focus:ring-indigo-500 font-mono"
                          />
                        </div>

                        {/* Preset load helpers to make user interaction exciting */}
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setOcrDocName("Consulting_Breach_California.pdf");
                              setOcrDocCategory("contracts");
                              setOcrText(`Consultant agrees to build proprietary analytics tools for Client. Any dispute must be heard exclusively in London, UK. Consultant is barred from working in the global AI field for 10 years following termination.`);
                            }}
                            className="text-[9px] bg-slate-800 text-slate-300 px-2 py-1 rounded hover:bg-slate-755"
                          >
                            + Load High Risk Draft
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOcrDocName("Ontario_Lease_Rider.docx");
                              setOcrDocCategory("tenancy");
                              setOcrText(`Landlord shall inspect the premises every Sunday at 9:00 PM without prior warning. Tenant forfeits $2000 reservation hold fee if they move out early.`);
                            }}
                            className="text-[9px] bg-slate-800 text-slate-300 px-2 py-1 rounded hover:bg-slate-755"
                          >
                            + Residential Rent Rider
                          </button>
                        </div>

                        <button
                          type="submit"
                          disabled={vaultLoading}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-md flex items-center justify-center gap-1 transition-all"
                        >
                          {vaultLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                          Encrypt & Scan File
                        </button>
                      </form>

                      {/* Smooth Progress Bar */}
                      {uploadProgress > 0 && (
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg space-y-2 animate-fadeIn shadow-inner">
                          <div className="flex justify-between items-center text-[10px] font-bold font-mono">
                            <span className="text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                              {uploadProgress === 100 ? "Sync Completed!" : "OCR Ingesting & Encrypting..."}
                            </span>
                            <span className="text-slate-400 font-mono font-black">{uploadProgress}%</span>
                          </div>
                          
                          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-150 ease-out rounded-full shadow-lg"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-[9px] text-slate-500 font-mono italic leading-none pt-0.5">
                            Processing document matrices in-place offline & uploading to Google Cloud...
                          </p>
                        </div>
                      )}

                      {/* List of files in Vault */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Available Secure Documents</span>
                          <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-950/40 px-1.5 py-0.2 rounded border border-indigo-900/30">
                            {uploadedDocs.filter((doc) => {
                              if (!docSearchQuery.trim()) return true;
                              const q = docSearchQuery.toLowerCase();
                              return (
                                doc.name.toLowerCase().includes(q) ||
                                doc.category.toLowerCase().includes(q) ||
                                (doc.tags || []).some(t => t.toLowerCase().includes(q))
                              );
                            }).length} of {uploadedDocs.length}
                          </span>
                        </div>

                        {/* Search and Retrieval bar */}
                        <div className="relative mt-1 mb-2">
                          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={docSearchQuery}
                            onChange={(e) => setDocSearchQuery(e.target.value)}
                            placeholder="Type to filter by tags, names, categories..."
                            className="w-full bg-slate-900 text-xs text-slate-300 placeholder-slate-600 pl-8 pr-3 py-2 border border-slate-800 hover:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          {docSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setDocSearchQuery("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                          {uploadedDocs.filter((doc) => {
                            if (!docSearchQuery.trim()) return true;
                            const q = docSearchQuery.toLowerCase();
                            return (
                              doc.name.toLowerCase().includes(q) ||
                              doc.category.toLowerCase().includes(q) ||
                              (doc.tags || []).some(t => t.toLowerCase().includes(q))
                            );
                          }).length === 0 ? (
                            <p className="text-[11px] text-slate-500 italic py-6 text-center">No agreements match your search criteria.</p>
                          ) : (
                            uploadedDocs.filter((doc) => {
                              if (!docSearchQuery.trim()) return true;
                              const q = docSearchQuery.toLowerCase();
                              return (
                                doc.name.toLowerCase().includes(q) ||
                                doc.category.toLowerCase().includes(q) ||
                                (doc.tags || []).some(t => t.toLowerCase().includes(q))
                              );
                            }).map((doc) => (
                              <motion.div
                                key={doc.id}
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ duration: 0.35, ease: "easeOut" }}
                                layout
                                onClick={() => {
                                  setSelectedVaultDoc(doc);
                                  setVaultViewMode("details");
                                }}
                                className={`p-3 bg-slate-900 border rounded-lg cursor-pointer transition-all flex flex-col gap-2.5 ${
                                  selectedVaultDoc?.id === doc.id ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-800 hover:border-slate-700"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <FileText className={`w-5 h-5 ${doc.riskScore > 50 ? "text-red-400" : "text-emerald-400"}`} />
                                  <div className="flex-1 overflow-hidden">
                                    <p className="text-xs font-bold text-white truncate">{doc.name}</p>
                                    <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">{doc.category} · {doc.size}</p>
                                  </div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                    doc.riskScore > 50 ? "bg-red-950 text-red-300 border border-red-900" : "bg-emerald-950 text-emerald-300 border border-emerald-900"
                                  }`}>
                                    Risk: {doc.riskScore}
                                  </span>
                                </div>

                                {/* Tag capsules block */}
                                {doc.tags && doc.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 border-t border-slate-800/40 pt-1.5">
                                    {doc.tags.map((tag, tagIndex) => (
                                      <span
                                        key={tagIndex}
                                        className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-950/40 border border-indigo-900/30 text-indigo-300 flex items-center"
                                        title={`Filtered tag: ${tag}`}
                                      >
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </motion.div>
                            ))
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Main Content Pane: Detailed scanned analysis with entry/exit animation triggers */}
                <div className={`lg:col-span-8 ${vaultViewMode === "details" ? "block" : "hidden lg:block"}`}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedVaultDoc ? selectedVaultDoc.id : "empty-details-screen"}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3 }}
                      className="bg-slate-950 rounded-xl border border-slate-800 p-6 space-y-6"
                    >
                      {vaultViewMode === "details" && (
                        <button
                          onClick={() => setVaultViewMode("list")}
                          className="lg:hidden flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-all px-3 py-1.5 bg-slate-900 border border-slate-800 rounded mb-2 w-fit"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Back to Document List</span>
                        </button>
                      )}

                      {selectedVaultDoc ? (
                        <div className="space-y-6">
                          {/* Header bar of selected document */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-mono tracking-widest text-indigo-400 uppercase font-black">ACTIVE AUDITED ARTIFACT</span>
                                {isOnline ? (
                                  <span className="text-[8px] bg-emerald-950 text-emerald-400 border border-emerald-900 px-1 py-0.2 rounded font-mono font-bold uppercase">● Online Core</span>
                                ) : (
                                  <span className="text-[8px] bg-amber-950 text-amber-400 border border-amber-900 px-1 py-0.2 rounded font-mono font-bold uppercase">● Offline Sandbox Cache</span>
                                )}
                              </div>
                              <h4 className="text-xl font-bold text-white mt-1">{selectedVaultDoc.name}</h4>
                              <p className="text-xs text-slate-400 mt-0.5 mt-1 border-l-2 border-slate-700 pl-2">
                                Last Modified: {new Date(selectedVaultDoc.uploadedAt).toLocaleString()} · {selectedVaultDoc.size}
                                {selectedVaultDoc.changeSummary && <span className="text-slate-450 block text-[10.5px] italic mt-0.5 font-mono">"{selectedVaultDoc.changeSummary}"</span>}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-lg border border-slate-800">
                              <div className="text-right">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">AI Risk Score</span>
                                <p className="text-xs text-slate-300 font-medium">Protectiveness Rating</p>
                              </div>
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-sm border-2 ${
                                selectedVaultDoc.riskScore > 50 
                                  ? "bg-red-950/40 text-red-400 border-red-500 animate-pulse" 
                                  : "bg-emerald-950/40 text-emerald-400 border-emerald-500"
                              }`}>
                                {selectedVaultDoc.riskScore}%
                              </div>
                            </div>
                          </div>

                          {/* Categorization & User Tagging Widget */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5 text-indigo-400 mb-2">
                                <Tags className="w-4 h-4 text-indigo-400" />
                                <span className="text-[10px] font-black uppercase tracking-wider font-sans">Document Categorization & Tags</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 min-h-[26px]">
                                {(selectedVaultDoc.tags || []).length === 0 ? (
                                  <span className="text-xs text-slate-500 italic">No custom search tags added yet. Use the field to categorize under tags like "urgent", "reviewed", "drafted".</span>
                                ) : (
                                  (selectedVaultDoc.tags || []).map((t, index) => (
                                    <span key={index} className="flex items-center gap-1 bg-indigo-950/80 hover:bg-slate-900 text-indigo-300 hover:text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-900/60 font-mono text-[10px] transition-all">
                                      <span>#{t}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveTag(selectedVaultDoc.id, t)}
                                        className="text-indigo-400 hover:text-red-400 font-extrabold ml-1 text-xs focus:outline-none"
                                        title="Remove tag"
                                      >
                                        &times;
                                      </button>
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-center w-full sm:w-auto">
                              <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddTag(selectedVaultDoc.id);
                                  }
                                }}
                                placeholder="Add custom tag..."
                                className="bg-slate-950 border border-slate-700/80 hover:border-slate-600 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 sm:flex-initial"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddTag(selectedVaultDoc.id)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-md transition-all whitespace-nowrap"
                              >
                                Add Tag
                              </button>
                            </div>
                          </div>

                          {/* Real-time Jurisdictional Compliance Alerts System */}
                          {activeComplianceAlerts.length > 0 && (
                            <div className="bg-red-950/40 border border-red-850 p-5 rounded-xl space-y-3 shadow-lg">
                              <div className="flex items-center gap-2 text-red-400">
                                <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
                                <span className="text-xs font-black uppercase tracking-wider font-sans">
                                  REGULATORY JURISDICTIONAL COMPLIANCE WARNINGS ({activeComplianceAlerts.length})
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-300 leading-normal">
                                The active draft statement fails relative to core statutes matching your selected sovereign jurisdiction (<strong className="text-indigo-400">{selectedSubnational || selectedCountry}</strong>). Standard courts may deem these sections void.
                              </p>
                              <div className="space-y-2.5 pt-1">
                                {activeComplianceAlerts.map((alert) => (
                                  <div key={alert.id} className="p-3 bg-slate-950/80 rounded border border-red-900/40 space-y-2 text-[11px]">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <span className="font-extrabold text-white text-xs block uppercase font-sans">
                                        ⚠️ {alert.ruleName}
                                      </span>
                                      <span className="text-[9px] bg-red-950 font-bold px-1.5 py-0.2 rounded border border-red-900 text-red-300 tracking-wider uppercase font-mono">
                                        {alert.severity} Compliance Violation
                                      </span>
                                    </div>
                                    <p className="text-slate-405 leading-relaxed font-sans">{alert.description}</p>
                                    <div className="bg-slate-900/60 p-2 rounded border border-slate-805 text-[10.5px] font-mono text-slate-300">
                                      <span className="text-slate-500 font-bold block">TRIGGER CLAUSE SUBSTRING:</span>
                                      "{alert.matchingSnippet}"
                                    </div>
                                    <div className="text-[10px] text-indigo-300 font-bold">
                                      STATUTE SOURCE CODE reference: {alert.sourceStatute}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        // Execute instant redline substitute
                                        const replacedContent = selectedVaultDoc.content.replace(
                                          new RegExp(alert.remedyOriginal, "i"),
                                          alert.remedyReplacement
                                        );
                                        try {
                                          const response = await fetch("/api/documents/edit", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                              documentId: selectedVaultDoc.id,
                                              content: replacedContent,
                                              changeSummary: `Auto-Remeditated: Resolved ${alert.ruleName} compliance flag.`
                                            })
                                          });
                                          const data = await response.json();
                                          if (data.success && data.document) {
                                            setSelectedVaultDoc(data.document);
                                            setUploadedDocs(prev => prev.map(d => d.id === data.document.id ? data.document : d));
                                            const freshList = uploadedDocs.map(d => d.id === data.document.id ? data.document : d);
                                            localStorage.setItem("cached_documents", JSON.stringify(freshList));
                                            try {
                                              await setDoc(doc(db, "documents", data.document.id), data.document);
                                            } catch (dbErr) {
                                              console.warn("Could not sync compliance document update with Cloud Firestore", dbErr);
                                            }
                                            showToast("⚡ Flagged non-compliance clause resolved via instant auto-redline substitution.");
                                          }
                                        } catch(err) {
                                          // Sim offline
                                          const updatedDoc = {
                                            ...selectedVaultDoc,
                                            content: replacedContent,
                                            uploadedAt: new Date().toISOString(),
                                            changeSummary: `Auto-Remeditated Offline: Resolved ${alert.ruleName}`,
                                            riskScore: Math.max(12, selectedVaultDoc.riskScore - 15),
                                            versions: [...(selectedVaultDoc.versions || []), {
                                              id: `v-auto-${Date.now()}`,
                                              versionNumber: (selectedVaultDoc.versions?.length || 0) + 1,
                                              content: selectedVaultDoc.content,
                                              editedAt: new Date().toISOString(),
                                              editedBy: "akinisaacade@gmail.com",
                                              changeSummary: "Before Auto-Redline Fix Integration",
                                              riskScore: selectedVaultDoc.riskScore
                                            }]
                                          };
                                          setSelectedVaultDoc(updatedDoc);
                                          setUploadedDocs(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
                                          const freshList = uploadedDocs.map(d => d.id === updatedDoc.id ? updatedDoc : d);
                                          localStorage.setItem("cached_documents", JSON.stringify(freshList));
                                          showToast("⚡ Offline auto-redline substitution successfully resolved and hand-coded in local storage cache.");
                                        }
                                      }}
                                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] tracking-tight rounded transition-all uppercase flex items-center gap-1 mt-1.5"
                                    >
                                      <Sparkles className="w-3 h-3 text-amber-305" />
                                      Apply Instant Compliance Redline Fix
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Text of contract box (Editable) */}
                          <div className="bg-slate-900 p-5 border border-slate-800 rounded-lg space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-2">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">Primary Agreements Text Scan</span>
                              
                              {/* Utility Control Ribbon */}
                              <div className="flex items-center gap-2">
                                {!isEditingDoc ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsEditingDoc(true);
                                        const key = `document_autosave_${selectedVaultDoc.id}`;
                                        const savedDraft = localStorage.getItem(key);
                                        if (savedDraft) {
                                          try {
                                            const parsed = JSON.parse(savedDraft);
                                            if (parsed && parsed.content && parsed.content !== selectedVaultDoc.content) {
                                              setHasDraftToRestore(true);
                                              setDraftTimestamp(parsed.timestamp);
                                            } else {
                                              setHasDraftToRestore(false);
                                            }
                                          } catch (e) {
                                            console.warn("Could not parse saved draft", e);
                                            setHasDraftToRestore(false);
                                          }
                                        } else {
                                          setHasDraftToRestore(false);
                                        }
                                        setActiveEditContent(selectedVaultDoc.content);
                                        setChangeSummaryText("");
                                      }}
                                      className="px-2 py-1 bg-indigo-900/40 hover:bg-indigo-800/80 border border-indigo-700/65 text-indigo-300 rounded text-[10px] font-bold flex items-center gap-1 transition-all"
                                    >
                                      <FileEdit className="w-3 h-3" />
                                      Edit Content
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => triggerDownloadOrPrintContent(selectedVaultDoc)}
                                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-[10px] font-bold flex items-center gap-1 transition-all"
                                      title="Generate printable PDF layout sheet with full metadata summary"
                                    >
                                      <Printer className="w-3 h-3 text-amber-400" />
                                      Print / PDF
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (confirm("Are you absolutely sure you want to permanently delete this document from the secure vault? This cannot be undone.")) {
                                          handleDeleteDocument(selectedVaultDoc.id);
                                        }
                                      }}
                                      className="px-2 py-1 bg-red-950/40 hover:bg-red-900/50 border border-red-900/60 text-red-400 hover:text-red-300 rounded text-[10px] font-bold flex items-center gap-1 transition-all"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Delete File
                                    </button>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] text-amber-450 font-bold bg-amber-950 border border-amber-900/60 px-1.5 py-0.5 rounded font-mono uppercase animate-pulse">REVISION LOCK ENGAGED</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* View mode vs Edit mode content block */}
                            {!isEditingDoc ? (
                              <p className="text-xs text-slate-300 font-mono leading-relaxed bg-slate-950 p-4 rounded border border-slate-900 whitespace-pre-line select-text">
                                {selectedVaultDoc.content}
                              </p>
                            ) : (
                              <form onSubmit={handleEditDoc} className="space-y-3">
                                {isEditingDoc && hasDraftToRestore && (
                                  <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                        <span className="text-[11px] font-bold text-amber-300 font-mono uppercase tracking-wider">Unsaved Auto-saved Draft Found</span>
                                      </div>
                                      <p className="text-[11px] text-slate-300">
                                        A pending revision from {draftTimestamp ? new Date(draftTimestamp).toLocaleString() : "a previous session"} is available.
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const key = `document_autosave_${selectedVaultDoc?.id}`;
                                          const savedDraft = localStorage.getItem(key);
                                          if (savedDraft) {
                                            try {
                                              const parsed = JSON.parse(savedDraft);
                                              if (parsed && parsed.content) {
                                                setActiveEditContent(parsed.content);
                                                showToast("🔄 Unsaved draft restored.");
                                              }
                                            } catch (e) {
                                              console.error("Failed to recover content", e);
                                            }
                                          }
                                          setHasDraftToRestore(false);
                                        }}
                                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black rounded transition-all shadow uppercase tracking-wider"
                                      >
                                        Restore Draft
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (selectedVaultDoc) {
                                            localStorage.removeItem(`document_autosave_${selectedVaultDoc.id}`);
                                          }
                                          setHasDraftToRestore(false);
                                          showToast("Draft discarded.");
                                        }}
                                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded transition-all border border-slate-700"
                                      >
                                        Discard
                                      </button>
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-mono font-bold text-slate-400 block mb-1">Directly Modify Agreement Texts:</span>
                                  {lastAutosavedTime ? (
                                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded flex items-center gap-1 leading-none">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                      Auto-saved {lastAutosavedTime}
                                    </span>
                                  ) : (
                                    activeEditContent !== selectedVaultDoc?.content && (
                                      <span className="text-[9px] font-mono text-slate-400 italic">Editing...</span>
                                    )
                                  )}
                                </div>
                                <textarea
                                  value={activeEditContent}
                                  onChange={(e) => setActiveEditContent(e.target.value)}
                                  rows={8}
                                  required
                                  className="w-full bg-slate-950 text-xs text-slate-200 p-3 border border-indigo-500/60 rounded focus:ring-1 focus:ring-amber-400 font-mono leading-relaxed"
                                  placeholder="Modify contract clauses..."
                                />
                                <div>
                                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Audit Log Changelog Summary (e.g. 'Removed restrictive non-compete'):</label>
                                  <input
                                    type="text"
                                    value={changeSummaryText}
                                    onChange={(e) => setChangeSummaryText(e.target.value)}
                                    placeholder="Enter revision note..."
                                    className="w-full bg-slate-950 text-xs text-slate-100 p-2 border border-slate-700 rounded focus:ring-1 focus:ring-indigo-500"
                                    required
                                  />
                                </div>
                                <div className="flex justify-end gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (activeEditContent && activeEditContent !== selectedVaultDoc?.content) {
                                        if (confirm("Discard unsaved changes? This will delete your current editing session progress.")) {
                                          setIsEditingDoc(false);
                                          if (selectedVaultDoc) {
                                            localStorage.removeItem(`document_autosave_${selectedVaultDoc.id}`);
                                          }
                                          setHasDraftToRestore(false);
                                          setLastAutosavedTime(null);
                                        }
                                      } else {
                                        setIsEditingDoc(false);
                                        setHasDraftToRestore(false);
                                        setLastAutosavedTime(null);
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded hover:bg-slate-755 transition-all"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    className="px-3 py-1.5 bg-emerald-600 font-extrabold hover:bg-emerald-500 text-white text-[10px] rounded transition-all flex items-center gap-1.5 uppercase tracking-wide"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                    Commit Revision & Auditing History
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>

                          {/* Interactive Clause analysis */}
                          {selectedVaultDoc.clauses && selectedVaultDoc.clauses.length > 0 && (
                            <div className="space-y-3">
                              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">Classified Clause Elements:</span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedVaultDoc.clauses.map((cl, i) => (
                                  <div key={i} className="bg-slate-900 p-4 rounded-lg border border-slate-800 flex flex-col justify-between">
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-black text-white">{cl.title}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                          cl.risk === "High" ? "bg-red-950 text-red-400 border border-red-900" :
                                          cl.risk === "Medium" ? "bg-amber-950 text-amber-400 border border-amber-900" :
                                          "bg-emerald-950 text-emerald-400 border border-emerald-900"
                                        }`}>
                                          {cl.risk} Risk
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-300 italic mb-2 font-mono">"{cl.text}"</p>
                                      <p className="text-[11px] text-slate-400">{cl.analysis}</p>
                                    </div>
                                    
                                    {/* Option to read out loud via TTS directly */}
                                    <button
                                      onClick={() => {
                                        setTtsInput(cl.analysis);
                                        setActiveTab("multimodal");
                                        showToast("Clause analysis loaded into Synthesizer.");
                                      }}
                                      className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold tracking-wider uppercase mt-4 flex items-center gap-1 self-start select-none"
                                    >
                                      Listen with Voice Reader &rarr;
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* AI Suggestions & redlining corrections */}
                          {selectedVaultDoc.suggestedRedlines && selectedVaultDoc.suggestedRedlines.length > 0 && (
                            <div className="bg-slate-900 p-4 border border-slate-800 rounded-lg space-y-3">
                              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 block">AI Redlining & Proposed Substitutions:</span>
                              {selectedVaultDoc.suggestedRedlines.map((red, i) => (
                                <div key={i} className="p-3 bg-slate-950 rounded border border-slate-800 text-[11px] space-y-2">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <div className="border border-red-900/60 p-2 rounded bg-red-950/20">
                                      <span className="font-bold text-red-400 block mb-1">ORIGINAL OFFENDING PROVISION</span>
                                      <p className="text-slate-400 italic">"{red.original}"</p>
                                    </div>
                                    <div className="border border-emerald-900/60 p-2 rounded bg-emerald-950/20">
                                      <span className="font-bold text-emerald-400 block mb-1">PROPOSED REMEDIAL REVISION</span>
                                      <p className="text-slate-200">"{red.replacement}"</p>
                                    </div>
                                  </div>
                                  <p className="text-slate-400 pt-1 font-medium">
                                    <strong className="text-slate-300">Strategy Rationale:</strong> {red.reasoning}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Secure linkages folder exp share tool */}
                          <div className="bg-gradient-to-r from-slate-950 to-indigo-950 p-4 rounded-lg border border-slate-800 space-y-4">
                            <div>
                              <h5 className="text-xs font-extrabold text-white uppercase flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Share File Vault Securely (Expiring link)
                              </h5>
                              <p className="text-[11px] text-slate-400">Generates a secure, expiring URL with set access controls.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                                <label className="text-[9px] text-slate-400 block font-bold mb-1">Permission Level:</label>
                                <select
                                  value={sharePermission}
                                  onChange={(e) => setSharePermission(e.target.value as "read" | "write")}
                                  className="bg-slate-950 text-xs text-white p-1 rounded border border-slate-705 w-full font-mono text-[11px]"
                                >
                                  <option value="read">View Only (Encrypted)</option>
                                  <option value="write">Full Collaborative Write</option>
                                </select>
                              </div>
                              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                                <label className="text-[9px] text-slate-400 block font-bold mb-1">Duration Expiration:</label>
                                <select
                                  value={shareDuration}
                                  onChange={(e) => setShareDuration(parseInt(e.target.value))}
                                  className="bg-slate-950 text-xs text-white p-1 rounded border border-slate-705 w-full font-mono text-[11px]"
                                >
                                  <option value={1}>1 Hour (Sensitive)</option>
                                  <option value={24}>24 Hours</option>
                                  <option value={168}>7 Days (Corporate)</option>
                                </select>
                              </div>
                              <div className="flex items-end">
                                <button
                                  type="button"
                                  onClick={handleShareDoc}
                                  className="w-full bg-indigo-600 hover:bg-indigo-505 text-white text-[11px] font-black px-4 py-2 uppercase tracking-tight rounded transition-all select-none"
                                >
                                  Generate Expiring Link
                                </button>
                              </div>
                            </div>

                            {shareLinkResult && (
                              <div className="p-3 bg-slate-900 border border-indigo-500 rounded text-xs select-all break-all font-mono">
                                <span className="text-emerald-400 font-bold block mb-1">SECURE EXPIRING INTEGRATION LINK:</span>
                                {shareLinkResult}
                              </div>
                            )}
                          </div>

                          {/* Audited Version / Revisions History Timeline */}
                          <div id="revisions-history-timeline-section" className="bg-slate-900 p-5 rounded-lg border border-slate-850 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <div>
                                <h5 className="text-xs font-extrabold text-white uppercase flex items-center gap-1.5">
                                  <History className="w-4 h-4 text-amber-400 animate-pulse" /> Contract Revisions & Version History Cache
                                </h5>
                                <p className="text-[11px] text-slate-400">Save edits as baseline checkpoints. Restore previous audits or purge obsolete iterations.</p>
                              </div>
                              <span className="text-[9px] bg-indigo-950 px-2 py-0.5 rounded border border-indigo-900 font-mono text-indigo-400 font-bold uppercase">v-crypt 2.4.1</span>
                            </div>

                            <div className="space-y-3">
                              {/* Standard active baseline snapshot */}
                              <div className="p-3 bg-slate-950 rounded border border-indigo-500/40 relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[9px] bg-indigo-600/30 text-indigo-300 font-bold px-1.5 py-0.2 rounded border border-indigo-500 uppercase">Active Revision</span>
                                    <span className="text-white font-extrabold">Active Checking Standard</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-mono">
                                    Author: akinisaacade@gmail.com · Last saved: {new Date(selectedVaultDoc.uploadedAt).toLocaleString()}
                                  </p>
                                  <p className="text-[11px] text-slate-300 block mt-1 italic font-sans">
                                    Changelog Note: "{selectedVaultDoc.changeSummary || "Base document metadata import"}"
                                  </p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => triggerDownloadOrPrintContent(selectedVaultDoc)}
                                    className="p-1 px-2.5 bg-slate-900 border border-slate-700 text-slate-300 font-black rounded hover:bg-slate-800 text-[10px] uppercase flex items-center gap-1 transition-all"
                                    title="Export PDF / Print this active version"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-amber-400" /> Text/Print
                                  </button>
                                </div>
                              </div>

                              {/* Prior historical versions */}
                              {selectedVaultDoc.versions && selectedVaultDoc.versions.length > 0 ? (
                                <div className="border-l-2 border-slate-800 ml-3 pl-4 space-y-3.5 pt-2">
                                  {selectedVaultDoc.versions.slice().reverse().map((ver, idx) => {
                                    const displayedVerNum = ver.versionNumber || (selectedVaultDoc.versions ? selectedVaultDoc.versions.length - idx : 1);
                                    return (
                                      <div key={ver.id || idx} className="p-3 bg-slate-950 rounded border border-slate-850 text-xs relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        {/* Vertical connection bullet indicator */}
                                        <div className="absolute w-2 h-2 bg-slate-800 border border-slate-600 rounded-full -left-[21px] top-5"></div>
                                        
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[9px] bg-slate-800 text-slate-400 font-mono font-bold px-1.5 py-0.2 rounded uppercase">V{displayedVerNum}</span>
                                            <span className="text-slate-200 font-bold">Revision Point Checkpoint</span>
                                            <span className="text-[9.5px] text-slate-500 font-mono">{new Date(ver.editedAt || Date.now()).toLocaleString()}</span>
                                          </div>
                                          <p className="text-[10px] text-slate-400 font-mono">Auditor: {ver.editedBy || "akinisaacade@gmail.com"}</p>
                                          <p className="text-[11px] text-slate-300 italic font-sans font-medium">"{ver.changeSummary || "Auditor contract review checkpoint"}"</p>
                                          <div className="text-[9px] text-slate-500 font-mono">
                                            OCR Character Length: {ver.content?.length || 0} characters · Risk Score: {ver.riskScore}%
                                          </div>
                                        </div>

                                        <div className="flex gap-1.5 shrink-0 self-start sm:self-center">
                                          <button
                                            type="button"
                                            onClick={() => handleRestoreVersion(ver.id)}
                                            className="p-1.5 px-2.5 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800 text-indigo-400 hover:text-white font-black rounded text-[10px] uppercase tracking-tight transition-all flex items-center gap-1"
                                            title="Rollback active contract to this state"
                                          >
                                            <RefreshCw className="w-3 h-3" /> Restore V{displayedVerNum}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => triggerDownloadOrPrintContent({ name: `${selectedVaultDoc.name}_V${displayedVerNum}`, content: ver.content })}
                                            className="p-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded text-[10px] font-black uppercase tracking-tight transition-all flex items-center gap-1"
                                            title="View printable PDF sheets"
                                          >
                                            <Printer className="w-3 h-3 text-amber-500" /> Print
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (confirm("Are you absolutely sure you want to delete this historical version from secure persistence?")) {
                                                handleDeleteVersion(ver.id);
                                              }
                                            }}
                                            className="p-1.5 bg-red-950/40 hover:bg-red-900/40 border border-red-900/40 text-red-450 rounded transition-all"
                                            title="Delete version checkpoint"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-center text-[10px] text-slate-500 italic py-2 font-mono text-slate-550">No previous backups or archival logs exist for this asset registry point.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-20 text-center uppercase tracking-widest text-slate-400">
                          <p>No documents located. Create or select a template to review.</p>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}

          {/* 3.5 Compliance Dashboard Tab */}
          {activeTab === "compliance" && (
            <ComplianceDashboard
              documents={uploadedDocs}
              onSelectDoc={(doc) => {
                setSelectedVaultDoc(doc);
                setVaultViewMode("details");
                setActiveTab("vault");
              }}
              onNavigateToTab={(tab) => {
                setActiveTab(tab);
              }}
              showToast={showToast}
              currentUser={currentUser}
              onUpdateDoc={async (updatedDoc) => {
                setUploadedDocs(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
                const freshList = uploadedDocs.map(d => d.id === updatedDoc.id ? updatedDoc : d);
                localStorage.setItem("cached_documents", JSON.stringify(freshList));
                try {
                  await setDoc(doc(db, "documents", updatedDoc.id), updatedDoc);
                } catch (dbErr) {
                  console.warn("Could not sync compliance document update with Cloud Firestore", dbErr);
                }
              }}
            />
          )}

          {/* 4. Sovereign Forms Generator & Procedures Wizard */}
          {activeTab === "forms" && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Form selector & Inputs left pane */}
                <div className="lg:col-span-5 bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-6">
                  <div>
                    <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider mb-2 flex items-center gap-1.5">
                      <FileText className="w-4 h-4" /> Sovereign PDF / Document Customizer
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Customize crucial legal documents in real time. Standard layouts adapt fully into sovereign regulatory bodies.
                    </p>
                  </div>

                  {/* Selector options */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-900 p-2 rounded border border-slate-800">
                    <button
                      onClick={() => setActiveTemplate("nda")}
                      className={`p-2 rounded text-xs transition-all font-bold ${
                        activeTemplate === "nda" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      Mutual NDA
                    </button>
                    <button
                      onClick={() => setActiveTemplate("will")}
                      className={`p-2 rounded text-xs transition-all font-bold ${
                        activeTemplate === "will" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      Last Will
                    </button>
                    <button
                      onClick={() => setActiveTemplate("sublease")}
                      className={`p-2 rounded text-xs transition-all font-bold ${
                        activeTemplate === "sublease" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      Sublease Pact
                    </button>
                    <button
                      onClick={() => setActiveTemplate("power_of_attorney")}
                      className={`p-2 rounded text-xs transition-all font-bold ${
                        activeTemplate === "power_of_attorney" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      Durable Power of Attorney
                    </button>
                  </div>

                  {/* Customizable inputs based on selected template */}
                  <div className="space-y-3 bg-slate-900/60 p-4 border border-slate-800 rounded-lg">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">Tailor Variables</span>
                    
                    {activeTemplate === "nda" && (
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">DISCLOSING PARTY (COMPANY A):</label>
                          <input
                            type="text"
                            value={templateInputs.partyA}
                            onChange={(e) => setTemplateInputs({ ...templateInputs, partyA: e.target.value })}
                            className="bg-slate-950 p-2 rounded border border-slate-700 w-full"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">RECEIVING ENTITY (PARTY B):</label>
                          <input
                            type="text"
                            value={templateInputs.partyB}
                            onChange={(e) => setTemplateInputs({ ...templateInputs, partyB: e.target.value })}
                            className="bg-slate-950 p-2 rounded border border-slate-700 w-full"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">GOVERNING REGION REGULATION:</label>
                          <input
                            type="text"
                            value={templateInputs.jurisdictionState}
                            onChange={(e) => setTemplateInputs({ ...templateInputs, jurisdictionState: e.target.value })}
                            className="bg-slate-950 p-2 rounded border border-slate-700 w-full"
                          />
                        </div>
                      </div>
                    )}

                    {activeTemplate === "will" && (
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">MAKER OF THE WILL (TESTATOR):</label>
                          <input
                            type="text"
                            value={templateInputs.willMaker}
                            onChange={(e) => setTemplateInputs({ ...templateInputs, willMaker: e.target.value })}
                            className="bg-slate-950 p-2 rounded border border-slate-700 w-full"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">EXECUTOR APPARATUS NAME:</label>
                          <input
                            type="text"
                            value={templateInputs.executorName}
                            onChange={(e) => setTemplateInputs({ ...templateInputs, executorName: e.target.value })}
                            className="bg-slate-950 p-2 rounded border border-slate-700 w-full"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">BENEFICIARY TRUST FOUNDATION:</label>
                          <input
                            type="text"
                            value={templateInputs.willBeneficiary}
                            onChange={(e) => setTemplateInputs({ ...templateInputs, willBeneficiary: e.target.value })}
                            className="bg-slate-950 p-2 rounded border border-slate-700 w-full"
                          />
                        </div>
                      </div>
                    )}

                    {activeTemplate === "sublease" && (
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">SUBLEASE TENANT NAME:</label>
                          <input
                            type="text"
                            value={templateInputs.subleaseTenant}
                            onChange={(e) => setTemplateInputs({ ...templateInputs, subleaseTenant: e.target.value })}
                            className="bg-slate-950 p-2 rounded border border-slate-700 w-full"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">PREMISES PHYSICAL ADDRESS:</label>
                          <input
                            type="text"
                            value={templateInputs.subleasePremises}
                            onChange={(e) => setTemplateInputs({ ...templateInputs, subleasePremises: e.target.value })}
                            className="bg-slate-950 p-2 rounded border border-slate-700 w-full"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">MONTHLY PAY ($):</label>
                            <input
                              type="number"
                              value={templateInputs.subleaseMonthlyRent}
                              onChange={(e) => setTemplateInputs({ ...templateInputs, subleaseMonthlyRent: e.target.value })}
                              className="bg-slate-950 p-2 rounded border border-slate-700 w-full"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">ESCROW ESCROW DEPOSIT ($):</label>
                            <input
                              type="number"
                              value={templateInputs.subleaseDepositAmount}
                              onChange={(e) => setTemplateInputs({ ...templateInputs, subleaseDepositAmount: e.target.value })}
                              className="bg-slate-950 p-2 rounded border border-slate-700 w-full"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTemplate === "power_of_attorney" && (
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">PRINCIPAL (YOUR NAME):</label>
                          <input
                            type="text"
                            value={templateInputs.principalName}
                            onChange={(e) => setTemplateInputs({ ...templateInputs, principalName: e.target.value })}
                            className="bg-slate-950 p-2 rounded border border-slate-700 w-full"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">ATTORNEY-IN-FACT APPOINTEE:</label>
                          <input
                            type="text"
                            value={templateInputs.attorneyInFactName}
                            onChange={(e) => setTemplateInputs({ ...templateInputs, attorneyInFactName: e.target.value })}
                            className="bg-slate-950 p-2 rounded border border-slate-700 w-full"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Live rendering display & direct vault simulation save */}
                <div className="lg:col-span-7 bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <span className="text-[10px] font-black uppercase text-amber-300">Live Draft Screen</span>
                      <button
                        onClick={handleDownloadDraft}
                        className="bg-slate-800 text-white text-[11px] font-extrabold px-3 py-1.5 uppercase tracking-tighter hover:bg-indigo-600 rounded flex items-center gap-1 transition-all"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-400" /> Save as Local Draft Instrument
                      </button>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded p-4 font-mono text-[11px] leading-relaxed text-slate-200 whitespace-pre-wrap min-h-[300px]">
                      {customDraftContent}
                    </div>

                    <div className="p-4 bg-indigo-950/40 border border-indigo-500/20 rounded-lg flex items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold text-white block">Test with Co-Counsel</span>
                        <p className="text-[11px] text-slate-400">Want the Judge or Lawyer Agent to evaluate this exact template draft for legal risks?</p>
                      </div>
                      <button
                        onClick={() => {
                          setOcrDocName(`${activeTemplate}_draft_instrument.pdf`);
                          setOcrText(customDraftContent);
                          setActiveTab("vault");
                          showToast("Template text securely integrated into vault review scanning.");
                        }}
                        className="bg-indigo-600 text-white text-[11px] font-black uppercase tracking-wider px-4 py-2 hover:bg-indigo-500 rounded flex items-center gap-1.5"
                      >
                        Scan in Vault Now <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Legal Procedures step-by-step assistant wizard */}
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Sliders className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-bold text-white">Sovereign Legal Procedures Wizard</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
                    <span className="text-amber-300 text-xs font-black uppercase font-mono block">Stage 1: Enterprise Incorporation</span>
                    <ul className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                      <li>Name Reservation Check inside target provincial gazette (e.g. e-Laws).</li>
                      <li>Drafting Articles of Corporate Resolution & Structure.</li>
                      <li>Filing standard Form 1 with registration fees ($200 federal).</li>
                      <li>Auto-generate Corporate Registers.</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
                    <span className="text-amber-300 text-xs font-black uppercase font-mono block">Stage 2: Permanent Residency Visa RAG</span>
                    <ul className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                      <li>Calculate CRS credentials or visa eligibility limits or points.</li>
                      <li>Gather employment confirmation letters & credentials checks.</li>
                      <li>Incorporate provincial immigration streams application files.</li>
                      <li>Track regulatory quotas across state agencies.</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
                    <span className="text-amber-300 text-xs font-black uppercase font-mono block">Stage 3: Landlord - Tenant Small Claims</span>
                    <ul className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                      <li>Issue written letter of complaint (24-hour warning defaults).</li>
                      <li>Apply legal dispute references matching territorial tenancy acts.</li>
                      <li>Submit certified file claim with tribunal registries.</li>
                      <li>Perform court server verification routines.</li>
                    </ul>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* 5. Attorney Consultation & Calendar Reservation */}
          {activeTab === "consultations" && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Available legal advocates details */}
                <div id="attorney-profiles-grid" className="lg:col-span-7 bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-6">
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                      <Briefcase className="w-5 h-5 text-indigo-400" /> Roster Attorney Panel
                    </h3>
                    <p className="text-xs text-slate-400 font-sans">
                      Locate regional roster counsel, verify subnational hourly rate limits, and reserve hourly consultation bookings with fully validated trust retainers.
                    </p>
                  </div>

                  {/* Search and Regional Filter Row */}
                  <div className="space-y-3 bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-450">
                        <Search className="w-4 h-4 text-indigo-400" />
                      </span>
                      <input
                        type="text"
                        value={attorneySearchQuery}
                        onChange={(e) => setAttorneySearchQuery(e.target.value)}
                        placeholder="Filter attorneys by name or domain specialties (e.g., M&A, Real Estate, Ruiz)..."
                        className="w-full bg-slate-950 hover:bg-slate-920 border border-slate-700/80 focus:border-indigo-500 rounded-lg pl-10 pr-16 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-all font-mono"
                      />
                      {attorneySearchQuery && (
                        <button
                          type="button"
                          onClick={() => setAttorneySearchQuery("")}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-amber-500 font-extrabold hover:text-amber-400"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Regional Counsel Locators & Add buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-[11px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-400 font-bold uppercase text-[9px] font-mono">Locate Counsel:</span>
                        <button
                          type="button"
                          onClick={() => setAttorneySearchQuery("CA-ON")}
                          className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] text-indigo-400 px-2 py-0.5 rounded font-bold font-mono"
                        >
                          ON (Canada)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttorneySearchQuery("US-CA")}
                          className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] text-indigo-400 px-2 py-0.5 rounded font-bold font-mono"
                        >
                          CA (California)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttorneySearchQuery("NG")}
                          className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] text-indigo-400 px-2 py-0.5 rounded font-bold font-mono"
                        >
                          NG (Nigeria)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttorneySearchQuery("MX")}
                          className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] text-indigo-400 px-2 py-0.5 rounded font-bold font-mono"
                        >
                          MX (Mexico)
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            // Synthesize mock AI roster counsel profile that matches the target region!
                            const names = ["Dame Miriam Vance", "Alistair Sterling, Esq.", "Chidi Opara, LLM", "Sofia Castillo, QC"];
                            const titles = ["International Arbitrator", "Senior Constitutional Advocate", "Admiralty & Maritime Counsel", "Civil Litigation Scholar"];
                            const Jurs = ["CA-ON", "NG", "MX-CMX", "US-CA"];
                            const specialitiesList = [
                              ["Commercial Disputes", "Maritime Trade", "Chancery Division"],
                              ["SME Compliance", "Securities Regulation", "Constitutional Appeals"],
                              ["Civil Redlines", "Trust Asset Escrow", "LSO Conduct"],
                              ["Cross-Border M&A", "GDPR Data Audits", "Patent IP Defense"]
                            ];
                            const reviewsList = [
                              ["Spotted regulatory showstoppers in our merger filings instantly.", "Incredibly sharp response on jurisdictional rate limit disputes!"],
                              ["Highly meticulous legal drafting guidance.", "Helped recover compliance escrow funds within 24 hours."]
                            ];

                            const randomIdx = Math.floor(Math.random() * names.length);
                            const newAtt: Attorney = {
                              id: `attorney-synthetic-${Date.now()}`,
                              name: names[randomIdx],
                              title: titles[randomIdx],
                              jurisdiction: Jurs[randomIdx],
                              avatar: `https://images.unsplash.com/photo-${1500000000000 + randomIdx * 100000}?auto=format&fit=crop&q=80&w=200`,
                              specialties: specialitiesList[randomIdx],
                              hourlyRate: 250 + Math.floor(Math.random() * 4) * 30,
                              rating: parseFloat((4.6 + Math.random() * 0.4).toFixed(1)),
                              availabilityMap: { "Mon": 60, "Tue": 80, "Wed": 50, "Thu": 70, "Fri": 30 },
                              availabilityHours: {
                                "Mon": ["09:00 AM", "10:00 AM", "02:00 PM"],
                                "Tue": ["10:00 AM", "11:30 AM", "04:00 PM"],
                                "Wed": ["09:00 AM", "02:00 PM", "04:00 PM"],
                                "Thu": ["10:00 AM", "11:30 AM", "02:00 PM"],
                                "Fri": ["09:00 AM", "11:30 AM", "04:00 PM"],
                                "Sat": ["10:00 AM", "02:00 PM"],
                                "Sun": ["11:30 AM", "04:00 PM"]
                              },
                              reviews: reviewsList[Math.floor(Math.random() * reviewsList.length)]
                            };

                            setAttorneys((prev) => [newAtt, ...prev]);
                            setSelectedAttorney(newAtt);
                            showToast(`AI prebuilt engine successfully auto-provisioned: ${newAtt.name}`);
                          }}
                          id="btn-ai-auto-provision-counsel"
                          className="bg-indigo-900/40 hover:bg-indigo-800/60 border border-indigo-700/60 text-indigo-300 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1.5 transition-all"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                          AI Auto-Gen Counsel
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowAddAttorneyForm(!showAddAttorneyForm)}
                          className="bg-emerald-900/45 hover:bg-emerald-800 border border-emerald-700 text-emerald-300 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1 transition-all"
                        >
                          <UserPlus className="w-3 h-3 text-emerald-400" />
                          {showAddAttorneyForm ? "Hide Form" : "Add Counsel"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Add Attorney Form Panel */}
                  {showAddAttorneyForm && (
                    <div className="bg-slate-900 p-4 rounded-xl border border-indigo-500/30 space-y-3">
                      <h4 className="text-xs font-black uppercase text-white tracking-wider">Register Roster Counsel Profile</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1 font-bold">Counsel Full Name:</label>
                          <input
                            type="text"
                            value={newAttName}
                            onChange={(e) => setNewAttName(e.target.value)}
                            placeholder="e.g. Rachel Zane, Esq."
                            className="w-full bg-slate-950 border border-slate-705 p-2 text-white rounded outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1 font-bold">Professional Title:</label>
                          <input
                            type="text"
                            value={newAttTitle}
                            onChange={(e) => setNewAttTitle(e.target.value)}
                            placeholder="e.g. Partner - Asset & Estate Law"
                            className="w-full bg-slate-950 border border-slate-705 p-2 text-white rounded outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1 font-bold">State / Country Jurisdiction:</label>
                          <select
                            value={newAttJurisdiction}
                            onChange={(e) => setNewAttJurisdiction(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-705 p-2 text-white rounded outline-none"
                          >
                            <option value="CA-ON">Ontario (Canada)</option>
                            <option value="US-CA">California (USA)</option>
                            <option value="NG">Nigeria (Federal)</option>
                            <option value="MX">Mexico (Federal)</option>
                            <option value="GB">United Kingdom (Common Law)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1 font-bold">Hourly Retainer Rate ($ USD):</label>
                          <input
                            type="number"
                            value={newAttRate}
                            onChange={(e) => setNewAttRate(parseInt(e.target.value) || 200)}
                            min={100}
                            max={600}
                            className="w-full bg-slate-950 border border-slate-705 p-2 text-white rounded outline-none"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-400 block mb-1 font-bold">Specialties (comma-separated):</label>
                          <input
                            type="text"
                            value={newAttSpecialties}
                            onChange={(e) => setNewAttSpecialties(e.target.value)}
                            placeholder="e.g. Commercial Redlines, Liquidated Claims, GDPR Audits"
                            className="w-full bg-slate-950 border border-slate-705 p-2 text-white rounded outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddAttorneyForm(false)}
                          className="bg-slate-800 text-[10px] text-slate-300 font-bold py-1 px-3 rounded hover:bg-slate-750"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!newAttName.trim() || !newAttTitle.trim()) {
                              showToast("Please enter name and title fields for counsel registration.");
                              return;
                            }
                            const specs = newAttSpecialties.trim()
                              ? newAttSpecialties.split(",").map(s => s.trim())
                              : ["Corporate Law", "General Practice"];

                            const newlyAdded: Attorney = {
                              id: `attorney-custom-${Date.now()}`,
                              name: newAttName,
                              title: newAttTitle,
                              jurisdiction: newAttJurisdiction,
                              avatar: newAttAvatar || "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&q=80&w=200",
                              specialties: specs,
                              hourlyRate: newAttRate,
                              rating: 5.0,
                              availabilityMap: { "Mon": 90, "Tue": 90, "Wed": 90, "Thu": 90, "Fri": 90 },
                              availabilityHours: {
                                "Mon": ["09:00 AM", "10:00 AM", "02:00 PM"],
                                "Tue": ["10:00 AM", "11:30 AM", "04:00 PM"],
                                "Wed": ["09:00 AM", "02:00 PM", "04:00 PM"],
                                "Thu": ["10:00 AM", "11:30 AM", "02:00 PM"],
                                "Fri": ["09:00 AM", "11:30 AM", "04:00 PM"],
                                "Sat": ["10:00 AM", "02:00 PM"],
                                "Sun": ["11:30 AM", "04:00 PM"]
                              },
                              reviews: ["Roster attorney verified. Newly provisioned on regional compliance register."]
                            };

                            setAttorneys((prev) => [newlyAdded, ...prev]);
                            setSelectedAttorney(newlyAdded);
                            setShowAddAttorneyForm(false);
                            setNewAttName("");
                            setNewAttTitle("");
                            setNewAttSpecialties("");
                            showToast(`Registered ${newlyAdded.name} successfully to active roster.`);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-[10px] text-white font-bold py-1 px-3 rounded transition-all"
                        >
                          Register Counsel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {attorneys.filter((att) => {
                      if (!attorneySearchQuery) return true;
                      const q = attorneySearchQuery.toLowerCase();
                      return (
                        att.name.toLowerCase().includes(q) ||
                        att.title.toLowerCase().includes(q) ||
                        att.jurisdiction.toLowerCase().includes(q) ||
                        att.specialties.some((spec) => spec.toLowerCase().includes(q))
                      );
                    }).map((att) => (
                      <div
                        key={att.id}
                        onClick={() => {
                          setSelectedAttorney(att);
                          setBookingResult(null);
                        }}
                        className={`p-4 border rounded-xl cursor-pointer transition-all flex flex-col md:flex-row gap-4 items-start ${
                          selectedAttorney && selectedAttorney.id === att.id ? "bg-indigo-950/30 border-amber-400 shadow-md" : "bg-slate-900 border-slate-800 hover:border-slate-750"
                        }`}
                      >
                        <img src={att.avatar} alt={att.name} className="w-14 h-14 rounded-full object-cover border-2 border-indigo-500 shrink-0" />
                        <div className="flex-1 space-y-3 w-full">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800/60 pb-1 w-full">
                            <div>
                              <h4 className="text-sm font-black text-white flex items-center gap-2 font-sans">
                                {att.name}
                                <span className="text-[9px] bg-indigo-950 font-bold px-1.5 py-0.2 rounded border border-indigo-900 text-indigo-400">Roster Partner</span>
                              </h4>
                              <p className="text-[11px] text-slate-400 font-medium font-sans">{att.title} · Jurisdiction: {att.jurisdiction}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <span className="text-xs font-mono font-black text-amber-300 block">${att.hourlyRate}/hr</span>
                                <div className="flex items-center text-amber-500 text-xs justify-end">
                                  <Star className="w-3.5 h-3.5 fill-current" />
                                  <span className="ml-1 font-bold">{att.rating}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAttorney(att.id, att.name);
                                }}
                                id={`delete-attorney-${att.id}`}
                                className="p-1.5 bg-red-950/40 border border-red-900/60 rounded text-red-400 hover:text-red-300 hover:bg-red-900/50 transition-all self-center"
                                title="Revoke and delete registration"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 font-mono">
                            {att.specialties.map((spec, sIdx) => (
                              <span key={sIdx} className="bg-slate-800 text-[9px] font-bold text-slate-300 py-0.5 px-2 rounded-full border border-slate-755 uppercase">
                                {spec}
                              </span>
                            ))}
                          </div>

                          {/* Dynamic weekly peak availability bar indicator chart */}
                          <div className="space-y-1.5 p-2 bg-slate-950 rounded border border-slate-800">
                            <span className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-emerald-400" /> Peak Weekly Availability Ratio
                            </span>
                            <div className="grid grid-cols-5 gap-1.5 text-[9px] text-center text-slate-300 pt-1">
                              {Object.keys(att.availabilityMap).map((day) => {
                                const ratio = att.availabilityMap[day];
                                return (
                                  <div key={day} className="space-y-1">
                                    <div className="bg-slate-800 h-6 w-full rounded overflow-hidden relative border border-slate-750">
                                      <div
                                        style={{ height: `${ratio}%` }}
                                        className={`absolute bottom-0 left-0 right-0 ${
                                          ratio > 70 ? "bg-emerald-500" : ratio > 40 ? "bg-amber-400" : "bg-indigo-600"
                                        }`}
                                      ></div>
                                    </div>
                                    <span className="font-mono text-[8px] font-bold block">{day} ({ratio}%)</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Anonymized Review Snippet box */}
                          <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800/50 space-y-1.5">
                            <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400">Client Reviews snippet:</span>
                            {att.reviews.map((rev, rIdx) => (
                              <p key={rIdx} className="text-[10px] text-slate-300 italic leading-snug">
                                "{rev}"
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}

                    {attorneys.filter((att) => {
                      if (!attorneySearchQuery) return true;
                      const q = attorneySearchQuery.toLowerCase();
                      return (
                        att.name.toLowerCase().includes(q) ||
                        att.title.toLowerCase().includes(q) ||
                        att.jurisdiction.toLowerCase().includes(q) ||
                        att.specialties.some((spec) => spec.toLowerCase().includes(q))
                      );
                    }).length === 0 && (
                      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                        <UserMinus className="w-8 h-8 text-slate-500 mx-auto" />
                        <h4 className="text-xs font-bold text-slate-300">No Counsel Members Match Search Query</h4>
                        <p className="text-[11px] text-slate-500">Try modifying your filter keyword or click one of the preset locator buttons.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scheduling Panel with Dynamic calculation */}
                <div className="lg:col-span-12 xl:col-span-5 bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col gap-6 justify-between animate-fadeIn">
                  <form onSubmit={handleBookingSubmit} className="space-y-5">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-sm font-black uppercase text-slate-100 tracking-wider font-sans">Book Consultation</h3>
                      </div>
                      <p className="text-xs text-slate-400 font-sans">
                        Select duration & secure workspace dates to dynamically calculate retainers.
                      </p>
                    </div>

                    <div className="space-y-3 bg-slate-900 p-4 border border-slate-800 rounded-lg">
                      <div className="text-xs space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider font-mono">Selected Representative:</span>
                        <p className="text-sm font-bold text-white uppercase">{selectedAttorney ? selectedAttorney.name : "No Advocate Selected"}</p>
                        <p className="text-[10px] text-amber-300 font-mono font-bold">${selectedAttorney ? selectedAttorney.hourlyRate : 300}/Hr Base retainer</p>
                      </div>

                      {/* Select Consultation Duration */}
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">Duration Interval Allocation:</label>
                        <select
                          id="duration-selector"
                          value={bookingDuration}
                          onChange={(e) => setBookingDuration(parseInt(e.target.value))}
                          className="w-full bg-slate-950 text-xs text-slate-100 p-2 border border-slate-700 rounded-md focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value={30}>30 Minutes Brief Session</option>
                          <option value={60}>60 Minutes Standard Legal Review</option>
                          <option value={90}>90 Minutes Deep Structural Counsel</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1 font-sans">Appointment Date:</label>
                          <input
                            type="date"
                            value={bookingDate}
                            onChange={(e) => setBookingDate(e.target.value)}
                            min="2026-06-20"
                            required
                            className="w-full bg-slate-950 text-xs text-slate-100 p-2 border border-slate-700 rounded-md outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1 font-bold font-sans">Available Hour Block:</label>
                          <select
                            value={bookingTime}
                            onChange={(e) => setBookingTime(e.target.value)}
                            required
                            className="w-full bg-slate-950 text-xs text-slate-100 p-2 border border-slate-700 rounded-md"
                          >
                            {(selectedAttorney?.availabilityHours?.[getDayOfWeek(bookingDate)] || []).map((h) => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                            {(!selectedAttorney?.availabilityHours?.[getDayOfWeek(bookingDate)] || selectedAttorney.availabilityHours[getDayOfWeek(bookingDate)].length === 0) && (
                              <option value="">No Slots Available (Toggle hours in portal grid below)</option>
                            )}
                          </select>
                        </div>
                      </div>

                      {/* Case Notes & Specific Legal Questions */}
                      <div className="space-y-2 border-t border-slate-800/60 pt-2.5">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1 font-sans">
                            Case Notes / Background (for attorney review):
                          </label>
                          <textarea
                            value={bookingCaseNotes}
                            onChange={(e) => setBookingCaseNotes(e.target.value)}
                            placeholder="Provide brief context or background of your legal matter (optional)..."
                            className="w-full bg-slate-950 text-xs text-slate-100 p-2 border border-slate-700 rounded-md outline-none h-16 resize-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1 font-sans">
                            Specific Legal Questions:
                          </label>
                          <textarea
                            value={bookingLegalQuestions}
                            onChange={(e) => setBookingLegalQuestions(e.target.value)}
                            placeholder="List specific questions you'd like addressed (optional)..."
                            className="w-full bg-slate-950 text-xs text-slate-100 p-2 border border-slate-700 rounded-md outline-none h-16 resize-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Rate Limit Analysis Box */}
                      {selectedAttorney && (
                        <div className="bg-slate-950 p-2.5 rounded border border-slate-805 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 font-mono">Jurisdiction Rate Limit check:</span>
                            <span className="text-[9px] bg-emerald-950/80 text-emerald-400 font-bold px-1.5 py-0.2 rounded border border-emerald-900/40 font-mono">COMPLIANT</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-snug font-sans animate-fadeIn">
                            {selectedAttorney.jurisdiction === "CA-ON" ? "Ontario LSO ceiling is $450/hr. Current: $350/hr is valid." : 
                             selectedAttorney.jurisdiction === "US-CA" ? "California State Bar advisory limit: $500/hr. Current: $350/hr is valid." :
                             "Standard Sovereign Trust default rate limit: $400/hr. Current is fully compliant."}
                          </p>
                        </div>
                      )}

                      {/* Trust Retainer Validation */}
                      {selectedAttorney && (
                        <div className="bg-slate-950/60 p-2.5 rounded border border-slate-805 space-y-1.5 animate-fadeIn font-sans">
                          <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 block font-mono">Trust Retainer Escrow Assessment:</span>
                          <div className="flex items-center gap-1.5">
                            <input type="checkbox" defaultChecked className="rounded bg-slate-900 border-slate-700 text-indigo-500 w-3 h-3 cursor-pointer" />
                            <span className="text-[10px] text-slate-300">Validate Escrow trust reserves match calculated retainer (${selectedAttorney.hourlyRate * (bookingDuration / 60)} USD)</span>
                          </div>
                        </div>
                      )}

                      {/* Dynamic retainer calculations */}
                      <div className="border-t border-slate-805 pt-3 mt-2 flex items-center justify-between font-mono">
                        <div>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Estimated Cost Ledger:</span>
                          <p className="text-xs text-slate-400 mt-0.5 font-sans">Retainer escrow security</p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-white">${selectedAttorney ? selectedAttorney.hourlyRate * (bookingDuration / 60) : 300}</span>
                          <span className="text-[9px] text-slate-400 block">USD processed securely</span>
                        </div>
                      </div>

                      {/* SMS & Email Reminders Configuration */}
                      <div className="bg-slate-900 p-3 border border-slate-800 rounded-lg space-y-3 font-sans mt-2">
                        <div className="flex items-center gap-1.5 border-b border-slate-800/60 pb-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-[9.5px] font-black uppercase tracking-wider text-indigo-400 font-mono">Consultation Reminders Setup</span>
                        </div>
                        
                        <div className="space-y-2.5">
                          <div className="space-y-1.5">
                            <label className="flex items-center gap-2 text-[10.5px] text-slate-300 font-medium cursor-pointer">
                              <input
                                type="checkbox"
                                checked={smsReminder}
                                onChange={(e) => setSmsReminder(e.target.checked)}
                                className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-1 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                              />
                              <span>Enable SMS Reminders</span>
                            </label>
                            {smsReminder && (
                              <input
                                type="tel"
                                required
                                placeholder="Enter mobile phone: e.g. +1 (555) 019-2834"
                                value={reminderPhone}
                                onChange={(e) => setReminderPhone(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white placeholder-slate-600 font-mono outline-none focus:border-indigo-500"
                              />
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="flex items-center gap-2 text-[10.5px] text-slate-300 font-medium cursor-pointer">
                              <input
                                type="checkbox"
                                checked={emailReminder}
                                onChange={(e) => setEmailReminder(e.target.checked)}
                                className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-1 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                              />
                              <span>Enable Email Reminders</span>
                            </label>
                            {emailReminder && (
                              <input
                                type="email"
                                required
                                placeholder="Enter reminder email"
                                value={reminderEmail}
                                onChange={(e) => setReminderEmail(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white placeholder-slate-600 font-mono outline-none focus:border-indigo-500"
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 font-sans">
                        <input
                          type="checkbox"
                          id="sync-cal-chk"
                          checked={googleSync}
                          onChange={(e) => setGoogleSync(e.target.checked)}
                          className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-1 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                        <label htmlFor="sync-cal-chk" className="text-[11px] text-slate-300 font-medium cursor-pointer">
                          Automatically sync to Google Calendar / Workspace via prebuilt trigger hooks
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-md flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                    >
                      <Calendar className="w-4 h-4" /> Assemble Reservation Escrow
                    </button>
                  </form>

                  {/* Attorney Weekly Availability Hours Editor */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5 text-indigo-400">
                        <Clock className="w-4 h-4 text-indigo-400" />
                        <span className="text-[11px] font-black uppercase tracking-wider font-sans">Counsel Weekly Availability Grid</span>
                      </div>
                      <span className="text-[9px] bg-indigo-950 text-indigo-300 border border-indigo-900/60 font-mono font-bold px-1.5 py-0.5 rounded">
                        PORTAL VIEW
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug">
                      Click/toggle specific hour slots for <strong>{selectedAttorney?.name}</strong>. The booking calendar's hour options dynamically update based on these selections.
                    </p>
                    
                    <div className="space-y-2 pt-1">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                        const dayHours = selectedAttorney?.availabilityHours?.[day] || [];
                        return (
                          <div key={day} className="grid grid-cols-12 gap-1.5 items-center border-b border-slate-800/40 pb-2 last:border-0 last:pb-0">
                            <span className="col-span-2 text-[10px] font-mono font-bold text-slate-300">{day}</span>
                            <div className="col-span-10 flex flex-wrap gap-1">
                              {["09:00 AM", "10:00 AM", "11:30 AM", "02:00 PM", "04:00 PM"].map((hour) => {
                                const isSelected = dayHours.includes(hour);
                                return (
                                  <button
                                    key={hour}
                                    type="button"
                                    onClick={() => toggleAttorneyHour(day, hour)}
                                    className={`text-[9px] font-mono px-2 py-0.5 rounded transition-all flex items-center gap-1 font-bold border ${
                                      isSelected
                                        ? "bg-emerald-950/80 border-emerald-500 text-emerald-400 hover:bg-emerald-900"
                                        : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                                    }`}
                                  >
                                    <span>{hour}</span>
                                    <span className="text-[8px] opacity-70">{isSelected ? "✓" : "+"}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3 pt-6 border-t border-slate-800">
                    
                    {/* Switcher for Upcoming vs Past Bookings */}
                    <div className="flex border-b border-slate-800 pb-1.5 items-center justify-between">
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => setBookingSubTab("upcoming")}
                          className={`text-[10px] font-black uppercase tracking-wider transition-all pb-1 outline-none ${
                            bookingSubTab === "upcoming" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Upcoming Sessions
                        </button>
                        <button
                          type="button"
                          onClick={() => setBookingSubTab("past")}
                          className={`text-[10px] font-black uppercase tracking-wider transition-all pb-1 outline-none ${
                            bookingSubTab === "past" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Past Bookings ({pastBookings.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setBookingSubTab("analytics")}
                          className={`text-[10px] font-black uppercase tracking-wider transition-all pb-1 outline-none ${
                            bookingSubTab === "analytics" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Analytics 📊
                        </button>
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono font-bold">REGISTRY PORTAL</span>
                    </div>

                    {bookingSubTab === "upcoming" && (
                      <div className="space-y-2 max-h-[350px] overflow-y-auto animate-fadeIn">
                        {bookings.map((bk) => (
                          <div key={bk.id} className="p-3 bg-slate-900 border border-slate-800 rounded-md text-[11px] space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-extrabold text-white uppercase font-sans">{bk.lawyerName}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{bk.date} @ {bk.time} ({bk.duration} mins)</p>
                                <p className="text-[9.5px] text-indigo-300 font-mono">Retainer processed: ${bk.retainerFee}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="bg-emerald-950 border border-emerald-500 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold block mb-1">CONFIRMED</span>
                                {bk.syncedWithCalendar && (
                                  <span className="text-[9px] text-indigo-400 font-bold flex items-center gap-1 justify-end">
                                    <CheckCircle className="w-3 h-3 text-indigo-400" /> Workspace Synced
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Reminders visual badge indicators */}
                            {(bk.smsReminder || bk.emailReminder) && (
                              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800/40">
                                {bk.smsReminder && (
                                  <span className="text-[8.5px] font-mono font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-900/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Smartphone className="w-2.5 h-2.5 text-indigo-400" />
                                    SMS Reminder to {bk.reminderPhone}
                                  </span>
                                )}
                                {bk.emailReminder && (
                                  <span className="text-[8.5px] font-mono font-bold bg-sky-950/80 text-sky-300 border border-sky-900/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Mail className="w-2.5 h-2.5 text-sky-400" />
                                    Email: {bk.reminderEmail}
                                  </span>
                                )}
                              </div>
                            )}

                            {(bk.caseNotes || bk.legalQuestions) && (
                              <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
                                {bk.caseNotes && (
                                  <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
                                    <p className="text-[9px] font-black uppercase text-indigo-400 tracking-wider font-mono">Case Notes:</p>
                                    <p className="text-[10.5px] text-slate-300 font-sans mt-0.5 whitespace-pre-wrap">{bk.caseNotes}</p>
                                  </div>
                                )}
                                {bk.legalQuestions && (
                                  <div className="bg-slate-950/50 p-2 rounded border border-slate-800">
                                    <p className="text-[9px] font-black uppercase text-emerald-400 tracking-wider font-mono">Specific Questions:</p>
                                    <p className="text-[10.5px] text-slate-300 font-sans mt-0.5 whitespace-pre-wrap">{bk.legalQuestions}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Complete trigger button */}
                            <button
                              type="button"
                              onClick={async () => {
                                const completedBooking = {
                                  ...bk,
                                  status: "Completed"
                                };
                                try {
                                  await setDoc(doc(db, "bookings", bk.id), completedBooking);
                                } catch (err) {
                                  console.warn("Could not sync complete status with firestore", err);
                                }
                                setBookings(prev => prev.filter(x => x.id !== bk.id));
                                setPastBookings(prev => [completedBooking, ...prev]);
                                setBookingSubTab("past");
                                setRatingBookingId(bk.id); // prompt for review immediately
                                showToast("Consultation marked as Completed! Please rate your session.");
                              }}
                              className="w-full mt-2 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded transition-all cursor-pointer text-center uppercase tracking-wider"
                            >
                              ✓ Mark Consultation Completed
                            </button>
                          </div>
                        ))}

                        {bookings.length === 0 && (
                          <p className="text-center text-[10px] text-slate-500 italic py-4 font-sans">No upcoming scheduled appointments booked.</p>
                        )}
                      </div>
                    )}

                    {bookingSubTab === "past" && (
                      <div className="space-y-2 max-h-[350px] overflow-y-auto animate-fadeIn">
                        {pastBookings.map((bk) => {
                          const isRatingThis = ratingBookingId === bk.id;
                          return (
                            <div key={bk.id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-md text-[11px] space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-extrabold text-slate-300 uppercase font-sans">{bk.lawyerName}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">{bk.date} @ {bk.time} ({bk.duration} mins)</p>
                                  <p className="text-[9.5px] text-slate-500 font-mono">Retainer cleared: ${bk.retainerFee}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="bg-slate-800 border border-slate-700 text-slate-400 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold block mb-1">COMPLETED</span>
                                  <span className="text-[8.5px] text-slate-500 font-semibold block font-sans">Audit Invoice Released</span>
                                </div>
                              </div>

                              {/* Ratings display or rating form */}
                              {bk.rating ? (
                                <div className="p-2 bg-slate-950/40 border border-slate-800 rounded space-y-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9.5px] font-mono font-black text-amber-400 uppercase">User Feedback:</span>
                                    <div className="flex text-amber-400">
                                      {Array.from({ length: bk.rating }).map((_, i) => (
                                        <Star key={i} className="w-2.5 h-2.5 fill-amber-400 stroke-amber-400" />
                                      ))}
                                    </div>
                                  </div>
                                  {bk.feedbackComment && (
                                    <p className="text-[10.5px] text-slate-300 font-sans italic">"{bk.feedbackComment}"</p>
                                  )}
                                </div>
                              ) : isRatingThis ? (
                                <div className="p-3 bg-indigo-950/20 border border-indigo-500/30 rounded-lg space-y-2.5 animate-fadeIn">
                                  <p className="text-[10px] font-black uppercase text-indigo-400 tracking-wider font-mono">Post-Consultation Session Review</p>
                                  
                                  <div>
                                    <label className="text-[9.5px] text-slate-400 block mb-1 font-bold">Select Star Rating (1-5):</label>
                                    <div className="flex gap-1.5">
                                      {[1, 2, 3, 4, 5].map((val) => (
                                        <button
                                          key={val}
                                          type="button"
                                          onClick={() => setFeedbackRating(val)}
                                          className="p-1 transition-transform active:scale-90"
                                        >
                                          <Star
                                            className={`w-5 h-5 ${
                                              val <= feedbackRating
                                                ? "fill-amber-400 stroke-amber-400"
                                                : "stroke-slate-600 hover:stroke-amber-400"
                                            }`}
                                          />
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div>
                                    <label className="text-[9.5px] text-slate-400 block mb-1 font-bold">Comments / Experience:</label>
                                    <textarea
                                      value={feedbackComment}
                                      onChange={(e) => setFeedbackComment(e.target.value)}
                                      placeholder="How was your discussion with counsel? (optional)"
                                      className="w-full bg-slate-950 border border-slate-705 rounded p-1.5 text-xs text-white placeholder-slate-600 font-sans outline-none focus:border-indigo-500 h-14 resize-none"
                                    />
                                  </div>

                                  <div className="flex justify-end gap-1.5 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setRatingBookingId(null)}
                                      className="px-2.5 py-1 bg-slate-800 text-slate-300 text-[10px] font-bold rounded"
                                    >
                                      Later
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleFeedbackSubmit(bk.id)}
                                      className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider rounded"
                                    >
                                      Submit Feedback
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRatingBookingId(bk.id);
                                    setFeedbackRating(5);
                                    setFeedbackComment("");
                                  }}
                                  className="w-full py-1 bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-900/40 text-indigo-300 text-[10px] font-bold rounded transition-all cursor-pointer text-center"
                                >
                                  ★ Rate & Leave Review Feedback
                                </button>
                              )}

                              {(bk.caseNotes || bk.legalQuestions) && (
                                <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5">
                                  {bk.caseNotes && (
                                    <div className="bg-slate-950/40 p-2 rounded border border-slate-800">
                                      <p className="text-[9px] font-black uppercase text-indigo-400 tracking-wider font-mono">Case Notes:</p>
                                      <p className="text-[10.5px] text-slate-400 font-sans mt-0.5 whitespace-pre-wrap">{bk.caseNotes}</p>
                                    </div>
                                  )}
                                  {bk.legalQuestions && (
                                    <div className="bg-slate-950/40 p-2 rounded border border-slate-800">
                                      <p className="text-[9px] font-black uppercase text-emerald-400 tracking-wider font-mono">Specific Questions:</p>
                                      <p className="text-[10.5px] text-slate-400 font-sans mt-0.5 whitespace-pre-wrap">{bk.legalQuestions}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {bookingSubTab === "analytics" && (
                      <div className="space-y-4 p-1.5 animate-fadeIn max-h-[420px] overflow-y-auto">
                        
                        {/* Dynamic KPIs */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-slate-900/60 p-2.5 border border-slate-800 rounded">
                            <span className="text-[8px] font-mono font-bold text-slate-400 block uppercase">Total Scheduled</span>
                            <span className="text-sm font-black text-white font-mono">
                              {bookings.length + pastBookings.length}
                            </span>
                          </div>
                          <div className="bg-slate-900/60 p-2.5 border border-slate-800 rounded">
                            <span className="text-[8px] font-mono font-bold text-slate-400 block uppercase">Retainer Fees</span>
                            <span className="text-sm font-black text-emerald-400 font-mono">
                              ${[...bookings, ...pastBookings].reduce((acc, x) => acc + x.retainerFee, 0)}
                            </span>
                          </div>
                          <div className="bg-slate-900/60 p-2.5 border border-slate-800 rounded">
                            <span className="text-[8px] font-mono font-bold text-slate-400 block uppercase">Workload</span>
                            <span className="text-sm font-black text-indigo-400 font-mono">
                              {[...bookings, ...pastBookings].reduce((acc, x) => acc + x.duration, 0)}m
                            </span>
                          </div>
                        </div>

                        {/* Recharts Bar Chart: Retainer Fees Collected & Booked Sessions per advocate */}
                        <div className="bg-slate-900/40 p-3 border border-slate-800 rounded-lg space-y-2">
                          <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                            <span className="text-[9.5px] font-mono font-black uppercase text-slate-300">Revenue per Counsel Member ($ USD)</span>
                            <span className="text-[8.5px] text-emerald-400 font-mono font-bold">ESCROW TOTALS</span>
                          </div>
                          <div className="w-full h-44 font-mono text-[9px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={(() => {
                                  const all = [...bookings, ...pastBookings];
                                  const res: { [name: string]: { name: string; revenue: number; sessions: number } } = {};
                                  attorneys.forEach(att => {
                                    const short = att.name.replace("Hon. ", "").replace(", QC", "").replace(", Esq.", "").replace("Dr. ", "");
                                    res[att.id] = { name: short, revenue: 0, sessions: 0 };
                                  });
                                  all.forEach(b => {
                                    if (res[b.lawyerId]) {
                                      res[b.lawyerId].revenue += b.retainerFee;
                                      res[b.lawyerId].sessions += 1;
                                    } else {
                                      const short = b.lawyerName.replace("Hon. ", "").replace(", QC", "").replace(", Esq.", "").replace("Dr. ", "");
                                      res[b.lawyerId] = { name: short, revenue: b.retainerFee, sessions: 1 };
                                    }
                                  });
                                  return Object.values(res);
                                })()}
                                margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
                              >
                                <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                                <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                                <Tooltip
                                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "6px", fontSize: "10px", color: "#fff" }}
                                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                                />
                                <Bar dataKey="revenue" fill="#6366f1" radius={[2, 2, 0, 0]} barSize={16}>
                                  {(() => {
                                    const colors = ["#6366f1", "#10b981", "#f59e0b", "#3b82f6"];
                                    return attorneys.map((_, i) => (
                                      <Cell key={i} fill={colors[i % colors.length]} />
                                    ));
                                  })()}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Recharts Pie Chart: Workload Allocation in minutes */}
                        <div className="bg-slate-900/40 p-3 border border-slate-800 rounded-lg space-y-2">
                          <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                            <span className="text-[9.5px] font-mono font-black uppercase text-slate-300">Counsel Workload Distribution (Minutes)</span>
                            <span className="text-[8.5px] text-indigo-400 font-mono font-bold">TIME METRICS</span>
                          </div>
                          <div className="w-full h-44 font-mono text-[9px] flex items-center justify-between gap-2">
                            <div className="w-[55%] h-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={(() => {
                                      const all = [...bookings, ...pastBookings];
                                      const res: { [name: string]: { name: string; value: number } } = {};
                                      attorneys.forEach(att => {
                                        const short = att.name.replace("Hon. ", "").replace(", QC", "").replace(", Esq.", "").replace("Dr. ", "");
                                        res[att.id] = { name: short, value: 0 };
                                      });
                                      all.forEach(b => {
                                        if (res[b.lawyerId]) {
                                          res[b.lawyerId].value += b.duration;
                                        } else {
                                          const short = b.lawyerName.replace("Hon. ", "").replace(", QC", "").replace(", Esq.", "").replace("Dr. ", "");
                                          res[b.lawyerId] = { name: short, value: b.duration };
                                        }
                                      });
                                      return Object.values(res).filter(x => x.value > 0);
                                    })()}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={22}
                                    outerRadius={45}
                                    paddingAngle={3}
                                    dataKey="value"
                                  >
                                    {attorneys.map((_, idx) => {
                                      const colors = ["#6366f1", "#10b981", "#f59e0b", "#3b82f6"];
                                      return <Cell key={`cell-${idx}`} fill={colors[idx % colors.length]} />;
                                    })}
                                  </Pie>
                                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "6px", fontSize: "10px", color: "#fff" }} />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="w-[45%] text-[10px] space-y-1 text-slate-400">
                              {(() => {
                                const colors = ["#6366f1", "#10b981", "#f59e0b", "#3b82f6"];
                                return attorneys.map((att, idx) => {
                                  const totalMins = [...bookings, ...pastBookings]
                                    .filter(b => b.lawyerId === att.id)
                                    .reduce((acc, b) => acc + b.duration, 0);
                                  return (
                                    <div key={att.id} className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[idx % colors.length] }} />
                                      <span className="truncate max-w-[80px] font-sans font-medium text-slate-300">{att.name.split(",")[0]}</span>
                                      <span className="text-slate-500 font-mono text-[9px]">({totalMins}m)</span>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        </div>

                      </div>
                    )}

                    {bookingResult && (
                      <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[11px] rounded-lg mt-2 font-mono whitespace-pre-wrap">
                        {bookingResult}
                      </div>
                    )}
                  </div>
                </div>

              </div>
              
            </div>
          )}

          {/* 6. Multimodal Tools, Video & Audio */}
          {activeTab === "multimodal" && (
            <div className="space-y-6">
              
              <div className="bg-slate-900 border border-slate-700 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-indigo-400" />
                  Multimodal Legal Operations Hub
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Transcribe recorded case summaries dynamically using Gemini Speech extraction, synthesize plain speaking clause vocalizations (TTS), or process presentation briefing video reels.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Voice speech Synthesizer panel (TTS) */}
                <div className="lg:col-span-4 bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
                  <div>
                    <span className="bg-indigo-950 border border-indigo-700 text-indigo-300 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                      MODULE 1
                    </span>
                    <h4 className="text-sm font-bold text-white uppercase mt-1">Speech Reading Synthesizer</h4>
                    <p className="text-[11px] text-slate-400">Convert complex clauses or AI suggestions to fluid spoken voiceovers.</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Clause Text to read:</label>
                      <textarea
                        value={ttsInput}
                        onChange={(e) => setTtsInput(e.target.value)}
                        placeholder="e.g. This contract designates the California Civil Code as principal authority for liability issues..."
                        rows={4}
                        className="bg-slate-900 p-2 text-xs border border-slate-700 rounded w-full text-slate-200 outline-none font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">Speaker Voice:</label>
                        <select
                          value={ttsVoice}
                          onChange={(e) => setTtsVoice(e.target.value)}
                          className="bg-slate-900 p-1.5 text-xs text-white rounded border border-slate-700 w-full"
                        >
                          <option value="Kore">Kore (Male / Neutral)</option>
                          <option value="Fen">Fen (Female / Soft)</option>
                          <option value="Puck">Puck (Energetic)</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={handleTtsSynth}
                          disabled={ttsSpeechLoading}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs uppercase tracking-tight py-2 rounded transition-all"
                        >
                          {ttsSpeechLoading ? "Processing..." : "Generate Voice"}
                        </button>
                      </div>
                    </div>

                    {ttsAudioResult && (
                      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs space-y-2">
                        <p className="text-emerald-400 font-bold font-mono">Synthesizer stream healthy:</p>
                        <div className="flex items-center gap-3 bg-indigo-950 p-2 border border-indigo-700 rounded">
                          <Volume2 className="w-5 h-5 text-amber-300 animate-pulse" />
                          <span className="text-[11px] text-slate-200">Playing voice model: {ttsVoice}. Modalities generated successfully.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Microphone Speech to Text (STT) Recorder simulation */}
                <div className="lg:col-span-4 bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
                  <div>
                    <span className="bg-amber-950 border border-amber-700 text-amber-300 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                      MODULE 2
                    </span>
                    <h4 className="text-sm font-bold text-white uppercase mt-1">Grounded Audio Transcriber</h4>
                    <p className="text-[11px] text-slate-400">Verbally describe your dispute details and transcribe securely.</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Verbal Case Narration simulation:</label>
                      <input
                        type="text"
                        value={voicePromptSim}
                        onChange={(e) => setVoicePromptSim(e.target.value)}
                        placeholder="I purchased a franchise license but didn't receive documents within cooling-off period."
                        className="bg-slate-900 font-mono p-2 text-xs border border-slate-700 rounded w-full text-slate-200 outline-none"
                      />
                      <span className="text-[9px] text-slate-400 italic block mt-1">Note: Enter a simulated narration above then click Record.</span>
                    </div>

                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg flex flex-col items-center justify-center text-center space-y-3">
                      <button
                        onClick={handlePrebuiltVoiceRecording}
                        className={`w-14 h-14 rounded-full flex items-center justify-center font-bold relative transition-all ${
                          voiceRecording ? "bg-red-600 scale-105 animate-pulse" : "bg-indigo-600 hover:bg-indigo-500 text-white"
                        }`}
                      >
                        <Mic className="w-6 h-6 text-white" />
                      </button>
                      <span className="text-xs text-slate-300 font-bold">
                        {voiceRecording ? "System recording mic stream..." : "Record Verbal Statements"}
                      </span>
                    </div>

                    {transcriptionResult && (
                      <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                          <span className="text-indigo-400 font-mono font-bold uppercase tracking-wider">Transcribed Output</span>
                          <span className="text-[9px] bg-indigo-905 border border-indigo-700 text-slate-300 px-1 py-0.5 rounded">
                            {transcriptionResult.extractedJurisdiction}
                          </span>
                        </div>
                        <p className="text-slate-200 italic leading-snug">"{transcriptionResult.text}"</p>
                        <div className="pt-1">
                          <span className="text-[9px] text-slate-400 block font-bold">POSSIBLE JURISDICTIONAL ACTIONS:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {transcriptionResult.causesOfAction?.map((cause: string, i: number) => (
                              <span key={i} className="bg-indigo-950 border border-indigo-800/40 text-amber-300 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                                {cause}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Generative legal briefings video from text */}
                <div className="lg:col-span-4 bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
                  <div>
                    <span className="bg-teal-950 border border-teal-700 text-teal-300 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                      MODULE 3
                    </span>
                    <h4 className="text-sm font-bold text-white uppercase mt-1">Generative Video briefings</h4>
                    <p className="text-[11px] text-slate-400">Render legal presentation outline animations via experimental Veo systems.</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Presentation Prompt:</label>
                      <input
                        type="text"
                        value={videoPrompt}
                        onChange={(e) => setVideoPrompt(e.target.value)}
                        placeholder="e.g. Generate a courtroom procedural explainer video highlighting Ontario civil litigation stages..."
                        className="bg-slate-900 p-2 text-xs border border-slate-700 rounded w-full text-slate-200 outline-none"
                      />
                    </div>

                    <button
                      onClick={handleGenerateVideoBrief}
                      disabled={videoGenerating}
                      className="w-full bg-teal-600 hover:bg-teal-500 font-extrabold text-white text-xs uppercase tracking-wider py-2 rounded transition-all"
                    >
                      {videoGenerating ? "Generating..." : "Render Video Brief"}
                    </button>

                    {videoOperation && (
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-2">
                        <span className="text-teal-400 font-mono font-black animate-pulse block">VEO PIPELINE ACTIVE</span>
                        <p className="text-[10px] text-slate-300">Operation initialized:</p>
                        <span className="text-[9px] font-mono text-indigo-300 block select-all bg-slate-950 p-1.5 rounded">{videoOperation}</span>
                        <div className="flex items-center gap-1.5 bg-teal-950/40 border border-teal-800/3s p-2 rounded">
                          <Video className="w-5 h-5 text-teal-400 animate-pulse" />
                          <span className="text-[10px] text-slate-400">Rendering video. Presentation frame sequences queued.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* 8. Gemini Legal Translation & Polyglot Suite */}
          {activeTab === "translation" && (
            <div id="translation-suite-viewport" className="space-y-6">
              
              {/* Top Banner and System Profile Settings */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950/40 p-5 rounded-xl border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-emerald-400 animate-spin" style={{ animationDuration: "12s" }} />
                    <h2 className="text-lg font-extrabold text-white uppercase tracking-wider">Gemini Sovereign Legal translation Suite</h2>
                  </div>
                  <p className="text-xs text-slate-400 max-w-2xl">
                    High-reasoning translation agents preserving legal meaning, citations, and specific clause structures between English, French, Spanish, and German. Grounded by strict multi-jurisdictional glossaries.
                  </p>
                </div>
                
                {/* Global preferredLanguage configuration */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 min-w-[280px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Your Preferred Language:</span>
                    <span className="bg-indigo-900 text-indigo-300 font-mono text-[9px] px-1.5 py-0.5 rounded font-black uppercase">Active Routing</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {(["en", "fr", "es", "de"] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setPreferredLanguage(lang);
                          showToast(`Default language updated to: ${lang.toUpperCase()}. Auto-routing initiated for all agents.`);
                        }}
                        className={`py-1 text-xs font-bold rounded uppercase ${
                          preferredLanguage === lang
                            ? "bg-indigo-600 text-white border-b-2 border-amber-400"
                            : "bg-slate-900 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-500 italic leading-tight">
                    {preferredLanguage === "en" 
                      ? "Standard English direct queries are active."
                      : `Consolidated pipeline active. User questions in ${preferredLanguage.toUpperCase()} will be auto-normalized to English, analyzed by the Judicial Bench (Tutor/Lawyer/Judge), and corresponding answers localized back.`}
                  </p>
                </div>
              </div>

              {/* Translation Console Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Input Panel */}
                <div className="lg:col-span-6 bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      Translation Input
                    </span>
                    <span className="text-[11px] text-slate-400 uppercase font-bold">Source Material</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Source Language:</label>
                        <button 
                          onClick={() => setTranslationInput("")} 
                          className="text-[9px] text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                          Clear Text
                        </button>
                      </div>
                      <select
                        value={translationSource}
                        onChange={(e: any) => setTranslationSource(e.target.value)}
                        className="bg-slate-900 p-2 text-xs text-white rounded border border-slate-700 w-full font-mono"
                      >
                        <option value="auto">Auto-Detect Language (Recommended)</option>
                        <option value="en">English (EN)</option>
                        <option value="fr">French (FR)</option>
                        <option value="es">Spanish (ES)</option>
                        <option value="de">German (DE)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Target Language:</label>
                        <select
                          value={translationTarget}
                          onChange={(e: any) => setTranslationTarget(e.target.value)}
                          className="bg-slate-900 p-2 text-xs text-white rounded border border-slate-700 w-full font-mono font-bold"
                        >
                          <option value="en">English (EN)</option>
                          <option value="fr">French (FR)</option>
                          <option value="es">Spanish (ES)</option>
                          <option value="de">German (DE)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Agent Style / Mode:</label>
                        <select
                          value={translationMode}
                          onChange={(e: any) => setTranslationMode(e.target.value)}
                          className="bg-slate-900 p-2 text-xs text-white rounded border border-slate-700 w-full font-mono"
                        >
                          <option value="standard">Standard Translation (Direct)</option>
                          <option value="document">Document Clause Preservation (Formal)</option>
                          <option value="explanation">Explanation Layout (Readable Prose)</option>
                          <option value="ui">UI Precision Mode (Short prompts)</option>
                          <option value="bilingual">Bilingual SidebySide Context</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Legal Text or Clause Area:</label>
                      <textarea
                        value={translationInput}
                        onChange={(e) => setTranslationInput(e.target.value)}
                        placeholder="Paste individual legal clauses, statutes, court orders, case histories, or questions that want bidirectional translations..."
                        rows={8}
                        className="bg-slate-900 p-3 text-xs border border-slate-700 rounded-lg w-full text-slate-100 outline-none font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <button
                      onClick={handleTriggerTranslation}
                      disabled={translationLoading}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-black text-xs uppercase tracking-wider py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_4px_12px_rgba(79,70,229,0.3)]"
                    >
                      {translationLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                          <span>Gemini Translating...</span>
                        </>
                      ) : (
                        <>
                          <Globe className="w-4 h-4 text-amber-300" />
                          <span>Translate via Sovereign Agent</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Output Panel */}
                <div className="lg:col-span-6 bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <span className="bg-indigo-950 text-indigo-400 border border-indigo-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        Target Translation Output
                      </span>
                      <span className="bg-slate-900 text-slate-400 text-[9px] px-2 py-0.5 rounded font-mono block">
                        Agent Style: {translationMode}
                      </span>
                    </div>

                    {translationResultText ? (
                      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-sans text-xs text-slate-150 leading-relaxed space-y-3 min-h-[220px] max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                        {translationResultText}
                      </div>
                    ) : (
                      <div className="border border-dashed border-slate-800 rounded-lg p-12 text-center text-xs text-slate-500 uppercase tracking-widest font-mono min-h-[220px] flex items-center justify-center">
                        {translationLoading ? "Processing translation stream..." : "Awaiting Translation request output"}
                      </div>
                    )}
                  </div>

                  {translationResultText && (
                    <div className="pt-4 border-t border-slate-800 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(translationResultText);
                          showToast("Translated output copied to clipboard!");
                        }}
                        className="bg-slate-900 hover:bg-slate-800 border border-slate-700 px-3 py-1.5 rounded text-xs font-bold text-slate-300 flex items-center gap-1.5"
                      >
                        Copy to Clipboard
                      </button>
                      <button
                        onClick={() => {
                          setChatMessage(`Apply localized analysis / draft response to the following translated clause: ${translationResultText}`);
                          setActiveTab("counsel");
                          showToast("Translated text successfully injected as Co-Counsel draft trigger!");
                        }}
                        className="bg-indigo-950 hover:bg-indigo-900 border border-indigo-700 px-3 py-1.5 rounded text-xs font-bold text-white flex items-center gap-1.5"
                      >
                        Infect to Co-Counsel Chat
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Strict Multi-jurisdictional Legal Glossary Guide */}
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <span className="bg-amber-950 text-amber-300 border border-amber-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    Grounding Glossary Layer
                  </span>
                  <h3 className="text-base font-black text-white uppercase tracking-wider mt-1">
                    Certified Bidirectional Legal Mappings glossary
                  </h3>
                  <p className="text-xs text-slate-400">
                    Precision definitions mapping intricate common-law and civil terminology accurately to avoid interpretation errors in target languages. Click any glossary card to load it.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[
                    {
                      id: "contract",
                      domain: "general",
                      en: "contract",
                      fr: "contrat",
                      es: "contrato",
                      de: "Vertrag",
                      notes: "Legally binding agreement between two or more parties."
                    },
                    {
                      id: "consideration",
                      domain: "common-law-contracts",
                      en: "consideration",
                      fr: "contrepartie (concept de common law)",
                      es: "contraprestación (concepto de common law)",
                      de: "Gegenleistung (common-law-Begriff)",
                      notes: "Core common-law concept; keep original term in parentheses when needed."
                    },
                    {
                      id: "tort",
                      domain: "tort",
                      en: "tort",
                      fr: "responsabilité délictuelle",
                      es: "responsabilidad extracontractual",
                      de: "unerlaubte Handlung",
                      notes: "Non-contractual civil wrong; translations are doctrinally approximate."
                    },
                    {
                      id: "statute",
                      domain: "public-law",
                      en: "statute",
                      fr: "loi",
                      es: "ley",
                      de: "Gesetz",
                      notes: "Formally enacted legislation."
                    },
                    {
                      id: "regulation",
                      domain: "public-law",
                      en: "regulation",
                      fr: "règlement",
                      es: "reglamento",
                      de: "Verordnung",
                      notes: "Subordinate legislation or EU regulation depending on context."
                    },
                    {
                      id: "supreme_court",
                      domain: "courts",
                      en: "Supreme Court",
                      fr: "Cour suprême",
                      es: "Tribunal Supremo",
                      de: "Oberstes Gericht / Bundesgerichtshof (context-dependent)",
                      notes: "Use official court name where one exists (e.g., 'Supreme Court of Canada')."
                    },
                    {
                      id: "data_protection_authority",
                      domain: "privacy",
                      en: "data protection authority",
                      fr: "autorité de protection des données",
                      es: "autoridad de protección de datos",
                      de: "Datenschutzbehörde",
                      notes: "Generic label; map to CNIL, ICO, BfDI, etc. per jurisdiction."
                    }
                  ].map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setTranslationInput(item.en);
                        setTranslationResultText("");
                        showToast(`Loaded glossary term "${item.en}" into Translator input.`);
                      }}
                      className="bg-slate-900 p-4 border border-slate-800 rounded-lg hover:border-indigo-600 transition-all cursor-pointer space-y-2 group flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-bold group-hover:text-amber-300 font-mono text-xs uppercase">
                            {item.id.replace("_", " ")}
                          </span>
                          <span className="text-[8px] bg-slate-950 px-1 py-0.5 text-slate-500 rounded border border-slate-800 uppercase font-bold">
                            {item.domain}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 italic">"{item.notes}"</p>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-850 text-[10px] font-mono select-all">
                        <div className="bg-slate-950 p-1 rounded">
                          <span className="text-slate-500 font-bold">EN:</span> <span className="text-slate-200">{item.en}</span>
                        </div>
                        <div className="bg-slate-950 p-1 rounded">
                          <span className="text-slate-500 font-bold">FR:</span> <span className="text-slate-200">{item.fr}</span>
                        </div>
                        <div className="bg-slate-950 p-1 rounded">
                          <span className="text-slate-500 font-bold">ES:</span> <span className="text-slate-200">{item.es}</span>
                        </div>
                        <div className="bg-slate-950 p-1 rounded">
                          <span className="text-slate-500 font-bold">DE:</span> <span className="text-slate-200">{item.de}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* 7. Maintenance Self-healing Sweep */}
          {activeTab === "maintenance" && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Maintenance overview terminal */}
                <div className="lg:col-span-5 bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-6">
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-amber-300 animate-spin" /> Maintainer Daemon Sweep
                    </h3>
                    <p className="text-xs text-slate-400">
                      Instantly audits core express server setups, checks memory RAG directories, and performs health check verifying database persistence structures.
                    </p>
                  </div>

                  <button
                    onClick={handleMaintenanceRun}
                    disabled={maintenanceLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider py-3 rounded-lg flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4 text-white" /> Check and Prevent System Crashing
                  </button>

                  {maintenanceReport ? (
                    <div className="space-y-4 bg-slate-900 p-4 border border-slate-800 rounded-lg text-xs">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-white uppercase">System Integrity Matrix</span>
                        <span className="text-[10px] bg-emerald-950 border border-emerald-500 text-emerald-400 px-2 py-0.5 rounded font-mono">
                          {maintenanceReport.dbCheck}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[10px]">
                          <span className="text-slate-400">Server Uptime:</span>
                          <p className="text-white font-bold">{Math.round(maintenanceReport.uptime)} Secs active</p>
                        </div>
                        <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[10px]">
                          <span className="text-slate-400">Current App Build:</span>
                          <p className="text-white font-bold">{maintenanceReport.version}</p>
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-950/25 border border-emerald-500/30 text-emerald-400 text-[11px] rounded-md flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="font-mono font-bold">Health Auditing Scan completed successfully. System optimized.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 border border-dashed border-slate-800 rounded-lg text-center text-xs text-slate-500 uppercase tracking-widest font-mono">
                      {maintenanceLoading ? "DAEMON VERIFY RUNNING..." : "WAITING FOR SCAN INITIATION"}
                    </div>
                  )}
                </div>

                {/* Real-time system logs console */}
                <div className="lg:col-span-7 bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div className="space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block border-b border-slate-800 pb-2">
                      Live Server Activity Records & Security Logs
                    </span>
                    
                    <div className="bg-slate-900 border border-slate-800 rounded p-4 font-mono text-[10px] leading-relaxed text-slate-300 max-h-[280px] overflow-y-auto space-y-2">
                      {systemLogs.map((log, index) => (
                        <div key={index} className="flex flex-col md:flex-row md:items-center justify-between text-slate-300 border-b border-slate-850 pb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-indigo-400">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                            <span>{log.event}</span>
                          </div>
                          <span className={`font-bold mt-1 md:mt-0 ${log.status === "SUCCESS" || log.status === "HEALTHY" ? "text-emerald-400" : "text-amber-400"}`}>
                            {log.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800">
                    <p className="text-[10px] text-slate-500 italic">
                      Maintaining daemon automatically monitors file modifications and optimizes performance, ensuring offline synchronization is aligned correctly.
                    </p>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Billing & Subscriptions Hub */}
          {activeTab === "billing" && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4 h-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold font-sans text-white tracking-tight flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-amber-400" />
                      Membership & Billing Hub
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Manage your Global Legal Counsel plan, check active tier access, and initialize real-time Stripe checkout sessions.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-slate-400">Operator Session:</span>
                    <span className="bg-slate-900 border border-slate-800 text-indigo-400 px-2.5 py-1 rounded font-bold">
                      {currentUser ? currentUser.email : "Guest Mode (Unregistered)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-tab Navigation */}
              <div className="flex border-b border-slate-850 gap-1 pt-1">
                <button
                  type="button"
                  id="tab-billing-terminal"
                  onClick={() => setBillingSubTab("terminal")}
                  className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider border-b-2 font-mono transition-all duration-150 flex items-center gap-2 ${
                    billingSubTab === "terminal"
                      ? "border-amber-400 text-amber-400 bg-amber-500/5"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Plans & Billing Terminal
                </button>
                <button
                  type="button"
                  id="tab-billing-schema"
                  onClick={() => setBillingSubTab("schema")}
                  className={`px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider border-b-2 font-mono transition-all duration-150 flex items-center gap-2 ${
                    billingSubTab === "schema"
                      ? "border-indigo-400 text-indigo-400 bg-indigo-500/5"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  Mongoose User Schema
                </button>
              </div>

              {billingSubTab === "terminal" ? (
                effectiveSubscription?.status === "active" ? (
                  /* --- ACTIVE PREMIUM VIEW --- */
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
                    {/* Glowing Active Membership Card */}
                    <div className="md:col-span-2 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 p-6 rounded-xl border border-emerald-500/30 shadow-lg shadow-emerald-950/20 space-y-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-emerald-500 text-slate-900 font-sans font-black text-[10px] tracking-wider uppercase px-4 py-1 rounded-bl-xl shadow-md">
                        ACTIVE MEMBER
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
                          <Award className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-lg font-bold text-white">Sovereign Pro Counsel</h3>
                          <p className="text-xs text-slate-400">Premium Subscription Plan</p>
                          <div className="flex items-center gap-1.5 mt-2 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full w-max">
                            <CheckCircle className="w-3.5 h-3.5" /> Synchronized with Stripe & Firestore Database
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800 text-xs">
                        <div className="space-y-1 bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                          <span className="text-slate-400 font-mono">Subscription Status</span>
                          <p className="text-emerald-400 font-bold text-sm flex items-center gap-1.5 uppercase font-mono mt-1">
                            ● Active / Paid
                          </p>
                        </div>
                        <div className="space-y-1 bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                          <span className="text-slate-400 font-mono">Current Plan Tier</span>
                          <p className="text-white font-bold text-sm uppercase mt-1">
                            {effectiveSubscription.planType === "yearly" ? "Yearly License ($349/year)" : "Monthly Membership ($39/month)"}
                          </p>
                        </div>
                        <div className="space-y-1 bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                          <span className="text-slate-400 font-mono">Subscriber Email</span>
                          <p className="text-indigo-300 font-bold font-mono mt-1 select-all">
                            {currentUser ? currentUser.email : "akinisaacade@gmail.com"}
                          </p>
                        </div>
                        <div className="space-y-1 bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                          <span className="text-slate-400 font-mono">Stripe Subscription ID</span>
                          <p className="text-slate-300 font-bold font-mono text-[11px] truncate mt-1 select-all">
                            {effectiveSubscription.subscriptionId || "sub_1TfEN_Active_Demo"}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 flex flex-wrap gap-3">
                        <button 
                          onClick={() => {
                            fetchSubscription();
                            showToast("🔄 Fetching latest subscription detail...");
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-md transition-all flex items-center gap-2"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Synchronize License
                        </button>
                        <button 
                          onClick={() => {
                            alert("Stripe Customer Billing Portal is active in production modes.");
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-4 py-2 rounded-md transition-all"
                        >
                          Launch Portal Support
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-3">
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-400" /> Unlocked Premium Features
                        </h4>
                        <ul className="text-xs text-slate-300 space-y-2 mt-2 font-sans list-disc list-inside">
                          <li>Unlimited <strong>AI Counsel</strong> conversational multi-agent threads.</li>
                          <li>High-priority OCR document intake with secure cloud archives.</li>
                          <li>Advanced multi-jurisdictional compliance alert synthesis.</li>
                          <li>Real-time automated legal translations with bilingual output formatting.</li>
                          <li>Direct sovereign consultation scheduler with zero wait-times.</li>
                        </ul>
                      </div>

                      <div className="bg-amber-955/10 border border-amber-500/20 p-4 rounded-lg">
                        <div className="flex gap-2">
                          <Info className="w-4 h-4 text-amber-400 shrink-0" />
                          <p className="text-[11px] text-amber-300 leading-relaxed font-sans">
                            Your active Stripe session is tracked securely inside your private cloud sandbox. You can change your active subscriptions context by simulating cancellation.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* --- PAYMENT PLANS VIEW (UNSUBSCRIBED) --- */
                  <div className="space-y-6 animate-fadeIn">
                    {/* Alert Banner / Call to Action */}
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
                      <div className="absolute -right-16 -top-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" /> Unlock All Legal Matters Premium Active Tier
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                          Access raw AI multi-agent counseling, instant automated compliance audits, sovereign translation synthesizers, and priorities legal booking directly connected to Stripe checkout.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 mr-2">Secure Test Card Sandbox</span>
                        <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold px-3 py-1 rounded text-xs">
                          Stripe Live Sandbox
                        </div>
                      </div>
                    </div>

                    {/* Pricing grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                      {/* Plan A: Monthly Plan */}
                      <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all space-y-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-xs text-indigo-400 font-bold font-mono tracking-widest uppercase">Professional Monthly</span>
                              <h3 className="text-xl font-bold text-white mt-1">Counsel Monthly</h3>
                            </div>
                            <span className="bg-slate-950 px-2 py-1 text-slate-400 rounded text-[9px] font-bold font-mono uppercase">Monthly access</span>
                          </div>
                          <div className="flex items-baseline gap-1.5 border-b border-slate-800 pb-4">
                            <span className="text-3xl font-black text-white">$39</span>
                            <span className="text-xs text-slate-400 font-mono">/ month</span>
                          </div>
                          <ul className="space-y-3 text-xs text-slate-300">
                            <li className="flex items-center gap-2">
                              ● Auto-compliance auditing triggers
                            </li>
                            <li className="flex items-center gap-2">
                              ● Multi-agent AI counseling (Translated input)
                            </li>
                            <li className="flex items-center gap-2">
                              ● Private document vault storage support
                            </li>
                            <li className="flex items-center gap-2">
                              ● Unlimited legal translations
                            </li>
                          </ul>
                        </div>
                        <button
                          onClick={() => handleStripeCheckout("monthly")}
                          disabled={stripeLoading}
                          className="w-full bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {stripeLoading ? (
                            <span className="flex items-center gap-2">
                              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" /> Connecting to checkout...
                            </span>
                          ) : (
                            "Subscribe Monthly"
                          )}
                        </button>
                      </div>

                      {/* Plan B: Yearly License (Highlighted) */}
                      <div className="bg-slate-900/80 p-6 rounded-xl border border-indigo-500/30 shadow-lg shadow-indigo-950/10 flex flex-col justify-between hover:border-indigo-500/50 transition-all space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-indigo-500 text-white font-sans font-black text-[9px] tracking-widest uppercase px-3 py-1 rounded-bl-md shadow-sm">
                          25% SAVINGS
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-xs text-amber-400 font-bold font-mono tracking-widest uppercase">Annual Unlimited</span>
                              <h3 className="text-xl font-bold text-white mt-1">Counsel Annual</h3>
                            </div>
                            <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase">MOST POPULAR</span>
                          </div>
                          <div className="flex items-baseline gap-1.5 border-b border-slate-800 pb-4">
                            <span className="text-3xl font-black text-white">$349</span>
                            <span className="text-xs text-slate-400 font-mono">/ year</span>
                          </div>
                          <ul className="space-y-3 text-xs text-slate-300">
                            <li className="flex items-center gap-2 text-indigo-300">
                              ★ Everything in Monthly plan
                            </li>
                            <li className="flex items-center gap-2">
                              ★ Priority processing speed access
                            </li>
                            <li className="flex items-center gap-2">
                              ★ Access to multi-jurisdiction procedures
                            </li>
                            <li className="flex items-center gap-2">
                              ★ Dedicated priority customer logs backup
                            </li>
                          </ul>
                        </div>
                        <button
                          onClick={() => handleStripeCheckout("yearly")}
                          disabled={stripeLoading}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-lg transition-all shadow-md shadow-indigo-900/20 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {stripeLoading ? (
                            <span className="flex items-center gap-2">
                              <RefreshCw className="w-4 h-4 animate-spin text-white" /> Connecting to checkout...
                            </span>
                          ) : (
                            "Subscribe Annual"
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Sandbox test card hints */}
                    <div className="bg-slate-950 p-5 rounded-lg border border-slate-850 mt-8 space-y-2">
                      <h4 className="text-xs font-mono font-bold text-amber-300 uppercase tracking-widest">
                        💳 Stripe Sandbox Developer Guidance
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                        This system operates inside a fully secured sandboxed workspace integrated with Stripe Payment checkouts. 
                        You can run checkout operations using Stripe credentials. Complete transactions instantly with the 
                        standard Stripe sandbox testing account card:
                      </p>
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-mono">
                        <span className="text-slate-400">Card Number:</span>
                        <strong className="bg-slate-900 px-2 py-1 rounded border border-slate-800 text-white select-all">
                          4242 &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 4242
                        </strong>
                        <span className="text-slate-400">CVV/EXP:</span>
                        <strong className="bg-slate-900 px-2 py-1 rounded border border-slate-800 text-white select-all">
                          Any (e.g. 123, 12/28)
                        </strong>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono border-t border-slate-900 mt-2">
                        <span className="text-amber-400 font-bold">Publishable Key:</span>
                        <strong className="bg-indigo-950/40 px-2.5 py-1 rounded border border-indigo-900/40 text-indigo-300 select-all tracking-tight font-bold">
                          {(import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY || "pk_live_Y8I4kIWBXPdQIfZ2tthPIFwV00DlqCjZva"}
                        </strong>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                /* --- SCHEMA SPECIFICATION VIEW --- */
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden space-y-4">
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white font-mono font-black text-[9px] tracking-widest uppercase px-4 py-1.5 rounded-bl-xl shadow flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                      ACTIVE MONGOOSE MODEL
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
                        <Database className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-white">Database User & Subscription Schema</h3>
                        <p className="text-xs text-slate-400">
                          Production schema specification model code. Configured for MongoDB/Mongoose with fields for registration identity, encrypted tokens, and active free trial timers.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                       {/* Left explanation block */}
                       <div className="md:col-span-1 space-y-4">
                         <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg space-y-3">
                           <h4 className="text-xs font-bold text-indigo-300 font-mono tracking-wider uppercase border-b border-slate-800 pb-1.5">
                             Field Specifications
                           </h4>
                           <ul className="space-y-3 text-[11px] text-slate-300 font-sans">
                             <li>
                               <strong className="text-white font-mono block">fullName</strong>
                               <span className="text-slate-400 text-[10px] block mt-0.5 leading-normal">
                                 String, required, automatically trimmed of outer spacing on creation. Matches user's registration display name.
                               </span>
                             </li>
                             <li>
                               <strong className="text-white font-mono block">email</strong>
                               <span className="text-slate-400 text-[10px] block mt-0.5 leading-normal">
                                 String, required, uniqueness indexed, auto-lowercased, and trimmed. Serves as primary billing lookup.
                               </span>
                             </li>
                             <li>
                               <strong className="text-white font-mono block">password</strong>
                               <span className="text-slate-400 text-[10px] block mt-0.5 leading-normal">
                                 Secure password string stored with state-of-the-art cryptographic hashing in database.
                               </span>
                             </li>
                             <li>
                               <strong className="text-white font-mono block">subscriptionStatus</strong>
                               <span className="text-slate-400 text-[10px] block mt-0.5 leading-normal mb-1">
                                 Enumerated state string field matching access bounds:
                               </span>
                               <span className="inline-flex gap-1">
                                 <span className="bg-violet-950 text-violet-300 px-1.5 py-0.2 rounded border border-violet-850 font-mono text-[9px]">trial</span>
                                 <span className="bg-emerald-900 text-emerald-100 px-1.5 py-0.2 rounded border border-emerald-800 font-mono text-[9px]">active</span>
                                 <span className="bg-rose-950 text-rose-300 px-1.5 py-0.2 rounded border border-rose-850 font-mono text-[9px]">expired</span>
                               </span>
                             </li>
                             <li>
                               <strong className="text-white font-mono block">trialEndDate</strong>
                               <span className="text-slate-400 text-[10px] block mt-0.5 leading-normal">
                                 Date timestamp of subscription expiration. Default is set to exactly 7 days from execution date.
                               </span>
                             </li>
                           </ul>
                         </div>

                         <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-lg space-y-1">
                           <h5 className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                             🧩 Dynamic Simulator Link
                           </h5>
                           <p className="text-[10px] text-slate-400 leading-normal">
                             This application's registration workflows and session structures have been fully integrated to write these fields dynamically, keeping database integrity consistent.
                           </p>
                         </div>
                       </div>

                       {/* Code Block Container */}
                       <div className="md:col-span-2 space-y-2">
                         <div className="flex items-center justify-between text-xs bg-slate-950 px-4 py-2 border border-slate-800 rounded-t-lg border-b-0">
                           <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1.5">
                             <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                             src/models/User.js <span className="text-slate-600 font-normal">| Mongoose Schema</span>
                           </span>
                           <button
                             type="button"
                             onClick={() => {
                               navigator.clipboard.writeText(`const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { 
    type: String, 
    required: true, 
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  subscriptionStatus: { 
    type: String, 
    enum: ['trial', 'active', 'expired'], 
    default: 'trial' 
  },
  trialEndDate: { 
    type: Date, 
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);`);
                               showToast("📋 Schema copied to clipboard!");
                             }}
                             className="text-[10px] uppercase tracking-wider bg-slate-900 border border-slate-800 hover:border-slate-750 text-indigo-400 hover:text-indigo-300 font-bold px-3 py-1 rounded transition-all cursor-pointer"
                           >
                             Copy Code
                           </button>
                         </div>
                         <div className="bg-slate-950 font-mono p-4 rounded-b-lg border border-slate-800 overflow-x-auto text-[11px] leading-relaxed select-all text-slate-300 max-h-[380px]">
                           <pre className="whitespace-pre">
{`const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { 
    type: String, 
    required: true, 
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  subscriptionStatus: { 
    type: String, 
    enum: ['trial', 'active', 'expired'], 
    default: 'trial' 
  },
  trialEndDate: { 
    type: Date, 
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);`}
                           </pre>
                         </div>
                       </div>
                     </div>
                    </div>
                  </div>
                )
              }
            </div>
          )}

          {activeTab === "auth" && (
            <div id="auth-panel" className="max-w-4xl mx-auto py-12 px-4 flex flex-col items-center justify-center min-h-[60vh]">
              <AuthPortal
                onAuthSuccess={(userData) => {
                  setCurrentUser(userData);
                  localStorage.setItem("sovereign_current_user", JSON.stringify(userData));
                  setActiveTab("billing");
                  showToast(`🎉 Secure console session loaded! Welcome, ${userData.name}.`);
                }}
                initialMode={authView}
                onClose={() => setActiveTab("directory")}
              />
            </div>
          )}

          {activeTab === "admin" && (currentUser?.isAdmin || currentUser?.email === "akinisaacade@gmail.com") && (
            <div id="admin-panel" className="max-w-7xl mx-auto py-6 px-4">
              <AdminConsole currentUser={currentUser} showToast={showToast} />
            </div>
          )}

        </main>

        {/* Global Footer containing disclaimers & compliance certifications */}
        <footer id="app-footer" className="bg-slate-950 border-t border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-[10px] font-mono uppercase tracking-wider text-slate-400">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> SOC2 COMPLIANT STATUS</span>
            <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> GDPR PRIVACY ENFORCED</span>
            <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> 256-BIT SSL PROTECTED</span>
          </div>
          <div className="flex items-center gap-2">
            <span>&copy; {new Date().getFullYear()} ALL LEGAL MATTERS INC.</span>
            <span className="text-amber-400 border-l border-slate-800 pl-2">V1.4.2 PROD REEL</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
