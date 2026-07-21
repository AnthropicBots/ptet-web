const { StudyMaterial } = require('../models');
const { Op } = require('sequelize');
const response = require('../utils/response');
const { getWeakSkills } = require('../services/weakAreaService');

/**
 * Validate pagination parameters
 * @param {number} limit - Limit parameter
 * @param {number} offset - Offset parameter
 * @returns {Object} - Validated and sanitized pagination params
 */
const validatePagination = (limit, offset) => {
    // Parse and validate limit
    let parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
        parsedLimit = 10; // Default value
    } else if (parsedLimit > 100) {
        parsedLimit = 100; // Max cap
    }

    // Parse and validate offset
    let parsedOffset = parseInt(offset, 10);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
        parsedOffset = 0; // Default value
    }

    return { limit: parsedLimit, offset: parsedOffset };
};

/**
 * GET /api/materials
 * List materials with optional filters (type, skill, is_premium, pagination)
 */
exports.getMaterials = async (req, res, next) => {
    try {
        const { type, skill, is_premium, limit, offset } = req.query;
        const where = {};

        // Validate pagination parameters
        const { limit: validLimit, offset: validOffset } = validatePagination(limit, offset);

        if (type) where.type = type;
        if (skill) where.skill = skill;
        if (is_premium !== undefined) where.is_premium = is_premium === 'true';

        const { count, rows } = await StudyMaterial.findAndCountAll({
            where,
            limit: validLimit,
            offset: validOffset,
            order: [['created_at', 'DESC']],
        });

        // If limit or offset were invalid, return warning in response
        const warnings = [];
        if (limit !== undefined && (isNaN(parseInt(limit, 10)) || parseInt(limit, 10) < 1 || parseInt(limit, 10) > 100)) {
            warnings.push(`Limit was adjusted to ${validLimit}. Allowed range: 1-100`);
        }
        if (offset !== undefined && (isNaN(parseInt(offset, 10)) || parseInt(offset, 10) < 0)) {
            warnings.push(`Offset was adjusted to ${validOffset}. Minimum value: 0`);
        }

        const responseData = {
            items: rows,
            pagination: {
                totalItems: count,
                totalPages: Math.ceil(count / validLimit),
                currentPage: Math.floor(validOffset / validLimit) + 1,
                limit: validLimit,
                offset: validOffset,
            }
        };

        if (warnings.length > 0) {
            responseData.warnings = warnings;
        }

        return response.paginate(res, responseData.items, responseData.pagination);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/materials/:id
 * Fetch a single material by ID
 */
exports.getMaterialById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const material = await StudyMaterial.findByPk(id);
        if (!material) {
            return response.error(res, 'Material not found', 404);
        }

        return response.success(res, material);
    } catch (err) {
        next(err);
    }
};

// ===================== ADMIN ONLY =====================

/**
 * POST /api/admin/materials
 * Create a new study material
 */
exports.createMaterial = async (req, res, next) => {
    try {
        const { title, description, type, skill, content_url, is_premium } = req.body;

        // Basic validation
        if (!title || !type || !skill || !content_url) {
            return response.error(
                res,
                'Missing required fields: title, type, skill, content_url',
                400
            );
        }

        const material = await StudyMaterial.create({
            title,
            description,
            type,
            skill,
            content_url,
            is_premium: is_premium !== undefined ? is_premium : false,
        });

        return response.success(res, material, 'Material created successfully', 201);
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/admin/materials/:id
 * Update an existing material
 */
exports.updateMaterial = async (req, res, next) => {
    try {
        const { id } = req.params;
        const material = await StudyMaterial.findByPk(id);

        if (!material) {
            return response.error(res, 'Material not found', 404);
        }

        const { title, description, type, skill, content_url, is_premium } = req.body;

        if (title !== undefined) material.title = title;
        if (description !== undefined) material.description = description;
        if (type !== undefined) material.type = type;
        if (skill !== undefined) material.skill = skill;
        if (content_url !== undefined) material.content_url = content_url;
        if (is_premium !== undefined) material.is_premium = is_premium;

        await material.save();
        return response.success(res, material, 'Material updated successfully');
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/admin/materials/:id
 * Delete a material
 */
exports.deleteMaterial = async (req, res, next) => {
    try {
        const { id } = req.params;
        const material = await StudyMaterial.findByPk(id);

        if (!material) {
            return response.error(res, 'Material not found', 404);
        }

        await material.destroy();
        return response.success(res, null, 'Material deleted successfully');
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/materials/recommended/:userId
 * Return top 5 materials based on user's weak skills.
 */
exports.getRecommendedMaterials = async (req, res, next) => {
    try {
        const { userId } = req.params;

        // Authorization: user can only access their own recommendations
        if (req.user.id !== userId && req.user.role !== 'admin') {
            return response.error(res, 'Unauthorized to access this user\'s recommendations', 403);
        }

        // 1. Get up to 3 weakest skills
        let weakSkills = await getWeakSkills(userId);

        // 2. If no weak skills (e.g., no tests taken), fallback to recent materials
        if (!weakSkills.length) {
            const fallback = await StudyMaterial.findAll({
                limit: 5,
                order: [['created_at', 'DESC']],
            });
            return response.success(res, fallback, 'No weak areas found, showing recent materials');
        }

        // 3. Fetch materials that match the weak skills
        let materials = await StudyMaterial.findAll({
            where: {
                skill: weakSkills,
            },
            limit: 5,
            // Prioritise free materials if the user does not have a premium subscription
            order: [
                ['is_premium', 'ASC'], // free first
                // optionally add random ordering: sequelize.literal('RANDOM()')
            ],
        });

        // 4. If fewer than 5 materials, fill with other materials (any skill)
        if (materials.length < 5) {
            const extra = await StudyMaterial.findAll({
                where: {
                    skill: { [Op.notIn]: weakSkills },
                },
                limit: 5 - materials.length,
                order: [['is_premium', 'ASC']],
            });
            materials = [...materials, ...extra];
        }

        return response.success(res, materials, 'Recommended materials based on your weak areas');
    } catch (err) {
        next(err);
    }
};