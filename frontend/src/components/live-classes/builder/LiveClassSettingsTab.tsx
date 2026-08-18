'use client';

import { Eye, Shield, Bell, MessageSquare } from 'lucide-react';

export interface SettingsFormData {
  visibility: 'PUBLIC' | 'ENROLLED_ONLY' | 'PRIVATE';
  allowChat: boolean;
  muteOnEntry: boolean;
  reminderMinutesBefore: number;
}

interface LiveClassSettingsTabProps {
  data: SettingsFormData;
  onChange: (data: SettingsFormData) => void;
}

export function LiveClassSettingsTab({
  data,
  onChange,
}: LiveClassSettingsTabProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-bold text-gray-900">Visibility & Access</h3>
          </div>
          <select
            value={data.visibility}
            onChange={(e) => onChange({ ...data, visibility: e.target.value as SettingsFormData['visibility'] })}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
          >
            <option value="ENROLLED_ONLY">Enrolled Students Only (Default)</option>
            <option value="PUBLIC">Publicly Visible to All Visitors</option>
            <option value="PRIVATE">Private (Invite Link Only)</option>
          </select>
        </div>

        <hr className="border-gray-100" />

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-bold text-gray-900">Participant Permissions</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-gray-200 p-3.5">
              <div>
                <span className="text-xs font-semibold text-gray-900">In-Meeting Chat</span>
                <p className="text-[11px] text-gray-500">Allow students to participate in live text chat.</p>
              </div>
              <input
                type="checkbox"
                checked={data.allowChat}
                onChange={(e) => onChange({ ...data, allowChat: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-200 p-3.5">
              <div>
                <span className="text-xs font-semibold text-gray-900">Mute Participants on Entry</span>
                <p className="text-[11px] text-gray-500">Automatically mute student microphones upon joining.</p>
              </div>
              <input
                type="checkbox"
                checked={data.muteOnEntry}
                onChange={(e) => onChange({ ...data, muteOnEntry: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-bold text-gray-900">Calendar & Notification Preferences</h3>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Send Email Reminder
            </label>
            <select
              value={data.reminderMinutesBefore}
              onChange={(e) => onChange({ ...data, reminderMinutesBefore: Number(e.target.value) })}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
            >
              <option value={15}>15 minutes before session</option>
              <option value={30}>30 minutes before session</option>
              <option value={60}>1 hour before session</option>
              <option value={1440}>24 hours before session</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
