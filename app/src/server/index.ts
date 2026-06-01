import express, { type Request, type Response } from "express";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

function sendJson(res: Response, data: unknown, status = 200) {
  res.status(status).json(data);
}

function sendError(res: Response, message: string, status = 500) {
  res.status(status).json({ error: message });
}

app.get("/health", (_req: Request, res: Response) => {
  sendJson(res, { status: "ok" });
});

export function start() {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
