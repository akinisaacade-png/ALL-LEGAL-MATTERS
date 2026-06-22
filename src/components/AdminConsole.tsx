import React, { useState, useEffect } from "react";
import {
  Users,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Key,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  AlertCircle,
  UserCheck,
  UserX,
  CreditCard,
  Plus,
  Database
} from "lucide-react";
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { seedEuropeJurisdictions } from "../utils/europeJurisdictions";

interface AdminConsoleProps {
  currentUser: { email: string; name: string } | null;
  showToast: (msg: string) => void;
  onRefreshAll?: () => void;
}

interface UserRecord {
  email: string;
  name: string;
  password?: string;
  createdAt: string;
  isActive?: boolean;
  isAdmin?: boolean;
  trialStartDate?: string;
  trialExpirationDate?: string;
}

interface SubscriptionRecord {
  emailKey: string;
  status: string;
  planType: string;
  priceId: string;
  subscriptionId: string;
  updatedAt: string;
}

export default function AdminConsole({ currentUser, showToast, onRefreshAll }: AdminConsoleProps) {
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [subsList, setSubsList] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Quick Edit States
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editSubStatus, setEditSubStatus] = useState("trial");
  const [editSubPlan, setEditSubPlan] = useState("trial");
  const [editTrialDays, setEditTrialDays] = useState(7);

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    trialActive: 0,
    subscribers: 0,
    admins: 0,
  });

  const fetchUsersAndSubscriptions = async () => {
    setLoading(true);
    try {
      const usersCol = collection(db, "users");
      const usersSnapshot = await getDocs(usersCol);
      const tempUsers: UserRecord[] = [];
      usersSnapshot.forEach((doc) => {
        const d = doc.data();
        tempUsers.push({
          email: d.email || doc.id.replace(/_/g, "."),
          name: d.name || "N/A",
          createdAt: d.createdAt || new Date().toISOString(),
          isActive: d.isActive !== false, // default true
          isAdmin: d.isAdmin === true,
          trialStartDate: d.trialStartDate || d.createdAt,
          trialExpirationDate: d.trialExpirationDate,
        });
      });

      const subsCol = collection(db, "subscriptions");
      const subsSnapshot = await getDocs(subsCol);
      const tempSubs: SubscriptionRecord[] = [];
      subsSnapshot.forEach((doc) => {
        const d = doc.data();
        const emailKey = doc.id;
        tempSubs.push({
          emailKey,
          status: d.status || "trial",
          planType: d.planType || "trial",
          priceId: d.priceId || "",
          subscriptionId: d.subscriptionId || "",
          updatedAt: d.updatedAt || new Date().toISOString(),
        });
      });

      setUsersList(tempUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setSubsList(tempSubs);

      // Compute Stats
      const now = new Date();
      let active = 0;
      let trials = 0;
      let premiums = 0;
      let adminCount = 0;

      tempUsers.forEach((u) => {
        const uKey = u.email.replace(/\./g, "_");
        const matchingSub = tempSubs.find((s) => s.emailKey === uKey);
        
        if (u.isActive !== false) active++;
        if (u.isAdmin) adminCount++;

        if (matchingSub && matchingSub.status === "active") {
          premiums++;
        } else {
          // Check if trial is active
          const createdDate = new Date(u.createdAt);
          const diffDays = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays < 7) {
            trials++;
          }
        }
      });

      setStats({
        totalUsers: tempUsers.length,
        activeUsers: active,
        trialActive: trials,
        subscribers: premiums,
        admins: adminCount,
      });

    } catch (err) {
      console.error("Error loading admin records:", err);
      showToast("❌ Unable to sync admin lists from Firestore cluster.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndSubscriptions();
  }, []);

  const handleToggleActive = async (user: UserRecord) => {
    const userDocKey = user.email.replace(/\./g, "_");
    const newActiveState = user.isActive === false ? true : false;
    try {
      const userRef = doc(db, "users", userDocKey);
      const existingSnap = await getDoc(userRef);
      const currentData = existingSnap.exists() ? existingSnap.data() : {};
      
      const updatedData = {
        ...currentData,
        isActive: newActiveState,
        updatedAt: new Date().toISOString()
      };
      await setDoc(userRef, updatedData, { merge: true });
      showToast(`👤 User ${user.email} status set to ${newActiveState ? "ACTIVE" : "INACTIVE"}.`);
      fetchUsersAndSubscriptions();
      if (onRefreshAll) onRefreshAll();
    } catch {
      showToast("❌ Error toggling account state.");
    }
  };

  const handleToggleAdmin = async (user: UserRecord) => {
    const userDocKey = user.email.replace(/\./g, "_");
    const newAdminState = !user.isAdmin;
    try {
      const userRef = doc(db, "users", userDocKey);
      await setDoc(userRef, { isAdmin: newAdminState }, { merge: true });
      showToast(`👑 Promoted ${user.email} to ${newAdminState ? "ADMINISTRATOR" : "STANDARD MEMBER"}.`);
      fetchUsersAndSubscriptions();
      if (onRefreshAll) onRefreshAll();
    } catch {
      showToast("❌ Error upgrading account level.");
    }
  };

  const startEdit = (user: UserRecord) => {
    const userDocKey = user.email.replace(/\./g, "_");
    const matchingSub = subsList.find((s) => s.emailKey === userDocKey);

    setEditingUser(user);
    setEditName(user.name);
    setEditIsActive(user.isActive !== false);
    setEditIsAdmin(user.isAdmin === true);
    setEditSubStatus(matchingSub?.status || "trial");
    setEditSubPlan(matchingSub?.planType || "trial");
    setEditTrialDays(7);
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    const userDocKey = editingUser.email.replace(/\./g, "_");
    try {
      // 1. Update user profile details
      const userRef = doc(db, "users", userDocKey);
      const existingSnap = await getDoc(userRef);
      const baseData = existingSnap.exists() ? existingSnap.data() : {};
      
      // Compute optional custom trial adjustments if sub is set back to trial
      const customCreatedAt = new Date();
      if (editSubStatus === "trial") {
        customCreatedAt.setDate(customCreatedAt.getDate() - (7 - editTrialDays));
      }

      await setDoc(userRef, {
        ...baseData,
        name: editName,
        isActive: editIsActive,
        isAdmin: editIsAdmin,
        ...(editSubStatus === "trial" ? { createdAt: customCreatedAt.toISOString() } : {})
      }, { merge: true });

      // 2. Adjust subscription parameters
      const subRef = doc(db, "subscriptions", userDocKey);
      await setDoc(subRef, {
        status: editSubStatus,
        planType: editSubPlan,
        priceId: editSubPlan === "yearly" ? "price_1TfEPRBMbxh6jv0CKiwDzY4x" : "price_1TfEPRBMbxh6jv0CKiwDzY4y",
        subscriptionId: "sub_admin_man_" + Math.random().toString(36).substring(7),
        updatedAt: new Date().toISOString()
      });

      showToast(`✅ Profile parameters for ${editingUser.email} saved successfully!`);
      setEditingUser(null);
      fetchUsersAndSubscriptions();
      if (onRefreshAll) onRefreshAll();
    } catch (e) {
      console.error(e);
      showToast("❌ Unable to update database profiles.");
    }
  };

  const handleResetUserPassword = async (email: string) => {
    const userKey = email.replace(/\./g, "_");
    // Generate a secure custom temporary baseline plain-text password for recovery
    const tempPass = "SecureSovereign!" + Math.floor(1000 + Math.random() * 9000);
    // Secure Web Crypto SHA-256 password hash generator
    const encoder = new TextEncoder();
    const data = encoder.encode(tempPass);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedPass = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    try {
      const userRef = doc(db, "users", userKey);
      await setDoc(userRef, { password: hashedPass }, { merge: true });
      alert(`🔑 SECURITY RECOVERY PROTOCOL VERIFIED:\n\nTemporary access key generated for ${email}:\n\n➡️   ${tempPass}\n\nPlease supply this password key to the operator directly.`);
      showToast(`🔑 Temporary session token restored for ${email}.`);
      fetchUsersAndSubscriptions();
    } catch {
      showToast("❌ Password reset dispatch failed.");
    }
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header section with branding */}
      <div className="p-6 bg-slate-900 border-b border-slate-800 flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400">
            <Shield className="w-5 h-5 text-indigo-400 animate-pulse" />
            <span className="text-[10px] font-mono font-black uppercase tracking-widest bg-indigo-950 border border-indigo-505/30 px-2 py-0.5 rounded">
              Sovereign IAM Console
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-white mt-1 tracking-tight font-sans">
            Sovereign Identity Control & Administration
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Authorize new operators, audit public registrations, check trial timers, override subscriptions, and deactivate credential pools.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={async () => {
              if (window.confirm("Are you sure you want to re-seed/reset the jurisdictions_europe_core collection in Firestore?")) {
                setLoading(true);
                try {
                  await seedEuropeJurisdictions(true);
                  showToast("🇪🇺 Jurisdictions collection seeded/reset successfully!");
                } catch (e) {
                  showToast("❌ Seeding failed.");
                } finally {
                  setLoading(false);
                }
              }
            }}
            disabled={loading}
            className="px-3 py-2 bg-slate-950 border border-amber-900/60 hover:bg-slate-900 text-amber-500 hover:text-amber-400 text-xs font-bold rounded-lg flex items-center gap-2 transition"
          >
            <Database className="w-3.5 h-3.5 text-amber-500" />
            <span>Reset EU Jurisdictions</span>
          </button>

          <button
            onClick={fetchUsersAndSubscriptions}
            disabled={loading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-705 text-xs font-bold rounded-lg flex items-center gap-2 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            <span>Reload Core Cluster Lists</span>
          </button>
        </div>
      </div>

      {/* Stats Board Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 border-b border-slate-800 text-center font-mono divide-x divide-slate-805/50 bg-slate-950/40">
        <div className="py-4 px-2">
          <span className="block text-[10px] text-slate-500 uppercase font-black">Total Personnel</span>
          <span className="text-lg font-black text-white">{stats.totalUsers}</span>
        </div>
        <div className="py-4 px-2">
          <span className="block text-[10px] text-emerald-400 uppercase font-black">Active Access Pools</span>
          <span className="text-lg font-black text-emerald-400">{stats.activeUsers}</span>
        </div>
        <div className="py-4 px-2">
          <span className="block text-[10px] text-teal-400 uppercase font-black">Active Free Trials</span>
          <span className="text-lg font-black text-teal-400">{stats.trialActive}</span>
        </div>
        <div className="py-4 px-2">
          <span className="block text-[10px] text-amber-400 uppercase font-black">Active Subscribers</span>
          <span className="text-lg font-black text-amber-400">{stats.subscribers}</span>
        </div>
        <div className="py-4 px-2">
          <span className="block text-[10px] text-indigo-400 uppercase font-black text-center">Root Admins</span>
          <span className="text-lg font-black text-indigo-400">{stats.admins}</span>
        </div>
      </div>

      {/* Search Input Filter */}
      <div className="p-4 bg-slate-900/40 border-b border-slate-800 flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter personnel database or subscriptions by email name or keyword..."
          className="bg-transparent text-xs text-white placeholder-slate-500 border-none outline-none w-full"
        />
      </div>

      {/* Master editing overlay / editor card */}
      {editingUser && (
        <div className="p-6 bg-slate-900/90 border-b border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
          <div>
            <h3 className="text-xs font-mono uppercase font-black text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> Editing IAM Record: <strong className="text-white text-xs">{editingUser.email}</strong>
            </h3>
            
            <div className="mt-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Operator Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded text-white"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="rounded text-indigo-600 bg-slate-950 border-slate-800"
                  />
                  <span>Account Active (Allow Login)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={editIsAdmin}
                    onChange={(e) => setEditIsAdmin(e.target.checked)}
                    className="rounded text-indigo-600 bg-slate-950 border-slate-800"
                  />
                  <span>System Administrator (Console Access)</span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-mono uppercase font-black text-indigo-400">Subscription Overrides</h3>
            
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">License Type</label>
                  <select
                    value={editSubPlan}
                    onChange={(e) => {
                      setEditSubPlan(e.target.value);
                      if (e.target.value === "trial") setEditSubStatus("trial");
                      else setEditSubStatus("active");
                    }}
                    className="w-full bg-slate-955 bg-slate-950 border border-slate-800 text-xs px-2 py-2 rounded text-white"
                  >
                    <option value="trial">Free Trial Space</option>
                    <option value="monthly">Monthly Pro</option>
                    <option value="yearly">AnnualElite Unlimited</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Status State</label>
                  <select
                    value={editSubStatus}
                    onChange={(e) => setEditSubStatus(e.target.value)}
                    className="w-full bg-slate-955 bg-slate-950 border border-slate-800 text-xs px-2 py-2 rounded text-white font-mono"
                  >
                    <option value="trial">TRIAL ACTIVE</option>
                    <option value="active">ACTIVE PAID</option>
                    <option value="canceled">CANCELED</option>
                    <option value="expired">EXPIRED</option>
                  </select>
                </div>
              </div>

              {editSubStatus === "trial" && (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">
                    Force Trial Remaining Days (Calculates backward from now)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="7"
                    value={editTrialDays}
                    onChange={(e) => setEditTrialDays(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-1.5 rounded text-white font-mono"
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded hover:bg-slate-700 font-sans"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-black rounded hover:bg-indigo-500 font-sans"
                >
                  Save Profile Parameter Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main personnel directories Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900 text-[10px] uppercase font-mono tracking-wider text-slate-400 border-b border-slate-850">
            <tr>
              <th className="py-3 px-4">Operator Info</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Level / Role</th>
              <th className="py-3 px-4">Trial / Subscription Status</th>
              <th className="py-3 px-4 text-right">Administrative Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500 font-mono">
                  ⚠️ No records matching query found in local directories index.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const uKey = u.email.replace(/\./g, "_");
                const matchingSub = subsList.find((s) => s.emailKey === uKey);
                
                // Calculate actual trial status of user
                const createdDate = new Date(u.createdAt);
                const diffDays = (new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
                const daysLeft = Math.max(0, 7 - diffDays);
                const isTrialActive = diffDays < 7;
                
                const isUserActive = u.isActive !== false;
                const isUserAdmin = u.isAdmin === true;

                return (
                  <tr key={u.email} className="hover:bg-slate-900/30 transition-all font-mono">
                    <td className="py-4 px-4">
                      <div>
                        <span className="block text-white font-extrabold text-xs font-sans">{u.name}</span>
                        <span className="block text-slate-400 text-[11px] mt-0.5">{u.email}</span>
                        <span className="block text-[9px] text-slate-600 mt-1">
                          Enrolled: {new Date(u.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(u)}
                        title="Click to toggle status flag"
                        className={`inline-flex items-center gap-1 text-[10px] uppercase font-black px-2 py-1 rounded border ${
                          isUserActive
                            ? "bg-emerald-950/50 text-emerald-400 border-emerald-500/20 hover:bg-emerald-900/40"
                            : "bg-rose-950/50 text-rose-300 border-rose-500/20 hover:bg-rose-900/40"
                        }`}
                      >
                        {isUserActive ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            Active
                          </>
                        ) : (
                          <>
                            <UserX className="w-3.5 h-3.5" />
                            Suspended
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleToggleAdmin(u)}
                        title="Click to toggle root authority"
                        className={`inline-flex items-center gap-1 text-[10px] uppercase font-black px-2 py-1 rounded border-2 ${
                          isUserAdmin
                            ? "bg-indigo-950 text-indigo-300 border-indigo-500/40 hover:bg-indigo-900"
                            : "bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {isUserAdmin ? "Admin" : "Member"}
                      </button>
                    </td>

                    <td className="py-4 px-4">
                      {matchingSub && matchingSub.status === "active" ? (
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-amber-400 shrink-0" />
                          <div>
                            <span className="block text-amber-300 text-[10px] font-extrabold uppercase">
                              Active {matchingSub.planType === "yearly" ? "Annual Elite" : "Monthly Pro"}
                            </span>
                            <span className="block text-[9px] text-slate-500">
                              UID: {matchingSub.subscriptionId.substring(0, 15)}...
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-1">
                            <Clock className={`w-3.5 h-3.5 ${isTrialActive ? "text-indigo-400" : "text-rose-500"}`} />
                            <span className={`text-[10px] font-black ${isTrialActive ? "text-indigo-300" : "text-rose-400"}`}>
                              {isTrialActive ? `Free Trial Active (${Math.ceil(daysLeft)} Days remaining)` : "Free Trial Expired"}
                            </span>
                          </div>
                          {!isTrialActive && !u.isAdmin && (
                            <span className="block text-[10px] text-rose-500 mt-0.5 bg-rose-955 bg-rose-950/20 px-1 py-0.5 rounded w-max">
                              ⚠️ ACCESS BLOCKED / RESTRICTED
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => startEdit(u)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-705 border border-slate-700 text-indigo-300 rounded font-sans text-[11px] font-bold transition flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3 text-indigo-400" />
                          Override Details
                        </button>
                        
                        <button
                          onClick={() => handleResetUserPassword(u.email)}
                          className="px-2.5 py-1.5 bg-teal-950/30 hover:bg-teal-900 border border-teal-500/20 text-teal-300 rounded font-sans text-[11px] font-black transition flex items-center gap-1"
                          title="Generate a temporary password bypass"
                        >
                          <Key className="w-3 h-3 text-teal-400" />
                          Reset Acc
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
