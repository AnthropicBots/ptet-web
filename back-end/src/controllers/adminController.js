const { Op, fn, col } = require('sequelize');
const { User, MockTest, TestAttempt } = require('../models');

exports.getAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      adminUsers,
      totalTests,
      testsTakenToday,
      averageScoreResult,
      dailyActiveUsers,
    ] = await Promise.all([
      User.count(),
      User.count({
        where: { is_active: true },
      }),
      User.count({
        where: { role: 'admin' },
      }),
      MockTest.count(),
      TestAttempt.count({
        where: {
          created_at: {
            [Op.gte]: startOfDay,
          },
        },
      }),
      TestAttempt.findOne({
        attributes: [[fn('AVG', col('score')), 'averageScore']],
        raw: true,
      }),
      TestAttempt.count({
        distinct: true,
        col: 'user_id',
        where: {
          created_at: {
            [Op.gte]: startOfDay,
          },
        },
      }),
    ]);

    const averageScore = Number(
      Number(averageScoreResult?.averageScore || 0).toFixed(2)
    );

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        adminUsers,
        totalTests,
        testsTakenToday,
        dailyActiveUsers,
        averageScore,
      },
    });
  } catch (error) {
    next(error);
  }
}