import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function InviteModal({
  inviteModal, setInviteModal,
  handleInvite, inviteEmail, setInviteEmail,
  inviteRole, setInviteRole, inviting
}) {
  return (
    <AnimatePresence>
      {inviteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="bg-bg-card border border-border rounded-2xl p-6 transition-all duration-250 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" style={{ width: '90%', maxWidth: '450px', background: 'var(--color-bg-card)', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.2rem' }}>Invite Collaborator</h3>
              <button onClick={() => setInviteModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>User Email</label>
                <input type="email" required placeholder="collaborator@example.com" className="w-full bg-surface border border-border rounded-xl text-text-primary font-sans text-[0.9375rem] px-4 py-3 outline-none transition-all duration-150 placeholder-text-muted focus:border-primary focus:shadow-[0_0_0_3px_rgba(14,165,233,0.2)] disabled:opacity-50 disabled:cursor-not-allowed" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>Permission Role</label>
                <select className="w-full bg-surface border border-border rounded-xl text-text-primary font-sans text-[0.9375rem] px-4 py-3 outline-none transition-all duration-150 placeholder-text-muted focus:border-primary focus:shadow-[0_0_0_3px_rgba(14,165,233,0.2)] disabled:opacity-50 disabled:cursor-not-allowed" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                  <option value="editor">Editor (Can edit itinerary)</option>
                  <option value="viewer">Viewer (Read-only)</option>
                </select>
              </div>
              <button type="submit" disabled={inviting} className="inline-flex items-center justify-center gap-2 font-sans font-semibold text-sm px-5 py-2.5 rounded-xl border-none cursor-pointer transition-all duration-250 ease-out whitespace-nowrap text-decoration-none relative overflow-hidden bg-gradient-primary bg-[length:200%_auto] text-white shadow-btn hover:bg-right hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_6px_20px_rgba(129,140,248,0.5)] active:translate-y-0 active:scale-[0.98] active:shadow-btn disabled:opacity-50 disabled:cursor-not-allowed" style={{ width: '100%', marginTop: '0.5rem' }}>
                {inviting ? 'Sending Invite...' : 'Send Invitation'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
