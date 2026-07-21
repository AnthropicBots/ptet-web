const { UserAnswer, Question, TestAttempt } = require('../models');
const { transcribeAudioUrl } = require('../services/speechToTextService');
const { evaluateSpeakingAnswer } = require('../services/aiScoringService');

const MAX_ANSWER_LENGTH = 5000;
const ANSWER_LENGTH_LIMITS = {
  'mcq': 1000,
  'multiple_choice': 1000,
  'true_false': 500,
  'boolean': 500,
  'essay': 5000,
  'descriptive': 5000,
  'speaking': 5000,
  'default': 5000
};

const validateAnswerLength = (answer, questionType) => {
  if (!answer) return null;
  
  let answerText = '';
  
  if (typeof answer === 'string') {
    answerText = answer;
  } else if (typeof answer === 'object' && answer !== null) {
    answerText = answer.text || JSON.stringify(answer);
  } else {
    answerText = String(answer);
  }

  const maxLength = ANSWER_LENGTH_LIMITS[questionType] || ANSWER_LENGTH_LIMITS.default;
  
  if (answerText.length > maxLength) {
    return `Answer cannot exceed ${maxLength} characters for ${questionType} questions`;
  }
  
  return null;
};

const submitAnswer = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { question_id, answer, time_taken_seconds } = req.body;

    if (!question_id) {
      return res.status(400).json({ success: false, message: 'question_id is required' });
    }

    const attempt = await TestAttempt.findByPk(attemptId);
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Test attempt not found' });
    }

    if (
      attempt.user_id !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        error: "You are not authorized to modify this test attempt",
      });
    }

    const existingAnswer = await UserAnswer.findOne({
      where: {
        attempt_id: attemptId,
        question_id: questionId,
      },
    });

    // existing update/create logic...

    const question = await Question.findByPk(question_id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const validationError = validateAnswerLength(answer, question.type);
    if (validationError) {
      return res.status(400).json({ 
        success: false, 
        message: validationError 
      });
    }

    let finalAnswer = typeof answer === 'object' && answer !== null ? { ...answer } : { text: answer };
    let userScore = null;
    let userFeedback = null;

    if (question.type === 'speaking' && finalAnswer.audioUrl) {
      try {
        const transcript = await transcribeAudioUrl(finalAnswer.audioUrl);
        finalAnswer.transcript = transcript;

        const transcriptValidation = validateAnswerLength(transcript, 'speaking');
        if (transcriptValidation) {
          return res.status(400).json({
            success: false,
            message: transcriptValidation
          });
        }

        try {
          const scoringResult = await evaluateSpeakingAnswer(
            transcript,
            question.content,
            question.scoring_rubric
          );
          userScore = scoringResult.overallScore;
          userFeedback = scoringResult;
        } catch (scoringError) {
          console.error('Error during AI scoring:', scoringError);
          userFeedback = { error: 'Failed to generate AI feedback' };
        }

      } catch (error) {
        console.error('Error during transcription:', error);
        finalAnswer.transcriptError = error.message;
      }
    }

    let userAnswer = await UserAnswer.findOne({
      where: {
        attempt_id: attemptId,
        question_id: question_id
      }
    });

    if (userAnswer) {
      userAnswer.answer = finalAnswer;
      userAnswer.score = userScore !== null ? userScore : userAnswer.score;
      userAnswer.feedback = userFeedback !== null ? userFeedback : userAnswer.feedback;
      userAnswer.time_taken_seconds = time_taken_seconds || userAnswer.time_taken_seconds;
      await userAnswer.save();
    } else {
      userAnswer = await UserAnswer.create({
        attempt_id: attemptId,
        question_id: question_id,
        answer: finalAnswer,
        score: userScore,
        feedback: userFeedback,
        time_taken_seconds: time_taken_seconds || 0,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Answer submitted successfully',
      data: userAnswer,
    });
  } catch (error) {
    next(error);
  }
};

const getAnswerFeedback = async (req, res, next) => {
  try {
    const { attemptId, answerId } = req.params;

    const userAnswer = await UserAnswer.findOne({
      where: {
        id: answerId,
        attempt_id: attemptId
      }
    });

    if (!userAnswer) {
      return res.status(404).json({ success: false, message: 'Answer not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        id: userAnswer.id,
        score: userAnswer.score,
        feedback: userAnswer.feedback,
        answer: userAnswer.answer
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitAnswer,
  getAnswerFeedback,
};