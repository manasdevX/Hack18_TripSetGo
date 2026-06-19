// src/pages/Dashboard/Admin/Destinations.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchDestinations, createDestination, updateDestination, deleteDestination, selectAdmin, clearAdminSuccess } from '@/features/admin/adminSlice'
import { Search, Plus, Edit2, Trash2, CheckCircle, AlertCircle, X } from 'lucide-react'
import Loader from '@/components/common/Loader'

export default function AdminDestinations() {
  const dispatch = useDispatch()
  const { destinations, destinationsPagination, loading, successMessage } = useSelector(selectAdmin)

  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)

  // Modals / forms
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    type: 'Hotel', // Hotel, Restaurant, Attraction
    name: '',
    description: '',
    address: '',
    city: '',
    country: '',
    coordinates: [0, 0], // [lng, lat]
    starRating: 3,
    priceLevel: 2,
    cuisines: '',
    category: '',
    ticketPrice: 0,
    recommendedDuration: 60,
    amenities: ''
  })

  useEffect(() => {
    dispatch(fetchDestinations({ page, limit: 10, search: searchTerm, type: typeFilter }))
  }, [dispatch, page, searchTerm, typeFilter])

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => dispatch(clearAdminSuccess()), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage, dispatch])

  const handleDelete = (dest) => {
    if (window.confirm(`Are you sure you want to delete "${dest.name}" (${dest.type})? This will also remove any reviews for this place.`)) {
      dispatch(deleteDestination({ type: dest.type, id: dest._id }))
    }
  }

  const handleEditClick = (dest) => {
    setEditingId(dest._id)
    setFormData({
      type: dest.type,
      name: dest.name || '',
      description: dest.description || '',
      address: dest.address || '',
      city: dest.city || '',
      country: dest.country || '',
      coordinates: dest.location?.coordinates || [0, 0],
      starRating: dest.starRating || 3,
      priceLevel: dest.priceLevel || 2,
      cuisines: dest.cuisines?.join(', ') || '',
      category: dest.category || '',
      ticketPrice: dest.ticketPrice || 0,
      recommendedDuration: dest.recommendedDuration || 60,
      amenities: dest.amenities?.join(', ') || ''
    })
    setIsModalOpen(true)
  }

  const handleOpenAddModal = () => {
    setEditingId(null)
    setFormData({
      type: 'Hotel',
      name: '',
      description: '',
      address: '',
      city: '',
      country: '',
      coordinates: [0, 0],
      starRating: 3,
      priceLevel: 2,
      cuisines: '',
      category: '',
      ticketPrice: 0,
      recommendedDuration: 60,
      amenities: ''
    })
    setIsModalOpen(true)
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    
    // Process list inputs
    const formattedData = {
      ...formData,
      cuisines: formData.cuisines ? formData.cuisines.split(',').map(c => c.trim()) : [],
      amenities: formData.amenities ? formData.amenities.split(',').map(a => a.trim()) : [],
    }

    if (editingId) {
      dispatch(updateDestination({ type: formData.type, id: editingId, data: formattedData }))
    } else {
      dispatch(createDestination(formattedData))
    }
    setIsModalOpen(false)
  }

  return (
    <div className="page-enter">
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>Manage <span className="gradient-text">Destinations</span></h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Add, edit, or remove Hotels, Restaurants, and Attractions</p>
        </div>
        <button className="btn-primary" onClick={handleOpenAddModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={16} /> Add Destination
        </button>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="card" style={{ padding: '1rem', borderColor: '#10b981', background: 'rgba(16, 185, 129, 0.05)', color: '#10b981', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle size={18} />
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
            placeholder="Search destinations by name..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }}
            style={{ paddingLeft: '2.5rem', width: '100%' }}
          />
        </div>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
          style={{ width: 'auto' }}
        >
          <option value="all">All Types</option>
          <option value="hotel">Hotels</option>
          <option value="restaurant">Restaurants</option>
          <option value="attraction">Attractions</option>
        </select>
      </div>

      {/* Destinations List */}
      {loading ? (
        <Loader text="Fetching destinations..." />
      ) : destinations.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <AlertCircle size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <p style={{ fontWeight: 600 }}>No destinations found</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: '2rem' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
                <th style={{ padding: '1rem' }}>Destination</th>
                <th style={{ padding: '1rem' }}>Type</th>
                <th style={{ padding: '1rem' }}>City / Country</th>
                <th style={{ padding: '1rem' }}>Rating / Reviews</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {destinations.map((dest) => (
                <tr key={dest._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div>
                      <p style={{ fontWeight: 600 }}>{dest.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {dest.description || dest.address || 'No description'}
                      </p>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${dest.type === 'Hotel' ? 'badge-primary' : dest.type === 'Restaurant' ? 'badge-warning' : 'badge-success'}`}>
                      {dest.type}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    {dest.city}{dest.country ? `, ${dest.country}` : ''}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ fontWeight: 600 }}>{dest.averageRating?.toFixed(1) || '0.0'}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>({dest.reviewCount || 0})</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button className="btn-icon" onClick={() => handleEditClick(dest)} title="Edit Destination">
                        <Edit2 size={16} color="#6366f1" />
                      </button>
                      <button className="btn-icon" onClick={() => handleDelete(dest)} title="Delete Destination">
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
      {destinationsPagination && destinationsPagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', fontSize: '0.875rem', fontWeight: 600 }}>
            Page {page} of {destinationsPagination.totalPages}
          </span>
          <button className="btn-secondary" disabled={page === destinationsPagination.totalPages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="sidebar-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="card" style={{ width: '100%', maxWidth: 600, padding: '2rem', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', right: 16, top: 16, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
            >
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>
              {editingId ? 'Edit Destination' : 'Add New Destination'}
            </h2>
            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Type Select */}
              {!editingId && (
                <div>
                  <label>Destination Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="Hotel">Hotel</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Attraction">Attraction</option>
                  </select>
                </div>
              )}

              {/* Name */}
              <div>
                <label>Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Description */}
              <div>
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Address */}
              {formData.type !== 'Attraction' && (
                <div>
                  <label>Address</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              )}

              {/* City & Country */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label>City</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                {formData.type !== 'Restaurant' && (
                  <div>
                    <label>Country</label>
                    <input
                      type="text"
                      required
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* Coordinates [longitude, latitude] */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label>Longitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.coordinates[0]}
                    onChange={(e) => setFormData({ ...formData, coordinates: [parseFloat(e.target.value) || 0, formData.coordinates[1]] })}
                  />
                </div>
                <div>
                  <label>Latitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.coordinates[1]}
                    onChange={(e) => setFormData({ ...formData, coordinates: [formData.coordinates[0], parseFloat(e.target.value) || 0] })}
                  />
                </div>
              </div>

              {/* HOTEL Specific Fields */}
              {formData.type === 'Hotel' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label>Star Rating (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.starRating}
                        onChange={(e) => setFormData({ ...formData, starRating: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label>Price Level (1-4)</label>
                      <input
                        type="number"
                        min="1"
                        max="4"
                        value={formData.priceLevel}
                        onChange={(e) => setFormData({ ...formData, priceLevel: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <label>Amenities (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="Pool, Wifi, Gym"
                      value={formData.amenities}
                      onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                    />
                  </div>
                </>
              )}

              {/* RESTAURANT Specific Fields */}
              {formData.type === 'Restaurant' && (
                <>
                  <div>
                    <label>Price Level (1-4)</label>
                    <input
                      type="number"
                      min="1"
                      max="4"
                      value={formData.priceLevel}
                      onChange={(e) => setFormData({ ...formData, priceLevel: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label>Cuisines (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="Italian, Fast Food, Chinese"
                      value={formData.cuisines}
                      onChange={(e) => setFormData({ ...formData, cuisines: e.target.value })}
                    />
                  </div>
                </>
              )}

              {/* ATTRACTION Specific Fields */}
              {formData.type === 'Attraction' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label>Category</label>
                      <input
                        type="text"
                        placeholder="Museum, Park, Monument"
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      />
                    </div>
                    <div>
                      <label>Ticket Price (₹)</label>
                      <input
                        type="number"
                        value={formData.ticketPrice}
                        onChange={(e) => setFormData({ ...formData, ticketPrice: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div>
                    <label>Recommended Duration (minutes)</label>
                    <input
                      type="number"
                      value={formData.recommendedDuration}
                      onChange={(e) => setFormData({ ...formData, recommendedDuration: parseInt(e.target.value) || 60 })}
                    />
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  {editingId ? 'Save Changes' : 'Create'}
                </button>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  )
}
