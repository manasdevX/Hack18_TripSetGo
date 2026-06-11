// server/src/agents/BaseAgent.js
const { GoogleGenerativeAI } = require('@google/generative-ai')
const logger = require('../utils/logger')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

/**
 * BaseAgent — Abstract base class for all travel planning agents.
 * Every specialized agent extends this and implements:
 *   - buildPrompt(context)  → returns the prompt string
 *   - parseResult(json)     → validates/transforms the raw parsed JSON
 *   - fallback(context)     → returns a deterministic result if Gemini fails
 */
class BaseAgent {
  constructor(name) {
    this.name  = name
    this.model = genAI.getGenerativeModel({ model: MODEL })
  }

  /**
   * Core execution method — builds prompt, calls Gemini, retries, extracts JSON.
   * On total failure, delegates to this.fallback(context).
   * @param {Object} context - Shared memory object (read + write)
   * @returns {Object} Agent result to be merged into shared memory
   */
  async execute(context) {
    const prompt = this.buildPrompt(context)
    const maxRetries = 3
    const delays = [1000, 2000, 4000]

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await this.model.generateContent(prompt)
        const text   = result.response.text().trim()

        // Strip accidental markdown fences
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('No JSON object in response')

        const parsed = JSON.parse(jsonMatch[0])
        const output = this.parseResult(parsed, context)

        logger.info(`[${this.name}] ✅ Done (attempt ${attempt + 1})`)
        return output
      } catch (err) {
        logger.warn(`[${this.name}] ⚠️ Attempt ${attempt + 1} failed: ${err.message}`)
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, delays[attempt]))
        } else {
          logger.error(`[${this.name}] ❌ All attempts failed — using fallback`)
          return this.fallback(context)
        }
      }
    }
  }

  // --- Abstract methods — must be overridden by subclasses ---
  buildPrompt(_context) { throw new Error(`${this.name} must implement buildPrompt()`) }
  parseResult(json, _context)  { return json }
  fallback(_context)    { return {} }
}

module.exports = BaseAgent
