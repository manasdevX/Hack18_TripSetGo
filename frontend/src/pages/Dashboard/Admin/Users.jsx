// src/pages/Dashboard/Admin/Users.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchUsers, updateUserStatus, updateUserRole, deleteUser, selectAdmin, clearAdminSuccess } from '@/features/admin/adminSlice'
import { Search, UserCheck, UserX, Shield, Trash2, Download, AlertCircle } from 'lucide-react'
import Loader from '@/components/common/Loader'

export default function AdminUsers() {
  const dispatch = useDispatch()
  const { users, usersPagination, loading, successMessage } = useSelector(selectAdmin)

  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    dispatch(fetchUsers({ page, limit: 10, search: searchTerm, role: roleFilter, status: statusFilter }))
  }, [dispatch, page, searchTerm, roleFilter, statusFilter])

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => dispatch(clearAdminSuccess()), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage, dispatch])

  const handleStatusToggle = (user) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active'
    if (window.confirm(`Are you sure you want to set ${user.name}'s status to ${nextStatus}?`)) {
      dispatch(updateUserStatus({ id: user._id, status: nextStatus }))
    }
  }

  const handleRoleToggle = (user) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin'
    if (window.confirm(`Are you sure you want to change ${user.name}'s role to ${nextRole}?`)) {
      dispatch(updateUserRole({ id: user._id, role: nextRole }))
    }
  }

  const handleDeleteUser = (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This will soft-delete their account.')) {
      dispatch(deleteUser(userId))
    }
  }

  const handleExportCSV = () => {
    const baseUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '')
      : 'http://localhost:5001'
    window.open(`${baseUrl}/api/v1/admin/export/users`, '_blank')
  }

  return (
    <div className="page-enter">
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>Manage <span className="gradient-text">Users</span></h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Review, update roles, toggle account statuses, and soft-delete users</p>
        </div>
        <button className="btn-secondary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="card" style={{ padding: '1rem', borderColor: '#10b981', background: 'rgba(16, 185, 129, 0.05)', color: '#10b981', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <UserCheck size={18} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{successMessage}</span>
        </div>
      )}

      {/* Filters Card */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }}
            style={{ paddingLeft: '2.5rem', width: '100%' }}
          />
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
          style={{ width: 'auto' }}
        >
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          style={{ width: 'auto' }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deleted">Deleted</option>
        </select>
      </div>

      {/* Users Table */}
      {loading ? (
        <Loader text="Fetching users..." />
      ) : users.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <AlertCircle size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <p style={{ fontWeight: 600 }}>No users found matching the query</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: '2rem' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
                <th style={{ padding: '1rem' }}>User</th>
                <th style={{ padding: '1rem' }}>Role</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Plan</th>
                <th style={{ padding: '1rem' }}>Joined Date</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <img
                        src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
                        alt={user.name}
                        style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <p style={{ fontWeight: 600 }}>{user.name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${user.role === 'admin' ? 'badge-primary' : 'badge-secondary'}`} style={{ textTransform: 'capitalize' }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${user.status === 'active' ? 'badge-success' : user.status === 'suspended' ? 'badge-warning' : 'badge-danger'}`} style={{ textTransform: 'capitalize' }}>
                      {user.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${user.plan === 'pro' ? 'badge-pro' : 'badge-secondary'}`} style={{ textTransform: 'uppercase' }}>
                      {user.plan}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      {/* Toggle status */}
                      <button
                        className="btn-icon"
                        title={user.status === 'active' ? 'Suspend user' : 'Activate user'}
                        onClick={() => handleStatusToggle(user)}
                        disabled={user.status === 'deleted'}
                      >
                        {user.status === 'active' ? <UserX size={16} color="#f59e0b" /> : <UserCheck size={16} color="#10b981" />}
                      </button>

                      {/* Toggle role */}
                      <button
                        className="btn-icon"
                        title={user.role === 'admin' ? 'Revoke admin access' : 'Make admin'}
                        onClick={() => handleRoleToggle(user)}
                        disabled={user.status === 'deleted'}
                      >
                        <Shield size={16} color={user.role === 'admin' ? '#ef4444' : '#6366f1'} />
                      </button>

                      {/* Delete */}
                      <button
                        className="btn-icon"
                        title="Delete user"
                        onClick={() => handleDeleteUser(user._id)}
                        disabled={user.status === 'deleted'}
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {usersPagination && usersPagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            className="btn-secondary"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', fontSize: '0.875rem', fontWeight: 600 }}>
            Page {page} of {usersPagination.totalPages}
          </span>
          <button
            className="btn-secondary"
            disabled={page === usersPagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
