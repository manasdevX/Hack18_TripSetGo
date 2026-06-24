const request = require('supertest');
const { app } = require('../../src/app');
const User = require('../../src/models/User.model');
const Trip = require('../../src/models/Trip.model');

jest.mock('../../src/services/email.service', () => ({
  sendOTP: jest.fn().mockResolvedValue(true),
  sendPasswordReset: jest.fn().mockResolvedValue(true)
}));

// Mock the generateTripPlan service
jest.mock('../../src/services/gemini.service', () => ({
  generateTripPlan: jest.fn().mockResolvedValue({
    meta: { total_days: 2 },
    itinerary: [],
    budget_breakdown_estimate: {}
  })
}));

describe('Trip Integration Tests', () => {
  let token;
  let userId;
  let tripId;

  beforeAll(async () => {
    // Create a verified user
    const user = await User.create({
      name: 'Trip Tester',
      email: 'triptester@example.com',
      passwordHash: 'Password123!',
      isEmailVerified: true
    });
    userId = user._id;

    // Login to get token
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'triptester@example.com', password: 'Password123!' });
    
    token = res.body.data.accessToken;
  });

  const tripPayload = {
    source: 'New York',
    destination: 'Paris',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    budget: 5000,
    numTravelers: 2,
    groupType: 'couple',
    pace: 'balanced',
    preferences: ['culture', 'food']
  };

  it('should create a new trip and return planData', async () => {
    const res = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${token}`)
      .send(tripPayload);

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBeDefined();
    
    tripId = res.body.data._id;
  });

  it('should retrieve the created trip', async () => {
    const res = await request(app)
      .get(`/api/v1/trips/${tripId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.destination).toBe('Paris');
    expect(res.body.data.source).toBe('New York');
  });

  it('should retrieve all trips for the user', async () => {
    const res = await request(app)
      .get('/api/v1/trips/my-trips')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]._id).toBe(tripId);
  });

  it('should update the trip', async () => {
    const res = await request(app)
      .put(`/api/v1/trips/${tripId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'My updated trip' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('My updated trip');
  });

  it('should delete the trip', async () => {
    const res = await request(app)
      .delete(`/api/v1/trips/${tripId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);

    // Verify it is deleted
    const trip = await Trip.findById(tripId);
    expect(trip).toBeNull();
  });
});
