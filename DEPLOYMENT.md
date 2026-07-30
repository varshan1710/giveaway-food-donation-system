# 🚀 GiveAway — Deployment Guide

This guide walks through deploying GiveAway using:
- **MongoDB Atlas** — managed database
- **Render** — backend (Node/Express API)
- **Vercel** — frontend (React/Vite)
- **GitHub** — source control and CI trigger for both platforms

---

## 1. Push the code to GitHub

```bash
cd giveaway
git init
git add .
git commit -m "Initial commit: GiveAway MERN app"
git branch -M main
git remote add origin https://github.com/<your-username>/giveaway.git
git push -u origin main
```

> Both `backend/` and `frontend/` live in the same repo (a monorepo). Render and Vercel both support deploying from a subdirectory of a repo, so no need to split them.

---

## 2. Set up MongoDB Atlas

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free account/cluster (M0 tier is enough to start).
2. **Database Access** → Add a database user with a strong password (this is *not* your Atlas login password).
3. **Network Access** → Add IP Address → allow `0.0.0.0/0` (or Render's specific egress IPs if you want to lock it down later).
4. **Connect** → "Drivers" → copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Append a database name before the `?`, e.g. `.../giveaway?retryWrites=true&w=majority`. This becomes your `MONGO_URI`.

---

## 3. Deploy the backend on Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**.
2. Connect your GitHub repo and select it.
3. Configure:
   - **Root Directory:** `backend`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free (or paid for always-on)
4. Add environment variables (Render dashboard → Environment):

   | Key | Value |
   |---|---|
   | `PORT` | `5000` (Render also injects its own `PORT`; the app reads `process.env.PORT` either way) |
   | `NODE_ENV` | `production` |
   | `MONGO_URI` | your Atlas connection string |
   | `JWT_SECRET` | a long random string (e.g. generate with `openssl rand -base64 48`) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `CLIENT_URL` | your Vercel frontend URL, e.g. `https://giveaway.vercel.app` (set after step 4) |
   | `ADMIN_EMAIL` | email for the seeded admin account |
   | `ADMIN_PASSWORD` | password for the seeded admin account |

5. Click **Create Web Service**. Render will build and deploy; note the resulting URL, e.g. `https://giveaway-api.onrender.com`.
6. (Optional) Run the seed script once via Render's **Shell** tab:
   ```bash
   npm run seed
   ```
7. Verify: visit `https://giveaway-api.onrender.com/api/health` — you should see `{"success":true,"status":"ok",...}`.

> **Note on file uploads:** Render's free-tier filesystem is ephemeral — uploaded images in `backend/uploads` will be lost on redeploy/restart. For production, swap the Multer disk storage engine for a cloud storage provider (S3, Cloudinary, etc.) without changing any controller code — only `middleware/uploadMiddleware.js` needs to change.

---

## 4. Deploy the frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → import your GitHub repo.
2. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add environment variable:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://giveaway-api.onrender.com/api` (your Render backend URL + `/api`) |

4. Click **Deploy**. Vercel will build and give you a URL, e.g. `https://giveaway.vercel.app`.
5. Go back to Render and update `CLIENT_URL` to this Vercel URL, then redeploy the backend (or it will auto-restart) so CORS allows requests from your live frontend.

`vercel.json` is already included in `frontend/` with a SPA rewrite rule so client-side routing (React Router) works correctly on refresh/direct links.

---

## 5. Post-deployment checklist

- [ ] Visit the live frontend URL and confirm the landing page loads
- [ ] Register a test donor, NGO, and volunteer account
- [ ] Log in as the seeded admin and approve the NGO/volunteer
- [ ] Post a donation as the donor, accept it as the NGO, assign the volunteer, and walk it through to "Delivered"
- [ ] Check the admin analytics dashboard renders charts correctly
- [ ] Confirm dark/light mode toggle works
- [ ] Test on a mobile viewport for responsiveness

---

## 6. Continuous deployment

Both Render and Vercel auto-deploy on every push to `main` (or your chosen branch) once connected to the GitHub repo — no extra CI config needed for a basic setup.

---

## 7. Environment variable summary

**Backend (Render) — `.env` equivalent:**
```
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
JWT_EXPIRES_IN=7d
CLIENT_URL=https://giveaway.vercel.app
ADMIN_EMAIL=admin@giveaway.org
ADMIN_PASSWORD=ChangeMe123!
```

**Frontend (Vercel) — `.env` equivalent:**
```
VITE_API_URL=https://giveaway-api.onrender.com/api
```
