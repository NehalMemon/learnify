const fs = require('fs');
const fsPromises = require('fs').promises;
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../config/logger');

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Extracts all MCQs from one or more uploaded image buffers using Gemini 2.5 Flash.
 * All images are passed in a single prompt to allow cross-image context aggregation.
 *
 * @param {import('express').Request['files']} files - Array of multer file objects (memoryStorage).
 * @returns {Promise<Array<{ title: string; options: string[]; correctOption: number; explanation: string }>>}
 * @throws {Error} If the Gemini API fails or the response is not valid JSON.
 */
exports.extractQuizzesFromImages = async (files) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Map all uploaded multer files into Gemini's inlineData format asynchronously
    // to prevent fs.readFileSync from blocking the event loop for all other users
    const imageParts = await Promise.all(
      files.map(async (file) => {
        let base64Data;

        // If Multer is using MemoryStorage
        if (file.buffer) {
          base64Data = file.buffer.toString('base64');
        }
        // If Multer is using DiskStorage
        else if (file.path) {
          // Use async fs.promises.readFile to prevent blocking the event loop
          const buffer = await fsPromises.readFile(file.path);
          base64Data = buffer.toString('base64');
          // Clean up the temp file after reading it into memory
          await fsPromises.unlink(file.path);
        } else {
          throw new Error('Invalid file upload configuration. No buffer or path found.');
        }

        return {
          inlineData: {
            data: base64Data,
            mimeType: file.mimetype,
          },
        };
      })
    );

    const prompt = `
      You are a medical examination expert. Analyze the provided images of textbook pages.
      Extract EVERY Multiple Choice Question (MCQ) across ALL images into a single structured JSON array.
      Format: [{ "title": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctOption": 0, "explanation": "..." }]
      Rules:
      - "correctOption" must be a zero-based integer index (0=A, 1=B, 2=C, 3=D).
      - Include ALL four option strings in the "options" array.
      - Return ONLY raw JSON. No markdown backticks. No prose before or after the array.
    `;

    // Pass the prompt text AND the full array of images to the model in one request
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text().replace(/```json|```/g, '').trim();

    return JSON.parse(text);
  } catch (error) {
    logger.error({ err: error }, '[AIService] extractQuizzesFromImages failed');

    const serviceError = new Error('Failed to extract MCQs from images.');
    serviceError.statusCode = 500;
    throw serviceError;
  }
};
