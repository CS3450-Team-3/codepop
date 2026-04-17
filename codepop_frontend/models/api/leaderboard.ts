import api from './api';
import {
  LeaderboardResponse,
  LeaderboardScope,
} from '@/models/types/leaderboard';

export async function getLeaderboard(
  scope: LeaderboardScope = 'local'
): Promise<LeaderboardResponse> {
  const { data } = await api.get('leaderboard/', {
    params: { scope },
  });
  return data;
}