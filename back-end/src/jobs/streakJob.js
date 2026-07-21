const cron = require('node-cron');
const { Op } = require('sequelize');
const { UserProfile, sequelize } = require('../models');
const redis = require('../config/redis');

const BATCH_SIZE = parseInt(process.env.STREAK_BATCH_SIZE) || 1000;
const MAX_RETRIES = parseInt(process.env.STREAK_MAX_RETRIES) || 3;
const LOCK_TTL = parseInt(process.env.STREAK_LOCK_TTL) || 300;

const LOCK_KEY = 'streak:update:lock';

async function acquireLock() {
  const result = await redis.set(LOCK_KEY, 'locked', 'NX', 'EX', LOCK_TTL);
  return result === 'OK';
}

async function releaseLock() {
  await redis.del(LOCK_KEY);
}

async function updateStreaksWithRetry(retryCount = 0) {
  try {
    if (!await acquireLock()) {
      console.log('Streak job already running, skipping...');
      return;
    }

    await updateStreaks();

  } catch (error) {
    console.error(`Streak update failed (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error.message);

    if (retryCount < MAX_RETRIES - 1) {
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      await updateStreaksWithRetry(retryCount + 1);
    } else {
      console.error('Max retries reached. Streak update failed.');
      throw error;
    }
  } finally {
    await releaseLock();
  }
}

async function updateStreaks() {
  const startTime = Date.now();
  console.log('Starting daily streak update job...');

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const transaction = await sequelize.transaction();

  try {
    const [increasedCount] = await UserProfile.update(
      { streak_days: sequelize.literal('streak_days + 1') },
      {
        where: {
          last_active: {
            [Op.gte]: yesterday,
            [Op.lt]: today
          }
        },
        transaction
      }
    );

    const [resetCount] = await UserProfile.update(
      { streak_days: 0 },
      {
        where: {
          last_active: {
            [Op.lt]: yesterday
          },
          streak_days: {
            [Op.gt]: 0
          }
        },
        transaction
      }
    );

    await transaction.commit();

    const profiles = await UserProfile.findAll({
      attributes: ['user_id', 'streak_days', 'last_active'],
      where: {
        streak_days: {
          [Op.gt]: 0
        }
      }
    });

    if (profiles.length > 0) {
      let pipeline = redis.pipeline();
      let count = 0;
      const milestoneUsers = [];

      for (const profile of profiles) {
        pipeline.set(`user:${profile.user_id}:streak`, profile.streak_days);
        count++;

        if (profile.streak_days % 7 === 0) {
          milestoneUsers.push({
            user_id: profile.user_id,
            streak: profile.streak_days
          });
        }

        if (count % BATCH_SIZE === 0) {
          await pipeline.exec();
          pipeline = redis.pipeline();
        }
      }

      if (count % BATCH_SIZE !== 0) {
        await pipeline.exec();
      }

      console.log(`Streak update completed. Increased: ${increasedCount}, Reset: ${resetCount}`);
      console.log(`Synced ${profiles.length} profiles to Redis.`);

      if (milestoneUsers.length > 0) {
        console.log('Streak milestones reached:');
        milestoneUsers.forEach(({ user_id, streak }) => {
          console.log(`  User ${user_id}: ${streak} days (${streak / 7} weeks)`);
        });
      }

      await logJobMetrics(startTime, increasedCount, resetCount, profiles.length);
    }

    return {
      success: true,
      increasedCount,
      resetCount,
      totalSynced: profiles.length,
      duration: Date.now() - startTime,
      milestoneUsers: milestoneUsers || []
    };

  } catch (error) {
    await transaction.rollback();
    console.error('Error updating streaks:', error);
    throw error;
  }
}

async function logJobMetrics(startTime, increasedCount, resetCount, totalSynced) {
  try {
    const duration = Date.now() - startTime;
    const timestamp = new Date().toISOString();

    await redis.hset('streak:job:metrics', {
      last_run: timestamp,
      duration_ms: duration,
      increased_count: increasedCount,
      reset_count: resetCount,
      total_synced: totalSynced,
      status: 'success'
    });

    console.log(`Job metrics logged: ${duration}ms, ${increasedCount} increased, ${resetCount} reset`);

  } catch (error) {
    console.error('Failed to log job metrics:', error);
  }
}

async function getJobStatus() {
  try {
    const metrics = await redis.hgetall('streak:job:metrics');
    const isLocked = await redis.exists(LOCK_KEY);

    return {
      status: isLocked ? 'running' : 'idle',
      metrics: metrics || null,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to get job status:', error);
    return { status: 'unknown', error: error.message };
  }
}

async function manualTrigger() {
  console.log('Manual streak update triggered...');
  await updateStreaksWithRetry();
}

const streakJob = cron.schedule('0 0 * * *', async () => {
  console.log('Cron job triggered at', new Date().toISOString());
  await updateStreaksWithRetry();
}, {
  scheduled: false,
  timezone: process.env.STREAK_TIMEZONE || "UTC"
});

function startJob() {
  streakJob.start();
  console.log('Streak job started. Schedule: 00:00 UTC daily');
}

function stopJob() {
  streakJob.stop();
  console.log('Streak job stopped.');
}

module.exports = {
  streakJob,
  updateStreaks,
  updateStreaksWithRetry,
  getJobStatus,
  manualTrigger,
  startJob,
  stopJob
};