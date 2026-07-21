const { User, UserProfile, SkillScore, UserAnswer, TestAttempt, Question, sequelize } = require('../models');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { jwtEmailSecret } = require("../config/jwt");

// ==================== CONFIGURATION ====================
const BCRYPT_ROUNDS = 12;

// ==================== GET USER PROFILE ====================
exports.getProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check authorization
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this profile',
      });
    }

    const user = await User.findByPk(id, {
      attributes: {
        exclude: ['password_hash', 'verification_token', 'refreshToken'],
      },
      include: [
        {
          model: UserProfile,
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    next(err);
  }
};

// ==================== UPDATE USER PROFILE ====================
exports.updateProfile = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;

    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this profile',
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Update User fields
    const userAllowedFields = ['name', 'photo_url', 'phone'];
    const userUpdateData = {};
    for (const field of userAllowedFields) {
      if (req.body[field] !== undefined) {
        userUpdateData[field] = req.body[field];
      }
    }

    if (Object.keys(userUpdateData).length > 0) {
      await user.update(userUpdateData);
    }

    // Update UserProfile fields
    let userProfile = await UserProfile.findOne({ where: { user_id: id } });

    const profileAllowedFields = [
      'target_score',
      'test_date',
      'country_applying_to',
      'visa_type',
      'streak_days',
      'last_active',
      'bio',
      'address',
      'city',
      'state',
      'zipCode',
      'country',
      'dateOfBirth',
      'gender',
      'preferences',
    ];

    const profileUpdateData = {};
    for (const field of profileAllowedFields) {
      if (req.body[field] !== undefined) {
        profileUpdateData[field] = req.body[field];
      }
    }

    if (!userProfile) {
      userProfile = await UserProfile.create({
        user_id: id,
        target_score: profileUpdateData.target_score || 0,
        ...profileUpdateData,
      });
    } else {
      await userProfile.update(profileUpdateData);
    }

    // Fetch updated user with profile
    const updatedUser = await User.findByPk(id, {
      attributes: {
        exclude: ['password_hash', 'verification_token', 'refreshToken'],
      },
      include: [{ model: UserProfile }],
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (err) {
    next(err);
  }
};

// ==================== CHANGE PASSWORD ====================
exports.changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to change this password',
      });
    }

    const user = await User.findByPk(id, {
      attributes: { include: ['password_hash'] },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    // Check if new password is same as old
    const isSame = await bcrypt.compare(newPassword, user.password_hash);
    if (isSame) {
      return res.status(400).json({
        success: false,
        error: 'New password must be different from current password',
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password_hash = hashedPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    // Clear refresh token to force re-login
    await User.update({ refreshToken: null }, { where: { id: id } });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (err) {
    next(err);
  }
};

// ==================== CHANGE EMAIL ====================
exports.changeEmail = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { newEmail, password } = req.body;

    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to change this email',
      });
    }

    const user = await User.findByPk(id, {
      attributes: { include: ['password_hash'] },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Password is incorrect',
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email: newEmail } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already in use',
      });
    }

    // Generate verification token
    const verificationToken = jwt.sign(
      { userId: id, newEmail },
      jwtEmailSecret,
      { expiresIn: "24h" }
    );

    // Store pending email change
    user.pendingEmail = newEmail;
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    // Send verification email (implement email service)
    // await emailService.sendVerificationEmail(newEmail, verificationToken);

    res.status(200).json({
      success: true,
      message: 'Verification email sent. Please check your email.',
      // verificationToken // Uncomment in development
    });
  } catch (err) {
    next(err);
  }
};

// ==================== VERIFY EMAIL CHANGE ====================
exports.verifyEmailChange = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification token is required',
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      jwtEmailSecret
    );
    const { userId, newEmail } = decoded;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (user.emailVerificationToken !== token) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification token',
      });
    }

    if (user.emailVerificationExpires < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Verification token has expired',
      });
    }

    // Update email
    user.email = newEmail;
    user.pendingEmail = null;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email changed successfully',
    });
  } catch (err) {
    next(err);
  }
};

