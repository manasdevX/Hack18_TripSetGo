// backend/src/services/travel/dto/schemas.js
// ─────────────────────────────────────────────────────────────────────────────
// Universal Normalization Layer — DTO Architecture and Validation Strategy
// ─────────────────────────────────────────────────────────────────────────────
const Joi = require('joi');
const travelLogger = require('../utils/travelLogger');

const schemas = {};

// 1. Hotel Schema
schemas.Hotel = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().required(),
  rating: Joi.number().min(0).max(10).allow(null),
  address: Joi.string().allow(null),
  coordinates: Joi.object({
    lat: Joi.number().required(),
    lon: Joi.number().required()
  }).allow(null),
  photos: Joi.array().items(Joi.string().uri()),
  category: Joi.string().allow(null),
  source: Joi.string().required()
}).unknown(true);

// 2. Restaurant Schema
schemas.Restaurant = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().required(),
  rating: Joi.number().min(0).max(10).allow(null),
  cuisine: Joi.string().allow(null),
  address: Joi.string().allow(null),
  coordinates: Joi.object({
    lat: Joi.number().required(),
    lon: Joi.number().required()
  }).allow(null),
  photos: Joi.array().items(Joi.string().uri()),
  source: Joi.string().required()
}).unknown(true);

// 3. Attraction Schema
schemas.Attraction = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().required(),
  category: Joi.string().allow(null),
  description: Joi.string().allow(null),
  coordinates: Joi.object({
    lat: Joi.number().required(),
    lon: Joi.number().required()
  }).allow(null),
  rating: Joi.number().min(0).max(10).allow(null),
  source: Joi.string().required()
}).unknown(true);

// 4. Flight Schema
schemas.Flight = Joi.object({
  airline: Joi.object({
    name: Joi.string().required(),
    iataCode: Joi.string().allow(null)
  }).unknown(true).required(),
  departureAirport: Joi.object({
    name: Joi.string().allow(null),
    iataCode: Joi.string().required()
  }).unknown(true).required(),
  arrivalAirport: Joi.object({
    name: Joi.string().allow(null),
    iataCode: Joi.string().required()
  }).unknown(true).required(),
  departureTime: Joi.string().isoDate().allow(null),
  arrivalTime: Joi.string().isoDate().allow(null),
  duration: Joi.number().allow(null),
  status: Joi.string().valid('scheduled', 'active', 'landed', 'cancelled', 'diverted', 'incident', 'unknown').required(),
  source: Joi.string().required()
}).unknown(true);

// 5. Destination Schema (Mapbox)
schemas.Destination = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().required(),
  country: Joi.string().allow(null),
  coordinates: Joi.object({
    lat: Joi.number().required(),
    lon: Joi.number().required()
  }).required(),
  source: Joi.string().required()
}).unknown(true);

/**
 * Validates an entity against a DTO schema.
 * @param {string} schemaName 
 * @param {Object} data 
 * @returns {Object|null} Returns valid data, or null if validation fails.
 */
function validateEntity(schemaName, data) {
  if (!data) return null;
  const schema = schemas[schemaName];
  if (!schema) {
    travelLogger.warn('Normalisation', `Unknown schema: ${schemaName}`);
    return null;
  }
  const { error, value } = schema.validate(data, { stripUnknown: false });
  if (error) {
    travelLogger.warn('Normalisation', `Validation failed for ${schemaName}: ${error.message}`);
    return null; // Fail-open: drop invalid entity, but don't crash
  }
  return value;
}

/**
 * Validates an array of entities against a DTO schema.
 * @param {string} schemaName 
 * @param {Object[]} list 
 * @returns {Object[]} Returns array of valid entities only.
 */
function validateList(schemaName, list) {
  if (!Array.isArray(list)) return [];
  return list.map(item => validateEntity(schemaName, item)).filter(Boolean);
}

module.exports = {
  validateEntity,
  validateList,
  schemas
};
