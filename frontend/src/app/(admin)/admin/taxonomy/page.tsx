'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import {
  ShieldAlert,
  Plus,
  Trash2,
  FolderTree,
  BookOpen,
  GraduationCap,
  Loader2,
  Tag,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export type PathType = 'K-12' | 'MEDICAL' | 'SKILLS';

export interface TaxonomyBoard {
  id: string;
  name: string;
  path_type: PathType;
  created_at?: string;
}

export interface TaxonomyGrade {
  id: string;
  name: string;
  path_type: PathType;
  created_at?: string;
}

export interface TaxonomySubject {
  id: string;
  name: string;
  created_at?: string;
}

export default function AdminTaxonomyPage() {
  const router = useRouter();
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('boards');

  // Boards State
  const [boards, setBoards] = useState<TaxonomyBoard[]>([]);
  const [loadingBoards, setLoadingBoards] = useState<boolean>(false);
  const [newBoardName, setNewBoardName] = useState<string>('');
  const [newBoardPathType, setNewBoardPathType] = useState<PathType>('K-12');
  const [addingBoard, setAddingBoard] = useState<boolean>(false);

  // Grades State
  const [grades, setGrades] = useState<TaxonomyGrade[]>([]);
  const [loadingGrades, setLoadingGrades] = useState<boolean>(false);
  const [newGradeName, setNewGradeName] = useState<string>('');
  const [newGradePathType, setNewGradePathType] = useState<PathType>('K-12');
  const [addingGrade, setAddingGrade] = useState<boolean>(false);

  // Subjects State
  const [subjects, setSubjects] = useState<TaxonomySubject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState<boolean>(false);
  const [newSubjectName, setNewSubjectName] = useState<string>('');
  const [addingSubject, setAddingSubject] = useState<boolean>(false);

  // Deleting ID tracking
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 1. Verify User Session & SUPER_ADMIN Role
  useEffect(() => {
    const verifySecurity = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          setIsAuthorized(false);
          setLoadingAuth(false);
          return;
        }

        let role = session.user.app_metadata?.role || session.user.user_metadata?.role;

        // Fallback: Query public.users table if role not set in session metadata
        if (!role) {
          const { data: userRow } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();
          role = userRow?.role;
        }

        if (role === 'SUPER_ADMIN') {
          setIsAuthorized(true);
          fetchBoards();
          fetchGrades();
          fetchSubjects();
        } else {
          setIsAuthorized(false);
        }
      } catch (err) {
        console.error('Error verifying user authorization:', err);
        setIsAuthorized(false);
      } finally {
        setLoadingAuth(false);
      }
    };

    verifySecurity();
  }, []);

  // ── Fetching Data ─────────────────────────────────────────────────────────

  const fetchBoards = async () => {
    setLoadingBoards(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('taxonomy_boards')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching boards:', error);
        toast.error('Failed to load boards: ' + error.message);
      } else {
        setBoards(data || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching boards:', err);
    } finally {
      setLoadingBoards(false);
    }
  };

  const fetchGrades = async () => {
    setLoadingGrades(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('taxonomy_grades')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching grades:', error);
        toast.error('Failed to load grades: ' + error.message);
      } else {
        setGrades(data || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching grades:', err);
    } finally {
      setLoadingGrades(false);
    }
  };

  const fetchSubjects = async () => {
    setLoadingSubjects(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('taxonomy_subjects')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching subjects:', error);
        toast.error('Failed to load subjects: ' + error.message);
      } else {
        setSubjects(data || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching subjects:', err);
    } finally {
      setLoadingSubjects(false);
    }
  };

  // ── Mutations: Add Records ────────────────────────────────────────────────

  const handleAddBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) {
      toast.error('Board name is required.');
      return;
    }

    setAddingBoard(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('taxonomy_boards')
        .insert({
          name: newBoardName.trim(),
          path_type: newBoardPathType,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding board:', error);
        toast.error(`Failed to add board: ${error.message}`);
      } else {
        toast.success(`Board "${newBoardName}" added successfully!`);
        setNewBoardName('');
        setNewBoardPathType('K-12');
        if (data) {
          setBoards((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        } else {
          fetchBoards();
        }
      }
    } catch (err) {
      console.error('Unexpected error adding board:', err);
      toast.error('An unexpected error occurred while adding the board.');
    } finally {
      setAddingBoard(false);
    }
  };

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGradeName.trim()) {
      toast.error('Grade name is required.');
      return;
    }

    setAddingGrade(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('taxonomy_grades')
        .insert({
          name: newGradeName.trim(),
          path_type: newGradePathType,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding grade:', error);
        toast.error(`Failed to add grade: ${error.message}`);
      } else {
        toast.success(`Grade "${newGradeName}" added successfully!`);
        setNewGradeName('');
        setNewGradePathType('K-12');
        if (data) {
          setGrades((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        } else {
          fetchGrades();
        }
      }
    } catch (err) {
      console.error('Unexpected error adding grade:', err);
      toast.error('An unexpected error occurred while adding the grade.');
    } finally {
      setAddingGrade(false);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) {
      toast.error('Subject name is required.');
      return;
    }

    setAddingSubject(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('taxonomy_subjects')
        .insert({
          name: newSubjectName.trim(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding subject:', error);
        toast.error(`Failed to add subject: ${error.message}`);
      } else {
        toast.success(`Subject "${newSubjectName}" added successfully!`);
        setNewSubjectName('');
        if (data) {
          setSubjects((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        } else {
          fetchSubjects();
        }
      }
    } catch (err) {
      console.error('Unexpected error adding subject:', err);
      toast.error('An unexpected error occurred while adding the subject.');
    } finally {
      setAddingSubject(false);
    }
  };

  // ── Mutations: Delete Records ─────────────────────────────────────────────

  const handleDeleteBoard = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete board "${name}"?`)) return;

    setDeletingId(id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('taxonomy_boards').delete().eq('id', id);

      if (error) {
        console.error('Error deleting board:', error);
        toast.error(`Failed to delete board: ${error.message}`);
      } else {
        toast.success(`Board "${name}" deleted.`);
        setBoards((prev) => prev.filter((b) => b.id !== id));
      }
    } catch (err) {
      console.error('Unexpected error deleting board:', err);
      toast.error('An error occurred while deleting the board.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteGrade = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete grade "${name}"?`)) return;

    setDeletingId(id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('taxonomy_grades').delete().eq('id', id);

      if (error) {
        console.error('Error deleting grade:', error);
        toast.error(`Failed to delete grade: ${error.message}`);
      } else {
        toast.success(`Grade "${name}" deleted.`);
        setGrades((prev) => prev.filter((g) => g.id !== id));
      }
    } catch (err) {
      console.error('Unexpected error deleting grade:', err);
      toast.error('An error occurred while deleting the grade.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSubject = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete subject "${name}"?`)) return;

    setDeletingId(id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('taxonomy_subjects').delete().eq('id', id);

      if (error) {
        console.error('Error deleting subject:', error);
        toast.error(`Failed to delete subject: ${error.message}`);
      } else {
        toast.success(`Subject "${name}" deleted.`);
        setSubjects((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error('Unexpected error deleting subject:', err);
      toast.error('An error occurred while deleting the subject.');
    } finally {
      setDeletingId(null);
    }
  };

  const renderPathTypeBadge = (pathType: PathType) => {
    switch (pathType) {
      case 'K-12':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">K-12</Badge>;
      case 'MEDICAL':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200">MEDICAL</Badge>;
      case 'SKILLS':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">SKILLS</Badge>;
      default:
        return <Badge className="bg-slate-50 text-slate-700 border-slate-200">{pathType}</Badge>;
    }
  };

  if (loadingAuth) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center font-sans antialiased text-slate-900">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <p className="text-sm font-medium">Verifying SUPER_ADMIN security policies...</p>
        </div>
      </div>
    );
  }

  // 1. Unauthorized View
  if (!isAuthorized) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center p-4 font-sans antialiased text-slate-900">
        <Toaster position="top-center" toastOptions={{ style: { background: '#0f172a', color: '#fff' } }} />
        <Card className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-md">
          <CardContent className="space-y-5 pt-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-950">Unauthorized Access</h1>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                You do not have permission to access the Taxonomy Manager. This page is strictly gatekept for users with the <strong className="text-slate-900">SUPER_ADMIN</strong> role.
              </p>
            </div>
            <div className="pt-3">
              <Button
                onClick={() => router.push('/admin/dashboard')}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5"
              >
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authorized View
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 font-sans antialiased text-slate-900">
      <Toaster position="top-center" toastOptions={{ style: { background: '#0f172a', color: '#fff' } }} />

      {/* Header */}
      <div className="mb-8 flex flex-col gap-2 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2">
          <FolderTree className="h-5 w-5 text-purple-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
            Super Admin Console
          </span>
          <Badge className="bg-purple-600 text-white text-[10px] uppercase font-bold">Gatekept</Badge>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Taxonomy Manager</h1>
        <p className="max-w-2xl text-xs text-slate-600 leading-relaxed">
          Manage global platform tags for Boards, Grade Levels, and Subjects across Learnify.
        </p>
      </div>

      {/* Tabs Interface */}
      <Tabs defaultValue="boards" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex gap-2 border-b border-slate-200 bg-transparent p-0">
          <TabsTrigger
            value="boards"
            className="flex items-center gap-2 rounded-t-lg border-b-2 px-5 py-3 text-xs font-bold transition-all data-[state=active]:border-purple-600 data-[state=active]:bg-purple-50/50 data-[state=active]:text-purple-700 data-[state=inactive]:border-transparent data-[state=inactive]:text-slate-500 hover:text-slate-900"
          >
            <BookOpen className="h-4 w-4" />
            Boards ({boards.length})
          </TabsTrigger>
          <TabsTrigger
            value="grades"
            className="flex items-center gap-2 rounded-t-lg border-b-2 px-5 py-3 text-xs font-bold transition-all data-[state=active]:border-purple-600 data-[state=active]:bg-purple-50/50 data-[state=active]:text-purple-700 data-[state=inactive]:border-transparent data-[state=inactive]:text-slate-500 hover:text-slate-900"
          >
            <GraduationCap className="h-4 w-4" />
            Grades ({grades.length})
          </TabsTrigger>
          <TabsTrigger
            value="subjects"
            className="flex items-center gap-2 rounded-t-lg border-b-2 px-5 py-3 text-xs font-bold transition-all data-[state=active]:border-purple-600 data-[state=active]:bg-purple-50/50 data-[state=active]:text-purple-700 data-[state=inactive]:border-transparent data-[state=inactive]:text-slate-500 hover:text-slate-900"
          >
            <Tag className="h-4 w-4" />
            Subjects ({subjects.length})
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: BOARDS ───────────────────────────────────────────────── */}
        <TabsContent value="boards" className="space-y-6 focus-visible:outline-none">
          <Card className="rounded-xl border border-slate-200 bg-white shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="h-4 w-4 text-purple-600" />
                Add New Education Board
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Create a new board classification (e.g., &quot;Sindh Board&quot;, &quot;Federal Board&quot;).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddBoard} className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <label htmlFor="boardName" className="text-xs font-bold text-slate-700">
                    Board Name
                  </label>
                  <Input
                    id="boardName"
                    type="text"
                    placeholder="e.g. Sindh Board"
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    required
                    className="text-sm"
                  />
                </div>

                <div className="w-full sm:w-48 space-y-1.5">
                  <label htmlFor="boardPathType" className="text-xs font-bold text-slate-700">
                    Path Type
                  </label>
                  <select
                    id="boardPathType"
                    value={newBoardPathType}
                    onChange={(e) => setNewBoardPathType(e.target.value as PathType)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
                  >
                    <option value="K-12">K-12</option>
                    <option value="MEDICAL">MEDICAL</option>
                    <option value="SKILLS">SKILLS</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  isLoading={addingBoard}
                  disabled={addingBoard}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-5 py-2.5 shrink-0"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Board
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3 px-5">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Education Boards ({boards.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingBoards ? (
                <div className="flex h-36 items-center justify-center text-xs text-slate-500 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                  Loading boards...
                </div>
              ) : boards.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No education boards found. Add one using the form above.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 bg-slate-50/30">
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Name</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Path Type</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {boards.map((board) => (
                      <TableRow key={board.id} className="border-slate-100 hover:bg-slate-50/50">
                        <TableCell className="font-bold text-slate-900 text-xs py-3.5">
                          {board.name}
                        </TableCell>
                        <TableCell className="py-3.5">
                          {renderPathTypeBadge(board.path_type)}
                        </TableCell>
                        <TableCell className="text-right py-3.5">
                          <button
                            type="button"
                            onClick={() => handleDeleteBoard(board.id, board.name)}
                            disabled={deletingId === board.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors disabled:opacity-50 cursor-pointer"
                            title="Delete Board"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: GRADES ───────────────────────────────────────────────── */}
        <TabsContent value="grades" className="space-y-6 focus-visible:outline-none">
          <Card className="rounded-xl border border-slate-200 bg-white shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="h-4 w-4 text-purple-600" />
                Add New Class / Grade Level
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Create a new grade level tag (e.g., &quot;9th Grade&quot;, &quot;A-Levels&quot;, &quot;MDCAT Prep&quot;).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddGrade} className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <label htmlFor="gradeName" className="text-xs font-bold text-slate-700">
                    Grade Name
                  </label>
                  <Input
                    id="gradeName"
                    type="text"
                    placeholder="e.g. 9th Grade"
                    value={newGradeName}
                    onChange={(e) => setNewGradeName(e.target.value)}
                    required
                    className="text-sm"
                  />
                </div>

                <div className="w-full sm:w-48 space-y-1.5">
                  <label htmlFor="gradePathType" className="text-xs font-bold text-slate-700">
                    Path Type
                  </label>
                  <select
                    id="gradePathType"
                    value={newGradePathType}
                    onChange={(e) => setNewGradePathType(e.target.value as PathType)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
                  >
                    <option value="K-12">K-12</option>
                    <option value="MEDICAL">MEDICAL</option>
                    <option value="SKILLS">SKILLS</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  isLoading={addingGrade}
                  disabled={addingGrade}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-5 py-2.5 shrink-0"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Grade
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3 px-5">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Grade Levels ({grades.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingGrades ? (
                <div className="flex h-36 items-center justify-center text-xs text-slate-500 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                  Loading grade levels...
                </div>
              ) : grades.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No grade levels found. Add one using the form above.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 bg-slate-50/30">
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Name</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Path Type</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grades.map((grade) => (
                      <TableRow key={grade.id} className="border-slate-100 hover:bg-slate-50/50">
                        <TableCell className="font-bold text-slate-900 text-xs py-3.5">
                          {grade.name}
                        </TableCell>
                        <TableCell className="py-3.5">
                          {renderPathTypeBadge(grade.path_type)}
                        </TableCell>
                        <TableCell className="text-right py-3.5">
                          <button
                            type="button"
                            onClick={() => handleDeleteGrade(grade.id, grade.name)}
                            disabled={deletingId === grade.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors disabled:opacity-50 cursor-pointer"
                            title="Delete Grade"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 3: SUBJECTS ─────────────────────────────────────────────── */}
        <TabsContent value="subjects" className="space-y-6 focus-visible:outline-none">
          <Card className="rounded-xl border border-slate-200 bg-white shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="h-4 w-4 text-purple-600" />
                Add New Subject Tag
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Create a global subject tag (e.g., &quot;Biology&quot;, &quot;Organic Chemistry&quot;, &quot;Physics&quot;).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddSubject} className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <label htmlFor="subjectName" className="text-xs font-bold text-slate-700">
                    Subject Name
                  </label>
                  <Input
                    id="subjectName"
                    type="text"
                    placeholder="e.g. Biology"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    required
                    className="text-sm"
                  />
                </div>

                <Button
                  type="submit"
                  isLoading={addingSubject}
                  disabled={addingSubject}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-5 py-2.5 shrink-0"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Subject
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-3 px-5">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Global Subjects ({subjects.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingSubjects ? (
                <div className="flex h-36 items-center justify-center text-xs text-slate-500 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                  Loading subjects...
                </div>
              ) : subjects.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No subjects found. Add one using the form above.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 bg-slate-50/30">
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Name</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjects.map((subject) => (
                      <TableRow key={subject.id} className="border-slate-100 hover:bg-slate-50/50">
                        <TableCell className="font-bold text-slate-900 text-xs py-3.5 flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                          {subject.name}
                        </TableCell>
                        <TableCell className="text-right py-3.5">
                          <button
                            type="button"
                            onClick={() => handleDeleteSubject(subject.id, subject.name)}
                            disabled={deletingId === subject.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors disabled:opacity-50 cursor-pointer"
                            title="Delete Subject"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
