const { sequelize } = require('../config/db');

const User = require('./User')(sequelize);
const UserProfile = require('./UserProfile')(sequelize);
const StudyMaterial = require('./StudyMaterial')(sequelize);

// Define associations if necessary
// User.hasOne(UserProfile, { foreignKey: 'user_id' });
// UserProfile.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  sequelize,
  User,
  UserProfile,
  StudyMaterial
};
