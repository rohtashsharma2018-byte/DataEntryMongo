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

// Use existing model if it exists to prevent OverwriteModelError in serverless
const Entry = mongoose.models.Entry || mongoose.model("Entry", entrySchema);

// Connection helper
let isConnected = false;
async function connectToDatabase() {
  if (isConnected && mongoose.connection.readyState >= 1) return;
  
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is required");
  }
  
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'entries_db',
      bufferCommands: false,
    });
    isConnected = true;
    console.log("Connected to MongoDB Atlas (entries_db) via Mongoose.");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

  // API health check
  app.get("/api/health", async (req, res) => {
    try {
      await connectToDatabase();
      res.json({ 
        status: "ok", 
        database: "connected",
        hasUri: !!process.env.MONGODB_URI 
      });
    } catch (err) {
      res.status(500).json({ 
        status: "error", 
        message: err instanceof Error ? err.message : "Unknown error",
        hasUri: !!process.env.MONGODB_URI 
      });
    }
  });

  // API routes
  app.get("/api/entries", async (req, res) => {
    try {
      await connectToDatabase();
      const entries = await Entry.find().sort({ createdAt: -1 });
      console.log(`Successfully fetched ${entries.length} entries`);
      res.json(entries);
    } catch (error) {
      console.error("GET /api/entries error:", error);
      res.status(500).json({ error: "Failed to fetch entries", details: error instanceof Error ? error.message : String(error) });
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
