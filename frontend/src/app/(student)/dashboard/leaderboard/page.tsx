'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { quizApi } from '@/lib/api';
import { useAuth } from '@/hooks/useApi';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const medalByRank = new Map([
  [1, '🥇'],
  [2, '🥈'],
  [3, '🥉'],
]);

type LeaderboardEntry = {
  rank: number;
  userId: string;
  fullName: string;
  score: number;
  totalQs: number;
  percentage: number;
  timeTakenSec?: number | null;
  finishedAt?: string | null;
};

const formatSpeed = (timeTakenSec?: number | null) => {
  if (timeTakenSec === null || timeTakenSec === undefined) return 'N/A';
  const minutes = Math.floor(timeTakenSec / 60);
  const seconds = timeTakenSec % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const isBetterAttempt = (candidate: LeaderboardEntry, current: LeaderboardEntry) => {
  if (candidate.score !== current.score) return candidate.score > current.score;
  const candidateTime = candidate.timeTakenSec ?? Number.MAX_SAFE_INTEGER;
  const currentTime = current.timeTakenSec ?? Number.MAX_SAFE_INTEGER;
  if (candidateTime !== currentTime) return candidateTime < currentTime;
  const candidateFinished = candidate.finishedAt ? new Date(candidate.finishedAt).getTime() : 0;
  const currentFinished = current.finishedAt ? new Date(current.finishedAt).getTime() : 0;
  return candidateFinished > currentFinished;
};

const dedupeBestAttempts = (entries: LeaderboardEntry[]) => {
  const byUser = new Map<string, LeaderboardEntry>();
  entries.forEach((entry) => {
    const existing = byUser.get(entry.userId);
    if (!existing || isBetterAttempt(entry, existing)) {
      byUser.set(entry.userId, entry);
    }
  });

  return Array.from(byUser.values())
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      const timeA = a.timeTakenSec ?? Number.MAX_SAFE_INTEGER;
      const timeB = b.timeTakenSec ?? Number.MAX_SAFE_INTEGER;
      if (timeA !== timeB) return timeA - timeB;
      const finishedA = a.finishedAt ? new Date(a.finishedAt).getTime() : 0;
      const finishedB = b.finishedAt ? new Date(b.finishedAt).getTime() : 0;
      return finishedB - finishedA;
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
};

const LeaderboardRow = ({
  entry,
  isCurrentUser,
  index,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  index: number;
}) => {
  const medal = medalByRank.get(entry.rank) ?? `#${entry.rank}`;

  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className={`border-b border-gray-100 transition-colors ${
        isCurrentUser ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-gray-50'
      }`}
    >
      <TableCell className="font-semibold text-gray-900">
        <span className="text-lg">{medal}</span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar size="lg" className="bg-gray-100">
            <AvatarFallback className="bg-gray-100 text-sm text-gray-600">
              {entry.fullName?.charAt(0) ?? 'S'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-gray-900">{entry.fullName}</p>
              {isCurrentUser ? (
                <Badge className="bg-primary/20 text-primary-foreground" variant="secondary">
                  You
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-gray-400">
              Attempted on {entry.finishedAt ? new Date(entry.finishedAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200" variant="secondary">
          {entry.percentage}%
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-gray-600">
        {formatSpeed(entry.timeTakenSec)}
      </TableCell>
    </motion.tr>
  );
};

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const currentUserId = user?.id ?? '';
  const studyYear = user?.studyYear ?? '—';

  useEffect(() => {
    let isMounted = true;

    const loadLeaderboard = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await quizApi.getLeaderboard();
        if (!isMounted) return;
        const raw = response.data.data ?? [];
        const deduped = dedupeBestAttempts(raw);
        setLeaderboard(deduped);
      } catch {
        if (isMounted) setError('Unable to load leaderboard right now.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadLeaderboard();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardHeader className="gap-2">
            <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
              <Trophy className="size-5 text-amber-500" />
              Medical Excellence Ranking — Year {studyYear}
            </CardTitle>
            <p className="text-sm text-gray-500">
              Showing the top performers in your study year based on their best attempt per quiz.
            </p>
          </CardHeader>
        </Card>

        {isLoading ? (
          <div className="flex min-h-[45vh] items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <Card className="border border-red-200 bg-red-50 shadow-sm">
            <CardContent className="p-6 text-sm text-red-700">{error}</CardContent>
          </Card>
        ) : leaderboard.length === 0 ? (
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardContent className="p-8 text-center text-sm text-gray-500">
              No leaderboard entries yet. Complete a quiz to claim your spot.
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow className="border-gray-200">
                    <TableHead className="text-gray-500">Rank</TableHead>
                    <TableHead className="text-gray-500">Student</TableHead>
                    <TableHead className="text-gray-500">Performance</TableHead>
                    <TableHead className="text-gray-500">Speed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((entry, index) => (
                    <LeaderboardRow
                      key={`${entry.userId}-${entry.rank}`}
                      entry={entry}
                      index={index}
                      isCurrentUser={entry.userId === currentUserId}
                    />
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
