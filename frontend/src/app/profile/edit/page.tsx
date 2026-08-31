"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { ArrowLeft, User, Loader2, Sparkles, BookOpen, GraduationCap } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { CloudinaryUploader } from "@/components/ui/CloudinaryUploader";
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui";

const BOARD_OPTIONS = [
  "FBISE (Federal Board)",
  "BISE Lahore",
  "BISE Rawalpindi",
  "BISE Karachi",
  "BISE Peshawar",
  "Cambridge (O/A Levels)",
  "Edexcel / Oxford AQA",
  "Aga Khan University Examination Board (AKU-EB)",
  "Other",
];

const GRADE_OPTIONS = [
  "Grade 9 (Matric 1 / O1)",
  "Grade 10 (Matric 2 / O2)",
  "Grade 11 (FSc 1 / AS Level)",
  "Grade 12 (FSc 2 / A2 Level)",
  "MDCAT / Medical Prep",
  "ECAT / Engineering Prep",
  "Undergraduate / University",
  "Other",
];

export default function ProfileEditPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [educationBoard, setEducationBoard] = useState<string>("");
  const [classGrade, setClassGrade] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [avatarUpdating, setAvatarUpdating] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          toast.error("Please log in to edit your profile.");
          router.push("/login");
          return;
        }

        setUserId(user.id);
        setEmail(user.email ?? "");

        // Fetch user profile from public.users table
        const { data: profile, error: dbError } = await supabase
          .from("users")
          .select("full_name, avatar_url, education_board, class_grade")
          .eq("id", user.id)
          .single();

        if (dbError && dbError.code !== "PGRST116") {
          console.error("Error fetching user profile:", dbError);
        }

        if (profile) {
          setFullName(profile.full_name || user.user_metadata?.full_name || "");
          setAvatarUrl(profile.avatar_url || null);
          setEducationBoard(profile.education_board || "");
          setClassGrade(profile.class_grade || "");
        } else {
          setFullName(user.user_metadata?.full_name || "");
        }
      } catch (err) {
        console.error("Unexpected error loading user profile:", err);
        toast.error("Failed to load user profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  // Handle avatar upload success callback from CloudinaryUploader
  const handleAvatarSuccess = async (url: string) => {
    if (!userId) {
      toast.error("User session not found.");
      return;
    }

    setAvatarUpdating(true);
    // 1. Immediately update local UI state
    setAvatarUrl(url);

    try {
      // 2. Immediately update avatar_url in Supabase public.users table
      const supabase = createClient();
      const { error } = await supabase
        .from("users")
        .update({
          avatar_url: url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        console.error("Error updating avatar_url in database:", error);
        toast.error("Avatar updated locally, but failed to save to database: " + error.message);
      } else {
        toast.success("Avatar updated successfully!");
      }
    } catch (err) {
      console.error("Unexpected error saving avatar:", err);
      toast.error("An unexpected error occurred while saving the avatar.");
    } finally {
      setAvatarUpdating(false);
    }
  };

  // Handle form submission for education_board and class_grade
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      toast.error("User session not found.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("users")
        .update({
          education_board: educationBoard.trim() || null,
          class_grade: classGrade.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        console.error("Error updating profile in database:", error);
        toast.error("Failed to update profile: " + error.message);
      } else {
        toast.success("Profile updated successfully!");
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("dismissed_profile_completion_banner");
        }
      }
    } catch (err) {
      console.error("Unexpected error saving profile:", err);
      toast.error("An unexpected error occurred while saving your profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">Loading profile information...</p>
        </div>
      </div>
    );
  }

  const avatarPreset = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_AVATARS;

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 font-sans antialiased text-slate-900">
      <Toaster position="top-center" toastOptions={{ style: { background: "#0f172a", color: "#fff" } }} />

      {/* Navigation Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Edit Profile</h1>
            <p className="text-xs text-slate-500">Manage your academic preferences and avatar settings.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Avatar Upload Section */}
        <Card className="rounded-xl border border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-600" />
              Profile Photo
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Upload a picture to personalize your LMS account.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            {/* Circular Avatar Placeholder */}
            <div className="relative group">
              <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-indigo-100 bg-slate-100 shadow-inner flex items-center justify-center">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={fullName || "User Avatar"}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <User className="h-10 w-10" />
                  </div>
                )}
                {avatarUpdating && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 sm:items-start">
              <div className="text-center sm:text-left">
                <p className="text-sm font-bold text-slate-900">{fullName || "User"}</p>
                <p className="text-xs text-slate-500">{email}</p>
              </div>

              <div className="mt-1">
                <CloudinaryUploader
                  preset={avatarPreset}
                  onSuccess={handleAvatarSuccess}
                  buttonText={avatarUrl ? "Change Avatar" : "Upload Avatar"}
                  className="bg-indigo-600 hover:bg-indigo-700 text-xs py-2 px-4 shadow-xs"
                />
              </div>
              <p className="text-[11px] text-slate-400">Supported formats: JPG, PNG, WEBP</p>
            </div>
          </CardContent>
        </Card>

        {/* Academic Profile Form */}
        <form onSubmit={handleSubmit}>
          <Card className="rounded-xl border border-slate-200 bg-white shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-indigo-600" />
                Academic Details
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Provide your education board and grade level to personalize your learning material recommendations. These fields are optional.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Education Board */}
              <div className="space-y-1.5">
                <label htmlFor="educationBoard" className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                  Education Board
                </label>
                <div className="relative">
                  <select
                    id="educationBoard"
                    value={educationBoard}
                    onChange={(e) => setEducationBoard(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs outline-none transition-colors focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 disabled:bg-slate-50"
                  >
                    <option value="">-- Select Education Board (Optional) --</option>
                    {BOARD_OPTIONS.map((board) => (
                      <option key={board} value={board}>
                        {board}
                      </option>
                    ))}
                  </select>
                </div>
                {educationBoard === "Other" && (
                  <div className="mt-2">
                    <Input
                      type="text"
                      placeholder="Enter your custom Education Board"
                      value={educationBoard}
                      onChange={(e) => setEducationBoard(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                )}
                <p className="text-[11px] text-slate-400">e.g. FBISE, Cambridge, BISE Lahore</p>
              </div>

              {/* Class / Grade */}
              <div className="space-y-1.5 pt-1">
                <label htmlFor="classGrade" className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Sparkles className="h-3.5 w-3.5 text-slate-500" />
                  Class / Grade Level
                </label>
                <div className="relative">
                  <select
                    id="classGrade"
                    value={classGrade}
                    onChange={(e) => setClassGrade(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs outline-none transition-colors focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 disabled:bg-slate-50"
                  >
                    <option value="">-- Select Class/Grade Level (Optional) --</option>
                    {GRADE_OPTIONS.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>
                {classGrade === "Other" && (
                  <div className="mt-2">
                    <Input
                      type="text"
                      placeholder="Enter your custom Class or Grade"
                      value={classGrade}
                      onChange={(e) => setClassGrade(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                )}
                <p className="text-[11px] text-slate-400">e.g. Grade 10, FSc Part 1, MDCAT Prep</p>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
                <Link href="/dashboard">
                  <Button type="button" variant="outline" size="sm">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={saving}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[130px]"
                >
                  {saving ? "Saving..." : "Update Profile"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </main>
  );
}
