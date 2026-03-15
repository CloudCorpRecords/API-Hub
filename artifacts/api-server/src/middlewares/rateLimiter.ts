import rateLimit from "express-rate-limit";
import type { Request } from "express";

function getUserKey(req: Request): string {
  const userId = req.user?.id;
  if (userId) return `user:${userId}`;
  const forwarded = req.headers["x-forwarded-for"];
  const addr = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "unknown";
  return `anon:${addr}`;
}

const sharedConfig = {
  keyGenerator: getUserKey,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false as const,
};

export const bountyCreateLimiter = rateLimit({
  ...sharedConfig,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: {
    error: "Rate limit exceeded",
    message: "You can create at most 5 bounties per hour. Please try again later.",
  },
});

export const bountyClaimLimiter = rateLimit({
  ...sharedConfig,
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: {
    error: "Rate limit exceeded",
    message: "You can claim at most 10 bounties per hour. Please try again later.",
  },
});

export const towerAiMessageLimiter = rateLimit({
  ...sharedConfig,
  windowMs: 10 * 60 * 1000,
  limit: 30,
  message: {
    error: "Rate limit exceeded",
    message: "You can send at most 30 messages per 10 minutes. Please try again later.",
  },
});
