export interface LeaderboardEntry {
  position: number;
  userName: string;
  score: number;
}

export interface LeaderboardResponse {
  top5: LeaderboardEntry[];
  localLeaderboard: LeaderboardEntry[];
}

export type LeaderboardScope = 'local' | 'regional' | 'national';