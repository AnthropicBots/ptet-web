const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SkillScore = sequelize.define(
    'SkillScore',
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
      skill: {
        type: DataTypes.ENUM('speaking', 'writing', 'reading', 'listening'),
        allowNull: false,
        validate: {
          isIn: [['speaking', 'writing', 'reading', 'listening']],
        },
      },
      score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      recorded_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
    },
    {
      tableName: 'skill_scores',
      timestamps: false,
    }
  );

  return SkillScore;
};
