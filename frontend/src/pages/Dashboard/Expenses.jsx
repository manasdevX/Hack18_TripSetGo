// src/pages/Dashboard/Expenses.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { Plus, Receipt, Users, Calculator, Trash2, UserPlus, ArrowRight, Wallet } from 'lucide-react'
import {
  fetchGroups, fetchGroup, createGroup, deleteGroup, addMember, addExpense, deleteExpense,
  selectGroups, selectGroupDetail, selectGroupsLoading, selectDetailLoading, selectExpenseSubmitting,
} from '@/features/expenses/expensesSlice'
import { selectUser } from '@/features/auth/authSlice'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import Modal from '@/components/common/Modal'
import Avatar from '@/components/common/Avatar'
import { SkeletonCard } from '@/components/common/Loader'

const CATEGORY_META = {
  accommodation: { emoji: '🏨', label: 'Stay',     color: '#818cf8' },
  food:          { emoji: '🍽️', label: 'Food',      color: '#34d399' },
  transport:     { emoji: '🚗', label: 'Transport', color: '#22d3ee' },
  entertainment: { emoji: '🎉', label: 'Fun',       color: '#fbbf24' },
  misc:          { emoji: '💰', label: 'Misc',      color: '#a78bfa' },
}

const toast = (type, message) => window.dispatchEvent(new CustomEvent('toast', { detail: { type, message } }))
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

