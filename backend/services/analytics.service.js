// backend/services/analytics.service.js
// Aggregation helpers used by the stats controller.

import { Event } from "../models/Event.js";

/**
 * Build a 7×24 heatmap of word counts bucketed by (day-of-week, hour).
 * Returns a 2D array where heatmap[dayIndex][hour] = totalWords.
 */
export async function buildHeatmap(userId, since) {
  const events = await Event.find({
    userId,
    flushedAt: { $gte: since }
  }).select("flushedAt deltaWords");

  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const e of events) {
    const d = new Date(e.flushedAt);
    grid[d.getDay()][d.getHours()] += e.deltaWords;
  }
  return grid;
}

/**
 * Return the median of an array of numbers, or 0 for empty input.
 */
export function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}
