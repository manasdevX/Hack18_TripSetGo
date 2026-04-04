"use client";
import { useState, useMemo, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAuthStore } from "../../../store/authStore";
import api from "../../../lib/api";
import {
  Receipt, Users, Plus, ArrowUpRight, ArrowDownRight, Coffee, Car, Home, X,
  Ticket, CheckCircle2, DollarSign, TrendingUp, Edit3, Trash2, User,
  AlertCircle, Search, BarChart3, Handshake, Mail, Trash,
  ChevronRight, Wallet, History as HistoryIcon, PieChart, UserPlus, Settings, Loader2
} from "lucide-react";

export default function ExpensesPage() {
  // ===== 1. AUTH & USER CONTEXT =====
  const { user: authUser } = useAuthStore();
  // currentUserId is the User.id UUID from the JWT — used to match GroupMember.user_id
  const currentUserId = authUser?.id || null;
  const currentUserName = authUser?.full_name || "User";
  const currentUserEmail = authUser?.email || "";

  const [activeTab, setActiveTab] = useState("overview");

  const [groups, setGroups] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);

  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settlementInProgress, setSettlementInProgress] = useState(null); // Track which settlement is being settled
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  
  const [selectedGroup, setSelectedGroup] = useState(groups[0]?.id || null);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  
  // Form States
  const [newExpense, setNewExpense] = useState({ title: "", amount: "", paidBy: "", category: "food", splitType: "equal", customSplits: {} });
  const [newGroup, setNewGroup] = useState({ name: "", currency: "INR", currencySymbol: "₹" });
  const [newMember, setNewMember] = useState({ name: "", email: "" });
  const [recordPayment, setRecordPayment] = useState({ from: "", to: "", amount: "" });
  const [memberError, setMemberError] = useState("");
  const [customSplitError, setCustomSplitError] = useState("");
  const [expenseSearchQuery, setExpenseSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    const fetchMyGroups = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/groups');
        // Backend returns all groups where current user is a GroupMember (shared visibility)
        const fetchedGroups = res.data?.groups || res.data || [];
        setGroups(fetchedGroups);

        // Flatten all expenses and settlements from every group the user belongs to
        let allExpenses = [];
        let allSettlements = [];
        fetchedGroups.forEach(g => {
          if (Array.isArray(g.expenses)) {
            allExpenses = [...allExpenses, ...g.expenses];
          }
          if (Array.isArray(g.settlements)) {
            allSettlements = [...allSettlements, ...g.settlements];
          }
        });
        setExpenses(allExpenses);
        setSettlements(allSettlements);

        // Auto-select the first group only if nothing is selected yet
        // (preserves selection across re-fetches so the view doesn't jump)
        setSelectedGroup(prev => {
          if (prev && fetchedGroups.some(g => g.id === prev)) return prev;
          return fetchedGroups[0]?.id || null;
        });
      } catch (err) {
        console.error("Failed to fetch groups:", err);
        alert(err?.response?.data?.detail || "Failed to load groups. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchMyGroups();
  }, []);


  const currentGroup = useMemo(() => groups.find((g) => g.id === selectedGroup), [groups, selectedGroup]);
  const groupExpenses = useMemo(() => expenses.filter((e) => e.groupId === selectedGroup || e.group_id === selectedGroup), [expenses, selectedGroup]);

  // ===== 2. FINANCIAL MATH ENGINE (CRITICAL) =====
  const balances = useMemo(() => {
    const res = {};
    if (!currentGroup) return res;
    
    // Initialize all members with 0 balance
    currentGroup.members.forEach(m => {
      res[m.id] = 0;
    });

    // Process expenses: (Amount Paid) - (User's share of split)
    groupExpenses.forEach(exp => {
      const paidBy = exp.paidBy || exp.paid_by;
      const amount = parseFloat(exp.amount) || 0;
      
      // Ensure paidBy member exists in balance object
      if (!res.hasOwnProperty(paidBy)) {
        res[paidBy] = 0;
      }
      
      // Creditor: person who paid
      res[paidBy] = parseFloat((parseFloat(res[paidBy] || 0) + amount).toFixed(2));
      
      // Debtors: split shares
      Object.entries(exp.splits || {}).forEach(([uid, amt]) => {
        if (!res.hasOwnProperty(uid)) {
          res[uid] = 0;
        }
        const splitAmount = parseFloat(amt) || 0;
        res[uid] = parseFloat((parseFloat(res[uid] || 0) - splitAmount).toFixed(2));
      });
    });

    // Process settlements: from_member pays to_member to reduce debt
    // After settlement: from_member's balance increases (they owe less)
    //                  to_member's balance decreases (they receive payment)
    settlements.filter(s => s.groupId === selectedGroup || s.group_id === selectedGroup).forEach(s => {
      const fromMember = s.from_member || s.from;
      const toMember = s.to_member || s.to;
      const settleAmount = parseFloat(s.amount) || 0;
      
      // Ensure both members exist in balance object
      if (!res.hasOwnProperty(fromMember)) {
        res[fromMember] = 0;
      }
      if (!res.hasOwnProperty(toMember)) {
        res[toMember] = 0;
      }
      
      // from_member paid money, so they owe less: balance INCREASES (moves toward zero if negative)
      res[fromMember] = parseFloat((parseFloat(res[fromMember] || 0) + settleAmount).toFixed(2));
      
      // to_member received money, so they are owed less: balance DECREASES (moves toward zero if positive)
      res[toMember] = parseFloat((parseFloat(res[toMember] || 0) - settleAmount).toFixed(2));
    });

    // Convert all values to floats (toFixed returns strings)
    Object.keys(res).forEach(id => {
      res[id] = parseFloat(res[id]);
    });

    return res;
  }, [selectedGroup, expenses, settlements, currentGroup]);

  const simplifiedDebts = useMemo(() => {
    const debts = [];
    const b = { ...balances };
    // Floating-point safe: use 0.01 tolerance for comparisons
    const creditors = Object.entries(b).filter(x => x[1] > 0.01).sort((a, b) => b[1] - a[1]);
    const debtors = Object.entries(b).filter(x => x[1] < -0.01).sort((a, b) => a[1] - b[1]);

    let i = 0, j = 0;
    while (i < creditors.length && j < debtors.length) {
      const amt = Math.min(creditors[i][1], Math.abs(debtors[j][1]));
      debts.push({ from: debtors[j][0], to: creditors[i][0], amount: parseFloat(amt.toFixed(2)) });
      creditors[i][1] -= amt;
      debtors[j][1] += amt;
      if (creditors[i][1] < 0.01) i++;
      if (debtors[j][1] > -0.01) j++;
    }
    return debts;
  }, [balances]);

  const categoryBreakdown = useMemo(() => {
    const stats = { food: 0, transport: 0, accommodation: 0, activities: 0, other: 0 };
    groupExpenses.forEach(e => { if (stats[e.category] !== undefined) stats[e.category] += e.amount; });
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    return { stats, total };
  }, [groupExpenses]);

  const filteredExpenses = useMemo(() => {
    return groupExpenses.filter(e => {
      const matchesSearch = e.title.toLowerCase().includes(expenseSearchQuery.toLowerCase());
      const matchesCat = selectedCategory === "all" || e.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [groupExpenses, expenseSearchQuery, selectedCategory]);

  // ===== 4. HANDLERS =====
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    const amount = parseFloat(newExpense.amount);
    if (!newExpense.title || isNaN(amount) || amount <= 0) {
      setCustomSplitError("Please enter a valid amount.");
      return;
    }

    let splits = {};
    if (newExpense.splitType === "equal") {
      const perPerson = amount / currentGroup.members.length;
      currentGroup.members.forEach(m => splits[m.id] = parseFloat(perPerson.toFixed(2)));
    } else {
      splits = newExpense.customSplits;
      const sum = Object.values(splits).reduce((a, b) => a + (parseFloat(b) || 0), 0);
      if (Math.abs(sum - amount) > 0.01) {
        setCustomSplitError(`Total must equal ${currentGroup?.currencySymbol}${amount.toFixed(2)}`);
        return;
      }
    }

    const payload = {
      title: newExpense.title,
      amount,
      paid_by: newExpense.paidBy || currentGroup.members[0]?.id,
      category: newExpense.category,
      split_type: newExpense.splitType,
      splits,
      group_id: selectedGroup,
      expense_type: "regular"
    };

    try {
      setIsSubmitting(true);
      
      if (editingExpenseId) {
        const res = await api.put(`/expenses/${editingExpenseId}`, payload);
        const updatedExp = res.data?.expense || res.data;
        const finalExp = updatedExp.id ? updatedExp : { ...payload, id: editingExpenseId, groupId: selectedGroup, date: new Date().toISOString().split("T")[0], paidByName: currentGroup.members.find(m => m.id === newExpense.paidBy)?.name || "Unknown" };
        setExpenses(expenses.map(e => e.id === editingExpenseId ? finalExp : e));
      } else {
        const res = await api.post(`/groups/${selectedGroup}/expenses`, payload);
        const newExp = res.data?.expense || res.data;
        const finalExp = newExp.id ? newExp : { ...payload, id: uuidv4(), groupId: selectedGroup, date: new Date().toISOString().split("T")[0], paidByName: currentGroup.members.find(m => m.id === newExpense.paidBy)?.name || "Unknown" };
        setExpenses([finalExp, ...expenses]);
      }
      closeExpenseModal();
    } catch (err) {
      console.error("Failed to save expense:", err);
      alert(err?.response?.data?.detail || "Failed to save expense. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const smartSettleClick = async (debt) => {
    if (settlementInProgress) return; // Prevent multiple simultaneous settle operations
    
    try {
      setSettlementInProgress(`${debt.from}-${debt.to}`); // Track this specific settlement
      
      const payload = { from_member: debt.from, to_member: debt.to, amount: debt.amount, method: "smart-settle", group_id: selectedGroup };
      const res = await api.post(`/groups/${selectedGroup}/settlements`, payload);
      const settleObj = res.data?.settlement || res.data;
      
      // Ensure settlement object has all required fields
      const finalObj = {
        id: settleObj.id || uuidv4(),
        group_id: settleObj.group_id || selectedGroup,
        groupId: settleObj.group_id || selectedGroup, // Keep both for compatibility
        from_member: settleObj.from_member || debt.from,
        to_member: settleObj.to_member || debt.to,
        amount: parseFloat(settleObj.amount || debt.amount),
        method: settleObj.method || "smart-settle",
        status: settleObj.status || "completed",
        created_at: settleObj.created_at || new Date().toISOString(),
      };
      
      setSettlements([...settlements, finalObj]);
    } catch (err) {
      console.error("Failed to record smart settlement:", err);
      alert(err?.response?.data?.detail || "Failed to record settlement. Please try again.");
    } finally {
      setSettlementInProgress(null); // Clear the settlement in progress
    }
  };

  const handleRecordPayment = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    
    const amt = parseFloat(recordPayment.amount);
    if (!recordPayment.from || !recordPayment.to || isNaN(amt) || amt <= 0) {
      alert("Please fill in all fields with a valid amount.");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const payload = { from_member: recordPayment.from, to_member: recordPayment.to, amount: amt, method: "manual", group_id: selectedGroup };
      const res = await api.post(`/groups/${selectedGroup}/settlements`, payload);
      const settleObj = res.data?.settlement || res.data;
      
      // Ensure settlement object has all required fields
      const finalObj = {
        id: settleObj.id || uuidv4(),
        group_id: settleObj.group_id || selectedGroup,
        groupId: settleObj.group_id || selectedGroup, // Keep both for compatibility
        from_member: settleObj.from_member || recordPayment.from,
        to_member: settleObj.to_member || recordPayment.to,
        amount: parseFloat(settleObj.amount || amt),
        method: settleObj.method || "manual",
        status: settleObj.status || "completed",
        created_at: settleObj.created_at || new Date().toISOString(),
      };
      
      setSettlements([...settlements, finalObj]);
      setShowRecordPaymentModal(false);
      setRecordPayment({ from: "", to: "", amount: "" }); // ✅ CRITICAL: Clear form state
    } catch (err) {
      console.error("Failed to record manual settlement:", err);
      alert(err?.response?.data?.detail || "Failed to record settlement. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddGroup = async (e) => {
    e.preventDefault();
    if (isSubmitting || !newGroup.name) return;
    
    try {
      setIsSubmitting(true);
      
      const payload = { name: newGroup.name, currency: newGroup.currency, currencySymbol: newGroup.currencySymbol };
      const res = await api.post("/groups", payload);
      const gObj = res.data?.group || res.data;
      const finalObj = gObj.id ? gObj : { id: uuidv4(), ...payload, members: [{ id: currentUserId, name: currentUserName, email: currentUserEmail }], createdAt: new Date().toISOString().split("T")[0] };
      
      setGroups([...groups, finalObj]);
      setSelectedGroup(finalObj.id);
      setShowAddGroupModal(false);
      setNewGroup({ name: "", currency: "INR", currencySymbol: "₹" });
    } catch (err) {
      console.error("Failed to add group:", err);
      alert(err?.response?.data?.detail || "Failed to create group. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditGroup = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      
      const payload = { name: newGroup.name, currency: newGroup.currency, currencySymbol: newGroup.currencySymbol };
      await api.put(`/groups/${selectedGroup}`, payload);
      setGroups(groups.map(g => g.id === selectedGroup ? { ...g, ...payload } : g));
      setShowEditGroupModal(false);
    } catch (err) {
      console.error("Failed to edit group:", err);
      alert(err?.response?.data?.detail || "Failed to update group. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      
      await api.delete(`/groups/${selectedGroup}`);
      const newGroups = groups.filter(g => g.id !== selectedGroup);
      setGroups(newGroups);
      setExpenses(expenses.filter(e => e.groupId !== selectedGroup && e.group_id !== selectedGroup));
      setSettlements(settlements.filter(s => s.groupId !== selectedGroup && s.group_id !== selectedGroup));
      setSelectedGroup(newGroups[0]?.id || null);
      setShowDeleteGroupModal(false);
    } catch (err) {
      console.error("Failed to delete group:", err);
      alert(err?.response?.data?.detail || "Failed to delete group. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (isSubmitting || !newMember.email) return;
    
    try {
      setIsSubmitting(true);
      setMemberError("");
      
      // Step 1: Verify user exists on backend
      const verifyRes = await api.get(`/users/verify/${newMember.email}`);
      const userData = verifyRes.data?.user || verifyRes.data;
      
      if (!userData || !userData.id) {
        setMemberError("User not found on TripSetGo.");
        setIsSubmitting(false);
        return;
      }
      
      // Step 2: Add member to group via API and get the actual created member record
      const addMemberRes = await api.post(`/groups/${selectedGroup}/members`, { 
        name: userData.name || userData.full_name || newMember.name || "Unknown User", 
        email: userData.email || newMember.email, 
        user_id: userData.id 
      });
      
      // Use the actual response data (contains the real member ID created by backend)
      const groupResponse = addMemberRes.data?.group || addMemberRes.data;
      if (groupResponse) {
        setGroups(groups.map(g => g.id === selectedGroup ? groupResponse : g));
      }
      
      setNewMember({ name: "", email: "" });
      setShowAddMemberModal(false);
    } catch (err) {
      console.error("Failed to add member:", err);
      setMemberError(err?.response?.data?.detail || "User not found on TripSetGo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeMember = async (memberId) => {
    // Guard: prevent removing yourself — compare GroupMember.id against the member we found for current user
    if (isSubmitting || memberId === currentUserMemberId) return;
    if (Math.abs(balances[memberId] || 0) > 0.01) {
      alert("Member balance must be zero to remove them.");
      return;
    }
    try {
      setIsSubmitting(true);
      
      await api.delete(`/groups/${selectedGroup}/members/${memberId}`);
      setGroups(groups.map(g => g.id === selectedGroup ? { ...g, members: g.members.filter(m => m.id !== memberId) } : g));
    } catch (err) {
      console.error("Failed to remove member:", err);
      alert(err?.response?.data?.detail || "Failed to remove member. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeExpenseModal = () => {
    setShowAddExpenseModal(false);
    setEditingExpenseId(null);
    setCustomSplitError("");
    setNewExpense({ title: "", amount: "", paidBy: currentGroup?.members[0]?.id || "", category: "food", splitType: "equal", customSplits: {} });
  };

  // ===== 5. HELPERS =====
  const formatCurrency = (amt) => `${currentGroup?.currencySymbol || "₹"}${Math.abs(amt).toFixed(2)}`;
  const getMemberName = (id) => currentGroup?.members.find(m => m.id === id)?.name || "Unknown";
  const getCatIcon = (cat) => {
    switch (cat) {
      case "food": return <Coffee className="w-5 h-5" />;
      case "transport": return <Car className="w-5 h-5" />;
      case "accommodation": return <Home className="w-5 h-5" />;
      case "activities": return <Ticket className="w-5 h-5" />;
      default: return <DollarSign className="w-5 h-5" />;
    }
  };

  // Find the GroupMember row that belongs to the currently logged-in user.
  // We match by user_id (the User.id UUID stored on GroupMember) — NOT by email.
  // This is robust: works for User A, User B, or any shared group member.
  const currentUserMemberId = currentGroup?.members?.find(
    m => m.user_id === currentUserId
  )?.id;
  const userBalance = currentUserMemberId ? (balances[currentUserMemberId] || 0) : 0;

  // ===== 6. RENDER =====
  if (isLoading) {
     return <div className="min-h-screen flex items-center justify-center font-black animate-pulse text-indigo-600 tracking-widest uppercase">Loading Data...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-700 pb-32">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6">
        <div>
          <h1 className="text-6xl font-black text-main-pure tracking-tighter lowercase">SplitCosts<span className="text-[var(--accent-primary)]">.</span></h1>
          <p className="text-muted-pure font-bold mt-2 tracking-tight">Precision financial tracking for travel groups.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowAddGroupModal(true)} disabled={isSubmitting} className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? <>
              <Loader2 className="w-5 h-5 animate-spin" /> Creating...
            </> : <>
              <Plus className="w-5 h-5" /> New Group
            </>}
          </button>
          <button onClick={() => setShowRecordPaymentModal(true)} disabled={isSubmitting} className="flex items-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? <>
              <Loader2 className="w-5 h-5 animate-spin" /> Processing...
            </> : <>
              <Handshake className="w-5 h-5" /> Settle
            </>}
          </button>
          <button onClick={() => setShowAddExpenseModal(true)} disabled={isSubmitting} className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? <>
              <Loader2 className="w-5 h-5 animate-spin" /> Adding...
            </> : <>
              <Plus className="w-5 h-5" /> Add Expense
            </>}
          </button>
        </div>
      </div>

      {/* GROUP NAVIGATOR */}
      <div className="flex gap-4 mb-10 overflow-x-auto pb-4 no-scrollbar">
        {groups.length > 0 ? groups.map(g => (
          <button key={g.id} onClick={() => setSelectedGroup(g.id)} className={`px-8 py-4 rounded-2xl font-black transition-all whitespace-nowrap ${selectedGroup === g.id ? 'bg-[var(--accent-primary)] text-white shadow-lg scale-105' : 'card-pure text-muted-pure border border-pure hover:bg-secondary-pure'}`}>
            {g.name}
          </button>
        )) : (
            <div className="w-full p-8 card-pure border-2 border-dashed border-pure rounded-[32px] text-center">
                <Users size={32} className="mx-auto text-muted-pure mb-2 opacity-30" />
                <p className="text-muted-pure font-black uppercase tracking-widest text-[10px]">Create your first group to begin</p>
            </div>
        )}
      </div>

      {/* TABS */}
      <div className="flex gap-10 border-b border-pure mb-10 overflow-x-auto no-scrollbar">
        {['overview', 'expenses', 'settlements', 'members'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`pb-6 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === t ? 'text-[var(--accent-primary)]' : 'text-muted-pure'}`}>
            {t}
            {activeTab === t && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--accent-primary)] rounded-full animate-in slide-in-from-left duration-300" />}
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === 'overview' && currentGroup && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* POSITION CARD */}
          <div className="lg:col-span-4 bg-slate-900 p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[350px]">
            <div className="relative z-10">
              <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-4">Your Position</p>
              <h2 className={`text-6xl font-black tracking-tighter ${userBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {userBalance >= 0 ? '+' : '-'}{formatCurrency(userBalance)}
              </h2>
              <p className="text-slate-400 font-bold mt-6 leading-tight">Net balance for <span className="text-white">{currentUserName}</span>.</p>
            </div>
            <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12">
                <PieChart size={240} />
            </div>
          </div>

          {/* MEMBERS CARD */}
          <div className="lg:col-span-8 card-pure p-10 rounded-[48px] border border-pure shadow-sm">
            <h3 className="text-2xl font-black text-main-pure mb-10 flex items-center gap-3"><Users className="text-[var(--accent-primary)]" /> Members</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentGroup.members.map(m => (
                <div key={m.id} className="p-8 bg-secondary-pure rounded-[32px] border-2 border-transparent hover:border-[var(--accent-soft)] transition-all group">
                   <p className="text-[10px] font-black text-muted-pure uppercase tracking-widest mb-1">{m.name}</p>
                   <p className={`text-3xl font-black ${balances[m.id] >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                     {balances[m.id] >= 0 ? '+' : '-'}{formatCurrency(balances[m.id])}
                   </p>
                </div>
              ))}
            </div>
          </div>

          {/* SMART SETTLE */}
          <div className="lg:col-span-5 bg-emerald-50 dark:bg-emerald-950/30 p-10 rounded-[48px] border border-emerald-100 dark:border-emerald-900 relative overflow-hidden">
             <h3 className="text-2xl font-black text-emerald-900 dark:text-emerald-300 mb-8 flex items-center gap-3"><TrendingUp /> Smart Settlement</h3>
             <div className="space-y-4">
                {simplifiedDebts.length > 0 ? simplifiedDebts.map((d, i) => (
                  <div key={i} className="p-6 card-pure rounded-[32px] shadow-sm flex justify-between items-center group transition-all hover:scale-[1.02] border border-pure">
                    <div>
                      <p className="text-[10px] font-black text-muted-pure uppercase tracking-widest mb-1">{getMemberName(d.from)} pays</p>
                      <p className="font-black text-main-pure text-lg">{getMemberName(d.to)}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-2xl font-black text-emerald-600 mb-2">{formatCurrency(d.amount)}</p>
                       <button onClick={() => smartSettleClick(d)} disabled={settlementInProgress === `${d.from}-${d.to}`} className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1">
                        {settlementInProgress === `${d.from}-${d.to}` ? <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Settling...
                        </> : "Confirm"}
                       </button>
                    </div>
                  </div>
                )) : (
                    <div className="text-center py-20 opacity-40">
                        <CheckCircle2 size={48} className="mx-auto text-emerald-600 mb-4" />
                        <p className="font-black uppercase tracking-widest text-muted-pure text-xs">Everything Settled</p>
                    </div>
                )}
             </div>
          </div>

          {/* CATEGORIES */}
          <div className="lg:col-span-7 card-pure p-10 rounded-[48px] border border-pure shadow-sm">
             <h3 className="text-2xl font-black text-main-pure mb-10 flex items-center gap-3"><PieChart className="text-[var(--accent-primary)]" /> Category Spend</h3>
             <div className="space-y-6">
                {Object.entries(categoryBreakdown.stats).map(([cat, val]) => (
                  <div key={cat} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <p className="text-xs font-black uppercase tracking-widest text-muted-pure flex items-center gap-2">
                        {getCatIcon(cat)} {cat}
                      </p>
                      <p className="font-black text-main-pure">{formatCurrency(val)}</p>
                    </div>
                    <div className="h-3 w-full bg-secondary-pure rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--accent-primary)] transition-all duration-1000" style={{ width: `${categoryBreakdown.total > 0 ? (val / categoryBreakdown.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* ===== EXPENSES TAB ===== */}
      {activeTab === 'expenses' && (
        <div className="space-y-8">
          <div className="card-pure p-6 rounded-[32px] border border-pure">
             <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-pure" size={20} />
                <input value={expenseSearchQuery} onChange={e => setExpenseSearchQuery(e.target.value)} placeholder="Filter expenses..." className="input-pure w-full pl-12 pr-6 py-4 rounded-2xl font-bold" />
             </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {filteredExpenses.length > 0 ? filteredExpenses.map(exp => (
              <div key={exp.id} className="card-pure p-8 rounded-[40px] border border-pure flex justify-between items-center group transition-all hover:shadow-xl">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[24px] bg-[var(--accent-soft)] text-[var(--accent-primary)] flex items-center justify-center">{getCatIcon(exp.category)}</div>
                  <div>
                    <h4 className="text-xl font-black text-main-pure tracking-tight">{exp.title}</h4>
                    <p className="text-muted-pure font-bold text-sm uppercase tracking-widest text-[10px]">{getMemberName(exp.paidBy || exp.paid_by)} • {exp.date || (exp.created_at && exp.created_at.split('T')[0])}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                   <p className="text-3xl font-black text-main-pure">{formatCurrency(exp.amount)}</p>
                   <div className="flex gap-2">
                      <button onClick={() => { setEditingExpenseId(exp.id); setNewExpense({...exp, amount: exp.amount.toString(), paidBy: exp.paidBy || exp.paid_by, splitType: exp.splitType || exp.split_type}); setShowAddExpenseModal(true); }} disabled={isSubmitting} className="p-3 bg-secondary-pure rounded-xl text-muted-pure hover:text-[var(--accent-primary)] disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Edit3 size={18} />}
                      </button>
                      <button onClick={async () => {
                         if (isSubmitting) return;
                         try {
                           setIsSubmitting(true);
                           await api.delete(`/expenses/${exp.id}`);
                           setExpenses(expenses.filter(e => e.id !== exp.id));
                         } catch (err) { 
                           console.error(err);
                           alert(err?.response?.data?.detail || "Failed to delete expense. Please try again.");
                         } finally {
                           setIsSubmitting(false);
                         }
                      }} disabled={isSubmitting} className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                      </button>
                   </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-40 bg-white rounded-[48px] border-2 border-dashed border-slate-100">
                <Receipt size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="font-black text-slate-300 uppercase tracking-widest text-xs">Nothing to show</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== SETTLEMENTS TAB ===== */}
      {activeTab === 'settlements' && (
        <div className="grid grid-cols-1 gap-4">
          {settlements.filter(s => s.groupId === selectedGroup || s.group_id === selectedGroup).length > 0 ? settlements.filter(s => s.groupId === selectedGroup || s.group_id === selectedGroup).map(s => (
            <div key={s.id} className="card-pure p-8 rounded-[40px] border border-pure flex justify-between items-center group transition-all">
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[24px] bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><Handshake size={32} /></div>
                  <div>
                    <h4 className="text-xl font-black text-main-pure tracking-tight">{getMemberName(s.from || s.from_member)} paid {getMemberName(s.to || s.to_member)}</h4>
                    <p className="text-muted-pure font-bold text-sm uppercase tracking-widest text-[10px]">{s.date || (s.created_at && s.created_at.split('T')[0])} • {s.method}</p>
                  </div>
               </div>
               <div className="flex items-center gap-6">
                  <p className="text-3xl font-black text-emerald-600">{formatCurrency(s.amount)}</p>
                  <button onClick={async () => {
                    if (isSubmitting) return;
                    try {
                      setIsSubmitting(true);
                      await api.delete(`/settlements/${s.id}`);
                      setSettlements(settlements.filter(item => item.id !== s.id));
                    } catch (err) {
                      console.error(err);
                      alert(err?.response?.data?.detail || "Failed to delete settlement. Please try again.");
                    } finally {
                      setIsSubmitting(false);
                    }
                  }} disabled={isSubmitting} className="p-3 text-muted-pure hover:text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18}/>}
                  </button>
               </div>
            </div>
          )) : (
            <div className="text-center py-40 card-pure rounded-[48px] border-2 border-dashed border-pure">
                <HistoryIcon size={48} className="mx-auto text-muted-pure mb-4 opacity-30" />
                <p className="font-black text-muted-pure uppercase tracking-widest text-xs">No records found</p>
            </div>
          )}
        </div>
      )}

      {/* ===== MEMBERS TAB ===== */}
      {activeTab === 'members' && currentGroup && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <div className="lg:col-span-8 card-pure p-10 rounded-[48px] border border-pure shadow-sm">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black text-main-pure flex items-center gap-3"><Users className="text-[var(--accent-primary)]" /> Members</h3>
                <button onClick={() => setShowAddMemberModal(true)} disabled={isSubmitting} className="flex items-center gap-2 px-6 py-3 bg-[var(--accent-soft)] text-[var(--accent-primary)] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[var(--accent-primary)] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSubmitting ? <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Adding...
                  </> : <>
                    <UserPlus size={18} /> Add Member
                  </>}
                </button>
              </div>
              <div className="space-y-4">
                {currentGroup.members.map(m => (
                  <div key={m.id} className="p-6 bg-secondary-pure rounded-3xl flex justify-between items-center group transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 card-pure rounded-2xl flex items-center justify-center font-black text-[var(--accent-primary)] shadow-sm border border-pure">{m.name.charAt(0)}</div>
                      <div>
                        <p className="font-black text-main-pure">{m.name} {m.user_id === currentUserId && <span className="text-[var(--accent-primary)] text-xs">· You</span>}</p>
                        <p className="text-xs font-bold text-muted-pure">{m.email}</p>
                      </div>
                    </div>
                    {m.user_id !== currentUserId && (
                      <button onClick={() => removeMember(m.id)} disabled={isSubmitting} className="p-3 text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all disabled:cursor-not-allowed">
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 size={18} />}
                      </button>
                    )}
                  </div>
                ))}
              </div>
           </div>
           <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900 p-10 rounded-[48px] text-white relative overflow-hidden shadow-2xl">
                <Settings className="absolute -right-6 -top-6 w-32 h-32 text-white/5" />
                <h3 className="text-xl font-black mb-8 relative z-10">Group Settings</h3>
                <div className="space-y-4 relative z-10">
                  <button onClick={() => { setNewGroup({...currentGroup}); setShowEditGroupModal(true); }} disabled={isSubmitting} className="w-full p-6 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between hover:bg-white/10 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSubmitting ? <>
                      Edit Details <Loader2 size={18} className="text-indigo-400 animate-spin" />
                    </> : <>
                      Edit Details <ChevronRight size={18} className="text-indigo-400" />
                    </>}
                  </button>
                  <button onClick={() => setShowDeleteGroupModal(true)} disabled={isSubmitting} className="w-full p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-center justify-between hover:bg-rose-500/20 text-rose-400 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSubmitting ? <>
                      Delete Group <Loader2 size={18} className="animate-spin" />
                    </> : <>
                      Delete Group <Trash2 size={18} />
                    </>}
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* ===== ALL MODALS ===== */}

      {/* ADD MEMBER */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="card-pure w-full max-w-md rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-main-pure">Add Member</h3>
                <button onClick={() => setShowAddMemberModal(false)} className="p-3 bg-secondary-pure rounded-full transition-all hover:rotate-90"><X className="text-main-pure" /></button>
             </div>
             <form onSubmit={handleAddMember} className="space-y-6">
                <input required value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} placeholder="Full Name" className="input-pure w-full p-5 rounded-2xl font-bold" />
                <input required type="email" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} placeholder="Email Address" className="input-pure w-full p-5 rounded-2xl font-bold" />
                {memberError && <p className="text-rose-500 text-sm font-bold ml-1">{memberError}</p>}
                <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-[var(--accent-primary)] text-white rounded-[32px] font-black text-xl hover:bg-[var(--accent-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isSubmitting ? <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Adding...
                  </> : "Add to Group"}
                </button>
             </form>
          </div>
        </div>
      )}

      {/* RECORD SETTLEMENT */}
      {showRecordPaymentModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[48px] p-12 shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-10">
                <h3 className="text-3xl font-black tracking-tighter">Record Payment</h3>
                <button onClick={() => setShowRecordPaymentModal(false)} className="p-3 bg-slate-50 rounded-full transition-all hover:rotate-90"><X /></button>
             </div>
             <form onSubmit={handleRecordPayment} className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <select required className="p-4 bg-slate-50 rounded-2xl border-none font-bold" value={recordPayment.from} onChange={e => setRecordPayment({...recordPayment, from: e.target.value})}>
                    <option value="">Payer</option>
                    {currentGroup?.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <select required className="p-4 bg-slate-50 rounded-2xl border-none font-bold" value={recordPayment.to} onChange={e => setRecordPayment({...recordPayment, to: e.target.value})}>
                    <option value="">Receiver</option>
                    {currentGroup?.members.filter(m=>m.id!==recordPayment.from).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <input required type="number" step="0.01" value={recordPayment.amount} onChange={e => setRecordPayment({...recordPayment, amount: e.target.value})} placeholder="0.00" className="w-full p-6 bg-slate-50 rounded-3xl border-none font-black text-5xl text-emerald-600 focus:ring-0" />
                <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-emerald-600 text-white rounded-[32px] font-black text-xl shadow-xl hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isSubmitting ? <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Recording...
                  </> : "Record Settlement"}
                </button>
             </form>
          </div>
        </div>
      )}

      {/* EDIT GROUP */}
      {showEditGroupModal && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black">Edit Group</h3>
                <button onClick={() => setShowEditGroupModal(false)} className="p-3 bg-slate-50 rounded-full transition-all hover:rotate-90"><X /></button>
             </div>
             <form onSubmit={handleEditGroup} className="space-y-6">
                <input required value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl border-none font-bold" />
                <div className="grid grid-cols-2 gap-4">
                  <select value={newGroup.currency} onChange={e => {
                    const symbols = { USD: '$', EUR: '€', INR: '₹', GBP: '£' };
                    setNewGroup({...newGroup, currency: e.target.value, currencySymbol: symbols[e.target.value]});
                  }} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold">
                    <option value="INR">INR (₹)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option>
                  </select>
                  <div className="w-full p-4 bg-slate-100 rounded-2xl font-black text-center">{newGroup.currencySymbol}</div>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-slate-900 text-white rounded-[32px] font-black text-xl shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isSubmitting ? <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Updating...
                  </> : "Update Group"}
                </button>
             </form>
          </div>
        </div>
      )}

      {/* ADD EXPENSE */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[48px] p-12 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-4xl font-black tracking-tighter">{editingExpenseId ? 'Edit Entry' : 'New Entry'}</h3>
              <button onClick={closeExpenseModal} className="p-4 bg-slate-50 rounded-full transition-all hover:rotate-90"><X /></button>
            </div>
            <form onSubmit={handleAddExpense} className="space-y-8 overflow-y-auto pr-2 no-scrollbar">
              <div className="flex gap-3">
                  <input required value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} placeholder="Dinner at Eiffel..." className="flex-1 p-5 bg-slate-50 rounded-3xl border-none font-bold text-lg focus:ring-2 focus:ring-indigo-500/20" />
                  <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})} className="p-5 bg-slate-50 rounded-3xl border-none font-black text-xs uppercase tracking-widest cursor-pointer">
                    <option value="food">Food</option><option value="transport">Travel</option><option value="accommodation">Stay</option><option value="activities">Fun</option>
                  </select>
              </div>
              <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount</label>
                    <input required type="number" step="0.01" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} placeholder="0.00" className="w-full p-6 bg-slate-50 rounded-3xl border-none font-black text-4xl text-indigo-600 focus:ring-2 focus:ring-indigo-500/20" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Who Paid?</label>
                    <select value={newExpense.paidBy} onChange={e => setNewExpense({...newExpense, paidBy: e.target.value})} className="w-full p-6 bg-slate-50 rounded-3xl border-none font-bold text-lg cursor-pointer">
                        {currentGroup?.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
              </div>
              <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Splitting Logic</label>
                    <button type="button" onClick={() => setNewExpense({...newExpense, splitType: newExpense.splitType === 'equal' ? 'custom' : 'equal'})} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Switch to {newExpense.splitType === 'equal' ? 'Custom' : 'Equal'}</button>
                 </div>
                 {newExpense.splitType === 'equal' ? (
                   <div className="p-6 bg-indigo-50/50 rounded-3xl border-2 border-dashed border-indigo-100">
                      <p className="text-sm font-bold text-indigo-900 text-center">Total will be split equally among {currentGroup?.members.length} members.</p>
                   </div>
                 ) : (
                   <div className="space-y-4">
                      {currentGroup?.members.map(m => (
                        <div key={m.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                           <span className="flex-1 font-bold text-slate-600">{m.name}</span>
                           <input type="number" placeholder="0.00" value={newExpense.customSplits[m.id] || ""} onChange={e => {
                             const cs = {...newExpense.customSplits, [m.id]: e.target.value};
                             setNewExpense({...newExpense, customSplits: cs});
                           }} className="w-32 p-3 bg-white rounded-xl border-none text-right font-black" />
                        </div>
                      ))}
                      {customSplitError && <p className="text-xs font-bold text-rose-600 flex items-center gap-1"><AlertCircle size={14}/> {customSplitError}</p>}
                   </div>
                 )}
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black text-xl shadow-2xl hover:bg-indigo-700 transition-all active:scale-95 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isSubmitting ? <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Saving...
                </> : "Save Expense"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD GROUP */}
      {showAddGroupModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[48px] p-12 shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-10">
                <h3 className="text-3xl font-black tracking-tighter">New Group</h3>
                <button onClick={() => setShowAddGroupModal(false)} className="p-3 bg-slate-50 rounded-full hover:rotate-90 transition-all"><X /></button>
             </div>
             <form onSubmit={handleAddGroup} className="space-y-8">
                <input required value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} placeholder="Trip Name..." className="w-full p-5 bg-slate-50 rounded-3xl border-none font-bold text-xl" />
                <div className="grid grid-cols-2 gap-4">
                   <select value={newGroup.currency} onChange={e => {
                        const symbols = { USD: '$', EUR: '€', INR: '₹', GBP: '£' };
                        setNewGroup({...newGroup, currency: e.target.value, currencySymbol: symbols[e.target.value]});
                   }} className="p-4 bg-slate-50 rounded-2xl border-none font-bold">
                      <option value="INR">INR (₹)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option>
                   </select>
                   <div className="w-full p-4 bg-slate-100 rounded-2xl font-black text-center">{newGroup.currencySymbol}</div>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black text-xl shadow-2xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isSubmitting ? <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Creating...
                  </> : "Create Group"}
                </button>
             </form>
          </div>
        </div>
      )}

      {/* DELETE GROUP CONFIRMATION */}
      {showDeleteGroupModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95">
             <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-600 mb-6 mx-auto"><Trash2 size={40} /></div>
             <h3 className="text-2xl font-black text-center mb-2 tracking-tight text-slate-900">Delete Group?</h3>
             <p className="text-slate-500 text-center text-sm font-medium mb-10 leading-relaxed">This will permanently erase all data associated with this trip.</p>
             <div className="flex gap-3">
                <button onClick={() => setShowDeleteGroupModal(false)} disabled={isSubmitting} className="flex-1 py-4 bg-slate-50 rounded-2xl font-black text-slate-400 uppercase tracking-widest text-[10px] disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
                <button onClick={handleDeleteGroup} disabled={isSubmitting} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1">
                  {isSubmitting ? <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Deleting...
                  </> : "Delete"}
                </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}