export default function Expenses() {
  const dispatch      = useDispatch()
  const user          = useSelector(selectUser)
  const groups        = useSelector(selectGroups)
  const detail        = useSelector(selectGroupDetail)
  const loadingGroups = useSelector(selectGroupsLoading)
  const loadingDetail = useSelector(selectDetailLoading)
  const submitting    = useSelector(selectExpenseSubmitting)

  const [pickedId, setPickedId]     = useState(null)
  const [createOpen, setCreateOpen]   = useState(false)
  const [memberOpen, setMemberOpen]   = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [isDeleting, setIsDeleting]   = useState(false)

  const [groupName, setGroupName]   = useState('')
  const [groupEmails, setGroupEmails] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [exp, setExp] = useState({ title: '', amount: '', category: 'misc', paidBy: '', splitAmong: [], note: '' })

  useEffect(() => { dispatch(fetchGroups()) }, [dispatch])

  // Derive the active group rather than syncing it in an effect: honour the
  // user's pick while it still exists, otherwise fall back to the first group.
  const selectedId = (pickedId && groups.some((g) => g._id === pickedId)) ? pickedId : (groups[0]?._id || null)

  useEffect(() => {
    if (selectedId) dispatch(fetchGroup(selectedId))
  }, [selectedId, dispatch])

  // Only treat `detail` as belonging to the selection (avoids flashing stale data).
  const activeDetail = detail?.group?._id === selectedId ? detail : null
  const group   = activeDetail?.group
  const members = group?.members || []
  const isOwner = group && user && (group.ownerId === user._id || group.ownerId?._id === user._id)
  const memberName = (id) => members.find((m) => m._id === id)?.name || 'Someone'

  const total = activeDetail?.total || 0
  const balances = activeDetail?.balances || {}
  const settlements = activeDetail?.settlements || []
  const perPerson = members.length > 0 ? total / members.length : 0

  // ── Mutations ──
  const submitGroup = async (e) => {
    e.preventDefault()
    if (!groupName.trim()) return toast('error', 'Give your group a name')
    const emails = groupEmails.split(',').map((s) => s.trim()).filter(Boolean)
    try {
      const { group: g, unresolved } = await dispatch(createGroup({ name: groupName.trim(), memberEmails: emails })).unwrap()
      setCreateOpen(false); setGroupName(''); setGroupEmails('')
      setPickedId(g._id)
      if (unresolved?.length) toast('info', `Group created. These emails aren't registered yet: ${unresolved.join(', ')}`)
      else toast('success', 'Group created')
    } catch (err) { toast('error', err) }
  }

  const submitMember = async (e) => {
    e.preventDefault()
    if (!memberEmail.trim()) return
    try {
      await dispatch(addMember({ groupId: selectedId, email: memberEmail.trim() })).unwrap()
      setMemberOpen(false); setMemberEmail('')
      toast('success', 'Member added')
    } catch (err) { toast('error', err) }
  }

  const openAddExpense = () => {
    const ids = members.map((m) => m._id)
    const defaultPayer = user && ids.includes(user._id) ? user._id : (ids[0] || '')
    setExp({ title: '', amount: '', category: 'misc', paidBy: defaultPayer, splitAmong: ids, note: '' })
    setExpenseOpen(true)
  }

  const submitExpense = async (e) => {
    e.preventDefault()
    if (!exp.title.trim()) return toast('error', 'What was the expense for?')
    if (!exp.amount || Number(exp.amount) <= 0) return toast('error', 'Enter an amount greater than 0')
    if (!exp.paidBy) return toast('error', 'Select who paid')
    if (!exp.splitAmong.length) return toast('error', 'Split between at least one person')
    try {
      await dispatch(addExpense({
        groupId: selectedId,
        title: exp.title.trim(),
        amount: Number(exp.amount),
        category: exp.category,
        paidBy: exp.paidBy,
        splitAmong: exp.splitAmong,
        note: exp.note.trim(),
      })).unwrap()
      setExpenseOpen(false)
      toast('success', 'Expense added')
    } catch (err) { toast('error', err) }
  }

  const onDeleteExpense = async (id) => {
    try {
      await dispatch(deleteExpense({ groupId: selectedId, expenseId: id })).unwrap()
      toast('success', 'Expense removed')
    } catch (err) { toast('error', err) }
  }

  const onDeleteGroup = async () => {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      await dispatch(deleteGroup(selectedId)).unwrap()
      setPickedId(null)
      toast('success', 'Group deleted')
    } catch (err) {
      toast('error', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleSplit = (id) => setExp((p) => ({
    ...p,
    splitAmong: p.splitAmong.includes(id) ? p.splitAmong.filter((x) => x !== id) : [...p.splitAmong, id],
  }))

  // ── Render ──
  return (
    <div className="animate-fadeIn">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>Group <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">Expenses</span></h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Split costs with friends and settle up fairly</p>
        </div>
        <Button icon={<Plus size={15} />} size="sm" onClick={() => setCreateOpen(true)}>New Group</Button>
      </div>

      {loadingGroups && groups.length === 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] text-center py-16 px-8">
          <div style={{ fontSize: 56, marginBottom: '1rem' }}>👥</div>
          <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No expense groups yet</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', maxWidth: 420, marginInline: 'auto' }}>
            Create a group for your trip, add the friends travelling with you, and TripSetGo will track who paid what and who owes whom.
          </p>
          <Button icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>Create your first group</Button>
        </div>
      ) : (
        <>
          {/* Group selector */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
            {groups.map((g) => {
              const active = g._id === selectedId
              return (
                <button key={g._id} onClick={() => setPickedId(g._id)}
                  className={`border rounded-xl px-4 py-3.5 min-w-[180px] text-left transition-all cursor-pointer ${active ? 'border-primary bg-[rgba(129,140,248,0.1)] shadow-[0_0_18px_rgba(129,140,248,0.25)]' : 'border-border bg-bg-card hover:border-primary/45'}`}>
                  <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{g.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {(g.members?.length || 0)} member{(g.members?.length || 0) === 1 ? '' : 's'} • {inr(g.totalSpent)}
                  </p>
                </button>
              )
            })}
          </div>

          {/* Detail panel */}
          {loadingDetail && !activeDetail ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : activeDetail ? (
            <>
              {/* Group header */}
              <div className="bg-[rgba(17,24,39,0.75)] backdrop-blur-[20px] border border-border rounded-xl shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] px-6 py-5 mb-6 flex justify-between items-center flex-wrap gap-4">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex' }}>
                    {members.slice(0, 5).map((m, i) => (
                      <div key={m._id} style={{ marginLeft: i === 0 ? 0 : -12 }} title={m.name}>
                        <Avatar src={m.avatar} name={m.name} size="sm" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700 }}>{group.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{members.length} member{members.length === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {isOwner && <Button variant="secondary" size="sm" icon={<UserPlus size={15} />} onClick={() => setMemberOpen(true)}>Add member</Button>}
                  <Button size="sm" icon={<Plus size={15} />} onClick={openAddExpense}>Add expense</Button>
                  {isOwner && (
                    <button 
                      onClick={onDeleteGroup} 
                      disabled={isDeleting}
                      className={`inline-flex items-center justify-center p-2 rounded-lg text-xs font-semibold bg-transparent text-red-500 transition-all ${isDeleting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white/5 hover:text-red-600'}`} 
                      title="Delete group"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {[
                  { label: 'Total Spent',  value: inr(total),     icon: <Receipt size={20} />,    color: '#818cf8' },
                  { label: 'Members',      value: members.length, icon: <Users size={20} />,      color: '#22d3ee' },
                  { label: 'Per Person',   value: inr(perPerson), icon: <Calculator size={20} />, color: '#34d399' },
                ].map((s) => (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-bg-card border border-border rounded-xl p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] flex gap-4 items-center">
                    <div style={{ width: 44, height: 44, background: `${s.color}20`, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>{s.icon}</div>
                    <div>
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>{s.label}</p>
                      <p style={{ fontWeight: 800, fontSize: '1.125rem' }}>{s.value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                {/* Expenses list */}
                <div>
                  <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Expenses</h2>
                  {activeDetail.expenses.length === 0 ? (
                    <div className="bg-bg-card border border-border rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] text-center py-10 px-4 text-text-muted">
                      <Wallet size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                      <p style={{ fontWeight: 600 }}>No expenses yet</p>
                      <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Add the first one to start splitting.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {activeDetail.expenses.map((e, i) => {
                        const meta = CATEGORY_META[e.category] || CATEGORY_META.misc
                        return (
                          <motion.div key={e._id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-bg-card border border-border rounded-xl p-4.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                              <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center', minWidth: 0 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: `${meta.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{meta.emoji}</div>
                                <div style={{ minWidth: 0 }}>
                                  <p style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</p>
                                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem' }}>
                                    {e.paidBy?.name || 'Someone'} paid • split {e.splitAmong?.length || 0} way{(e.splitAmong?.length || 0) === 1 ? '' : 's'}
                                  </p>
                                  {e.note && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{e.note}</p>}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                <p style={{ fontWeight: 700 }}>{inr(e.amount)}</p>
                                <button onClick={() => onDeleteExpense(e._id)} className="inline-flex items-center justify-center p-1 rounded-md text-xs bg-transparent text-red-500 cursor-pointer hover:bg-white/5 transition-all" title="Delete expense">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Settlements + balances */}
                <div>
                  <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Settle Up</h2>
                  <div className="bg-bg-card border border-border rounded-xl p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] mb-5">
                    {settlements.length === 0 ? (
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '0.5rem 0' }}>
                        🎉 All settled up — nobody owes anything.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {settlements.map((s, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                              <span style={{ fontWeight: 600, color: 'var(--color-accent-red)' }}>{memberName(s.from)}</span>
                              <ArrowRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                              <span style={{ fontWeight: 600, color: 'var(--color-accent-green)' }}>{memberName(s.to)}</span>
                            </div>
                            <span style={{ fontWeight: 700 }}>{inr(s.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.95rem' }}>Balances</h3>
                  <div className="bg-bg-card border border-border rounded-xl p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    {members.map((m) => {
                      const bal = balances[m._id] || 0
                      return (
                        <div key={m._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Avatar src={m.avatar} name={m.name} size="xs" />
                            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{m.name}{user && m._id === user._id ? ' (you)' : ''}</span>
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: bal > 0.5 ? 'var(--color-accent-green)' : bal < -0.5 ? 'var(--color-accent-red)' : 'var(--color-text-muted)' }}>
                            {bal > 0.5 ? `gets ${inr(bal)}` : bal < -0.5 ? `owes ${inr(Math.abs(bal))}` : 'settled'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </>
      )}

      {/* Create group modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Expense Group">
        <form onSubmit={submitGroup} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Input label="Group name" placeholder="e.g. Goa Trip 2026" value={groupName} onChange={(e) => setGroupName(e.target.value)} required />
          <div>
            <Input label="Invite members by email (optional)" placeholder="alice@mail.com, bob@mail.com" value={groupEmails} onChange={(e) => setGroupEmails(e.target.value)} helperText="Comma-separated. Only registered TripSetGo users can be added." />
          </div>
          <Button type="submit" loading={submitting} icon={<Plus size={16} />} style={{ alignSelf: 'flex-start' }}>Create group</Button>
        </form>
      </Modal>

      {/* Add member modal */}
      <Modal isOpen={memberOpen} onClose={() => setMemberOpen(false)} title="Add a member">
        <form onSubmit={submitMember} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Input label="Member email" type="email" placeholder="friend@mail.com" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} required helperText="They must already have a TripSetGo account." />
          <Button type="submit" loading={submitting} icon={<UserPlus size={16} />} style={{ alignSelf: 'flex-start' }}>Add member</Button>
        </form>
      </Modal>

      {/* Add expense modal */}
      <Modal isOpen={expenseOpen} onClose={() => setExpenseOpen(false)} title="Add an expense" size="lg">
        <form onSubmit={submitExpense} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <Input label="What for?" placeholder="e.g. Dinner at beach shack" value={exp.title} onChange={(e) => setExp((p) => ({ ...p, title: e.target.value }))} required />
            <Input label="Amount (₹)" type="number" min="1" placeholder="3200" value={exp.amount} onChange={(e) => setExp((p) => ({ ...p, amount: e.target.value }))} required />
          </div>

          <div>
            <label style={{ marginBottom: '0.5rem' }}>Category</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {Object.entries(CATEGORY_META).map(([key, meta]) => (
                <button key={key} type="button" onClick={() => setExp((p) => ({ ...p, category: key }))}
                  className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${exp.category === key ? 'bg-gradient-to-br from-primary to-secondary text-white shadow-[0_4px_14px_0_rgba(14,165,233,0.3)]' : 'bg-transparent text-text-primary border border-border hover:border-primary hover:bg-primary/10'}`}>
                  {meta.emoji} {meta.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ marginBottom: '0.5rem' }}>Paid by</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {members.map((m) => (
                <button key={m._id} type="button" onClick={() => setExp((p) => ({ ...p, paidBy: m._id }))}
                  className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${exp.paidBy === m._id ? 'bg-gradient-to-br from-primary to-secondary text-white shadow-[0_4px_14px_0_rgba(14,165,233,0.3)]' : 'bg-transparent text-text-primary border border-border hover:border-primary hover:bg-primary/10'}`}>
                  {m.name}{user && m._id === user._id ? ' (you)' : ''}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ marginBottom: '0.5rem' }}>Split between <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>({exp.splitAmong.length} selected)</span></label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {members.map((m) => (
                <button key={m._id} type="button" onClick={() => toggleSplit(m._id)}
                  className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${exp.splitAmong.includes(m._id) ? 'bg-gradient-to-br from-primary to-secondary text-white shadow-[0_4px_14px_0_rgba(14,165,233,0.3)]' : 'bg-transparent text-text-primary border border-border hover:border-primary hover:bg-primary/10'}`}>
                  {m.name}
                </button>
              ))}
            </div>
            {exp.amount > 0 && exp.splitAmong.length > 0 && (
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                {inr(Number(exp.amount) / exp.splitAmong.length)} per person
              </p>
            )}
          </div>

          <Input label="Note (optional)" placeholder="Anything to remember about this expense" value={exp.note} onChange={(e) => setExp((p) => ({ ...p, note: e.target.value }))} />

          <Button type="submit" loading={submitting} icon={<Plus size={16} />} style={{ alignSelf: 'flex-start' }}>Add expense</Button>
        </form>
      </Modal>
    </div>
  )
}