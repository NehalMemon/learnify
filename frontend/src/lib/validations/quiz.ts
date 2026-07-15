import { z } from 'zod';

export const QuestionType = z.enum([
  'SINGLE_CHOICE',
  'TRUE_FALSE',
  'MULTIPLE_SELECT',
  'MATCHING_PAIRS',
]);

export type QuestionTypeType = z.infer<typeof QuestionType>;

export const SingleChoiceQuestionSchema = z.object({
  type: z.literal('SINGLE_CHOICE'),
  questionText: z.string().min(1, 'Question text is required'),
  options: z.array(z.string().min(1, 'Option text is required')).min(2, 'Provide at least 2 options'),
  correctOptionIndex: z.number().min(0, 'Select a correct option'),
  explanation: z.string().optional(),
});

export const TrueFalseQuestionSchema = z.object({
  type: z.literal('TRUE_FALSE'),
  questionText: z.string().min(1, 'Question text is required'),
  correctAnswer: z.enum(['true', 'false']),
  explanation: z.string().optional(),
});

export const MultipleSelectQuestionSchema = z.object({
  type: z.literal('MULTIPLE_SELECT'),
  questionText: z.string().min(1, 'Question text is required'),
  options: z.array(z.string().min(1, 'Option text is required')).min(2, 'Provide at least 2 options'),
  correctOptionIndices: z.array(z.number()).min(1, 'Select at least one correct option'),
  explanation: z.string().optional(),
});

export const MatchingPairsQuestionSchema = z.object({
  type: z.literal('MATCHING_PAIRS'),
  questionText: z.string().min(1, 'Question text is required'),
  pairs: z.array(z.object({
    left: z.string().min(1, 'Left item is required'),
    right: z.string().min(1, 'Right match is required'),
  })).min(2, 'Provide at least 2 pairs to match'),
  explanation: z.string().optional(),
});

export const QuizQuestionSchema = z.discriminatedUnion('type', [
  SingleChoiceQuestionSchema,
  TrueFalseQuestionSchema,
  MultipleSelectQuestionSchema,
  MatchingPairsQuestionSchema,
]);

export const QuizBuilderSchema = z.object({
  title: z.string().min(1, 'Quiz title is required').max(100),
  categoryId: z.string().min(1, 'Category is required'),
  durationSec: z.number().min(60, 'Duration must be at least 60 seconds (1 minute)'),
  questions: z.array(QuizQuestionSchema).min(1, 'Add at least one question'),
});

export type QuizBuilderFormValues = z.infer<typeof QuizBuilderSchema>;
export type QuizQuestionFormValues = z.infer<typeof QuizQuestionSchema>;
