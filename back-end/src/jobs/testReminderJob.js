const cron = require('node-cron');
const { Op } = require('sequelize');
const { User, UserProfile } = require('../models');
const { sendTestReminderEmail } = require('../utils/email');

async function sendTestReminders() {
  console.log('Starting test reminder job...');
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const targetDateStart = new Date(today);
    targetDateStart.setUTCDate(targetDateStart.getUTCDate() + 3);

    const targetDateEnd = new Date(targetDateStart);
    targetDateEnd.setUTCDate(targetDateEnd.getUTCDate() + 1);

    const profiles = await UserProfile.findAll({
      where: {
        test_date: {
          [Op.gte]: targetDateStart,
          [Op.lt]: targetDateEnd,
        },
      },
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
        await sendTestReminderEmail(
          profile.user.email,
          profile.user.name,
          profile.test_date
        );
        emailsSent++;
      }
    }

    console.log(`Test reminder job completed. Emails sent: ${emailsSent}`);
  } catch (error) {
    console.error('Error running test reminder job:', error);
  }
}

// Run daily at 09:00 UTC
const testReminderJob = cron.schedule('0 9 * * *', () => {
  console.log('Test reminder cron job triggered at', new Date().toISOString());
  sendTestReminders();
}, {
  scheduled: false,
  timezone: "UTC"
});

module.exports = {
  testReminderJob,
  sendTestReminders
};
