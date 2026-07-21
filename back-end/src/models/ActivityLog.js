// back-end/src/models/ActivityLog.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ActivityLog = sequelize.define(
    'ActivityLog',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Action cannot be empty',
          },
        },
      },
      details: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      userAgent: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
    },
    {
      tableName: 'activity_logs',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false, // No updated_at needed for logs
    }
  );

  // ==================== CLASS METHODS ====================
  ActivityLog.logActivity = async function (userId, action, details = {}) {
    return await this.create({
      user_id: userId,
      action: action,
      details: details,
    });
  };

  ActivityLog.getUserActivities = async function (
    userId,
    page = 1,
    limit = 10,
    filter = null
  ) {
    const offset = (page - 1) * limit;

    const where = { user_id: userId };
    if (filter) {
      where.action = {
        [Op.like]: `%${filter}%`,
      };
    }

    const { count, rows } = await this.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: limit,
      offset: offset,
    });

    return {
      activities: rows,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  };

  return ActivityLog;
};
