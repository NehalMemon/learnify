'use client';

import { useState, useRef, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'react-hot-toast';
import { Trash, UploadCloud, Save } from 'lucide-react';

export default function ImportQuizPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminApi.listQuizzes().then((res) => {
      setQuizzes(res.data.data || []);
    }).catch(err => {
      toast.error('Failed to load quizzes');
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const extractQuestions = async () => {
    if (!file) return toast.error('Please select an image file first.');
    setIsExtracting(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await adminApi.extractMCQs(formData);
      if (res.data.success) {
        setQuestions(res.data.data);
        toast.success('Extraction successful!');
      } else {
        toast.error(res.data.message || 'Extraction failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to extract');
    } finally {
      setIsExtracting(false);
    }
  };

  const saveQuestions = async () => {
    if (!selectedQuizId) return toast.error('Please select a target Quiz first.');
    if (questions.length === 0) return toast.error('No questions to save.');
    
    try {
      const res = await adminApi.bulkCreateQuestionsToQuiz({
        quizId: selectedQuizId,
        questions,
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Saved successfully!');
        setQuestions([]);
        setFile(null);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save questions');
    }
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const newQs = [...questions];
    newQs[index] = { ...newQs[index], [field]: value };
    setQuestions(newQs);
  };

  const updateOption = (index: number, optIndex: number, value: string) => {
    const newQs = [...questions];
    const opts = [...(newQs[index].options || [])];
    opts[optIndex] = value;
    newQs[index].options = opts;
    setQuestions(newQs);
  };

  const deleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Medical Quiz Importer</h1>

      <Card>
        <CardHeader>
          <CardTitle>Step 1: Select Target Quiz</CardTitle>
        </CardHeader>
        <CardContent>
          <select 
            className="w-full p-2 rounded-md border border-gray-300 bg-white text-gray-900"
            value={selectedQuizId}
            onChange={(e) => setSelectedQuizId(e.target.value)}
          >
            <option value="">-- Select a Quiz --</option>
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>{q.title}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 2: Upload Image for Extraction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div 
            className="border-2 border-dashed border-gray-300 p-8 rounded-lg text-center cursor-pointer hover:border-gray-400 transition"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-2" />
            <p className="text-gray-600 font-medium">Click or drag image to upload</p>
            <p className="text-gray-500 text-sm mt-1">{file ? file.name : 'No file selected'}</p>
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              accept="image/*"
              onChange={handleFileChange} 
            />
          </div>
          <Button 
            onClick={extractQuestions} 
            disabled={!file || isExtracting}
            className="w-full"
          >
            {isExtracting ? 'Extracting with Gemini...' : 'Extract Questions'}
          </Button>
        </CardContent>
      </Card>

      {questions.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Step 3: Review Staging Area</CardTitle>
            <Button onClick={saveQuestions} className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="w-4 h-4 mr-2" />
              Save to Database
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">Question Title</TableHead>
                  <TableHead className="w-1/3">Options & Correct Answer</TableHead>
                  <TableHead>Explanation</TableHead>
                  <TableHead className="w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((q, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Textarea 
                        value={q.title || ''} 
                        onChange={(e) => updateQuestion(i, 'title', e.target.value)}
                        className="min-h-[100px]"
                      />
                    </TableCell>
                    <TableCell className="space-y-2">
                      {[0, 1, 2, 3].map((optIndex) => (
                        <div key={optIndex} className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name={`correct-${i}`} 
                            checked={Number(q.correctOption) === optIndex}
                            onChange={() => updateQuestion(i, 'correctOption', optIndex)}
                            className="w-4 h-4"
                          />
                          <Input 
                            value={q.options?.[optIndex] || ''} 
                            onChange={(e) => updateOption(i, optIndex, e.target.value)}
                            className="h-8"
                          />
                        </div>
                      ))}
                    </TableCell>
                    <TableCell>
                      <Textarea 
                        value={q.explanation || ''} 
                        onChange={(e) => updateQuestion(i, 'explanation', e.target.value)}
                        className="min-h-[100px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="destructive" size="icon" onClick={() => deleteQuestion(i)}>
                        <Trash className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
