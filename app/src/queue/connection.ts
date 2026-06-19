import { ConnectionOptions, RedisConnection } from "bullmq";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";


export function getQueueConnection(): ConnectionOptions {
  return { url: REDIS_URL };
}

export function getQueueName(): string {
  return process.env.QUEUE_NAME || "cv-autopilot";
}
