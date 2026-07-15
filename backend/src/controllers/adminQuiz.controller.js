// ─── Admin Quiz Management Controller ──────────────────────
// CRUD for DoctorsQuizz: categories, quizzes, and polymorphic questions.
//
// Security: All operations require ADMIN role (enforced by router middleware).

const prisma = require('../config/db');
const logger = require('../config/logger');
const { extractQuizzesFromImages } = require('../services/ai.service');

// ═══════════════════════════════════════════════════════════════
// DATA TRANSFORMERS (Polymorphic Question Formats)
// ═══════════════════════════════════════════════════════════════

/**
 * Transforms the frontend polymorphic question payload into the database structure.
 * Supporting: SINGLE_CHOICE, TRUE_FALSE, MULTIPLE_SELECT, MATCHING_PAIRS.
 * Seamessly fallback and convert legacy MCQs as well.
 *
 * @param {object} q - The question object from frontend
 * @returns {object} The transformed question for Prisma Client
 */
const transformQuestion = (q) => {
  const type = q.type || 'SINGLE_CHOICE';
  const base = {
    type,
    questionText: q.questionText.trim(),
    explanation: q.explanation ? q.explanation.trim() : null,
    points: q.points !== undefined ? Number(q.points) : 1,
  };

  // Fisher-Yates shuffle algorithm for matching pairs randomization
  const shuffle = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  switch (type) {
    case 'SINGLE_CHOICE': {
      // Legacy MCQ support
      const isLegacy = q.optionA !== undefined || q.optionB !== undefined || q.optionC !== undefined || q.optionD !== undefined || q.correctOption !== undefined;
      if (isLegacy) {
        const options = [
          (q.optionA || '').trim(),
          (q.optionB || '').trim(),
          (q.optionC || '').trim(),
          (q.optionD || '').trim()
        ];
        const correctMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
        const correctIndex = correctMap[q.correctOption] !== undefined ? correctMap[q.correctOption] : 0;
        return {
          ...base,
          content: options,
          correctAnswer: correctIndex,
          optionA: options[0],
          optionB: options[1],
          optionC: options[2],
          optionD: options[3],
          correctOption: q.correctOption,
        };
      }

      // New polymorphic structure
      return {
        ...base,
        content: q.options.map((opt) => opt.trim()),
        correctAnswer: Number(q.correctOptionIndex),
        optionA: q.options[0] ? q.options[0].trim() : null,
        optionB: q.options[1] ? q.options[1].trim() : null,
        optionC: q.options[2] ? q.options[2].trim() : null,
        optionD: q.options[3] ? q.options[3].trim() : null,
        correctOption: String(q.correctOptionIndex),
      };
    }

    case 'TRUE_FALSE': {
      const isTrue = q.correctAnswer === 'true' || q.correctAnswer === true;
      return {
        ...base,
        content: ['True', 'False'],
        correctAnswer: isTrue ? 'true' : 'false',
        optionA: 'True',
        optionB: 'False',
        optionC: null,
        optionD: null,
        correctOption: isTrue ? 'A' : 'B',
      };
    }

    case 'MULTIPLE_SELECT': {
      const correctIndices = Array.isArray(q.correctOptionIndices)
        ? q.correctOptionIndices.map((idx) => Number(idx))
        : [];
      return {
        ...base,
        content: q.options.map((opt) => opt.trim()),
        correctAnswer: correctIndices,
        optionA: q.options[0] ? q.options[0].trim() : null,
        optionB: q.options[1] ? q.options[1].trim() : null,
        optionC: q.options[2] ? q.options[2].trim() : null,
        optionD: q.options[3] ? q.options[3].trim() : null,
        correctOption: correctIndices.join(','),
      };
    }

    case 'MATCHING_PAIRS': {
      const leftItems = q.pairs.map((p) => p.left.trim());
      const rightItems = q.pairs.map((p) => p.right.trim());

      const randomizedLeft = shuffle(leftItems);
      const randomizedRight = shuffle(rightItems);

      const solutionMap = {};
      q.pairs.forEach((p) => {
        solutionMap[p.left.trim()] = p.right.trim();
      });

      return {
        ...base,
        content: {
          left: randomizedLeft,
          right: randomizedRight,
        },
        correctAnswer: solutionMap,
        optionA: null,
        optionB: null,
        optionC: null,
        optionD: null,
        correctOption: null,
      };
    }

    default:
      throw new Error(`Unsupported question type: ${type}`);
  }
};

