import { useCallback, useEffect, useState } from 'react';
import {
  ACHIEVEMENTS,
  type Achievement,
  type AchievementId,
  saveUnlockedAchievement,
} from './achievements';

export function useAchievements() {
  const [activeAchievement, setActiveAchievement] = useState<Achievement | null>(null);
  const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);

  const triggerAchievement = useCallback((id: AchievementId) => {
    const isNew = saveUnlockedAchievement(id);
    if (!isNew) return;
    const achievement = ACHIEVEMENTS[id];
    setAchievementQueue((prev) => [...prev, achievement]);
  }, []);

  useEffect(() => {
    if (!activeAchievement && achievementQueue.length > 0) {
      const [next, ...rest] = achievementQueue;
      setActiveAchievement(next);
      setAchievementQueue(rest);
    }
  }, [activeAchievement, achievementQueue]);

  const dismissAchievement = useCallback(() => {
    setActiveAchievement(null);
  }, []);

  return {
    activeAchievement,
    triggerAchievement,
    dismissAchievement,
  };
}
