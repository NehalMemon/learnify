'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { toast } from 'react-hot-toast';
import {
  Download,
  FileSpreadsheet,
  Upload,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  bulkCreateBankQuestions,
  type BankQuestionType,
  type CreateBankQuestionInput,
  type QuestionDifficulty,
} from '@/app/actions/questionBankActions';

interface ImportQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string;
  subjectId?: string | null;
  onSuccess?: () => void;
}

export function ImportQuestionsModal({
  isOpen,
  onClose,
  categoryId,
  subjectId,
  onSuccess,
}: ImportQuestionsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<CreateBankQuestionInput[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setFile(null);
    setParsedQuestions([]);
    setParseWarnings([]);
    setParseError(null);
    setIsParsing(false);
    setIsSaving(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleModalClose = () => {
    resetState();
    onClose();
  };

  const handleDownloadTemplate = () => {
    const headers =
      'type,question_text,points,difficulty,explanation,tags,option_a,option_b,option_c,option_d,correct_answer\n';
    const sampleRows = [
      'SINGLE_CHOICE,"What is the primary organ of the human cardiovascular system?",1,EASY,"The heart pumps blood through the circulatory system.",biology,"Heart","Lungs","Liver","Kidney",A',
      'MULTIPLE_CHOICE,"Select all prime numbers below.",2,MEDIUM,"2 and 3 are prime numbers.",math,2,3,4,6,"A,B"',
      'TRUE_FALSE,"Pure water boils at 100 degrees Celsius at sea level.",1,EASY,"100°C is the boiling point under standard pressure.",chemistry,,,,"TRUE"',
      'SHORT_ANSWER,"What is the chemical formula for carbon dioxide?",1,MEDIUM,"CO2 is the formula for carbon dioxide.",chemistry,,,,"CO2"',
    ].join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + sampleRows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', 'question_bank_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Template downloaded');
  };

  const processCsvFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv') && selectedFile.type !== 'text/csv') {
      setParseError('Please upload a valid .csv file.');
      return;
    }

    setFile(selectedFile);
    setParseError(null);
    setParseWarnings([]);
    setIsParsing(true);

    Papa.parse<Record<string, string>>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setIsParsing(false);
        if (results.errors && results.errors.length > 0 && results.data.length === 0) {
          setParseError(`CSV Parsing Error: ${results.errors[0].message}`);
          return;
        }

        const mapped: CreateBankQuestionInput[] = [];
        const warnings: string[] = [];

        results.data.forEach((row, index) => {
          const rowNum = index + 1;
          const rawQuestionText = row.question_text || row.questionText || row.Question || '';
          if (!rawQuestionText.trim()) {
            warnings.push(`Row ${rowNum}: Skipped because question_text is empty.`);
            return;
          }

          // 1. Map type (default to SINGLE_CHOICE)
          let type: BankQuestionType = 'SINGLE_CHOICE';
          const rawType = (row.type || '').trim().toUpperCase();
          if (['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'].includes(rawType)) {
            type = rawType as BankQuestionType;
          } else if (rawType.includes('MULTIPLE') || rawType.includes('MULTI')) {
            type = 'MULTIPLE_CHOICE';
          } else if (rawType.includes('TRUE') || rawType.includes('BOOLEAN')) {
            type = 'TRUE_FALSE';
          } else if (rawType.includes('SHORT') || rawType.includes('TEXT')) {
            type = 'SHORT_ANSWER';
          }

          // 2. Map difficulty (default to MEDIUM)
          let difficulty: QuestionDifficulty = 'MEDIUM';
          const rawDiff = (row.difficulty || '').trim().toUpperCase();
          if (['EASY', 'MEDIUM', 'HARD'].includes(rawDiff)) {
            difficulty = rawDiff as QuestionDifficulty;
          }

          // 3. Map points & explanation
          const points = Math.max(1, Number(row.points) || 1);
          const explanation = row.explanation ? row.explanation.trim() : null;

          // 4. Map tags
          const tags = row.tags
            ? row.tags
                .split(/[,;|]/)
                .map((t) => t.trim().replace(/^#/, ''))
                .filter(Boolean)
            : [];

          // 5. Map option fields
          const optA = (row.option_a || row.optionA || '').trim();
          const optB = (row.option_b || row.optionB || '').trim();
          const optC = (row.option_c || row.optionC || '').trim();
          const optD = (row.option_d || row.optionD || '').trim();

          const rawAnswer = row.correct_answer || row.correctAnswer || row.correct_option ? String(row.correct_answer || row.correctAnswer || row.correct_option).trim() : '';

          let contentData: Record<string, unknown> = {};
          let correctAnswerData: Record<string, unknown> = {};

          if (type === 'SINGLE_CHOICE') {
            const optionsList = [
              { id: 'A', text: optA },
              { id: 'B', text: optB },
              { id: 'C', text: optC },
              { id: 'D', text: optD },
            ].filter((o) => o.text.length > 0);

            const cleanedSingle = rawAnswer.replace(/[\[\]"']/g, '').trim();
            let selectedOption = 'A';
            const upperCorrect = cleanedSingle.toUpperCase();
            if (['A', 'B', 'C', 'D'].includes(upperCorrect)) {
              selectedOption = upperCorrect;
            } else if (cleanedSingle) {
              const matched = optionsList.find((o) => o.text.toLowerCase() === cleanedSingle.toLowerCase());
              if (matched) selectedOption = matched.id;
            }

            contentData = { options: optionsList };
            correctAnswerData = { value: selectedOption };
          } else if (type === 'MULTIPLE_CHOICE') {
            const optionsList = [
              { id: 'A', text: optA },
              { id: 'B', text: optB },
              { id: 'C', text: optC },
              { id: 'D', text: optD },
            ].filter((o) => o.text.length > 0);

            // Cleans "A, C", "A,C", or even ["A", "C"] into a clean array: ['A', 'C']
            const multiOptions = rawAnswer
              .replace(/[\[\]"']/g, '') // strip brackets and quotes if typed
              .split(',')
              .map((item) => item.trim().toUpperCase())
              .filter(Boolean);

            const validOptions = multiOptions.filter((p) => ['A', 'B', 'C', 'D'].includes(p));
            const selectedOptions = validOptions.length > 0 ? validOptions : ['A'];

            contentData = { options: optionsList };
            correctAnswerData = { values: selectedOptions };
          } else if (type === 'TRUE_FALSE') {
            const cleanedTF = rawAnswer.replace(/[\[\]"']/g, '').trim().toUpperCase();
            const tfVal = ['FALSE', 'F', '0', 'NO'].includes(cleanedTF) ? 'FALSE' : 'TRUE';
            contentData = { choices: ['TRUE', 'FALSE'] };
            correctAnswerData = { value: tfVal };
          } else if (type === 'SHORT_ANSWER') {
            const cleanedShort = rawAnswer.replace(/[\[\]"']/g, '').trim();
            contentData = { placeholder: 'Type your answer...' };
            correctAnswerData = { value: cleanedShort || 'N/A' };
          }

          mapped.push({
            category_id: categoryId || null,
            subject_id: subjectId || null,
            type,
            question_text: rawQuestionText.trim(),
            points,
            difficulty,
            explanation,
            tags,
            content: contentData,
            correct_answer: correctAnswerData,
          });
        });

        if (mapped.length === 0) {
          setParseError('No valid questions were found in the CSV file.');
        }

        setParsedQuestions(mapped);
        setParseWarnings(warnings);
      },
      error: (err) => {
        setIsParsing(false);
        setParseError(`Failed to read CSV file: ${err.message}`);
      },
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processCsvFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processCsvFile(e.dataTransfer.files[0]);
    }
  };

  const handleSaveToVault = async () => {
    if (parsedQuestions.length === 0) {
      toast.error('No questions available to save.');
      return;
    }

    if (!categoryId) {
      toast.error('Category is required to save questions.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await bulkCreateBankQuestions(parsedQuestions, categoryId, subjectId || null);
      if (result.success) {
        toast.success(`Successfully saved ${parsedQuestions.length} question(s) to vault!`);
        resetState();
        onClose();
        if (onSuccess) onSuccess();
      } else {
        toast.error('Failed to save questions to vault');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error bulk saving questions to vault';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="flex w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl transition-all border border-[#e4e6ef] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#eceef5] px-6 py-4 bg-[#fbfbfd]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f1f0ff] text-[#3525cd]">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#191c1e]">Import Questions from CSV</h2>
              <p className="text-xs text-[#696778]">Upload a CSV file to bulk add questions to the vault</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#777586] transition hover:bg-[#eceef5] hover:text-[#191c1e]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Template Download Section */}
          <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5">
            <div className="text-xs text-indigo-950 font-medium">
              <span className="font-bold">Need the CSV format?</span> Download our starter template with pre-filled sample rows.
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#3525cd] border border-indigo-200 shadow-2xs transition hover:bg-indigo-50"
            >
              <Download className="h-3.5 w-3.5" />
              Download CSV Template
            </button>
          </div>

          {/* File Upload Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${
              isDragging
                ? 'border-[#3525cd] bg-[#f1f0ff]'
                : file
                ? 'border-emerald-300 bg-emerald-50/30'
                : 'border-[#dadce5] bg-[#f7f7fb] hover:border-[#3525cd] hover:bg-white'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            {isParsing ? (
              <div className="flex flex-col items-center gap-2 py-4 text-[#3525cd]">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-xs font-semibold">Parsing CSV file...</span>
              </div>
            ) : file ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                <div className="text-xs font-bold text-[#191c1e]">{file.name}</div>
                <span className="text-[11px] text-[#696778]">
                  Click or drag to choose a different CSV file
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-4">
                <Upload className="h-8 w-8 text-[#8d8b99]" />
                <div className="text-xs font-bold text-[#191c1e]">
                  Click to upload or drag & drop CSV file
                </div>
                <span className="text-[11px] text-[#696778]">Supports standard .csv format</span>
              </div>
            )}
          </div>

          {/* Parsing Errors */}
          {parseError ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <div>{parseError}</div>
            </div>
          ) : null}

          {/* Parsed Summary Box */}
          {parsedQuestions.length > 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Successfully parsed {parsedQuestions.length} question(s).</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Ready to insert into category vault. Click "Save to Vault" below to complete import.
              </p>

              {parseWarnings.length > 0 ? (
                <div className="mt-2 border-t border-emerald-200 pt-2 text-[11px] text-amber-800">
                  <span className="font-semibold">Note:</span> {parseWarnings.length} warning(s) during parse:
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-[10px]">
                    {parseWarnings.slice(0, 3).map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#eceef5] bg-[#fbfbfd] px-6 py-4">
          <button
            type="button"
            onClick={handleModalClose}
            disabled={isSaving}
            className="rounded-xl border border-[#dadce5] bg-white px-4 py-2.5 text-xs font-semibold text-[#4b4a58] transition hover:bg-[#f7f7fb] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveToVault}
            disabled={isSaving || parsedQuestions.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#3525cd] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#2f20b8] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving to Vault...
              </>
            ) : (
              'Save to Vault'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
