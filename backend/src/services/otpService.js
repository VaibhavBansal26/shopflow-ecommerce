const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { cache } = require('../config/redis');
const { AppError } = require('../middleware/errorHandler');

const OTP_TTL = 600; // 10 minutes
const MAX_ATTEMPTS = 5;

const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

const sendOTP = async (phone) => {
  const otp = generateOTP();
  const hash = await bcrypt.hash(otp, 10);

  // Store hashed OTP in Redis with TTL
  await cache.set(`otp:${phone}`, { hash, attempts: 0 }, OTP_TTL);

  if (process.env.NODE_ENV === 'production') {
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await twilio.messages.create({
      body: `Your ShopFlow OTP is ${otp}. Valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
  } else {
    console.log(`[DEV] OTP for ${phone}: ${otp}`);
  }
};

const verifyOTP = async (phone, otp) => {
  const data = await cache.get(`otp:${phone}`);
  if (!data) throw new AppError('OTP expired or not sent.', 400);

  if (data.attempts >= MAX_ATTEMPTS) {
    await cache.del(`otp:${phone}`);
    throw new AppError('Too many attempts. Request a new OTP.', 429);
  }

  const valid = await bcrypt.compare(otp, data.hash);
  if (!valid) {
    data.attempts++;
    await cache.set(`otp:${phone}`, data, OTP_TTL);
    throw new AppError('Invalid OTP.', 400);
  }

  await cache.del(`otp:${phone}`);
  return true;
};

module.exports = { sendOTP, verifyOTP };
