"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X, UserCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export function ProfileCompletionBanner() {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if user temporarily skipped in this session
    const isDismissed = typeof window !== "undefined" && sessionStorage.getItem("dismissed_profile_completion_banner");
    if (isDismissed === "true") {
      setLoading(false);
      return;
    }

    const checkUserProfile = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsVisible(false);
          return;
        }

        const { data: profile, error } = await supabase
          .from("users")
          .select("education_board, class_grade")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching user profile for completion banner:", error);
          setIsVisible(false);
          return;
        }

        const needsCompletion =
          !profile?.education_board ||
          profile.education_board.trim() === "" ||
          !profile?.class_grade ||
          profile.class_grade.trim() === "";

        setIsVisible(needsCompletion);
      } catch (err) {
        console.error("Error checking user profile completion status:", err);
        setIsVisible(false);
      } finally {
        setLoading(false);
      }
    };

    checkUserProfile();
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("dismissed_profile_completion_banner", "true");
    }
  };

  if (loading || !isVisible) {
    return null;
  }

  return (
    <div className="relative w-full rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 p-4 shadow-xs transition-all dark:border-indigo-900/60 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Complete Your Profile
            </h4>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
              Complete your profile to get the most out of your learning experience.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
          >
            Skip for now
          </button>
          <Link
            href="/profile/edit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <UserCheck className="h-3.5 w-3.5" />
            Update Profile
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close banner"
            className="ml-1 rounded-lg p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfileCompletionBanner;
