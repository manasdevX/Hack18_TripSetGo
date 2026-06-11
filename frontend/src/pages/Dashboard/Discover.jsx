// src/pages/Dashboard/Discover.jsx
import { useEffect, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { Search, Heart, Bookmark, MessageCircle, Copy } from 'lucide-react'
import {
  fetchFeed, searchTrips, setFilters, setSearchQuery, discoverLikeTrip, discoverSaveTrip,
  selectFeed, selectDiscoverLoading, selectHasMore, selectDiscoverFilters,
} from '@/features/discover/discoverSlice'
import { cloneTrip } from '@/features/trips/tripsSlice'
import Input from '@/components/common/Input'
import { SkeletonCard } from '@/components/common/Loader'
import { useDebounce } from '@/hooks/useDebounce'

const CARD_GRADIENTS = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #06b6d4, #6366f1)',
  'linear-gradient(135deg, #10b981, #06b6d4)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #8b5cf6, #ec4899)',
  'linear-gradient(135deg, #14b8a6, #6366f1)',
]

function getCardGradient(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return CARD_GRADIENTS[Math.abs(hash) % CARD_GRADIENTS.length]
}

function TripCard({ trip }) {
  const dispatch = useDispatch()
  const gradient = getCardGradient(trip.destination || '')
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Destination gradient header */}
      <div style={{ height: 120, borderRadius: 'var(--radius-md)', background: gradient, display: 'flex', alignItems: 'flex-end', padding: '1rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontWeight: 800, fontSize: '1.125rem' }}>{trip.destination}</p>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem' }}>from {trip.source}</p>
        </div>
      </div>
      {/* Content */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gradient-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
            {trip.user?.name?.[0] || '?'}
          </div>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{trip.user?.name || 'Anonymous'}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.8rem', flexWrap: 'wrap' }}>
          <span>📅 {trip.planData?.meta?.total_days || '?'}d</span>
          <span>👥 {trip.numTravelers} {trip.groupType}</span>
          <span>💰 ₹{Number(trip.budget).toLocaleString()}</span>
        </div>
        {trip.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginTop: '0.625rem' }}>
            {trip.tags.slice(0, 3).map(t => <span key={t} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', borderRadius: 99 }}>#{t}</span>)}
          </div>
        )}
      </div>
      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
        <button onClick={() => dispatch(discoverLikeTrip(trip._id))}
          className="btn btn-ghost btn-sm" style={{ color: trip.isLiked ? '#f87171' : undefined }}>
          <Heart size={15} fill={trip.isLiked ? 'currentColor' : 'none'} /> {trip.likesCount || 0}
        </button>
        <button onClick={() => dispatch(discoverSaveTrip(trip._id))}
          className="btn btn-ghost btn-sm" style={{ color: trip.isSaved ? '#fbbf24' : undefined }}>
          <Bookmark size={15} fill={trip.isSaved ? 'currentColor' : 'none'} /> {trip.savesCount || 0}
        </button>
        <button className="btn btn-ghost btn-sm">
          <MessageCircle size={15} /> {trip.commentsCount || 0}
        </button>
        <button onClick={() => dispatch(cloneTrip(trip._id))} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>
          <Copy size={15} /> Clone
        </button>
      </div>
    </motion.div>
  )
}

export default function Discover() {
  const dispatch = useDispatch()
  const feed     = useSelector(selectFeed)
  const loading  = useSelector(selectDiscoverLoading)
  const hasMore  = useSelector(selectHasMore)
  const filters  = useSelector(selectDiscoverFilters)
  const cursor   = useSelector(s => s.discover.cursor)
  const query    = useSelector(s => s.discover.searchQuery)
  const debouncedQuery = useDebounce(query, 500)

  // Initial load
  useEffect(() => { dispatch(fetchFeed({})) }, [dispatch])

  // Search
  useEffect(() => {
    if (debouncedQuery) dispatch(searchTrips({ query: debouncedQuery, filters }))
    else if (debouncedQuery === '') dispatch(fetchFeed({}))
  }, [debouncedQuery, filters, dispatch])

  // Infinite scroll sentinel
  const sentinelRef = useRef()
  const handleObserver = useCallback(entries => {
    if (entries[0].isIntersecting && hasMore && !loading && !debouncedQuery) {
      dispatch(fetchFeed({ cursor, filters }))
    }
  }, [hasMore, loading, cursor, filters, debouncedQuery, dispatch])

  useEffect(() => {
    const obs = new IntersectionObserver(handleObserver, { threshold: 0.5 })
    if (sentinelRef.current) obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [handleObserver])

  const displayFeed = useSelector(s => s.discover.searchResults || s.discover.feed)

  return (
    <div className="page-enter">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          Discover <span className="gradient-text">Trips</span>
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Browse, like, and clone trips from the community</p>
      </div>

      {/* Search & filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <Input
            placeholder="Search destinations, tags..."
            value={query}
            onChange={e => dispatch(setSearchQuery(e.target.value))}
            icon={<Search size={16} />}
          />
        </div>
        <select
          className="input"
          style={{ width: 160, background: 'var(--color-bg-card)', color: 'var(--color-text-primary)', cursor: 'pointer' }}
          value={filters.sortBy}
          onChange={e => dispatch(setFilters({ sortBy: e.target.value }))}
        >
          <option value="latest">Latest</option>
          <option value="popular">Most Popular</option>
          <option value="saves">Most Saved</option>
        </select>
      </div>

      {/* Feed grid */}
      {loading && feed.length === 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {displayFeed.map(trip => <TripCard key={trip._id} trip={trip} />)}
          </div>
          {displayFeed.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: '1rem' }}>🌍</div>
              <p style={{ fontWeight: 600 }}>No trips found</p>
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Try a different search or check back later</p>
            </div>
          )}
          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} style={{ height: 40, marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {loading && feed.length > 0 && <div className="animate-spin" style={{ width: 24, height: 24, border: '2px solid rgba(99,102,241,0.3)', borderTopColor: 'var(--color-accent-primary)', borderRadius: '50%' }} />}
          </div>
        </>
      )}
    </div>
  )
}
