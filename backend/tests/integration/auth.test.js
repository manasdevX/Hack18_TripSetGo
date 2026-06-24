const request = require('supertest');
const { app } = require('../../src/app');
const User = require('../../src/models/User.model');
const OTP = require('../../src/models/OTP.model');

// Mock email service to prevent actual emails from being sent
jest.mock('../../src/services/email.service', () => ({
  sendOTP: jest.fn().mockResolvedValue(true),
  sendPasswordReset: jest.fn().mockResolvedValue(true)
}));

describe('Auth Integration Tests', () => {
  const testUser = {
    name: 'Test User',
    email: 'testauth@example.com',
    password: 'Password123!'
  };

  it('should successfully sign up a new user and send OTP', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send(testUser);

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testUser.email);

    // Verify user is created but not verified
    const user = await User.findOne({ email: testUser.email });
    expect(user).toBeTruthy();
    expect(user.isEmailVerified).toBe(false);

    // Verify OTP was stored
    const otpDoc = await OTP.findOne({ email: testUser.email });
    expect(otpDoc).toBeTruthy();
    expect(otpDoc.otp).toHaveLength(6);
  });

  it('should fail login if email is not verified', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/verify your email/i);
  });

  it('should successfully verify OTP', async () => {
    const otpDoc = await OTP.findOne({ email: testUser.email });
    const otp = otpDoc.otp;

    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ email: testUser.email, otp });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);

    // Verify user is now verified
    const user = await User.findOne({ email: testUser.email });
    expect(user.isEmailVerified).toBe(true);
    
    // Verify OTP doc was deleted
    const deletedOtp = await OTP.findOne({ email: testUser.email });
    expect(deletedOtp).toBeNull();
  });

  it('should successfully login and return JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe(testUser.email);

    // Check if refresh token cookie is set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const hasRefreshToken = cookies.some(cookie => cookie.startsWith('refreshToken='));
    expect(hasRefreshToken).toBe(true);
  });
});
