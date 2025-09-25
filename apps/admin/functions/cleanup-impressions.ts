// netlify/functions/cleanup-impressions.ts
// Scheduled cleanup of old impression logs to enforce retention
import type { Handler } from "@netlify/functions";

// Disabled: legacy impressions cleanup not used with new schema.
// Schedule removed to avoid Netlify cron.

export const handler: Handler = async () => {
  return { statusCode: 204, body: "" };
};

export default handler;


