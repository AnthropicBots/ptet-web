// back-end/src/models/UserProfile.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserProfile = sequelize.define(
    'UserProfile',
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
        unique: true,
      },

      // Test related fields
      target_score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: {
            args: [0],
            msg: 'Target score cannot be negative',
          },
          max: {
            args: [120],
            msg: 'Target score cannot exceed 120',
          },
        },
      },

      test_date: {
        type: DataTypes.DATE,
        allowNull: true,
        validate: {
          isDate: {
            msg: 'Please provide a valid date',
          },
        },
      },

      country_applying_to: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: {
            args: [0, 100],
            msg: 'Country name cannot exceed 100 characters',
          },
        },
      },

      visa_type: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: {
            args: [0, 50],
            msg: 'Visa type cannot exceed 50 characters',
          },
        },
      },

      // User engagement fields
      streak_days: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        validate: {
          min: {
            args: [0],
            msg: 'Streak days cannot be negative',
          },
        },
      },

      last_active: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },

      // Profile fields
      bio: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          len: {
            args: [0, 500],
            msg: 'Bio cannot exceed 500 characters',
          },
        },
      },

      address: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: {
            args: [0, 255],
            msg: 'Address cannot exceed 255 characters',
          },
        },
      },

      city: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: {
            args: [0, 100],
            msg: 'City cannot exceed 100 characters',
          },
        },
      },

      state: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: {
            args: [0, 100],
            msg: 'State cannot exceed 100 characters',
          },
        },
      },

      zipCode: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: {
            args: [0, 20],
            msg: 'ZIP code cannot exceed 20 characters',
          },
        },
      },

      country: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: {
            args: [0, 100],
            msg: 'Country cannot exceed 100 characters',
          },
        },
      },

      dateOfBirth: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        validate: {
          isDate: {
            msg: 'Please provide a valid date of birth',
          },
          isBefore: {
            args: [new Date().toISOString().split('T')[0]],
            msg: 'Date of birth cannot be in the future',
          },
        },
      },

      gender: {
        type: DataTypes.ENUM('male', 'female', 'other', 'prefer_not_to_say'),
        allowNull: true,
        defaultValue: 'prefer_not_to_say',
      },

      profileImage: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isUrl: {
            msg: 'Please provide a valid URL for profile image',
          },
        },
      },

      profileImagePublicId: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      preferences: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {
          notifications: {
            email: true,
            push: true,
            marketing: false,
          },
          theme: 'light',
          language: 'en',
          studyReminders: true,
          dailyGoal: 30, // minutes
        },
        validate: {
          isValidPreferences(value) {
            if (value && typeof value !== 'object') {
              throw new Error('Preferences must be an object');
            }
          },
        },
      },
    },
    {
      tableName: 'user_profiles',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  // ==================== HOOKS ====================
  UserProfile.beforeCreate((profile) => {
    // Ensure streak_days is never negative
    if (profile.streak_days < 0) {
      profile.streak_days = 0;
    }

    // Set last_active if not provided
    if (!profile.last_active) {
      profile.last_active = new Date();
    }

    // Ensure target_score is valid
    if (profile.target_score < 0) {
      profile.target_score = 0;
    }
    if (profile.target_score > 120) {
      profile.target_score = 120;
    }
  });

  UserProfile.beforeUpdate((profile) => {
    // Ensure streak_days is never negative
    if (profile.streak_days < 0) {
      profile.streak_days = 0;
    }

    // Ensure target_score is valid
    if (profile.target_score < 0) {
      profile.target_score = 0;
    }
    if (profile.target_score > 120) {
      profile.target_score = 120;
    }
  });

  // ==================== INSTANCE METHODS ====================
  UserProfile.prototype.updateStreak = async function () {
    const today = new Date();
    const lastActive = new Date(this.last_active);
    const diffDays = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Streak continues
      this.streak_days += 1;
    } else if (diffDays > 1) {
      // Streak broken
      this.streak_days = 1;
    }
    // If diffDays === 0, streak unchanged

    this.last_active = today;
    await this.save();
    return this.streak_days;
  };

  UserProfile.prototype.getPreferences = function () {
    return (
      this.preferences || {
        notifications: {
          email: true,
          push: true,
          marketing: false,
        },
        theme: 'light',
        language: 'en',
        studyReminders: true,
        dailyGoal: 30,
      }
    );
  };

  UserProfile.prototype.updatePreferences = async function (newPreferences) {
    this.preferences = {
      ...this.getPreferences(),
      ...newPreferences,
    };
    await this.save();
    return this.preferences;
  };

  // ==================== CLASS METHODS ====================
  UserProfile.findByUserId = async function (userId) {
    return await this.findOne({
      where: { user_id: userId },
    });
  };

  UserProfile.getActiveProfiles = async function () {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return await this.findAll({
      where: {
        last_active: {
          [Op.gte]: sevenDaysAgo,
        },
      },
    });
  };

  // ==================== ASSOCIATIONS ====================
  UserProfile.associate = (models) => {
    UserProfile.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });
  };

  return UserProfile;
};