// ==================== UPLOAD PROFILE IMAGE ====================
exports.uploadProfileImage = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to upload image',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided',
      });
    }

    // Upload to cloud storage (implement your upload service)
    // const uploadResult = await uploadService.uploadProfileImage(req.file, id);

    // For now, simulate upload
    const imageUrl = req.file.path || `/uploads/${req.file.filename}`;

    // Update user
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    user.photo_url = imageUrl;
    await user.save();

    // Update profile
    const userProfile = await UserProfile.findOne({ where: { user_id: id } });
    if (userProfile) {
      userProfile.profileImage = imageUrl;
      await userProfile.save();
    }

    res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: { imageUrl },
    });
  } catch (err) {
    next(err);
  }
};

// ==================== DEACTIVATE ACCOUNT ====================
exports.deactivateAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to deactivate this account',
      });
    }

    const user = await User.findByPk(id, {
      attributes: { include: ['password_hash'] },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Verify password for non-admin
    if (req.user.role !== 'admin') {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Password is incorrect',
        });
      }
    }

    // Soft delete - deactivate
    user.isActive = false;
    user.deactivatedAt = new Date();
    user.refreshToken = null; // Logout user
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account deactivated successfully',
    });
  } catch (err) {
    next(err);
  }
};

// ==================== REACTIVATE ACCOUNT ====================
exports.reactivateAccount = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to reactivate this account',
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (user.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Account is already active',
      });
    }

    user.isActive = true;
    user.deactivatedAt = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account reactivated successfully',
    });
  } catch (err) {
    next(err);
  }
};

// ==================== DELETE ACCOUNT ====================
exports.deleteAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this account',
      });
    }

    const user = await User.findByPk(id, {
      attributes: { include: ['password_hash'] },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Verify password for non-admin
    if (req.user.role !== 'admin') {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Password is incorrect',
        });
      }
    }

    // Delete user profile
    await UserProfile.destroy({ where: { user_id: id } });

    // Delete user (permanent)
    await User.destroy({ where: { id } });

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

// ==================== GET DASHBOARD DATA ====================
exports.getDashboardData = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check authorization
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this dashboard',
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const userProfile = await UserProfile.findOne({ where: { user_id: id } });
    const streak = userProfile ? userProfile.streak_days : 0;

    // Get real data from database (implement your actual queries)
    // const testsTaken = await TestResult.count({ where: { user_id: id } });
    // const averageScore = await TestResult.findOne({
    //   where: { user_id: id },
    //   attributes: [[sequelize.fn('AVG', sequelize.col('score')), 'avgScore']]
    // });

    const dashboardData = {
      streak,
      tests_taken: 12, // Replace with real data
      average_score: 68, // Replace with real data
      weak_skills: ['Reading Comprehension', 'Speaking Part 2'],
      recent_activity: [
        {
          id: '1',
          action: 'completed_mock_test',
          score: 65,
          date: new Date().toISOString(),
        },
        {
          id: '2',
          action: 'practiced_speaking',
          duration_minutes: 15,
          date: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
    };

    res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (err) {
    next(err);
  }
};

// ==================== GET USER ACTIVITY ====================
exports.getUserActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const sort = req.query.sort || 'desc';
    const filter = req.query.filter || '';

    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this activity log',
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Implement real activity log query
    // For now, using mock data with pagination
    const totalActivities = 45;
    const actions = [
      'test_completed',
      'test_started',
      'study_material_viewed',
      'speaking_practice',
      'quiz_attempted',
    ];
    const filteredActions = filter
      ? actions.filter((a) => a.includes(filter))
      : actions;

    const activities = [];
    const startIndex = (page - 1) * limit;
    const end = Math.min(startIndex + limit, totalActivities);

    for (let i = startIndex; i < end; i++) {
      const action = filteredActions[i % filteredActions.length];
      const activity = {
        id: `act_${totalActivities - i}`,
        action: action,
        date: new Date(Date.now() - i * 3600000 * 5).toISOString(),
      };

      if (action === 'test_completed') {
        activity.score = Math.floor(Math.random() * 40) + 50;
      } else if (action === 'test_started') {
        activity.test_id = `test_${i}`;
      } else if (action === 'speaking_practice') {
        activity.duration_minutes = Math.floor(Math.random() * 20) + 5;
      }

      activities.push(activity);
    }

    // Sort if needed
    if (sort === 'asc') {
      activities.reverse();
    }

    res.status(200).json({
      success: true,
      data: activities,
      pagination: {
        page,
        limit,
        totalItems: totalActivities,
        totalPages: Math.ceil(totalActivities / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ==================== GET USER PREFERENCES ====================
exports.getUserPreferences = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access preferences',
      });
    }

    const userProfile = await UserProfile.findOne({ where: { user_id: id } });
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        preferences: userProfile.preferences || {},
      },
    });
  } catch (err) {
    next(err);
  }
};

