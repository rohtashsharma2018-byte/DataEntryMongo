import express from "express";
import path from "path";
import { MongoClient } from "mongodb";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

let dbClient: MongoClient | null = null;

async function getCollection() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is required");
  }
  if (!dbClient) {
    dbClient = new MongoClient(process.env.MONGODB_URI);
    await dbClient.connect();
  }
  return dbClient.db("entries_db").collection("entries");
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

  // API routes
  app.get("/api/entries", async (req, res) => {
    try {
      const collection = await getCollection();
      const entries = await collection.find().sort({ createdAt: -1 }).toArray();
      res.json(entries);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch entries" });
    }
  });

  app.post("/api/entries", async (req, res) => {
    try {
      const { name, salary, amount } = req.body;
      if (!name || !salary || !amount || salary <= 0 || amount <= 0) {
        return res.status(400).json({ error: "Invalid input" });
      }
      
      const collection = await getCollection();
      const newEntry = {
        name,
        salary,
        amount,
        createdAt: new Date(),
      };
      const result = await collection.insertOne(newEntry);
      res.status(201).json({ ...newEntry, _id: result.insertedId });
    } catch (error) {
      console.error(error);
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
