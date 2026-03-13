require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
 res.json({ status: "ok", time: new Date().toISOString() });
});

// Utility helpers
function weekStart(date) {
 const d = new Date(date);
 const day = d.getDay();
 const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
 const monday = new Date(d.setDate(diff));
 return monday.toISOString().split("T")[0];
}

// ===== Sessions =====
app.get("/api/sessions", async (req, res) => {
 const { from, to } = req.query;
 try {
  const result = await db.query(
   `SELECT * FROM workout_sessions
       WHERE ($1::date IS NULL OR date >= $1)
         AND ($2::date IS NULL OR date <= $2)
       ORDER BY date DESC, day_type ASC`,
   [from || null, to || null],
  );
  res.json(result.rows);
 } catch (err) {
  console.error(err);
  res.status(500).json({ error: "Failed to fetch sessions" });
 }
});

app.post("/api/sessions", async (req, res) => {
 const {
  date,
  dayType,
  exercises = {},
  cardio = false,
  notes = "",
  completed = false,
  kcal = 0,
 } = req.body;
 if (!date || !dayType)
  return res.status(400).json({ error: "date and dayType are required" });

 try {
  const result = await db.query(
   `INSERT INTO workout_sessions (date, day_type, exercises, cardio, notes, completed, kcal)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (date, day_type)
       DO UPDATE SET exercises = EXCLUDED.exercises, cardio = EXCLUDED.cardio, notes = EXCLUDED.notes,
         completed = EXCLUDED.completed, kcal = EXCLUDED.kcal, updated_at = NOW()
       RETURNING *`,
   [date, dayType, exercises, cardio, notes, completed, kcal],
  );
  res.json(result.rows[0]);
 } catch (err) {
  console.error(err);
  res.status(500).json({ error: "Failed to save session" });
 }
});

app.delete("/api/sessions/:date/:dayType", async (req, res) => {
 const { date, dayType } = req.params;
 if (!date || !dayType)
  return res.status(400).json({ error: "date and dayType are required" });
 try {
  const result = await db.query(
   "DELETE FROM workout_sessions WHERE date = $1::date AND day_type = $2",
   [date, dayType],
  );
  if (result.rowCount === 0)
   return res.status(404).json({ error: "Session not found" });
  res.json({ success: true, deleted: result.rowCount });
 } catch (err) {
  console.error(err);
  res.status(500).json({ error: "Failed to delete session" });
 }
});

// Fallback: allow DELETE with JSON body for tools/clients that can't use params
app.delete("/api/sessions", async (req, res) => {
 const { date, dayType } = req.body || {};
 if (!date || !dayType)
  return res.status(400).json({ error: "date and dayType are required" });
 try {
  const result = await db.query(
   "DELETE FROM workout_sessions WHERE date = $1::date AND day_type = $2",
   [date, dayType],
  );
  if (result.rowCount === 0)
   return res.status(404).json({ error: "Session not found" });
  res.json({ success: true, deleted: result.rowCount });
 } catch (err) {
  console.error(err);
  res.status(500).json({ error: "Failed to delete session" });
 }
});

// ===== Weights =====
app.get("/api/weights", async (_req, res) => {
 try {
  const result = await db.query("SELECT * FROM weights ORDER BY date ASC");
  res.json(result.rows);
 } catch (err) {
  console.error(err);
  res.status(500).json({ error: "Failed to fetch weights" });
 }
});

app.post("/api/weights", async (req, res) => {
 const { date, weight } = req.body;
 if (!date || !weight)
  return res.status(400).json({ error: "date and weight are required" });
 try {
  const result = await db.query(
   `INSERT INTO weights (date, weight)
       VALUES ($1, $2)
       ON CONFLICT (date)
       DO UPDATE SET weight = EXCLUDED.weight, updated_at = NOW()
       RETURNING *`,
   [date, weight],
  );
  res.json(result.rows[0]);
 } catch (err) {
  console.error(err);
  res.status(500).json({ error: "Failed to save weight" });
 }
});

app.delete("/api/weights/:date", async (req, res) => {
 try {
  await db.query("DELETE FROM weights WHERE date = $1", [req.params.date]);
  res.json({ success: true });
 } catch (err) {
  console.error(err);
  res.status(500).json({ error: "Failed to delete weight" });
 }
});

// ===== Summary =====
app.get("/api/summary", async (_req, res) => {
 try {
  const { rows: sessions } = await db.query(
   "SELECT * FROM workout_sessions WHERE completed = true",
  );
  const totalSessions = sessions.length;
  const weekStartStr = weekStart(new Date());
  const weekSessions = sessions.filter((s) => s.date >= weekStartStr).length;
  const totalKcal = sessions.reduce((sum, s) => sum + (s.kcal || 0), 0);

  // Streak: consecutive weeks with at least one session ending this week
  const weekMap = new Set(sessions.map((s) => weekStart(s.date)));
  const weeks = Array.from(weekMap).sort().reverse();
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < weeks.length; i++) {
   const expected = new Date(now);
   expected.setDate(now.getDate() - i * 7 - now.getDay() + 1);
   const expectedStr = expected.toISOString().split("T")[0];
   if (weekMap.has(expectedStr)) streak++;
   else break;
  }

  res.json({ totalSessions, weekSessions, totalKcal, streak });
 } catch (err) {
  console.error(err);
  res.status(500).json({ error: "Failed to load summary" });
 }
});

// Fallback
app.use((req, res) => {
 res.status(404).json({ error: "Not found" });
});

module.exports = app;
