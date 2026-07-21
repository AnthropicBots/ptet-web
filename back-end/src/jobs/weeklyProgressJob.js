const cron = require('node-cron');
const { Op } = require('sequelize');
const { User, UserProfile, TestAttempt, sequelize } = require('../models');
const { sendWeeklyProgressEmail } = require('../utils/email');

async function sendWeeklyProgress() {
  console.log('Starting weekly progress job...');
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

    const profiles = await UserProfile.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'name'],
          where: { isActive: true },
        },
      ],
    });

    let emailsSent = 0;

    for (const profile of profiles) {
      const prefs = profile.getPreferences();

      if (prefs?.notifications?.email) {

        const attempts = await TestAttempt.findAll({
          where: {
            user_id: profile.user_id,
            started_at: {
              [Op.gte]: sevenDaysAgo,
            },
            status: 'completed'
          },
        });

        const testsTaken = attempts.length;
        let averageScore = null;

        if (testsTaken > 0) {
          const totalScore = attempts.reduce((acc, attempt) => acc + (attempt.total_score || 0), 0);
          averageScore = totalScore / testsTaken;
        }

        const stats = {
          streakDays: profile.streak_days,
          testsTaken,
          averageScore,
        };

        if (stats.streakDays > 0 || stats.testsTaken > 0) {
          await sendWeeklyProgressEmail(
            profile.user.email,
            profile.user.name,
            stats
          );
          emailsSent++;
        }
      }
    }

    console.log(`Weekly progress job completed. Emails sent: ${emailsSent}`);
  } catch (error) {
    console.error('Error running weekly progress job:', error);
  }
}

// Run weekly on Sunday at 09:00 UTCback-end/src/jobs/testReminderJob.js
const weeklyProgressJob = cron.schedule('0 9 * * 0', () => {
  console.log('Weekly progress cron job triggered at', new Date().toISOString());
  sendWeeklyProgress();
}, {
  scheduled: false,
  timezone: "UTC"
});

module.exports = {
  weeklyProgressJob,
  sendWeeklyProgress
};
