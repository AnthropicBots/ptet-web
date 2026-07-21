const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SavedMaterial = sequelize.define(
    "SavedMaterial",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        validate: {
          isUUID: 4,
          notNull: true,
        },
      },
      material_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "materials",
          key: "id",
        },
        validate: {
          isUUID: 4,
          notNull: true,
        },
      },
      saved_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          len: [0, 1000],
        },
      },
      tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: [],
        validate: {
          isValidTags(value) {
            if (value && value.length > 20) {
              throw new Error('Maximum 20 tags allowed');
            }
          }
        },
      },
      is_favorite: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: DataTypes.ENUM('active', 'archived', 'deleted'),
        allowNull: false,
        defaultValue: 'active',
      },
    },
    {
      tableName: "saved_materials",
      timestamps: true,
      createdAt: false,
      updatedAt: 'updated_at',
      paranoid: true,
      deletedAt: 'deleted_at',
      
      indexes: [
        {
          fields: ['user_id'],
          name: 'idx_saved_materials_user_id',
        },
        {
          fields: ['material_id'],
          name: 'idx_saved_materials_material_id',
        },
        {
          fields: ['user_id', 'material_id'],
          unique: true,
          name: 'idx_saved_materials_user_material_unique',
        },
        {
          fields: ['saved_at'],
          name: 'idx_saved_materials_saved_at',
        },
        {
          fields: ['is_favorite'],
          name: 'idx_saved_materials_is_favorite',
        },
        {
          fields: ['status'],
          name: 'idx_saved_materials_status',
        },
        {
          fields: ['user_id', 'status'],
          name: 'idx_saved_materials_user_status',
        },
      ],

      hooks: {
        beforeCreate: (savedMaterial) => {
          savedMaterial.saved_at = new Date();
        },
        beforeUpdate: (savedMaterial) => {
          savedMaterial.updated_at = new Date();
        },
        beforeBulkCreate: (savedMaterials) => {
          savedMaterials.forEach(sm => {
            if (!sm.saved_at) {
              sm.saved_at = new Date();
            }
          });
        },
      },

      scopes: {
        active: {
          where: { status: 'active' },
        },
        archived: {
          where: { status: 'archived' },
        },
        favorites: {
          where: { is_favorite: true },
        },
        recent: {
          order: [['saved_at', 'DESC']],
        },
        oldest: {
          order: [['saved_at', 'ASC']],
        },
        byUser: (userId) => ({
          where: { user_id: userId },
        }),
        byMaterial: (materialId) => ({
          where: { material_id: materialId },
        }),
        withTags: (tags) => ({
          where: {
            tags: { [sequelize.Op.overlap]: tags },
          },
        }),
        savedAfter: (date) => ({
          where: {
            saved_at: { [sequelize.Op.gte]: date },
          },
        }),
        savedBefore: (date) => ({
          where: {
            saved_at: { [sequelize.Op.lte]: date },
          },
        }),
      },
    }
  );

  SavedMaterial.prototype.isActive = function() {
    return this.status === 'active';
  };

  SavedMaterial.prototype.isArchived = function() {
    return this.status === 'archived';
  };

  SavedMaterial.prototype.isFavorite = function() {
    return this.is_favorite === true;
  };

  SavedMaterial.prototype.toggleFavorite = function() {
    this.is_favorite = !this.is_favorite;
    return this.save();
  };

  SavedMaterial.prototype.archive = function() {
    this.status = 'archived';
    return this.save();
  };

  SavedMaterial.prototype.restore = function() {
    this.status = 'active';
    this.deleted_at = null;
    return this.save();
  };

  SavedMaterial.prototype.hasTag = function(tag) {
    return this.tags && this.tags.includes(tag);
  };

  SavedMaterial.prototype.addTag = function(tag) {
    if (!this.tags) this.tags = [];
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      return this.save();
    }
    return this;
  };

  SavedMaterial.prototype.removeTag = function(tag) {
    if (this.tags) {
      this.tags = this.tags.filter(t => t !== tag);
      return this.save();
    }
    return this;
  };

  SavedMaterial.prototype.getTimeSinceSaved = function() {
    const now = new Date();
    const diff = now - this.saved_at;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  SavedMaterial.prototype.toJSON = function() {
    const values = { ...this.get() };
    delete values.deleted_at;
    return values;
  };

  SavedMaterial.associate = (models) => {
    SavedMaterial.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });
    SavedMaterial.belongsTo(models.Material, {
      foreignKey: 'material_id',
      as: 'material',
    });
  };

  return SavedMaterial;
};