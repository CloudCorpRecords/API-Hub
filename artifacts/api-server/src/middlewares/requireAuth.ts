import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({
      error: "Authentication required",
      message: "You must be logged in to perform this action. Visit /api/login to authenticate.",
    });
    return;
  }
  next();
}
