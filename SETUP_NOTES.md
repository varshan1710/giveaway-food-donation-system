# Setup Notes — Read This First

This zip includes a `backend/.env` file already pre-filled with your MongoDB
Atlas username and cluster (`varshannashok1710_db_user` @ `cluster0.nkyaqnt.mongodb.net`),
your database name (`giveaway`), and a freshly generated `JWT_SECRET`.

## ⚠️ Important: rotate your password first

Your database password was pasted in plain text in an earlier chat message,
so it should be treated as compromised. Before using this project:

1. Go to MongoDB Atlas → **Database Access**
2. Click **Edit** next to `varshannashok1710_db_user`
3. Click **Edit Password** → generate/enter a new password → **Update User**
4. Copy that new password

## Only one edit needed

Open `backend/.env` and replace `<PASTE_YOUR_NEW_PASSWORD_HERE>` in the
`MONGO_URI` line with your new password:

```
MONGO_URI=mongodb+srv://varshannashok1710_db_user:YOUR_NEW_PASSWORD@cluster0.nkyaqnt.mongodb.net/giveaway?retryWrites=true&w=majority&appName=Cluster0
```

**If your new password contains special characters** (`@ # : / ? %`), URL-encode
them first (e.g. `@` → `%40`, `#` → `%23`) or the connection will fail.

Nothing else in the backend needs to change — no source file (`models/`,
`controllers/`, `routes/`, `server.js`) references credentials directly; they
all read from `process.env.MONGO_URI` via `config/db.js`.

## Run it

```bash
cd backend
npm install
npm run seed   # creates admin + demo donor/NGO/volunteer accounts
npm run dev    # starts the API on http://localhost:5000
```

Check `http://localhost:5000/api/health` — you should see
`{"success":true,"status":"ok",...}`.

Then, in a second terminal:

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:5000/api is already correct
npm run dev            # starts the app on http://localhost:5173
```

## Reminder

`backend/.env` is already listed in `.gitignore` — don't remove it from
there, and never commit this file to a public repo, since it will contain
your real database password once you fill it in.
