import type { Response } from "express";

export function sendJson(res: Response, data: unknown, status = 200) {
  res.status(status).json(data);
}

export function sendError(res: Response, message: string, status = 500) {
  res.status(status).json({ error: message });
}
