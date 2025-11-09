/**
 * Booster Countdown Timer Component
 * Displays 30-day booster window with countdown and direct tracking
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

interface BoosterStatus {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  direct_count: number;
  target_directs: number;
  bonus_roi_percentage: number;
  status: 'active' | 'achieved' | 'expired';
  days_remaining: number;
  hours_remaining?: number;
  minutes_remaining?: number;
}

export const BoosterCountdownTimer: React.FC = () => {
  const { token } = useAuth();
  const [booster, setBooster] = useState<BoosterStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    fetchBoosterStatus();
    const interval = setInterval(fetchBoosterStatus, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!booster || booster.status !== 'active') return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const end = new Date(booster.end_date).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [booster]);

  const fetchBoosterStatus = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const res = await api.get('/booster/status', token);

      if (res.data?.booster) {
        setBooster(res.data.booster);
      } else {
        setBooster(null);
      }
    } catch (error) {
      console.error('Error fetching booster status:', error);
      setBooster(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-surface-light rounded w-48 mb-4"></div>
          <div className="h-20 bg-surface-light rounded"></div>
        </div>
      </div>
    );
  }

  if (!booster) {
    return (
      <div className="card p-6 bg-gradient-to-r from-purple-500/10 to-theme/10 border border-theme/30">
        <div className="flex items-center space-x-4">
          <div className="text-4xl">🚀</div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Booster Available!</h3>
            <p className="text-sm text-text-secondary">
              Make your first investment to start the 30-day booster countdown
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { direct_count, target_directs, status, bonus_roi_percentage } = booster;
  const progress = (direct_count / target_directs) * 100;
  const isAchieved = status === 'achieved';
  const isExpired = status === 'expired';
  const directsNeeded = Math.max(0, target_directs - direct_count);

  // Status-based styling
  let statusColor = 'yellow';
  let statusBg = 'from-yellow-500/20 to-orange-500/20';
  let statusBorder = 'border-yellow-500/30';
  let statusIcon = '⏳';

  if (isAchieved) {
    statusColor = 'green';
    statusBg = 'from-green-500/20 to-emerald-500/20';
    statusBorder = 'border-green-500/30';
    statusIcon = '🎉';
  } else if (isExpired) {
    statusColor = 'red';
    statusBg = 'from-red-500/20 to-pink-500/20';
    statusBorder = 'border-red-500/30';
    statusIcon = '⏱️';
  }

  return (
    <div className={`card p-6 bg-gradient-to-r ${statusBg} border ${statusBorder}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-3xl">{statusIcon}</span>
            <h2 className="text-2xl font-bold text-white">Booster Challenge</h2>
          </div>
          <p className="text-sm text-text-secondary">
            {isAchieved
              ? `Booster achieved! +${bonus_roi_percentage}% ROI bonus active`
              : isExpired
              ? 'Booster window expired'
              : 'Get 3 directs with investments to unlock bonus ROI'}
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
          isAchieved ? 'bg-green-500 text-white' :
          isExpired ? 'bg-red-500 text-white' :
          'bg-yellow-500 text-black'
        }`}>
          {status}
        </div>
      </div>

      {/* Progress Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Direct Count Progress */}
        <div className="bg-surface/50 backdrop-blur rounded-lg p-4">
          <div className="text-sm text-text-secondary mb-2">Direct Referrals with Investments</div>
          <div className="flex items-end space-x-2 mb-3">
            <div className="text-4xl font-bold text-white">{direct_count}</div>
            <div className="text-xl text-text-secondary pb-1">/ {target_directs}</div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-surface-light rounded-full h-2 overflow-hidden mb-2">
            <div
              className={`h-full transition-all duration-500 ${
                isAchieved
                  ? 'bg-gradient-to-r from-green-400 to-emerald-400'
                  : 'bg-gradient-to-r from-yellow-400 to-orange-400'
              }`}
              style={{ width: `${Math.min(100, progress)}%` }}
            ></div>
          </div>

          {!isAchieved && !isExpired && (
            <div className="text-xs text-text-secondary">
              {directsNeeded} more {directsNeeded === 1 ? 'direct' : 'directs'} needed
            </div>
          )}
        </div>

        {/* Countdown Timer */}
        <div className="bg-surface/50 backdrop-blur rounded-lg p-4">
          <div className="text-sm text-text-secondary mb-3">Time Remaining</div>

          {status === 'active' ? (
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{timeRemaining.days}</div>
                <div className="text-xs text-text-secondary">Days</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{timeRemaining.hours}</div>
                <div className="text-xs text-text-secondary">Hours</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{timeRemaining.minutes}</div>
                <div className="text-xs text-text-secondary">Mins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{timeRemaining.seconds}</div>
                <div className="text-xs text-text-secondary">Secs</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-2xl font-bold text-white">
                {isAchieved ? 'Completed! 🎉' : 'Expired'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bonus Info */}
      <div className="bg-surface/30 backdrop-blur rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-text-secondary mb-1">Bonus ROI Rate</div>
            <div className="text-2xl font-bold text-theme">+{bonus_roi_percentage}%</div>
          </div>
          {isAchieved && (
            <div className="text-right">
              <div className="text-sm text-text-secondary mb-1">Applied to</div>
              <div className="text-lg font-bold text-green-400">All Active Packages</div>
            </div>
          )}
          {!isAchieved && !isExpired && (
            <div className="text-right">
              <div className="text-sm text-text-secondary">Invite friends to activate!</div>
            </div>
          )}
        </div>
      </div>

      {/* Start/End Dates */}
      <div className="mt-4 flex items-center justify-between text-xs text-text-secondary">
        <div>Started: {new Date(booster.start_date).toLocaleDateString()}</div>
        <div>Ends: {new Date(booster.end_date).toLocaleDateString()}</div>
      </div>
    </div>
  );
};

export default BoosterCountdownTimer;
