// src/pages/Dashboard/Admin/Reports.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchReports, selectAdmin } from '@/features/admin/adminSlice'
import { ShieldCheck, ShieldAlert, Terminal, Calendar, User, Info } from 'lucide-react'
import Loader from '@/components/common/Loader'

export default function AdminReports() {
  const dispatch = useDispatch()
  const { reports, reportsPagination, loading } = useSelector(selectAdmin)
  const [page, setPage] = useState(1)

  useEffect(() => {
    dispatch(fetchReports({ page, limit: 15 }))
  }, [dispatch, page])

  return (
    <div className="page-enter">
      {/* Title */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>Audit <span className="gradient-text">Logs</span></h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Track administrative updates, roles escalations, and system actions</p>
      </div>

      {/* Reports Table/Logs */}
      {loading ? (
        <Loader text="Fetching audit logs..." />
      ) : reports.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <ShieldCheck size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <p style={{ fontWeight: 600 }}>System is clean. No audit logs recorded.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {reports.map((log) => {
            const isFailure = log.status === 'failure'
            return (
              <div key={log._id} className="card" style={{ padding: '1.25rem', borderColor: isFailure ? '#ef4444' : 'var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  
                  {/* Action + Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', borderRadius: '50%', background: isFailure ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: isFailure ? '#ef4444' : '#10b981' }}>
                      {isFailure ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                    </div>
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '0.9375rem', fontFamily: 'monospace' }}>{log.action}</h4>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <User size={12} /> {log.userId?.name || 'System'} ({log.userId?.email || 'automated'})
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={12} /> {new Date(log.timestamp).toLocaleString()}
                        </span>
                        {log.ipAddress && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Terminal size={12} /> IP: {log.ipAddress}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className={`badge ${isFailure ? 'badge-danger' : 'badge-success'}`}>
                    {log.status}
                  </span>

                </div>

                {/* Details block */}
                {log.details && Object.keys(log.details).length > 0 && (
                  <div style={{ marginTop: '1rem', background: 'var(--color-bg-secondary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <Info size={14} style={{ marginTop: '0.15rem', color: 'var(--color-text-secondary)' }} />
                      <div style={{ fontSize: '0.8125rem' }}>
                        <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Action Details:</p>
                        <pre style={{ fontFamily: 'monospace', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {reportsPagination && reportsPagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', fontSize: '0.875rem', fontWeight: 600 }}>
            Page {page} of {reportsPagination.totalPages}
          </span>
          <button className="btn btn-secondary" disabled={page === reportsPagination.totalPages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  )
}
