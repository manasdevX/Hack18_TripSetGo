// backend/src/services/travel/utils/apiKeyRotator.js
// ─────────────────────────────────────────────────────────────────────────────
// Manages a pool of API keys per provider.
// - Round-robin rotation on every request
// - On 401/403: marks the offending key as suspended for SUSPEND_TTL_MS
// - All keys suspended → logs CRITICAL + throws so circuit breaker opens
//
// Suspension state is stored in-memory (per process). For multi-process
// deployments, persist to Redis using the same pattern as circuitBreaker.js.
// ─────────────────────────────────────────────────────────────────────────────
const travelLogger = require('./travelLogger')

// How long to suspend a key after a 401/403 (ms)
const SUSPEND_TTL_MS = 60 * 60 * 1000 // 1 hour

class ApiKeyRotator {
  /**
   * @param {string}   providerName — Used in log messages
   * @param {string[]} keys         — Array of API keys (from provider config)
   */
  constructor(providerName, keys = []) {
    this.providerName = providerName
    this.keys = keys.filter(Boolean) // remove any undefined/null
    this.cursor = 0
    // suspension map: { keyIndex: suspendedUntilTimestamp }
    this._suspended = {}
  }

  /**
   * Get the next available (non-suspended) API key.
   * Returns null if no keys are configured or all are suspended.
   */
  next() {
    if (this.keys.length === 0) return null

    const now = Date.now()
    const total = this.keys.length

    // Try each key starting from cursor, wrapping around
    for (let i = 0; i < total; i++) {
      const idx = (this.cursor + i) % total
      const suspendedUntil = this._suspended[idx]

      if (!suspendedUntil || now >= suspendedUntil) {
        // Un-suspend if the suspension has expired
        if (suspendedUntil && now >= suspendedUntil) {
          delete this._suspended[idx]
          travelLogger.info(this.providerName, `API key [${idx}] suspension expired — re-activating`)
        }
        // Advance cursor for next call
        this.cursor = (idx + 1) % total
        return this.keys[idx]
      }
    }

    // All keys suspended
    const suspendedCount = Object.keys(this._suspended).length
    travelLogger.error(this.providerName, `ALL ${suspendedCount} API keys are suspended`, {
      suspendedCount,
    })
    return null
  }

  /**
   * Mark the key at the given index as suspended due to auth failure (401/403).
   * Also advances cursor to skip this key.
   * @param {string} key — The actual key string that failed
   */
  suspend(key) {
    const idx = this.keys.indexOf(key)
    if (idx === -1) return

    const until = Date.now() + SUSPEND_TTL_MS
    this._suspended[idx] = until

    travelLogger.warn(this.providerName, `API key [${idx}] suspended for 1 hour due to auth failure`, {
      keyIndex: idx,
      suspendedUntil: new Date(until).toISOString(),
    })
  }

  /**
   * Returns true if at least one key is available (not suspended).
   */
  hasAvailableKeys() {
    if (this.keys.length === 0) return false
    const now = Date.now()
    const total = this.keys.length
    for (let i = 0; i < total; i++) {
      const suspendedUntil = this._suspended[i]
      if (!suspendedUntil || now >= suspendedUntil) {
        return true
      }
    }
    return false
  }

  /**
   * Current health summary for monitoring.
   */
  status() {
    const now = Date.now()
    const suspended = Object.entries(this._suspended)
      .filter(([, until]) => now < until)
      .length

    return {
      total: this.keys.length,
      available: this.keys.length - suspended,
      suspended,
    }
  }
}

module.exports = ApiKeyRotator
