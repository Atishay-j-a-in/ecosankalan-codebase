import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getWasteStats } from '../services/api';
import { useAuth } from './AuthContext';

const StatsContext = createContext();

export const StatsProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?._id || user?.id || null;
  const queryClient = useQueryClient();

  // Weekly stats query (used on Dashboard and Impact)
  const weekQuery = useQuery({
    queryKey: ['wasteStats', userId, 'week'],
    queryFn: async () => {
      const res = await getWasteStats('week');
      return res.data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // All-time stats query (used on Profile and Impact)
  const allQuery = useQuery({
    queryKey: ['wasteStats', userId, 'all'],
    queryFn: async () => {
      const res = await getWasteStats('all');
      return res.data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Read month data from cache if present
  const monthData = userId ? (queryClient.getQueryData(['wasteStats', userId, 'month']) || null) : null;

  // Fetch or retrieve cached stats for a specific range ('week', 'month', 'all')
  const fetchStatsForRange = useCallback(async (range, force = false) => {
    if (!userId) return null;
    const queryKey = ['wasteStats', userId, range];
    if (force) {
      await queryClient.invalidateQueries({ queryKey });
    }
    return queryClient.fetchQuery({
      queryKey,
      queryFn: async () => {
        const res = await getWasteStats(range);
        return res.data;
      },
      staleTime: force ? 0 : 5 * 60 * 1000,
    });
  }, [userId, queryClient]);

  // Invalidate queries so fresh stats, history, and profile are fetched after waste is logged
  const refreshAllStats = useCallback(async () => {
    if (!userId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['wasteStats', userId] }),
      queryClient.invalidateQueries({ queryKey: ['wasteHistory'] }),
      queryClient.invalidateQueries({ queryKey: ['profile'] }),
    ]);
  }, [userId, queryClient]);

  const statsData = useMemo(() => ({
    week: weekQuery.data || null,
    month: monthData,
    all: allQuery.data || null,
  }), [weekQuery.data, monthData, allQuery.data]);

  const loading = weekQuery.isLoading || allQuery.isLoading;

  return (
    <StatsContext.Provider value={{ statsData, loading, fetchStatsForRange, refreshAllStats }}>
      {children}
    </StatsContext.Provider>
  );
};

export const useStats = () => useContext(StatsContext);
