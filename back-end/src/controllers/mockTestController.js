const { MockTest, Question } = require('../models');

exports.getTests = async (req, res, next) => {
  try {
    const { type, difficulty, duration } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (difficulty) filter.difficulty = difficulty;
    if (duration !== undefined) filter.duration_minutes = duration;

    const tests = await MockTest.findAll({
      where: filter,
      order: [['created_at', 'DESC']],
    });

    res.status(200).json({
      success: true,
      count: tests.length,
      data: tests,
    });
  } catch (error) {
    next(error);
  }
};

exports.getTestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const test = await MockTest.findByPk(id, {
      include: [
        {
          model: Question,
          as: 'questions',
          through: { attributes: [] },
        },
      ],
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Mock test not found',
      });
    }

    res.status(200).json({
      success: true,
      data: test,
    });
  } catch (error) {
    next(error);
  }
};
const { MockTest, MockTestQuestion } = require("../models");

exports.createMockTest = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      title,
      description,
      difficulty,
      duration_minutes,
      questionIds,
    } = req.body;

    const mockTest = await MockTest.create(
      {
        title,
        description,
        difficulty,
        duration_minutes,
        total_questions: questionIds.length,
      },
      { transaction }
    );

    const mappings = questionIds.map((questionId) => ({
      mock_test_id: mockTest.id,
      question_id: questionId,
    }));

    await MockTestQuestion.bulkCreate(mappings, {
      transaction,
    });

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Mock test created successfully",
      data: mockTest,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};
exports.updateMockTest = async (req, res, next) => {

  try {

    const {

      questionIds,
      ...updateData

    } = req.body;

    const test = await MockTest.findByPk(req.params.id);

    if (!test) {

      return res.status(404).json({

        success: false,
        error: "Mock Test not found"

      });

    }

    await test.update(updateData);

    if (questionIds) {

      await MockTestQuestion.destroy({

        where: {

          test_id: test.id

        }

      });

      for (let i = 0; i < questionIds.length; i++) {

        await MockTestQuestion.create({

          test_id: test.id,
          question_id: questionIds[i],
          order_index: i + 1

        });

      }

      test.total_questions = questionIds.length;

      await test.save();

    }

    res.json({

      success: true,
      message: "Mock Test updated successfully",
      data: test

    });

  } catch (err) {

    next(err);

  }

};
exports.deleteMockTest = async (req, res, next) => {

  try {

    const test = await MockTest.findByPk(req.params.id);

    if (!test) {

      return res.status(404).json({

        success: false,
        error: "Mock Test not found"

      });

    }

    await MockTestQuestion.destroy({

      where: {

        test_id: test.id

      }

    });

    await test.destroy();

    res.json({

      success: true,
      message: "Mock Test deleted successfully"

    });

  } catch (err) {

    next(err);

  }

};
