"use client";

import { useState } from "react";
import axios from "axios";

interface Props {
  userId: string;
  initialLearnifyStatus: boolean;
  initialQuizStatus: boolean;
}

export const UserEntitlementsCard = ({ userId, initialLearnifyStatus, initialQuizStatus }: Props) => {
  const [learnifyEnabled, setLearnifyEnabled] = useState(initialLearnifyStatus);
  const [doctorsQuizzEnabled, setDoctorsQuizzEnabled] = useState(initialQuizStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const toggle = async (key: "learnify" | "quiz") => {
    const nextLearnify = key === "learnify" ? !learnifyEnabled : learnifyEnabled;
    const nextQuiz = key === "quiz" ? !doctorsQuizzEnabled : doctorsQuizzEnabled;

    setLearnifyEnabled(nextLearnify);
    setDoctorsQuizzEnabled(nextQuiz);
    setIsSaving(true);
    setMessage(null);

    try {
      await axios.put(`/api/v1/admin/users/${userId}/entitlements`, {
        learnifyEnabled: nextLearnify,
        doctorsQuizzEnabled: nextQuiz,
      });
      setMessage("Saved");
    } catch {
      setMessage("Failed to save");
      // revert on failure
      setLearnifyEnabled(learnifyEnabled);
      setDoctorsQuizzEnabled(doctorsQuizzEnabled);
    } finally {
      setIsSaving(false);
    }
  };

  const Toggle = ({
    label,
    checked,
    onChange,
  }: {
    label: string;
    checked: boolean;
    onChange: () => void;
  }) => (
    <button
      type="button"
      onClick={onChange}
      disabled={isSaving}
      className={`flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 transition border border-gray-200 ${
        isSaving ? "opacity-80 cursor-not-allowed" : "hover:border-gray-300"
      }`}
    >
      <span className="text-sm font-medium text-gray-900">{label}</span>
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
          checked ? "bg-purple-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );

  return (
    <div className="space-y-3 rounded-2xl bg-white p-5 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Platform Entitlements</h3>
        {message && (
          <span className="text-xs text-gray-500">{message}</span>
        )}
      </div>

      <Toggle
        label="Learnify Platform Access"
        checked={learnifyEnabled}
        onChange={() => toggle("learnify")}
      />
      <Toggle
        label="DoctorsQuizz Platform Access"
        checked={doctorsQuizzEnabled}
        onChange={() => toggle("quiz")}
      />
    </div>
  );
};