// ==================== UPDATE USER PREFERENCES ====================
exports.updateUserPreferences = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { preferences } = req.body;

    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update preferences',
      });
    }

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid preferences data',
      });
    }

    const userProfile = await UserProfile.findOne({ where: { user_id: id } });
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found',
      });
    }

    userProfile.preferences = preferences;
    await userProfile.save();

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      data: { preferences },
    });
  } catch (err) {
    next(err);
  }
};
exports.getAdminUsers = async (req, res, next) => {
  try {
    const { User } = require("../models");
    const { Op } = require("sequelize");

    const {
      page = 1,
      limit = 10,
      search,
      role,
      joinedAfter,
      joinedBefore,
    } = req.query;

    const where = {};

    if (search) {
      where[Op.or] = [
        {
          name: {
            [Op.iLike]: `%${search}%`,
          },
        },
        {
          email: {
            [Op.iLike]: `%${search}%`,
          },
        },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (joinedAfter || joinedBefore) {
      where.created_at = {};

      if (joinedAfter)
        where.created_at[Op.gte] = new Date(joinedAfter);

      if (joinedBefore)
        where.created_at[Op.lte] = new Date(joinedBefore);
    }

    const offset = (page - 1) * limit;

    const { rows, count } = await User.findAndCountAll({
      where,
      offset,
      limit: Number(limit),
      order: [["created_at", "DESC"]],
      attributes: {
        exclude: [
          "password_hash",
          "verification_token",
          "refreshToken",
        ],
      },
    });

    res.status(200).json({
      success: true,
      total: count,
      page: Number(page),
      pages: Math.ceil(count / limit),
      users: rows,
    });
  } catch (err) {
    next(err);
  }
};
exports.updateUserRole = async (req, res, next) => {
  try {
    const { User } = require("../models");

    const { id } = req.params;

    const { role } = req.body;

    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({
        success: false,
        error: "Invalid role",
      });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    user.role = role;

    await user.save();

    res.json({
      success: true,
      message: "Role updated successfully",
      user,
    });
  } catch (err) {
    next(err);
  }
};
exports.deleteUser = async (req, res, next) => {
  try {
    const { User } = require("../models");

    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    user.isActive = false;

    user.deactivatedAt = new Date();

    await user.save();

    res.json({
      success: true,
      message: "User deactivated successfully",
    });
  } catch (err) {
    next(err);
  }
};

// ==================== GET USER PROGRESS ====================
exports.getUserProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;

    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this data',
      });
    }

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - parseInt(days));

    const progressData = await SkillScore.findAll({
      where: {
        user_id: id,
        recorded_at: {
          [Op.gte]: dateLimit,
        },
      },
      order: [['recorded_at', 'ASC']],
      attributes: ['skill', 'score', 'recorded_at'],
    });

    res.status(200).json({
      success: true,
      data: progressData,
    });
  } catch (err) {
    next(err);
  }
};

