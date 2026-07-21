const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const TestAttempt = sequelize.define(
    "TestAttempt",
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
          model: "users",
          key: "id",
        },
      },
      test_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "mock_tests",
          key: "id",
        },
      },
      started_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("in-progress", "completed", "abandoned"),
        allowNull: false,
        defaultValue: "in-progress",
      },
      total_score: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      score_breakdown: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      tableName: "test_attempts",
      timestamps: false,
    }
  );

  return TestAttempt;
};
