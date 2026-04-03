import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  updatedAt: string;
}

// In-memory leaderboard store
let leaderboard: LeaderboardEntry[] = [];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/leaderboard", (req, res) => {
    // Return top 10
    const top10 = [...leaderboard].sort((a, b) => b.score - a.score).slice(0, 10);
    res.json(top10);
  });

  app.post("/api/leaderboard", (req, res) => {
    const { id, name, score } = req.body;
    
    if (!id || !name || typeof score !== 'number') {
      return res.status(400).json({ error: "Invalid data" });
    }

    const existingIndex = leaderboard.findIndex(entry => entry.id === id);
    
    if (existingIndex >= 0) {
      // Only update if the new score is higher
      if (score > leaderboard[existingIndex].score) {
        leaderboard[existingIndex].score = score;
        leaderboard[existingIndex].name = name;
        leaderboard[existingIndex].updatedAt = new Date().toISOString();
      }
    } else {
      leaderboard.push({
        id,
        name,
        score,
        updatedAt: new Date().toISOString()
      });
    }

    res.json({ success: true });
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

startServer();
