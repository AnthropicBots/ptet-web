// back-end/src/models/User.js

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: {
            msg: "Must be a valid email address",
          },
          notEmpty: {
            msg: "Email cannot be empty",
          },
        },
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "Name cannot be empty",
          },
          len: {
            args: [2, 50],
            msg: "Name must be between 2 and 50 characters",
          },
        },
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: {
            args: [10, 15],
            msg: "Phone must be between 10 and 15 characters",
          },
        },
      },
      photo_url: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isUrl: {
            msg: "Please provide a valid URL for the photo",
          },
        },
      },
      provider: {
        type: DataTypes.ENUM("google", "github", "email"),
        allowNull: false,
        defaultValue: "email",
      },
      password_hash: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      verification_token: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      role: {
        type: DataTypes.ENUM("user", "admin"),
        allowNull: false,
        defaultValue: "user",
      },
      // New fields
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      deactivatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      passwordChangedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      passwordResetToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      passwordResetExpires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      refreshToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      pendingEmail: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      emailVerificationToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      emailVerificationExpires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "users",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  // Data Sanitization Hooks
  User.beforeCreate((user) => {
    if (user.email) user.email = user.email.toLowerCase().trim();
    if (user.name) user.name = user.name.trim();
  });

  User.beforeUpdate((user) => {
    if (user.email) user.email = user.email.toLowerCase().trim();
    if (user.name) user.name = user.name.trim();
  });

  return User;
};