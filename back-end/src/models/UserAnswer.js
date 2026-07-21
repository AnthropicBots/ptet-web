const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const UserAnswer = sequelize.define(
    "UserAnswer",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      attempt_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "test_attempts",
          key: "id",
        },
        validate: {
          isUUID: 4,
          notNull: true,
        },
      },
      question_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "questions",
          key: "id",
        },
        validate: {
          isUUID: 4,
          notNull: true,
        },
      },
      answer: {
        type: DataTypes.JSONB,
        allowNull: true,
        validate: {
          isValidAnswer(value) {
            if (value && typeof value !== 'object') {
              throw new Error('Answer must be a valid JSON object');
            }
            if (value && Object.keys(value).length > 100) {
              throw new Error('Answer too large (max 100 keys)');
            }
          }
        },
      },
      score: {
        type: DataTypes.FLOAT,
        allowNull: true,
        validate: {
          min: 0,
          max: 100,
          isFloat: true,
        },
        defaultValue: 0,
      },
      feedback: {
        type: DataTypes.JSONB,
        allowNull: true,
        validate: {
          isValidFeedback(value) {
            if (value && typeof value !== 'object') {
              throw new Error('Feedback must be a valid JSON object');
            }
            if (value && Object.keys(value).length > 50) {
              throw new Error('Feedback too large (max 50 keys)');
            }
          }
        },
        defaultValue: {},
      },
      time_taken_seconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
          max: 3600,
          isInt: true,
        },
      },
      is_correct: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: null,
      },
      status: {
        type: DataTypes.ENUM('pending', 'submitted', 'reviewed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        validate: {
          isValidMetadata(value) {
            if (value && typeof value !== 'object') {
              throw new Error('Metadata must be a valid JSON object');
            }
            if (value && Object.keys(value).length > 20) {
              throw new Error('Metadata too large (max 20 keys)');
            }
          }
        },
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "user_answers",
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      paranoid: true,
      deletedAt: 'deleted_at',
      
      indexes: [
        {
          fields: ['attempt_id'],
          name: 'idx_user_answers_attempt_id',
        },
        {
          fields: ['question_id'],
          name: 'idx_user_answers_question_id',
        },
        {
          fields: ['attempt_id', 'question_id'],
          unique: true,
          name: 'idx_user_answers_attempt_question_unique',
        },
        {
          fields: ['score'],
          name: 'idx_user_answers_score',
        },
        {
          fields: ['status'],
          name: 'idx_user_answers_status',
        },
        {
          fields: ['created_at'],
          name: 'idx_user_answers_created_at',
        },
        {
          fields: ['is_correct'],
          name: 'idx_user_answers_is_correct',
        },
      ],

      hooks: {
        beforeCreate: (userAnswer) => {
          if (userAnswer.score !== null && userAnswer.score !== undefined) {
            userAnswer.is_correct = userAnswer.score >= 50;
          }
          if (userAnswer.time_taken_seconds !== null && userAnswer.time_taken_seconds !== undefined) {
            userAnswer.metadata = {
              ...userAnswer.metadata,
              time_taken: userAnswer.time_taken_seconds
            };
          }
        },
        beforeUpdate: (userAnswer) => {
          if (userAnswer.changed('score')) {
            userAnswer.is_correct = userAnswer.score >= 50;
          }
          userAnswer.updated_at = new Date();
        },
      },

      scopes: {
        correct: {
          where: { is_correct: true },
        },
        incorrect: {
          where: { is_correct: false },
        },
        pending: {
          where: { status: 'pending' },
        },
        submitted: {
          where: { status: 'submitted' },
        },
        reviewed: {
          where: { status: 'reviewed' },
        },
        highScore: {
          where: { score: { [sequelize.Op.gte]: 70 } },
        },
        lowScore: {
          where: { score: { [sequelize.Op.lt]: 50 } },
        },
        recent: {
          order: [['created_at', 'DESC']],
        },
        byAttempt: (attemptId) => ({
          where: { attempt_id: attemptId },
        }),
      },
    }
  );

  UserAnswer.prototype.isPassing = function() {
    return this.score !== null && this.score >= 50;
  };

  UserAnswer.prototype.getTimeTakenFormatted = function() {
    if (!this.time_taken_seconds) return '0s';
    const mins = Math.floor(this.time_taken_seconds / 60);
    const secs = this.time_taken_seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  UserAnswer.prototype.toJSON = function() {
    const values = { ...this.get() };
    delete values.deleted_at;
    return values;
  };

  UserAnswer.associate = (models) => {
    UserAnswer.belongsTo(models.TestAttempt, {
      foreignKey: 'attempt_id',
      as: 'attempt',
    });
    UserAnswer.belongsTo(models.Question, {
      foreignKey: 'question_id',
      as: 'question',
    });
  };

  return UserAnswer;
};