// ==================== GET WEAK AREAS ====================
exports.getWeakAreas = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this data',
      });
    }

    const weakAreas = await UserAnswer.findAll({
      attributes: [
        [sequelize.col('question.subtype'), 'subtype'],
        [sequelize.col('question.type'), 'type'],
        [sequelize.fn('AVG', sequelize.col('UserAnswer.score')), 'average_score'],
      ],
      include: [
        {
          model: TestAttempt,
          as: 'attempt',
          attributes: [],
          where: { user_id: id },
        },
        {
          model: Question,
          as: 'question',
          attributes: [],
        },
      ],
      where: {
        score: {
          [Op.not]: null,
        },
      },
      group: [
        sequelize.col('question.subtype'),
        sequelize.col('question.type')
      ],
      order: [
        [sequelize.fn('AVG', sequelize.col('UserAnswer.score')), 'ASC']
      ],
      limit: 3,
      raw: true,
    });

    res.status(200).json({
      success: true,
      data: weakAreas,
    });
  } catch (err) {
    next(err);
  }
};

// ==================== GET USER STATS ====================
exports.getUserStats = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this data',
      });
    }

    const testStats = await TestAttempt.findOne({
      where: { user_id: id, status: 'completed' },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'testsCompleted'],
        [sequelize.fn('AVG', sequelize.col('total_score')), 'averageScore'],
        [sequelize.fn('MAX', sequelize.col('total_score')), 'bestScore'],
      ],
      raw: true,
    });

    const testsCompleted = parseInt(testStats?.testsCompleted || 0);
    const averageScore = parseFloat(testStats?.averageScore || 0);
    const bestScore = parseFloat(testStats?.bestScore || 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const recentStats = await TestAttempt.findOne({
      where: {
        user_id: id,
        status: 'completed',
        submitted_at: { [Op.gte]: thirtyDaysAgo },
      },
      attributes: [[sequelize.fn('AVG', sequelize.col('total_score')), 'avgScore']],
      raw: true,
    });

    const previousStats = await TestAttempt.findOne({
      where: {
        user_id: id,
        status: 'completed',
        submitted_at: {
          [Op.gte]: sixtyDaysAgo,
          [Op.lt]: thirtyDaysAgo,
        },
      },
      attributes: [[sequelize.fn('AVG', sequelize.col('total_score')), 'avgScore']],
      raw: true,
    });

    const recentAvg = parseFloat(recentStats?.avgScore || averageScore);
    const previousAvg = parseFloat(previousStats?.avgScore || 0);
    let improvementDelta = 0;
    if (previousAvg > 0) {
      improvementDelta = recentAvg - previousAvg;
    } else if (testsCompleted > 0 && recentAvg > 0) {
      improvementDelta = recentAvg;
    }

    const accuracyRaw = await UserAnswer.findAll({
      attributes: [
        [sequelize.col('question.type'), 'type'],
        'is_correct',
        [sequelize.fn('COUNT', sequelize.col('UserAnswer.id')), 'count'],
      ],
      include: [
        {
          model: TestAttempt,
          as: 'attempt',
          attributes: [],
          where: { user_id: id },
        },
        {
          model: Question,
          as: 'question',
          attributes: [],
        },
      ],
      group: [sequelize.col('question.type'), 'is_correct'],
      raw: true,
    });

    const typeStats = {
      speaking: { correct: 0, total: 0 },
      writing: { correct: 0, total: 0 },
      reading: { correct: 0, total: 0 },
      listening: { correct: 0, total: 0 },
    };

    accuracyRaw.forEach((row) => {
      const type = row.type;
      const isCorrect = row.is_correct === true || row.is_correct === 1 || row.is_correct === '1';
      const count = parseInt(row.count) || 0;

      if (typeStats[type]) {
        typeStats[type].total += count;
        if (isCorrect) {
          typeStats[type].correct += count;
        }
      }
    });

    const accuracyByQuestionType = Object.keys(typeStats).map((type) => ({
      type,
      accuracy: typeStats[type].total > 0 ? (typeStats[type].correct / typeStats[type].total) * 100 : 0,
    }));

    res.status(200).json({
      success: true,
      data: {
        testsCompleted,
        averageScore: Number(averageScore.toFixed(2)),
        bestScore: Number(bestScore.toFixed(2)),
        improvementDelta: Number(improvementDelta.toFixed(2)),
        accuracyByQuestionType,
      },
    });
  } catch (err) {
    next(err);
  }
};