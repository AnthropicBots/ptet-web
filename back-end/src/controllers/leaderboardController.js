const { redis } = require('../config/redis');
const { TestAttempt, User, UserProfile, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.getLeaderboard = async (req, res, next) => {
  try {
    const cacheKey = 'leaderboard:monthly';
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return res.status(200).json({
        success: true,
        data: JSON.parse(cachedData),
        cached: true
      });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const aggregates = await TestAttempt.findAll({
      where: {
        status: 'completed',
        submitted_at: {
          [Op.gte]: startOfMonth
        }
      },
      attributes: [
        'user_id',
        [sequelize.fn('AVG', sequelize.col('total_score')), 'averageScore'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'testsCompleted']
      ],
      group: ['user_id'],
      order: [
        [sequelize.fn('AVG', sequelize.col('total_score')), 'DESC']
      ],
      limit: 20,
      raw: true
    });

    const userIds = aggregates.map(a => a.user_id);

    let users = [];
    if (userIds.length > 0) {
      users = await User.findAll({
        where: { id: userIds },
        attributes: ['id', 'name'],
        include: [
          {
            model: UserProfile,
            as: 'profile',
            attributes: ['country', 'profileImage']
          }
        ]
      });
    }

    const userMap = {};
    users.forEach(u => {
      userMap[u.id] = u.get({ plain: true });
    });

    const formattedLeaderboard = aggregates.map((a, index) => {
      const user = userMap[a.user_id];
      return {
        rank: index + 1,
        user_id: a.user_id,
        name: user?.name || 'Anonymous',
        profileImage: user?.profile?.profileImage || null,
        country: user?.profile?.country || null,
        averageScore: Number(Number(a.averageScore).toFixed(2)),
        testsCompleted: Number(a.testsCompleted)
      };
    });

    await redis.setex(cacheKey, 3600, JSON.stringify(formattedLeaderboard));

    res.status(200).json({
      success: true,
      data: formattedLeaderboard,
      cached: false
    });
  } catch (err) {
    next(err);
  }
};