// @ts-nocheck - TODO: Migrate Supabase calls to MySQL backend API
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  total_investment: number;
  created_at: string;
  is_active: boolean;
  kyc_status: string;
  rank: string;
  level: number;
}

export const Team: React.FC = () => {
  const navigate = useNavigate();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamStats, setTeamStats] = useState({
    total: 0,
    direct: 0,
    active: 0,
    levelsUnlocked: 0,
    totalVolume: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      setLoading(true);

      // Get current user
      ;
      if (authError) throw authError;
      if (!user) throw new Error('User not authenticated');

      // Get direct referrals
        // .from('users')
        // .select('id, full_name, email, total_investment, created_at, is_active, kyc_status, rank')
        // .eq('sponsor_id', user.id)
        // .order('created_at', { ascending: false });

      if (teamError) throw teamError;

      // Calculate team statistics
      const directMembers = directReferrals || [];
      const activeCount = directMembers.filter(m => m.is_active).length;
      const totalVolume = directMembers.reduce((sum, m) => sum + (m.total_investment || 0), 0);

      // Get total team count (all levels) recursively
      // For now, we'll use direct count as a starting point
      // In production, implement recursive downline counting
      const totalTeamCount = directMembers.length;

      // Calculate deepest level (simplified - would need recursive query in production)
      const levelsUnlocked = totalTeamCount > 0 ? 1 : 0;

      setTeamStats({
        total: totalTeamCount,
        direct: directMembers.length,
        active: activeCount,
        levelsUnlocked,
        totalVolume
      });

      // Format team members with level info (all direct = level 1)
      const formattedMembers: TeamMember[] = directMembers.map(member => ({
        ...member,
        level: 1
      }));

      setTeamMembers(formattedMembers);

    } catch (error: any) {
      console.error('Error loading team data:', error);
      toast.error(error.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (member: TeamMember) => {
    if (!member.is_active) {
      return { text: 'Inactive', color: '#9e9e9e' };
    }
    if (member.kyc_status !== 'approved') {
      return { text: 'Pending KYC', color: '#ff9800' };
    }
    return { text: 'Active', color: '#4caf50' };
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>👥</div>
        <p>Loading team data...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '20px', padding: '10px 20px', cursor: 'pointer' }}>
        ← Back to Dashboard
      </button>

      <h1>My Team</h1>
      <p>View and manage your team structure</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '30px' }}>
        <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>👥</div>
          <h3 style={{ margin: '0 0 5px 0' }}>{teamStats.total}</h3>
          <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>Total Team</p>
        </div>

        <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>👤</div>
          <h3 style={{ margin: '0 0 5px 0' }}>{teamStats.direct}</h3>
          <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>Direct Referrals</p>
        </div>

        <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>✅</div>
          <h3 style={{ margin: '0 0 5px 0' }}>{teamStats.active}</h3>
          <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>Active Members</p>
        </div>

        <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>📊</div>
          <h3 style={{ margin: '0 0 5px 0' }}>{teamStats.levelsUnlocked}</h3>
          <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>Levels Unlocked</p>
        </div>

        <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>💰</div>
          <h3 style={{ margin: '0 0 5px 0' }}>${teamStats.totalVolume.toFixed(2)}</h3>
          <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>Team Volume</p>
        </div>
      </div>

      <div style={{ marginTop: '40px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: '0' }}>Team Members</h3>
          <button
            onClick={() => navigate('/genealogy')}
            style={{
              padding: '10px 20px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            View Tree
          </button>
        </div>

        {teamMembers.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>👥</div>
            <h3 style={{ color: '#666', marginBottom: '10px' }}>No team members yet</h3>
            <p style={{ color: '#999', marginBottom: '20px' }}>
              Start building your team by sharing your referral link!
            </p>
            <button
              onClick={() => navigate('/referrals')}
              style={{
                padding: '12px 24px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Get Referral Link
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd', background: '#f5f5f5' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Member</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Level</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Rank</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Joined</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Investment</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => {
                  const status = getStatusBadge(member);
                  return (
                    <tr key={member.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px' }}>
                        <div>
                          <div style={{ fontWeight: '500', color: '#333' }}>
                            {member.full_name || 'N/A'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            {member.email}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px',
                          background: '#f0f0f0',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          L{member.level}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 12px',
                          background: '#667eea20',
                          color: '#667eea',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {member.rank || 'Starter'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#666', fontSize: '14px' }}>
                        {format(new Date(member.created_at), 'MMM dd, yyyy')}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#2196f3' }}>
                        ${(member.total_investment || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 12px',
                          background: `${status.color}20`,
                          color: status.color,
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {status.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {teamMembers.length > 0 && (
        <div style={{ marginTop: '20px', padding: '20px', background: '#f5f5f5', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>💡 Team Building Tips</h4>
          <ul style={{ margin: '0', paddingLeft: '20px', color: '#666', fontSize: '14px', lineHeight: '1.8' }}>
            <li><strong>Active Support:</strong> Help your team members get started and achieve success</li>
            <li><strong>Training:</strong> Share knowledge about the platform and earning strategies</li>
            <li><strong>Recognition:</strong> Celebrate team achievements and milestones</li>
            <li><strong>Binary Placement:</strong> Strategic placement in binary tree maximizes matching bonus</li>
            <li><strong>Rank Advancement:</strong> Focus on team volume and active members to unlock higher ranks</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Team;