// ═══════════════════════════════════════════════════════════════
// CATEGORY CRUD
// ═══════════════════════════════════════════════════════════════

// ── POST /api/v1/admin/quiz/categories ────────────────────────
const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;

    const existing = await prisma.quizCategory.findUnique({ where: { name } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Quiz category with this name already exists.',
      });
    }

    const category = await prisma.quizCategory.create({
      data: { name },
    });

    res.status(201).json({
      success: true,
      message: 'Quiz category created successfully.',
      data: {
        id: category.id,
        name: category.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════
// QUESTION CRUD
// ═══════════════════════════════════════════════════════════════

// ── POST /api/v1/admin/quiz/categories/:categoryId/questions ──
const addQuestion = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const {
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      explanation,
    } = req.body;

    const category = await prisma.quizCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Quiz category not found.',
      });
    }

    if (!['A', 'B', 'C', 'D'].includes(correctOption)) {
      return res.status(400).json({
        success: false,
        message: 'correctOption must be one of: A, B, C, D.',
      });
    }

    const question = await prisma.quizQuestion.create({
      data: {
        categoryId,
        questionText,
        optionA,
        optionB,
        optionC,
        optionD,
        correctOption,
        explanation: explanation || null,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Question added successfully.',
      data: {
        id: question.id,
        categoryId: question.categoryId,
        questionText: question.questionText,
        optionA: question.optionA,
        optionB: question.optionB,
        optionC: question.optionC,
        optionD: question.optionD,
        correctOption: question.correctOption,
        explanation: question.explanation,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/admin/quiz/categories/:categoryId/questions/bulk ──
const bulkAddQuestions = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Questions must be a non-empty array.',
      });
    }

    const category = await prisma.quizCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Quiz category not found.',
      });
    }

    const validOptions = ['A', 'B', 'C', 'D'];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const index = `[${i}]`;

      if (!q.questionText || typeof q.questionText !== 'string' || q.questionText.trim().length < 5) {
        return res.status(400).json({
          success: false,
          message: `Question ${index}: questionText must be at least 5 characters.`,
        });
      }
      if (!q.optionA || !q.optionB || !q.optionC || !q.optionD) {
        return res.status(400).json({
          success: false,
          message: `Question ${index}: All four options (A, B, C, D) are required.`,
        });
      }
      if (!validOptions.includes(q.correctOption)) {
        return res.status(400).json({
          success: false,
          message: `Question ${index}: correctOption must be one of: A, B, C, D.`,
        });
      }
    }

    const questionsData = questions.map((q) => ({
      categoryId,
      questionText: q.questionText.trim(),
      optionA: q.optionA.trim(),
      optionB: q.optionB.trim(),
      optionC: q.optionC.trim(),
      optionD: q.optionD.trim(),
      correctOption: q.correctOption,
      explanation: q.explanation ? q.explanation.trim() : null,
    }));

    const result = await prisma.quizQuestion.createMany({ data: questionsData });

    res.status(201).json({
      success: true,
      message: `${result.count} questions added successfully.`,
      data: {
        count: result.count,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/v1/admin/quiz/questions/:id ─────────────────────
const updateQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      explanation,
    } = req.body;

    const existingQuestion = await prisma.quizQuestion.findUnique({
      where: { id },
    });
    if (!existingQuestion) {
      return res.status(404).json({
        success: false,
        message: 'Quiz question not found.',
      });
    }

    if (correctOption && !['A', 'B', 'C', 'D'].includes(correctOption)) {
      return res.status(400).json({
        success: false,
        message: 'correctOption must be one of: A, B, C, D.',
      });
    }

    const updatedQuestion = await prisma.quizQuestion.update({
      where: { id },
      data: {
        questionText: questionText ? questionText.trim() : undefined,
        optionA: optionA ? optionA.trim() : undefined,
        optionB: optionB ? optionB.trim() : undefined,
        optionC: optionC ? optionC.trim() : undefined,
        optionD: optionD ? optionD.trim() : undefined,
        correctOption: correctOption || undefined,
        explanation: explanation !== undefined ? (explanation ? explanation.trim() : null) : undefined,
      },
    });

    res.json({
      success: true,
      message: 'Question updated successfully.',
      data: updatedQuestion,
    });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/v1/admin/quiz/questions/:id ──────────────────
const deleteQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingQuestion = await prisma.quizQuestion.findUnique({
      where: { id },
    });
    if (!existingQuestion) {
      return res.status(404).json({
        success: false,
        message: 'Quiz question not found.',
      });
    }

    await prisma.quizQuestion.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Question deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/admin/quiz/categories ────────────────────────
const listCategories = async (req, res, next) => {
  try {
    const categories = await prisma.quizCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });

    res.json({
      success: true,
      data: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        questionCount: cat._count.questions,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/admin/quiz/categories/:categoryId/questions ──
const listQuestions = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    const [category, questions] = await Promise.all([
      prisma.quizCategory.findUnique({
        where: { id: categoryId },
      }),
      prisma.quizQuestion.findMany({
        where: { categoryId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Quiz category not found.',
      });
    }

    res.json({
      success: true,
      data: questions,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/v1/admin/quizzes ──────────────────────────────────
const getAdminQuizzes = async (req, res, next) => {
  try {
    const { categoryId, subject, search } = req.query;

    const where = {};

    if (categoryId) where.categoryId = categoryId;
    if (subject) where.subject = subject;
    if (search) {
      where.title = { contains: String(search), mode: 'insensitive' };
    }

    const quizzes = await prisma.quiz.findMany({
      where,
      select: {
        id: true,
        title: true,
        subject: true,
        year: true,
        isPublished: true,
        createdAt: true,
        category: { select: { id: true, name: true } },
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: quizzes });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/quizzes/:id
 */
const getAdminQuizById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        category: true,
        questions: {
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found.',
      });
    }

    res.json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/v1/admin/quiz/categories/:id ────────────────────
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const existing = await prisma.quizCategory.findUnique({
      where: { id },
    });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Quiz category not found.',
      });
    }

    if (name && name !== existing.name) {
      const duplicate = await prisma.quizCategory.findUnique({
        where: { name },
      });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'Quiz category with this name already exists.',
        });
      }
    }

    const updated = await prisma.quizCategory.update({
      where: { id },
      data: { name: name ? name.trim() : undefined },
    });

    res.json({
      success: true,
      message: 'Quiz category updated successfully.',
      data: {
        id: updated.id,
        name: updated.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/v1/admin/quiz/categories/:id ─────────────────
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.quizCategory.findUnique({
      where: { id },
    });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Quiz category not found.',
      });
    }

    await prisma.quizCategory.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Quiz category deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/v1/admin/quizzes/full ──────────────────────────
// Creates a named exam (Quiz wrapper) and nested Questions in a single transaction.
/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const createQuiz = async (req, res, next) => {
  try {
    const { title, categoryId, subject, year, durationSec, questions } = req.body;

    const category = await prisma.quizCategory.findUnique({ where: { id: categoryId } });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Quiz category not found.' });
    }

    // Map over the incoming questions and transform polymorphic types
    const transformedQuestions = questions.map((q) => transformQuestion(q));

    // Create the Quiz and all nested Questions in a single atomic database write.
    // questions: { create: transformedQuestionsArray }
    const quiz = await prisma.quiz.create({
      data: {
        title: title.trim(),
        categoryId,
        subject: subject?.trim() || null,
        year: year !== undefined ? Number(year) : 1,
        durationSec: durationSec !== undefined ? Number(durationSec) : 3600,
        isPublished: true,
        questions: {
          create: transformedQuestions,
        },
      },
      include: {
        questions: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Quiz "${quiz.title}" created with ${quiz.questions.length} question(s).`,
      data: quiz,
    });
  } catch (error) {
    logger.error({ err: error, path: req.originalUrl }, '[AdminQuizController] createQuiz failed');
    next(error);
  }
};

// ── POST /api/v1/admin/quizzes/extract ───────────────────────
const extractFromImages = async (req, res, next) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one image is required.' });
    }
    const questions = await extractQuizzesFromImages(req.files);
    res.json({ success: true, data: questions });
  } catch (error) {
    logger.error({ err: error, path: req.originalUrl }, '[AdminQuizController] extractFromImages failed');
    next(error);
  }
};

// ── POST /api/v1/admin/quizzes/bulk-create ───────────────────
const bulkCreateQuestions = async (req, res, next) => {
  try {
    const { quizId, questions } = req.body;
    if (!quizId || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'quizId and questions array are required.' });
    }
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }
    const validMap = ['A', 'B', 'C', 'D'];
    const questionsData = questions.map((q) => {
      const correctIndex = Number(q.correctOption);
      const optA = q.options && q.options[0] ? q.options[0] : q.optionA;
      const optB = q.options && q.options[1] ? q.options[1] : q.optionB;
      const optC = q.options && q.options[2] ? q.options[2] : q.optionC;
      const optD = q.options && q.options[3] ? q.options[3] : q.optionD;
      return {
        quizId,
        questionText: (q.title || q.questionText || '').trim(),
        optionA: (optA || '').trim(),
        optionB: (optB || '').trim(),
        optionC: (optC || '').trim(),
        optionD: (optD || '').trim(),
        correctOption: validMap[correctIndex] || 'A',
        explanation: q.explanation ? String(q.explanation).trim() : null,
      };
    });
    const createResult = await prisma.quizQuestion.createMany({ data: questionsData });
    res.status(201).json({ success: true, message: `${createResult.count} questions added successfully.`, data: { count: createResult.count } });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/admin/quizzes/:id
 * Full quiz update with nested question synchronization.
 */
const updateFullQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, categoryId, subject, year, durationSec, isPublished, questions } = req.body;

    const existingQuiz = await prisma.quiz.findUnique({ where: { id } });
    if (!existingQuiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Parent record
      const updatedQuiz = await tx.quiz.update({
        where: { id },
        data: {
          title: title ? title.trim() : undefined,
          categoryId,
          subject: subject ? subject.trim() : undefined,
          year: year !== undefined ? Number(year) : undefined,
          durationSec: durationSec !== undefined ? Number(durationSec) : undefined,
          isPublished: isPublished !== undefined ? Boolean(isPublished) : undefined,
        },
      });

      // 2. Sync Questions if provided
      if (questions && Array.isArray(questions)) {
        const incomingIds = questions.filter((q) => q.id).map((q) => q.id);

        // Delete questions that are no longer in the list
        await tx.quizQuestion.deleteMany({
          where: {
            quizId: id,
            id: { notIn: incomingIds },
          },
        });

        // Separate questions into "new" (no id) and "existing" (has id)
        const newQuestions = questions.filter((q) => !q.id);
        const existingQuestions = questions.filter((q) => q.id);

        // Batch create new questions (single query instead of N queries)
        if (newQuestions.length > 0) {
          const transformedNew = newQuestions.map((q) => ({
            ...transformQuestion(q),
            quizId: id,
          }));
          await tx.quizQuestion.createMany({
            data: transformedNew,
          });
        }

        // Update existing questions
        if (existingQuestions.length > 0) {
          await Promise.all(
            existingQuestions.map((q) => {
              const transformed = transformQuestion(q);
              return tx.quizQuestion.update({
                where: { id: q.id },
                data: {
                  type: transformed.type,
                  questionText: transformed.questionText,
                  content: transformed.content,
                  correctAnswer: transformed.correctAnswer,
                  points: transformed.points,
                  explanation: transformed.explanation,
                  optionA: transformed.optionA,
                  optionB: transformed.optionB,
                  optionC: transformed.optionC,
                  optionD: transformed.optionD,
                  correctOption: transformed.correctOption,
                },
              });
            })
          );
        }
      }

      return updatedQuiz;
    });

    res.json({
      success: true,
      message: 'Quiz updated successfully.',
      data: result,
    });
  } catch (error) {
    logger.error({ err: error, path: req.originalUrl }, '[AdminQuizController] updateFullQuiz failed');
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/quizzes/:id/status
 */
const toggleQuizStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;

    if (isPublished === undefined) {
      return res.status(400).json({ success: false, message: 'isPublished is required.' });
    }

    const updated = await prisma.quiz.update({
      where: { id },
      data: { isPublished: Boolean(isPublished) },
    });

    res.json({
      success: true,
      message: `Quiz ${updated.isPublished ? 'published' : 'unpublished'} successfully.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

const deleteQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Use a transaction to delete attempts and then the quiz
    await prisma.$transaction([
      prisma.quizAttempt.deleteMany({
        where: { quizId: id }
      }),
      prisma.quiz.delete({
        where: { id }
      })
    ]);

    res.json({
      success: true,
      message: 'Quiz deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCategory,
  addQuestion,
  bulkAddQuestions,
  updateQuestion,
  deleteQuestion,
  listCategories,
  listQuestions,
  getAdminQuizzes,
  getAdminQuizById,
  updateCategory,
  deleteCategory,
  createQuiz,
  createFullQuiz: createQuiz, // alias
  updateFullQuiz,
  toggleQuizStatus,
  deleteQuiz,
  extractFromImages,
  bulkCreateQuestions,
};
