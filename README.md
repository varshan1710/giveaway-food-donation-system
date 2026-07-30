# 🍱 GiveAway — Food Donation & Logistics Management System

[![MERN Stack](https://img.shields.io/badge/Stack-MERN-green.svg)](https://github.com/varshan1710/giveaway-food-donation-system)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Frontend: Vercel](https://img.shields.io/badge/Frontend-Vercel-black.svg)](https://vercel.com)
[![Backend: Render](https://img.shields.io/badge/Backend-Render-informational.svg)](https://render.com)
[![Database: MongoDB Atlas](https://img.shields.io/badge/Database-MongoDB%20Atlas-brightgreen.svg)](https://mongodb.com)

**GiveAway** is a full-stack MERN web application designed to eliminate food waste by seamlessly connecting **Food Donors** (restaurants, hotels, catering services, households) with **NGOs** and **Volunteers** for rapid food pickup and distribution before expiration.

GitHub Repository: [https://github.com/varshan1710/giveaway-food-donation-system](https://github.com/varshan1710/giveaway-food-donation-system)

---

## 📋 Table of Contents

- [Key Features](#-key-features)
- [Smart Heuristic Features](#-smart-heuristic-features)
- [Tech Stack & Free APIs](#-tech-stack--free-apis)
- [Folder Structure](#-folder-structure)
- [Database Schemas](#-database-schemas)
- [API Routes](#-api-routes)
- [Environment Variables](#-environment-variables)
- [Local Installation & Setup](#-local-installation--setup)
- [Deployment Instructions](#-deployment-instructions)
  - [Deploy Backend to Render](#1-deploy-backend-to-render)
  - [Deploy Frontend to Vercel](#2-deploy-frontend-to-vercel)
- [Future Enhancements](#-future-enhancements)

---

## ✨ Key Features

### 👤 Role-Based Portals

| Role | Core Capabilities |
|---|---|
| **Donor** | Post food donations with image uploads, specify quantity, category, expiry date, and pick precise location on an interactive OpenStreetMap picker. Receive instant SMS alert delivery feedback. |
| **NGO** | Permanent office location registration, view nearby food donations (list and Leaflet map view), accept/reject donations, assign volunteers, track volunteer live GPS by phone number. |
| **Volunteer** | Toggle **Start/Stop Live GPS Tracking**, receive automatic in-app & Browser Notifications when a new food donation is posted within 5 km, self-accept nearby pickups, update delivery pipeline status (`picked_up` → `delivered`). |
| **Admin** | Real-time Operations Map showing live volunteer positions & donation statuses, platform-wide analytics charts (meals served, food waste saved, donation trends), user management, NGO/volunteer approval management. |

### 🚀 Advanced Logistics & Tracking System

1. **FREE Real-Time Volunteer GPS Tracking**
   - Volunteers toggle **Start Tracking** to broadcast continuous GPS coordinates via the HTML5 Browser Geolocation API every 10–15 seconds to Node.js/Express.
   - Stores latest coordinates in MongoDB using 2dsphere GeoJSON index.
   - Automatically sanitizes invalid/uninitialized `[0,0]` coordinates to prevent markers from rendering in the ocean.

2. **Smart Nearby Volunteer Notifications**
   - When a donor creates a new donation, the system calculates distance to all active tracking volunteers using the **Haversine Formula**.
   - Volunteers within the radius (default 5 km, auto-expanded for urgent expiry) receive instant **Browser Push Notifications** and an interactive in-app modal to **Accept** or **Decline**.

3. **First-Accept-Wins Atomic Locking**
   - Atomic MongoDB `findOneAndUpdate({ _id, status: 'pending' })` guarantees that if multiple NGOs or volunteers attempt to accept the same donation simultaneously, exactly one succeeds while others receive a clean notification: *"This donation has already been assigned."*

4. **Admin Live Operations Map**
   - Interactive Leaflet dashboard mapping active volunteers (pulsing green pins), stale/idle pings (amber pins), pending donations (red pins), and active pickups (blue pins). Auto-refreshes every 15 seconds.

5. **Textbee SMS Alerting**
   - Automated free SMS alerts sent to registered NGO phone numbers (`+91XXXXXXXXXX` Indian E.164 format) when a nearby donor posts surplus food.

---

## 🧠 Smart Heuristic Features

- **Expiry-Aware Radius Multiplier:** Alert radius dynamically expands (up to 2.5×) when food expiry is under 2 hours to ensure rapid pickup.
- **Priority Score Ranking:** Orders donations based on urgency (hours to expiry) and volume (derived estimated meals).
- **Demand Forecasting:** Weighted moving-average calculation forecasting donation volume for the next 7 days on the admin analytics dashboard.
- **Duplicate & Suspicious Post Detector:** Flags suspicious duplicate listings or spam frequency before approval.

---

## 🛠️ Tech Stack & Free APIs

- **Frontend:** React 18, Vite, React Router v6, Tailwind CSS, React-Leaflet (OpenStreetMap), Chart.js (react-chartjs-2), Axios, React-Hot-Toast, React-Icons.
- **Backend:** Node.js, Express.js, Mongoose, JWT authentication, bcryptjs, Multer (image uploads), Nodemailer, Textbee API (SMS gateway).
- **Database:** MongoDB Atlas (GeoJSON 2dsphere indexing).
- **Free Map Infrastructure:** OpenStreetMap tile layers via Leaflet (No paid Google Maps or Mapbox APIs required).

---

## 📁 Folder Structure

```
giveaway-food-donation-system/
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB Atlas connection & auto-sync logic
│   ├── controllers/
│   │   ├── adminController.js     # Analytics, live volunteer map endpoint
│   │   ├── authController.js      # Register, login, profile management
│   │   ├── donationController.js  # Donation CRUD, Haversine alerts, atomic accept
│   │   ├── ngoController.js       # NGO profile, available volunteer lookup
│   │   ├── volunteerController.js # Start/stop tracking, GPS location updates
│   │   └── feedbackController.js  # Ratings & feedback
│   ├── middleware/
│   │   ├── authMiddleware.js      # JWT token verification & role authorization
│   │   ├── errorMiddleware.js     # Express global error handler
│   │   ├── uploadMiddleware.js    # Multer image storage setup
│   │   └── validateMiddleware.js  # Express-validator input validation
│   ├── models/
│   │   ├── User.js                # User collection (+91 phone validation, GeoJSON location)
│   │   ├── Donation.js            # Food donation schema (2dsphere pickup index)
│   │   ├── NGO.js                 # NGO office location & service radius
│   │   ├── Volunteer.js           # Volunteer tracking status & vehicle type
│   │   └── Feedback.js            # Feedback schema
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   ├── donationRoutes.js
│   │   ├── ngoRoutes.js
│   │   ├── volunteerRoutes.js
│   │   └── feedbackRoutes.js
│   ├── uploads/                   # Uploaded food images directory (.gitkeep)
│   ├── utils/
│   │   ├── smartFeatures.js       # Haversine distance, priority score, forecasting
│   │   ├── notify.js              # SMS & email alerting helpers
│   │   └── seed.js                # Database seeder script
│   ├── .env.example
│   ├── package.json
│   └── server.js                  # Express server entry point
├── frontend/
│   ├── src/
│   │   ├── components/            # MapPicker, LiveTrackingMap, VolunteerPhoneTracker, etc.
│   │   ├── context/               # AuthContext (JWT session state)
│   │   ├── pages/
│   │   │   ├── admin/             # AdminAnalytics, AdminLiveMap, AdminUsers, etc.
│   │   │   ├── donor/             # NewDonation, MyDonations
│   │   │   ├── ngo/               # BrowseDonations, AcceptedDonations
│   │   │   └── volunteer/         # VolunteerOverview, MyPickups
│   │   ├── services/              # Axios service endpoints
│   │   ├── App.jsx                # Application routes
│   │   ├── main.jsx               # Entry point
│   │   └── index.css              # Tailwind CSS & map animations
│   ├── .env.example
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── vercel.json                # Single-page app rewrite configuration
│   └── package.json
├── .gitignore                     # Git exclusion rules
├── DEPLOYMENT.md                  # Deployment guide
└── README.md                      # Project documentation
```

---

## 🗄️ Database Schemas

- **User**: Name, Email, Password (hashed), Role (`donor`, `ngo`, `volunteer`, `admin`), Phone (`+91XXXXXXXXXX`), Location (`Point` GeoJSON), `isActive`, `isVerified`.
- **Donation**: Donor ID, Food Name, Category, Quantity, Expiry Date, Pickup Location (`Point` GeoJSON), Status (`pending`, `accepted`, `out_for_pickup`, `picked_up`, `delivered`), Accepted NGO ID, Assigned Volunteer ID, Timeline audit log.
- **NGO**: User ID, Organization Name, Permanent Office Location (`Point` GeoJSON), Office Address, Service Radius (km), Approved status.
- **Volunteer**: User ID, Vehicle Type, `trackingEnabled` (Boolean), `availabilityStatus` (`available`, `busy`, `offline`), `lastLocationUpdate`, Total Pickups Completed.

---

## 🔌 API Routes

### Authentication (`/api/auth`)
- `POST /register` — Register donor, NGO (with office location picker), or volunteer
- `POST /login` — Authenticate and receive JWT token
- `GET /me` — Fetch current user profile

### Donations (`/api/donations`)
- `POST /` — Create donation & trigger NGO SMS + nearby volunteer alert
- `GET /` — Fetch donations (filtered by user role)
- `PUT /:id/accept` — Atomic NGO acceptance
- `PUT /:id/assign-volunteer` — Assign volunteer to accepted donation
- `PUT /:id/status` — Volunteer updates status (`picked_up` / `delivered`)
- `GET /track-by-phone/:phone` — Track active volunteer pickups by phone number

### Volunteer Tracking (`/api/volunteer`)
- `PUT /location` — Update volunteer GPS coordinates
- `PUT /tracking/start` — Enable tracking & set status to available
- `PUT /tracking/stop` — Disable tracking & set status to offline
- `GET /nearby-donations` — Poll pending donations within radius
- `PUT /donations/:id/accept` — Volunteer atomic self-acceptance

### Admin (`/api/admin`)
- `GET /analytics` — Platform-wide metrics and demand forecast
- `GET /volunteers/live` — Fetch all currently tracking volunteers for live map
- `GET /users` — Manage users & toggle active status

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/giveaway?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

# Optional Notifications
TEXTBEE_API_KEY=your_textbee_api_key
TEXTBEE_DEVICE_ID=your_textbee_device_id
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 💻 Local Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas database connection string

### 1. Clone Repository
```bash
git clone https://github.com/varshan1710/giveaway-food-donation-system.git
cd giveaway-food-donation-system
```

### 2. Configure Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env and enter your MONGO_URI and JWT_SECRET
```

### 3. Seed Demo Data (Optional)
```bash
npm run seed
```

### 4. Configure Frontend
```bash
cd ../frontend
npm install
cp .env.example .env
```

### 5. Run Application
```bash
# Terminal 1: Backend Server (http://localhost:5000)
cd backend
npm run dev

# Terminal 2: Frontend Server (http://localhost:5173)
cd frontend
npm run dev
```

---

## 🚀 Deployment Instructions

### 1. Deploy Backend to Render

1. Create a new **Web Service** on [Render](https://render.com).
2. Connect your GitHub repository: `varshan1710/giveaway-food-donation-system`.
3. Set the following build settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Add Environment Variables under Render dashboard settings:
   - `MONGO_URI` = `<Your MongoDB Atlas connection string>`
   - `JWT_SECRET` = `<Your secret key>`
   - `JWT_EXPIRES_IN` = `7d`
   - `NODE_ENV` = `production`
   - `CLIENT_URL` = `<Your deployed Vercel frontend URL>`
5. Click **Deploy Web Service** and note your API URL (e.g. `https://giveaway-api.onrender.com`).

### 2. Deploy Frontend to Vercel

1. Create a new project on [Vercel](https://vercel.com) and import `varshan1710/giveaway-food-donation-system`.
2. Configure project settings:
   - **Root Directory:** `frontend`
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add Environment Variable:
   - `VITE_API_URL` = `https://giveaway-api.onrender.com/api` (your Render backend API URL)
4. Click **Deploy**. Vercel will build the frontend and generate your live deployment link!

---

## 🔮 Future Enhancements

- **IoT Smart Container Integration:** Real-time temperature & humidity monitoring during food transport.
- **Cloud Image Storage:** AWS S3 or Cloudinary integration for scalable food image storage.
- **WebSockets / Socket.IO:** Real-time push updates alongside HTTP polling for instant map marker animations.
- **AI Freshness Detector:** Computer vision model to estimate food freshness from donor uploaded photos.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
