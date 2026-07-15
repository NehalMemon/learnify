const prisma = require('../config/db');

const getCategories = async (req, res, next) => {
  try {
    const hasSoftDeleteFlag = Boolean(
      prisma?._runtimeDataModel?.models?.QuizCategory?.fields?.some(
        (field) => field.name === 'isDeleted'
      )
    );

    const categories = await prisma.quizCategory.findMany({
      ...(hasSoftDeleteFlag ? { where: { isDeleted: false } } : {}),
      include: {
        _count: { select: { questions: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
};

