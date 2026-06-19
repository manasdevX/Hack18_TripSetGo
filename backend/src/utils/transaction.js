/**
 * Database transaction utilities for multi-document consistency
 * Uses MongoDB sessions to ensure ACID compliance across multiple collections
 */

/**
 * Execute a function within a MongoDB session/transaction
 * @param {Function} callback - Async function to execute within transaction
 * @returns {Promise} Result from callback
 * 
 * @example
 * await withTransaction(async (session) => {
 *   const user = await User.findByIdAndUpdate(userId, { tripsCount: tripsCount + 1 }, { session, new: true })
 *   const subscription = await Subscription.findByIdAndUpdate(subId, { searchesToday: searchesToday + 1 }, { session, new: true })
 *   return { user, subscription }
 * })
 */
async function withTransaction(callback) {
  const mongoose = require('mongoose')
  const session = await mongoose.startSession()
  
  try {
    session.startTransaction()
    const result = await callback(session)
    await session.commitTransaction()
    return result
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    await session.endSession()
  }
}

/**
 * Execute a function within a MongoDB session (no automatic transaction)
 * Useful for operations that need session context but not full ACID isolation
 * @param {Function} callback - Async function to execute within session
 * @returns {Promise} Result from callback
 */
async function withSession(callback) {
  const mongoose = require('mongoose')
  const session = await mongoose.startSession()
  
  try {
    const result = await callback(session)
    return result
  } finally {
    await session.endSession()
  }
}

module.exports = {
  withTransaction,
  withSession,
}
