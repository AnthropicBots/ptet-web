const {
  SavedMaterial,
  StudyMaterial,
  sequelize,
} = require("../models");

const {
  UniqueConstraintError,
} = require("sequelize");

const response = require("../utils/response");

exports.toggleSave = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {

    const userId = req.params.id;
    const materialId = req.params.materialId;

    if (
      req.user.id !== userId &&
      req.user.role !== "admin"
    ) {
      await transaction.rollback();

      return response.error(
        res,
        "Unauthorized to modify saved materials for this user",
        403
      );
    }

    const material =
      await StudyMaterial.findByPk(
        materialId,
        { transaction }
      );

    if (!material) {

      await transaction.rollback();

      return response.error(
        res,
        "Material not found",
        404
      );
    }

    const [savedMaterial, created] =
      await SavedMaterial.findOrCreate({

        where: {
          user_id: userId,
          material_id: materialId,
        },

        defaults: {
          user_id: userId,
          material_id: materialId,
        },

        transaction,
      });

    if (!created) {

      await savedMaterial.destroy({
        transaction,
      });

      await transaction.commit();

      return response.success(
        res,
        {
          saved: false,
        },
        "Material unsaved (removed from bookmarks)"
      );
    }

    await transaction.commit();

    return response.success(
      res,
      {
        saved: true,
      },
      "Material saved (added to bookmarks)"
    );

  } catch (err) {

    await transaction.rollback();

    if (err instanceof UniqueConstraintError) {

      return response.success(
        res,
        {
          saved: true,
        },
        "Material is already saved"
      );
    }

    next(err);
  }
};

exports.getSavedMaterials = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);

    if (Number(req.user.id) !== userId && req.user.role !== 'admin') {
      return response.error(res, 'Unauthorized to view saved materials for this user', 403);
    }

    const savedRecords = await SavedMaterial.findAll({
      where: { user_id: userId },
      include: [
        {
          model: StudyMaterial,
          attributes: [
            'id',
            'title',
            'description',
            'type',
            'skill',
            'content_url',
            'is_premium',
            'created_at',
          ],
        },
      ],
      order: [['saved_at', 'DESC']],
    });

    const materials = savedRecords.map((record) => record.StudyMaterial);

    return response.success(res, materials, 'Saved materials retrieved');
  } catch (err) {
    next(err);
  }
};