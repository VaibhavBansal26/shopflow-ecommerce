# ShopFlow Ecommerce Platform

A full-stack, production-ready ecommerce platform handling **5,000 orders/day** with **100,000 concurrent users**.

## Architecture

```
shopflow-ecommerce/
├── backend/          # Node.js + Express API, WebSocket, Bull queues
├── frontend/         # React + Tailwind CSS (Shopper, Admin, Rider, AI Chat panels)
├── mobile/           # React Native (Android + iOS)
├── recommendation-engine/  # Python FastAPI — collaborative filtering + regional popularity
└── shared/           # Shared TypeScript types and constants
```

## Features

- **4 Panels**: Shopper, Admin, Rider, AI Chat (order via conversation)
- **Payments**: Google Pay, Card (Stripe), Cash on Delivery, Wallet
- **AI Recommendations**: Region-based + collaborative filtering + purchase history
- **Real-time**: WebSocket for live order tracking + rider location
- **Auth**: Google OAuth 2.0 + OTP (Twilio)
- **Subscriptions**: Monthly/weekly auto-delivery with discounts
- **Scheduled Delivery**: Pick date & time at checkout
- **Mobile**: React Native (Android + iOS)
- **Security**: Helmet, rate limiting, PCI-DSS tokenization, OTP, CORS, HPP

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Tailwind CSS, Redux Toolkit, Socket.io-client |
| Backend | Node.js, Express, Socket.io, Bull, Passport |
| Database | PostgreSQL + Redis |
| AI/ML | Python FastAPI, scikit-learn, OpenAI GPT-4 |
| Mobile | React Native 0.74, Expo, React Navigation |
| Payments | Stripe (card), Google Pay, Cash |
| Auth | Google OAuth 2.0, JWT, OTP via Twilio |
| Infra | Docker, Redis pub/sub, AWS S3 |

## Quick Start

```bash
# Backend
cd backend && cp .env.example .env && npm install && npm run db:migrate && npm run dev

# Frontend
cd frontend && npm install && npm run dev

# Recommendation Engine
cd recommendation-engine && pip install -r requirements.txt && uvicorn src.main:app --reload

# Mobile
cd mobile && npm install && npx expo start
```

## Scale Design

- PostgreSQL connection pooling (max 20 connections)
- Redis caching for products, recommendations, sessions
- Bull queues for order processing, notifications, email
- WebSocket rooms per order for efficient broadcasting
- Horizontal scaling ready (stateless API + Redis sessions)
