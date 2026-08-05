import express from "express";
import path from "path";
import mongoose from "mongoose";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

// Schema definition
const entrySchema = new mongoose.Schema({
  name: { type: String, required: true },
  salary: { type: Number, required: true },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'entries' });

const Entry = mongoose.model("Entry", entrySchema);

// Connection helper
async function connectToDatabase() {
  if (mongoose.connection.readyState >= 1) return;
  
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is required");
  }
  
  try {
    // Explicitly set dbName to match the previous 'entries_db'
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'entries_db',
      bufferCommands: false, // Recommended for serverless to fail fast
    });
    console.log(`Connected to MongoDB Atlas (entries_db) via Mongoose. Collection: entries`);
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

  // API routes
  app.get("/api/entries", async (req, res) => {
    try {
      await connectToDatabase();
      const entries = await Entry.find().sort({ createdAt: -1 });
      console.log(`Found ${entries.length} entries in database`);
      res.json(entries);
    } catch (error) {
      console.error("GET /api/entries error:", error);
      res.status(500).json({ error: "Failed to fetch entries" });
    }
  });

  app.post("/api/entries", async (req, res) => {
    try {
      const { name, salary, amount } = req.body;
      
      if (!name || salary === undefined || amount === undefined || salary <= 0 || amount <= 0) {
        return res.status(400).json({ error: "Invalid input: Name, positive salary, and positive amount are required." });
      }
      
      await connectToDatabase();
      const newEntry = new Entry({ name, salary, amount });
      const savedEntry = await newEntry.save();
      
      res.status(201).json(savedEntry);
    } catch (error) {
      console.error("POST /api/entries error:", error);
      res.status(500).json({ error: "Failed to create entry" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
