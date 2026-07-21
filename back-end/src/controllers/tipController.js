const { Tip } = require('../models');
const redis = require('../config/redis');
const response = require('../utils/response');

/**
 * Deterministically pick a tip based on the current date.
 * Returns the same tip for all users on the same day.
 */
const getDailyTip = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const cacheKey = `daily_tip:${today}`;

    // 1. Try Redis cache
    let cached = null;
    try {
      cached = await redis.get(cacheKey);
    } catch (redisErr) {
      // Redis might be down – log and proceed to DB
      console.warn('Redis error, falling back to DB:', redisErr.message);
    }

    if (cached) {
      const tip = JSON.parse(cached);
      return response.success(res, tip, 'Daily tip (cached)');
    }

    // 2. Fetch all tips from DB
    const allTips = await Tip.findAll({ attributes: ['id', 'content', 'category'] });
    if (!allTips.length) {
      // Fallback message if no tips exist
      const fallback = {
        content: "Stay consistent and practice every day – progress comes with effort!",
        category: "General",
      };
      // Cache the fallback for the day to avoid repeated DB checks
      try {
        await redis.setex(
          cacheKey,
          getSecondsUntilMidnight(),
          JSON.stringify(fallback)
        );
      } catch (redisErr) {
        console.warn(
          "Failed to cache fallback daily tip:",
          redisErr.message
        );
      }

      return response.success(
        res,
        fallback,
        "Daily tip (fallback)"
      );
    }

    // 3. Deterministic selection based on the date
    // Use a hash of the date string to pick an index
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = ((hash << 5) - hash) + today.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }
    const index = Math.abs(hash) % allTips.length;
    const selectedTip = allTips[index];

    // 4. Cache the result with TTL until midnight
    const ttlSeconds = getSecondsUntilMidnight();
    await redis.setex(cacheKey, ttlSeconds, JSON.stringify(selectedTip));

    return response.success(res, selectedTip, 'Daily tip');
  } catch (err) {
    next(err);
  }
};

/**
 * Compute seconds until the next midnight (UTC or local time).
 * We'll use local time to match the date used for the key.
 */
function getSecondsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // next midnight
  return Math.floor((midnight - now) / 1000);
}

module.exports = { getDailyTip };