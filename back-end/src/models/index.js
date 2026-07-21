// back-end/src/models/index.js

const { sequelize } = require('../config/db');

// Import models
const User = require('./User')(sequelize);
const UserProfile = require('./UserProfile')(sequelize);
const StudyMaterial = require('./StudyMaterial')(sequelize);
const SavedMaterial = require('./SavedMaterial')(sequelize);
const Tip = require('./Tip')(sequelize);
const Question = require('./Question')(sequelize);
const MockTest = require('./MockTest')(sequelize);
const MockTestQuestion = require('./MockTestQuestion')(sequelize);
const TestAttempt = require('./TestAttempt')(sequelize);
const UserAnswer = require('./UserAnswer')(sequelize);
const ActivityLog = require('./ActivityLog')(sequelize); // New model for activity tracking
const SkillScore = require('./SkillScore')(sequelize);
const Notification = require('./Notification')(sequelize);

// ==================== USER ASSOCIATIONS ====================
// User - UserProfile (One-to-One)
User.hasOne(UserProfile, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE',
  as: 'profile',
});
UserProfile.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// ==================== SAVED MATERIAL ASSOCIATIONS ====================
// SavedMaterial belongs to User and StudyMaterial
SavedMaterial.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});
SavedMaterial.belongsTo(StudyMaterial, {
  foreignKey: 'material_id',
  as: 'material',
});

// User has many SavedMaterials
User.hasMany(SavedMaterial, {
  foreignKey: 'user_id',
  as: 'savedMaterials',
});
StudyMaterial.hasMany(SavedMaterial, {
  foreignKey: 'material_id',
  as: 'savedByUsers',
});

// User - StudyMaterial Many-to-Many through SavedMaterial
User.belongsToMany(StudyMaterial, {
  through: SavedMaterial,
  foreignKey: 'user_id',
  otherKey: 'material_id',
  as: 'bookmarkedMaterials',
});
StudyMaterial.belongsToMany(User, {
  through: SavedMaterial,
  foreignKey: 'material_id',
  otherKey: 'user_id',
  as: 'bookmarkedUsers',
});

// ==================== MOCK TEST ASSOCIATIONS ====================
// MockTest - User (Creator)
MockTest.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator',
});
User.hasMany(MockTest, {
  foreignKey: 'created_by',
  as: 'createdMockTests',
});

// TestAttempt - User
TestAttempt.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});
User.hasMany(TestAttempt, {
  foreignKey: 'user_id',
  as: 'testAttempts',
});

// TestAttempt - MockTest
TestAttempt.belongsTo(MockTest, {
  foreignKey: 'test_id',
  as: 'mockTest',
});
MockTest.hasMany(TestAttempt, {
  foreignKey: 'test_id',
  as: 'attempts',
});

// ==================== USER ANSWER ASSOCIATIONS ====================
// UserAnswer - TestAttempt
UserAnswer.belongsTo(TestAttempt, {
  foreignKey: 'attempt_id',
  as: 'attempt',
});
TestAttempt.hasMany(UserAnswer, {
  foreignKey: 'attempt_id',
  as: 'answers',
});

// UserAnswer - Question
UserAnswer.belongsTo(Question, {
  foreignKey: 'question_id',
  as: 'question',
});
Question.hasMany(UserAnswer, {
  foreignKey: 'question_id',
  as: 'answers',
});

// ==================== MOCK TEST - QUESTIONS (Many-to-Many) ====================
MockTest.belongsToMany(Question, {
  through: MockTestQuestion,
  foreignKey: 'test_id',
  otherKey: 'question_id',
  as: 'questions',
});
Question.belongsToMany(MockTest, {
  through: MockTestQuestion,
  foreignKey: 'question_id',
  otherKey: 'test_id',
  as: 'mockTests',
});

// ==================== ACTIVITY LOG ASSOCIATIONS ====================
ActivityLog.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});
User.hasMany(ActivityLog, {
  foreignKey: 'user_id',
  as: 'activities',
});

// ==================== NOTIFICATION ASSOCIATIONS ====================
Notification.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});
User.hasMany(Notification, {
  foreignKey: 'user_id',
  as: 'notifications',
});

// ==================== SKILL SCORE ASSOCIATIONS ====================
SkillScore.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});
User.hasMany(SkillScore, {
  foreignKey: 'user_id',
  as: 'skillScores',
});

// ==================== TIP ASSOCIATIONS ====================
Tip.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator',
});
User.hasMany(Tip, {
  foreignKey: 'created_by',
  as: 'createdTips',
});

// ==================== STUDY MATERIAL ASSOCIATIONS ====================
StudyMaterial.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator',
});
User.hasMany(StudyMaterial, {
  foreignKey: 'created_by',
  as: 'createdMaterials',
});

// ==================== EXPORTS ====================
module.exports = {
  sequelize,
  User,
  UserProfile,
  StudyMaterial,
  SavedMaterial,
  Tip,
  Question,
  MockTest,
  MockTestQuestion,
  TestAttempt,
  UserAnswer,
  ActivityLog,
  SkillScore,
  Notification,
};
