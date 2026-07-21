const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const MockTestQuestion = sequelize.define(
    "MockTestQuestion",
    {
      test_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'mock_tests',
          key: 'id'
        }
      },
      question_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'questions',
          key: 'id'
        }
      },
      order_index: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      }
    },
    {
      tableName: "mock_test_questions",
      timestamps: false,
    }
  );

  return MockTestQuestion;
};
