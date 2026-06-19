/**
 * Sanitization utilities for user-generated content
 * Prevents XSS attacks by escaping HTML and dangerous content
 */

const xss = require('xss')

const xssOptions = {
  whiteList: {},
  stripIgnoredTag: true,
  stripLeakedHtml: true,
  onTagAttr: (tag, name, value) => {
    // Remove all attributes
    return ''
  }
}

/**
 * Sanitize plain text input (escapes HTML, removes tags)
 * @param {string} text - Raw user input
 * @returns {string} Sanitized text
 */
const sanitizeText = (text) => {
  if (typeof text !== 'string') return ''
  return xss(text, xssOptions)
}

/**
 * Sanitize object containing multiple text fields
 * @param {object} obj - Object with text fields to sanitize
 * @param {array} fields - Field names to sanitize
 * @returns {object} Sanitized object
 */
const sanitizeObject = (obj, fields = []) => {
  if (!obj || typeof obj !== 'object') return obj
  const sanitized = { ...obj }
  
  fields.forEach(field => {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeText(sanitized[field])
    }
  })
  
  return sanitized
}

/**
 * Validate and sanitize review input
 * @param {object} reviewData - Review data to sanitize
 * @returns {object} Sanitized review data
 */
const sanitizeReview = (reviewData) => {
  return sanitizeObject(reviewData, ['title', 'text'])
}

/**
 * Validate and sanitize comment input
 * @param {string} comment - Comment text to sanitize
 * @returns {string} Sanitized comment
 */
const sanitizeComment = (comment) => {
  return sanitizeText(comment)
}

/**
 * Validate and sanitize user profile input
 * @param {object} userData - User profile data
 * @returns {object} Sanitized user data
 */
const sanitizeUserProfile = (userData) => {
  return sanitizeObject(userData, ['bio', 'name'])
}

module.exports = {
  sanitizeText,
  sanitizeObject,
  sanitizeReview,
  sanitizeComment,
  sanitizeUserProfile,
}
