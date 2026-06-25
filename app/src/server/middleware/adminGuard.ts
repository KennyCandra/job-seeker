import type { NextFunction, Request, Response } from "express";

const LOOPBACK_ADDRESSES = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

export function requireLocalOrAdmin(req: Request, res: Response, next: NextFunction): void {
  const adminToken = process.env.ADMIN_API_TOKEN;
  if (adminToken) {
    const auth = req.header("authorization") || "";
    const headerToken = req.header("x-admin-token") || "";
    if (headerToken === adminToken || auth === `Bearer ${adminToken}`) {
      next();
      return;
    }
  }

  const remoteAddress = req.socket.remoteAddress || "";
  if (LOOPBACK_ADDRESSES.has(remoteAddress)) {
    next();
    return;
  }

  res.status(403).json({ error: "Admin endpoint is restricted to localhost or ADMIN_API_TOKEN" });
}
