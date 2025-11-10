# M-Pesa Daraja API Integration with Next.js

A complete implementation of Safaricom's M-Pesa Daraja API for processing payments in Kenya using STK Push.

## 📋 Table of Contents
- [About M-Pesa Payment Methods](#about-mpesa-payment-methods)
- [Project Focus](#project-focus)
- [Prerequisites](#prerequisites)
- [Getting Your Credentials](#getting-your-credentials)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Installation](#installation)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)

---

## 💡 About M-Pesa Payment Methods

Safaricom M-Pesa offers two main ways to accept payments:

### 1. **SIM Toolkit (STK) / Manual Payment**
- Customer opens M-Pesa menu on their phone
- Selects "Lipa na M-Pesa" → "Pay Bill"
- Enters business number, account number, and amount manually
- Receives M-Pesa confirmation code (e.g., `QH12ABC34D`)

### 2. **STK Push (Automated)**
- Your system sends a payment request to customer's phone
- Customer receives automatic popup on their phone
- Customer enters M-Pesa PIN to complete
- Payment is processed and confirmed automatically

## 🎯 Project Focus

**This project focuses on STK Push** - the automated payment method. STK Push provides:
- ✅ Better user experience (no manual entry)
- ✅ Automatic payment confirmation
- ✅ Real-time transaction tracking
- ✅ Reduced payment errors

---

## 📦 Prerequisites

- Node.js 18+
- PostgreSQL database (or Neon)
- Safaricom Daraja API account ([Sign up here](https://developer.safaricom.co.ke/))

---

## 🔑 Getting Your Credentials

### Step 1: Get Business Shortcode

1. Log in to [Safaricom Daraja Portal](https://developer.safaricom.co.ke/)
2. Navigate to **APIs** in the top menu
3. Select **M-Pesa Express (STK Push)**
4. Click on **"Simulate"** button
5. In the simulator page, you'll see the **Shortcode** displayed
6. Copy this shortcode (e.g., `174379` for sandbox)

**Note:** In sandbox/test mode, the shortcode is typically `174379`. In production, you'll receive your actual business shortcode from Safaricom.

### Step 2: Get Consumer Key & Consumer Secret

1. Still on the Daraja portal, go to **My Apps**
2. Create a new app or select an existing one
3. Copy your **Consumer Key** and **Consumer Secret**

### Step 3: Get Passkey

The **Passkey** is provided by Safaricom and is used to generate the password for STK Push requests.

**How to get it:**
- **Sandbox:** Passkey is publicly available in Daraja documentation
  - Default sandbox passkey: `bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919`
- **Production:** Request your passkey from Safaricom after your app is approved
  - Email: apisupport@safaricom.co.ke
  - Or contact your account manager

---

## 🔐 Environment Variables

Create a `.env.local` file in your project root:

```env
# Database Connection
DATABASE_URL="postgresql://user:password@localhost:5432/mpesa_db"
# Or use Neon: postgresql://user:password@your-neon-hostname/mpesa_db

# M-Pesa Daraja API Credentials
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_SHORTCODE=174379

# Environment (sandbox or production)
MPESA_ENVIRONMENT=sandbox

# Callback URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000
MPESA_CALLBACK_URL=http://localhost:3000/api/mpesa/confirm
```

### Variable Explanations:

| Variable | Description | Where to Get It |
|----------|-------------|-----------------|
| `DATABASE_URL` | PostgreSQL connection string | Your database provider (local or Neon) |
| `MPESA_CONSUMER_KEY` | App consumer key | Daraja Portal → My Apps |
| `MPESA_CONSUMER_SECRET` | App consumer secret | Daraja Portal → My Apps |
| `MPESA_PASSKEY` | STK Push passkey | Daraja docs (sandbox) or Safaricom (production) |
| `MPESA_SHORTCODE` | Business number | Daraja Portal → APIs → STK Simulator |
| `MPESA_ENVIRONMENT` | `sandbox` or `production` | Set based on your testing stage |
| `MPESA_CALLBACK_URL` | Where M-Pesa sends results | Your public URL + `/api/mpesa/confirm` |

---

## 🗄️ Database Setup

This project uses **Prisma ORM** with PostgreSQL. You can use any PostgreSQL database, including **Neon** (serverless PostgreSQL).

### Option 1: Local PostgreSQL

```bash
# Install PostgreSQL locally
# Then create a database
createdb mpesa_db
```

### Option 2: Neon (Recommended for production)

1. Sign up at [Neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Add it to your `.env.local` as `DATABASE_URL`

### Run Migrations

```bash
# Install Prisma
npm install @prisma/client prisma

# Initialize Prisma (if not done)
npx prisma init

# Run migrations to create tables
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate
```

This creates two tables:
- `Transaction` - Stores STK Push payment records
- `ManualPayment` - Stores manual payment submissions

---

## 🚀 Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd mpesa-integration

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see your app.

---

## 🔌 API Endpoints

### 1. **POST `/api/mpesa/stk-push`**
Initiates an STK Push payment request.

**Request Body:**
```json
{
  "phoneNumber": "254712345678",
  "amount": 100,
  "accountReference": "ORDER123",
  "transactionDesc": "Payment for product"
}
```

**Response:**
```json
{
  "success": true,
  "message": "The service request is processed successfully.",
  "checkoutRequestId": "ws_CO_123456789",
  "transactionId": "uuid-here"
}
```

**What it does:**
- Sends payment prompt to customer's phone
- Saves transaction to database
- Returns checkout ID for status tracking

---

### 2. **POST `/api/mpesa/confirm`**
Receives payment confirmation from M-Pesa (webhook endpoint).

**What it does:**
- Automatically called by Safaricom when payment is completed
- Updates transaction status in database
- Records M-Pesa receipt number and transaction details
- **Note:** This endpoint is called by M-Pesa servers, not your frontend

---

### 3. **GET `/api/mpesa/status?id={transactionId}`**
Checks the status of a payment transaction.

**Query Parameters:**
- `id` - Transaction ID returned from `/stk-push`

**Response:**
```json
{
  "transaction": {
    "id": "uuid",
    "status": "success",
    "mpesaReceiptNumber": "QH12ABC34D",
    "amount": 100,
    "phoneNumber": "254712345678"
  }
}
```

**What it does:**
- Retrieves current transaction status from database
- Used by frontend to poll for payment completion

---

### 4. **POST `/api/mpesa/manual-payment`**
Accepts manual payment submissions (when customer pays via SIM toolkit).

**Request Body:**
```json
{
  "phoneNumber": "254712345678",
  "amount": 100,
  "mpesaCode": "QH12ABC34D",
  "accountReference": "ORDER123"
}
```

**What it does:**
- Records manual payment for verification
- Prevents duplicate M-Pesa code submissions
- Requires admin verification before approval

---

### 5. **GET/POST `/api/mpesa/debug`**
Debug endpoint for testing and troubleshooting.

**What it does:**
- Tests API connectivity
- Verifies credentials
- Checks environment configuration
- Useful during development

---

## 🧪 Testing

### Local Testing with ngrok

M-Pesa needs a public URL to send callbacks. Use ngrok for local testing:

```bash
# Install ngrok
npm install -g ngrok

# Start your Next.js app
npm run dev

# In another terminal, expose port 3000
ngrok http 3000
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`) and update your `.env.local`:

```env
MPESA_CALLBACK_URL=https://abc123.ngrok.io/api/mpesa/confirm
```

### Test STK Push Flow

1. Make a POST request to `/api/mpesa/stk-push`
2. Check your test phone for the M-Pesa prompt
3. Enter your M-Pesa PIN
4. Check `/api/mpesa/status` to see updated status

---

## 📱 Frontend Integration

The included `PaymentForm.tsx` component provides:
- Phone number input
- Amount input
- STK Push initiation
- Real-time status polling
- Success/failure messages

---

## 🔒 Production Checklist

Before going live:

- [ ] Switch `MPESA_ENVIRONMENT` to `production`
- [ ] Update to production credentials (Consumer Key, Secret, Passkey)
- [ ] Use your actual business shortcode
- [ ] Set production callback URL (must be HTTPS)
- [ ] Configure proper database with connection pooling
- [ ] Add authentication to admin endpoints
- [ ] Implement rate limiting
- [ ] Set up monitoring and logging
- [ ] Test with small amounts first

---

## 📞 Support

For M-Pesa API issues:
- Email: apisupport@safaricom.co.ke
- Portal: [developer.safaricom.co.ke](https://developer.safaricom.co.ke/)

---

## 📄 License

MIT License - feel free to use this project for your own applications.

---

**Izere! 🚀**