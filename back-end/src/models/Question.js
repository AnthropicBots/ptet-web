// back-end/src/models/Question.js

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Question = sequelize.define(
    "Question",
    {
      // ==================== BASIC INFORMATION ====================
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      type: {
        type: DataTypes.ENUM("speaking", "writing", "reading", "listening"),
        allowNull: false,
        validate: {
          isIn: {
            args: [["speaking", "writing", "reading", "listening"]],
            msg: "Invalid question type",
          },
        },
      },

      subtype: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isValidSubtype(value) {
            if (!value) return;
            
            // Validate subtype based on question type
            const validSubtypes = {
              speaking: ['read_aloud', 'repeat_sentence', 'describe_image', 'retell_lecture', 'answer_short_question'],
              writing: ['essay', 'summary', 'letter', 'report', 'review'],
              reading: ['multiple_choice', 'true_false', 'fill_blank', 'matching', 'summary_completion'],
              listening: ['multiple_choice', 'fill_blank', 'matching', 'highlight_correct', 'select_missing_word']
            };

            const valid = validSubtypes[this.type] || [];
            if (!valid.includes(value)) {
              throw new Error(`Invalid subtype "${value}" for question type "${this.type}"`);
            }
          }
        },
      },

      difficulty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: {
            args: [1],
            msg: "Difficulty must be at least 1",
          },
          max: {
            args: [5],
            msg: "Difficulty cannot exceed 5",
          },
        },
      },

      // ==================== CONTENT ====================
      content: {
        type: DataTypes.JSONB,
        allowNull: false,
        validate: {
          isValidContent(value) {
            if (!value || typeof value !== 'object') {
              throw new Error('Content must be a valid JSON object');
            }

            // Basic content validation
            if (!value.question_text && !value.prompt) {
              throw new Error('Content must include question_text or prompt');
            }

            // Validate based on question type
            const question = this;

            switch (question.type) {
              case 'speaking':
                if (!value.prompt) {
                  throw new Error('Speaking questions must have a prompt');
                }
                if (!value.instructions) {
                  throw new Error('Speaking questions must have instructions');
                }
                break;

              case 'writing':
                if (!value.prompt || value.prompt.length < 10) {
                  throw new Error('Writing questions must have a detailed prompt (min 10 chars)');
                }
                if (!value.word_limit || value.word_limit < 50) {
                  throw new Error('Writing questions must have a word limit (min 50)');
                }
                break;

              case 'reading':
                if (!value.passage && !value.text) {
                  throw new Error('Reading questions must have a passage or text');
                }
                if (!Array.isArray(value.options) || value.options.length < 2) {
                  throw new Error('Reading questions must have at least 2 options');
                }
                break;

              case 'listening':
                if (!value.transcript && !value.audio_url) {
                  throw new Error('Listening questions must have transcript or audio_url');
                }
                break;
            }
          }
        },
      },

      audio_url: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isUrl: {
            msg: "Please provide a valid URL for audio",
          },
        },
      },

      correct_answer: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      scoring_rubric: {
        type: DataTypes.JSONB,
        allowNull: true,
        validate: {
          isValidRubric(value) {
            if (value && typeof value !== 'object') {
              throw new Error('Scoring rubric must be a valid JSON object');
            }
            if (value) {
              // Check for required rubric fields based on question type
              const question = this;
              if (question.type === 'speaking' || question.type === 'writing') {
                if (!value.criteria || !Array.isArray(value.criteria)) {
                  throw new Error('Speaking/Writing rubrics must include criteria array');
                }
                if (!value.score_bands) {
                  throw new Error('Speaking/Writing rubrics must include score_bands');
                }
              }
            }
          }
        },
      },

      // ==================== METADATA ====================
      time_limit: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 60, // seconds
        validate: {
          min: {
            args: [5],
            msg: "Time limit must be at least 5 seconds",
          },
          max: {
            args: [1800],
            msg: "Time limit cannot exceed 1800 seconds (30 minutes)",
          },
        },
      },

      points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: {
            args: [1],
            msg: "Points must be at least 1",
          },
          max: {
            args: [100],
            msg: "Points cannot exceed 100",
          },
        },
      },

      hints: {
        type: DataTypes.JSONB,
        allowNull: true,
        validate: {
          isValidHints(value) {
            if (value && !Array.isArray(value)) {
              throw new Error('Hints must be an array');
            }
            if (value && value.length > 5) {
              throw new Error('Maximum 5 hints allowed');
            }
            if (value) {
              value.forEach(hint => {
                if (typeof hint !== 'string' || hint.length > 200) {
                  throw new Error('Each hint must be a string of max 200 characters');
                }
              });
            }
          }
        },
      },

      // ==================== STATUS & VERSIONING ====================
      status: {
        type: DataTypes.ENUM('draft', 'published', 'archived', 'under_review'),
        allowNull: false,
        defaultValue: 'draft',
        validate: {
          isIn: {
            args: [['draft', 'published', 'archived', 'under_review']],
            msg: "Invalid status value",
          },
        },
      },

      version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: {
            args: [1],
            msg: "Version must be at least 1",
          },
        },
      },

      previousVersions: {
        type: DataTypes.JSONB,
        allowNull: true,
      },

      // ==================== TAGS & CATEGORIES ====================
      tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        validate: {
          isValidTags(value) {
            if (value && !Array.isArray(value)) {
              throw new Error('Tags must be an array');
            }
            if (value && value.length > 10) {
              throw new Error('Maximum 10 tags allowed');
            }
            if (value) {
              value.forEach(tag => {
                if (typeof tag !== 'string' || tag.length > 30) {
                  throw new Error('Each tag must be a string of max 30 characters');
                }
              });
            }
          }
        },
      },

      category: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: {
            args: [0, 50],
            msg: "Category cannot exceed 50 characters",
          },
        },
      },

      subcategory: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: {
            args: [0, 50],
            msg: "Subcategory cannot exceed 50 characters",
          },
        },
      },

      difficulty_level: {
        type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
        allowNull: false,
        defaultValue: 'intermediate',
        validate: {
          isIn: {
            args: [['beginner', 'intermediate', 'advanced', 'expert']],
            msg: "Invalid difficulty level",
          },
        },
      },

      // ==================== LANGUAGE ====================
      language: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'en',
        validate: {
          isIn: {
            args: [['en', 'es', 'fr', 'de', 'zh', 'ja', 'ar', 'hi', 'pt', 'ru']],
            msg: "Unsupported language code",
          },
        },
      },

      // ==================== USAGE STATS ====================
      usage_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: {
            args: [0],
            msg: "Usage count cannot be negative",
          },
        },
      },

      success_rate: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: {
            args: [0],
            msg: "Success rate cannot be negative",
          },
          max: {
            args: [100],
            msg: "Success rate cannot exceed 100",
          },
        },
      },

      // ==================== CREATOR & TIMESTAMPS ====================
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },

      published_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      archived_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      // Keep original timestamp fields but add updated_at
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },

      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
    },
    {
      tableName: "questions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          fields: ['type'],
          name: 'idx_question_type',
        },
        {
          fields: ['status'],
          name: 'idx_question_status',
        },
        {
          fields: ['category'],
          name: 'idx_question_category',
        },
        {
          fields: ['difficulty_level'],
          name: 'idx_question_difficulty',
        },
        {
          fields: ['language'],
          name: 'idx_question_language',
        },
        {
          fields: ['created_by'],
          name: 'idx_question_created_by',
        },
        {
          fields: ['status', 'type', 'difficulty_level'],
          name: 'idx_question_composite',
        },
        {
          fields: ['usage_count'],
          name: 'idx_question_usage',
        },
      ],
    }
  );

  // ==================== HOOKS ====================
  Question.beforeCreate((question) => {
    // Ensure version starts at 1
    if (!question.version) {
      question.version = 1;
    }

    // Set published_at when status becomes published
    if (question.status === 'published') {
      question.published_at = new Date();
    }

    // Initialize previousVersions
    if (!question.previousVersions) {
      question.previousVersions = [];
    }

    // Map difficulty to difficulty_level
    if (question.difficulty) {
      const difficultyMap = {
        1: 'beginner',
        2: 'beginner',
        3: 'intermediate',
        4: 'advanced',
        5: 'expert'
      };
      question.difficulty_level = difficultyMap[question.difficulty] || 'intermediate';
    }
  });

  Question.beforeUpdate((question) => {
    // Increment version on content changes
    if (question.changed('content') || question.changed('correct_answer') || question.changed('scoring_rubric')) {
      question.version += 1;
      
      // Store previous version
      const previousVersion = {
        content: question.previous('content'),
        correct_answer: question.previous('correct_answer'),
        scoring_rubric: question.previous('scoring_rubric'),
        version: question.previous('version'),
        updatedAt: question.previous('updated_at'),
      };
      
      const prevVersions = question.previousVersions || [];
      question.previousVersions = [...prevVersions, previousVersion].slice(-10); // Keep last 10 versions
    }

    // Set timestamps based on status changes
    if (question.changed('status')) {
      if (question.status === 'published') {
        question.published_at = new Date();
      }
      if (question.status === 'archived') {
        question.archived_at = new Date();
      }
    }

    // Map difficulty to difficulty_level
    if (question.changed('difficulty')) {
      const difficultyMap = {
        1: 'beginner',
        2: 'beginner',
        3: 'intermediate',
        4: 'advanced',
        5: 'expert'
      };
      question.difficulty_level = difficultyMap[question.difficulty] || 'intermediate';
    }

    // Ensure updated_at is set
    question.updated_at = new Date();
  });

  // ==================== INSTANCE METHODS ====================
  Question.prototype.publish = async function() {
    this.status = 'published';
    this.published_at = new Date();
    await this.save();
    return this;
  };

  Question.prototype.archive = async function() {
    this.status = 'archived';
    this.archived_at = new Date();
    await this.save();
    return this;
  };

  Question.prototype.draft = async function() {
    this.status = 'draft';
    await this.save();
    return this;
  };

  Question.prototype.incrementUsage = async function() {
    this.usage_count += 1;
    await this.save();
    return this.usage_count;
  };

  Question.prototype.updateSuccessRate = async function(newRate) {
    if (newRate < 0 || newRate > 100) {
      throw new Error('Success rate must be between 0 and 100');
    }
    
    // Weighted average with existing rate
    const totalAttempts = this.usage_count || 1;
    this.success_rate = ((this.success_rate * (totalAttempts - 1)) + newRate) / totalAttempts;
    await this.save();
    return this.success_rate;
  };

  Question.prototype.getVersionHistory = function() {
    return this.previousVersions || [];
  };

  Question.prototype.addTag = async function(tag) {
    if (!this.tags) this.tags = [];
    if (!this.tags.includes(tag) && this.tags.length < 10) {
      this.tags.push(tag);
      await this.save();
    }
    return this.tags;
  };

  Question.prototype.removeTag = async function(tag) {
    if (this.tags) {
      this.tags = this.tags.filter(t => t !== tag);
      await this.save();
    }
    return this.tags;
  };

  Question.prototype.getDifficultyLabel = function() {
    const labels = {
      1: 'Very Easy',
      2: 'Easy',
      3: 'Medium',
      4: 'Hard',
      5: 'Very Hard'
    };
    return labels[this.difficulty] || 'Medium';
  };

  // ==================== CLASS METHODS ====================
  Question.findByType = async function(type, options = {}) {
    const where = { type };
    if (options.status) {
      where.status = options.status;
    }
    if (options.difficulty) {
      where.difficulty = options.difficulty;
    }
    
    return await this.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: options.limit || 10,
      offset: options.offset || 0,
    });
  };

  Question.findPublished = async function() {
    return await this.findAll({
      where: { status: 'published' },
      order: [['created_at', 'DESC']],
    });
  };

  Question.findByCategory = async function(category, options = {}) {
    const where = { category };
    if (options.status) {
      where.status = options.status;
    }
    
    return await this.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: options.limit || 10,
      offset: options.offset || 0,
    });
  };

  Question.searchByTags = async function(tags) {
    if (!Array.isArray(tags) || tags.length === 0) {
      return [];
    }
    
    // Using PostgreSQL array overlap operator
    return await this.findAll({
      where: sequelize.literal(`tags && ARRAY[${tags.map(t => `'${t}'`).join(',')}]::varchar[]`),
      order: [['created_at', 'DESC']],
    });
  };

  Question.getStats = async function() {
    const total = await this.count();
    const published = await this.count({ where: { status: 'published' } });
    const byType = await this.findAll({
      attributes: ['type', sequelize.fn('COUNT', sequelize.col('id'))],
      group: ['type'],
      raw: true,
    });
    const avgDifficulty = await this.findOne({
      attributes: [[sequelize.fn('AVG', sequelize.col('difficulty')), 'avgDifficulty']],
      raw: true,
    });

    return {
      total,
      published,
      byType,
      avgDifficulty: avgDifficulty?.avgDifficulty || 0,
    };
  };

  // ==================== ASSOCIATIONS ====================
  Question.associate = (models) => {
    Question.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator',
    });
    
    Question.hasMany(models.MockTestQuestion, {
      foreignKey: 'question_id',
      as: 'testQuestions',
    });
    
    Question.hasMany(models.UserAnswer, {
      foreignKey: 'question_id',
      as: 'userAnswers',
    });
  };

  return Question;
};