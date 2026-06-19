// src/pages/Dashboard/Admin/Reviews.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchReviews, deleteReview, selectAdmin, clearAdminSuccess } from '@/features/admin/adminSlice'
import { Star, Trash2, ShieldAlert, CheckCircle, Flag, MessageSquare } from 'lucide-react'
import Loader from '@/components/common/Loader'

export default function AdminReviews() {
  const dispatch = useDispatch()
  const { reviews, reviewsPagination, loading, successMessage } = useSelector(selectAdmin)

  const [reportedOnly, setReportedOnly] = useState(false)
  const [minRating, setMinRating] = useState(0)
  const [page, setPage] = useState(1)

  useEffect(() => {
    dispatch(fetchReviews({ page, limit: 10, reported: reportedOnly, rating: minRating }))
  }, [dispatch, page, reportedOnly, minRating])

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => dispatch(clearAdminSuccess()), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage, dispatch])

  const handleDeleteReview = (reviewId) => {
    if (window.confirm('Are you sure you want to delete this review? This action is permanent.')) {
      dispatch(deleteReview(reviewId))
    }
  }

  return (
    <div className="page-enter">
      {/* Title */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>Manage <span className="gradient-text">Reviews</span></h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Moderate community reviews, handle reported content, and purge spam</p>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="card" style={{ padding: '1rem', borderColor: '#10b981', background: 'rgba(16, 185, 129, 0.05)', color: '#10b981', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle size={18} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{successMessage}</span>
        </div>
      )}

      {/* Filters Card */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Flag filter */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={reportedOnly}
            onChange={(e) => { setReportedOnly(e.target.checked); setPage(1) }}
          />
          <Flag size={16} color={reportedOnly ? '#ef4444' : '#9ca3af'} /> Show Reported Reviews Only
        </label>

        {/* Rating filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Filter by rating:</span>
          <select
            value={minRating}
            onChange={(e) => { setMinRating(Number(e.target.value)); setPage(1) }}
            style={{ width: 'auto', padding: '0.25rem 0.5rem' }}
          >
            <option value={0}>All Stars</option>
            <option value={5}>5 Stars</option>
            <option value={4}>4+ Stars</option>
            <option value={3}>3+ Stars</option>
            <option value={2}>2+ Stars</option>
            <option value={1}>1+ Stars</option>
          </select>
        </div>
      </div>

      {/* Reviews Table/Cards */}
      {loading ? (
        <Loader text="Fetching reviews..." />
      ) : reviews.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <MessageSquare size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <p style={{ fontWeight: 600 }}>No reviews match this criteria</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {reviews.map((review) => {
            const isReported = review.reportedBy && review.reportedBy.length > 0
            return (
              <div key={review._id} className="card" style={{ padding: '1.5rem', borderColor: isReported ? '#ef4444' : 'var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  
                  {/* User & Rating */}
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <img
                      src={review.userId?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(review.userId?.name || 'User')}`}
                      alt={review.userId?.name}
                      style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <h4 style={{ fontWeight: 700 }}>{review.userId?.name || 'Unknown User'}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>{review.userId?.email}</p>
                      
                      {/* Rating */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            fill={i < review.rating ? '#f59e0b' : 'none'}
                            color={i < review.rating ? '#f59e0b' : '#9ca3af'}
                          />
                        ))}
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginLeft: '0.25rem' }}>
                          on {review.targetType} ({review.targetId})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badges / Danger Area */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {isReported && (
                      <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <ShieldAlert size={12} /> {review.reportedBy.length} Reports
                      </span>
                    )}
                    <button
                      className="btn-danger"
                      onClick={() => handleDeleteReview(review._id)}
                      style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                </div>

                {/* Review Body */}
                <div style={{ marginTop: '1.25rem' }}>
                  {review.title && <h5 style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '1rem' }}>{review.title}</h5>}
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', lineHeight: '1.5' }}>
                    {review.text}
                  </p>
                </div>

                {/* Date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  <span>Created {new Date(review.createdAt).toLocaleString()}</span>
                  {review.isVerifiedVisit && <span className="badge badge-success">Verified Visit</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {reviewsPagination && reviewsPagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            className="btn-secondary"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', fontSize: '0.875rem', fontWeight: 600 }}>
            Page {page} of {reviewsPagination.totalPages}
          </span>
          <button
            className="btn-secondary"
            disabled={page === reviewsPagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
