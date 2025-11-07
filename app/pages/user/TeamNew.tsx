import React, { useState, useMemo, useEffect } from 'react';
import { Card, Button, Badge } from '../../components/ui/DesignSystem';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getTeamMembers } from '../../services/team.service';
import { ResponsiveTable } from '../../components/ResponsiveTable';

// Mock data for team members
const mockTeamMembers = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    joinDate: '2024-01-15',
    level: 1,
    status: 'active',
    investment: 5000,
    totalInvestment: 15000,
    directReferrals: 3,
    teamSize: 12,
    leftLeg: 5,
    rightLeg: 7,
    volume: 25000,
    parentId: null,
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane@example.com',
    joinDate: '2024-02-20',
    level: 1,
    status: 'active',
    investment: 2000,
    totalInvestment: 8000,
    directReferrals: 2,
    teamSize: 5,
    leftLeg: 2,
    rightLeg: 3,
    volume: 12000,
    parentId: null,
  },
  {
    id: 3,
    name: 'Mike Johnson',
    email: 'mike@example.com',
    joinDate: '2024-03-10',
    level: 2,
    status: 'inactive',
    investment: 1000,
    totalInvestment: 3000,
    directReferrals: 1,
    teamSize: 2,
    leftLeg: 1,
    rightLeg: 1,
    volume: 5000,
    parentId: 1,
  },
  {
    id: 4,
    name: 'Sarah Williams',
    email: 'sarah@example.com',
    joinDate: '2024-04-05',
    level: 1,
    status: 'active',
    investment: 10000,
    totalInvestment: 20000,
    directReferrals: 4,
    teamSize: 18,
    leftLeg: 8,
    rightLeg: 10,
    volume: 42000,
    parentId: null,
  },
  {
    id: 5,
    name: 'Tom Brown',
    email: 'tom@example.com',
    joinDate: '2024-05-12',
    level: 2,
    status: 'pending',
    investment: 0,
    totalInvestment: 0,
    directReferrals: 0,
    teamSize: 0,
    leftLeg: 0,
    rightLeg: 0,
    volume: 0,
    parentId: 1,
  },
  {
    id: 6,
    name: 'Lisa Anderson',
    email: 'lisa@example.com',
    joinDate: '2024-06-01',
    level: 3,
    status: 'active',
    investment: 3000,
    totalInvestment: 3000,
    directReferrals: 0,
    teamSize: 0,
    leftLeg: 0,
    rightLeg: 0,
    volume: 3000,
    parentId: 3,
  },
];

// Generate level-wise breakdown data
const generateLevelData = (members: typeof mockTeamMembers) => {
  const levels = Array.from({ length: 30 }, (_, i) => ({
    level: i + 1,
    members: members.filter(m => m.level === i + 1).length,
    activeMembers: members.filter(m => m.level === i + 1 && m.status === 'active').length,
    totalInvestment: members
      .filter(m => m.level === i + 1)
      .reduce((sum, m) => sum + m.totalInvestment, 0),
    volume: members
      .filter(m => m.level === i + 1)
      .reduce((sum, m) => sum + m.volume, 0),
  }));
  return levels.filter(l => l.members > 0); // Only return levels with members
};

// Tree node interface
interface TreeNode {
  id: number;
  name: string;
  email: string;
  investment: number;
  teamSize: number;
  status: string;
  children: TreeNode[];
  leftLeg: number;
  rightLeg: number;
}

const TeamNew: React.FC = () => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'investment' | 'team'>('date');
  const [expandedLevels, setExpandedLevels] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
  const [expandedNodes, setExpandedNodes] = useState<number[]>([]);

  // Fetch team members on mount and when user changes
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!user?.id) {
        console.log('⚠️ No user ID available');
        setLoading(false);
        return;
      }

      console.log('👤 [My Team] Current user:', user.email, 'ID:', user.id);
      setLoading(true);
      try {
        // Call the MySQL API to get team members (JWT-based authentication)
        const teamData = await getTeamMembers();
        const members = teamData.members || [];

        console.log('📊 [My Team] Team members received:', members.length, 'members');
        console.log('📊 [My Team] Summary:', teamData.summary);

        // Map API data to component format (API returns full_name, component expects name)
        // Create user ID to index mapping first
        const idToIndex = new Map();
        members.forEach((member: any, index: number) => {
          idToIndex.set(member.id, index + 1);
        });

        const mappedMembers = members.map((member: any, index: number) => {
          // Find parent index based on sponsor_id
          let parentId = null;
          if (member.sponsor_id && member.sponsor_id !== user?.id) {
            parentId = idToIndex.get(member.sponsor_id) || null;
          }

          return {
            id: index + 1,
            name: member.full_name || 'Unknown User',
            email: member.email || '',
            level: member.level || 1,
            joinDate: member.created_at || new Date().toISOString(),
            status: member.is_active ? 'active' : 'inactive',
            totalInvestment: parseFloat(member.total_investment) || 0,
            teamSize: member.team_count || 0,
            volume: (parseFloat(member.left_volume) || 0) + (parseFloat(member.right_volume) || 0),
            directReferrals: 0, // Will be calculated from the data
            leftLeg: parseFloat(member.left_volume) || 0,
            rightLeg: parseFloat(member.right_volume) || 0,
            parentId: parentId,
            investment: parseFloat(member.total_investment) || 0
          };
        });

        setTeamMembers(mappedMembers);

        if (members.length === 0) {
          console.log('ℹ️ [My Team] No team members found for user');
        }
      } catch (error: any) {
        console.error('❌ [My Team] Error fetching team members:', error);
        toast.error(error.message || 'Failed to load team members');
        setTeamMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamMembers();
  }, [user?.id]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalSize = teamMembers.length;
    const activeMembers = teamMembers.filter(m => m.status === 'active').length;
    const totalVolume = teamMembers.reduce((sum, m) => sum + m.totalInvestment, 0); // Sum of all team investments
    const totalEarnings = teamMembers.reduce((sum, m) => sum + m.totalInvestment * 0.05, 0); // 5% commission estimate

    return {
      totalSize,
      activeMembers,
      totalVolume,
      totalEarnings,
    };
  }, [teamMembers]);

  // Get level-wise data
  const levelData = useMemo(() => generateLevelData(teamMembers), [teamMembers]);

  // Filter and sort team members
  const filteredMembers = useMemo(() => {
    let filtered = teamMembers;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }

    // Apply level filter
    if (levelFilter !== 'all') {
      filtered = filtered.filter(m => m.level === parseInt(levelFilter));
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(m =>
        (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.email || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime();
      } else if (sortBy === 'investment') {
        return b.totalInvestment - a.totalInvestment;
      } else {
        return b.teamSize - a.teamSize;
      }
    });

    return filtered;
  }, [teamMembers, searchTerm, statusFilter, levelFilter, sortBy]);

  // Build tree structure
  const buildTree = (members: typeof mockTeamMembers): TreeNode[] => {
    const map = new Map<number, TreeNode>();
    const roots: TreeNode[] = [];

    // Create nodes
    members.forEach(member => {
      map.set(member.id, {
        id: member.id,
        name: member.name,
        email: member.email,
        investment: member.investment,
        teamSize: member.teamSize,
        status: member.status,
        leftLeg: member.leftLeg,
        rightLeg: member.rightLeg,
        children: [],
      });
    });

    // Build tree
    members.forEach(member => {
      const node = map.get(member.id)!;
      if (member.parentId === null) {
        roots.push(node);
      } else {
        const parent = map.get(member.parentId);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    return roots;
  };

  const treeData = useMemo(() => buildTree(teamMembers), [teamMembers]);

  const toggleLevel = (level: number) => {
    setExpandedLevels(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const toggleNode = (nodeId: number) => {
    setExpandedNodes(prev =>
      prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]
    );
  };

  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'info';
    }
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.includes(node.id);
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id} style={{ marginLeft: depth > 0 ? `${depth * 32}px` : '0' }}>
        <div
          className={`flex items-center gap-4 p-4 mb-2 rounded-lg border transition-all ${
            node.status === 'active'
              ? 'bg-[#1e293b] border-[#334155] hover:border-[#00C7D1]'
              : 'bg-[#1e293b]/50 border-[#334155]/50'
          }`}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={() => toggleNode(node.id)}
              className={`w-6 h-6 flex items-center justify-center rounded transition-all ${
                isExpanded
                  ? 'bg-[#00C7D1] hover:bg-[#00e5f0] text-white scale-110'
                  : 'bg-[#334155] hover:bg-[#475569] text-[#f8fafc] scale-100'
              }`}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? '−' : '+'}
            </button>
          ) : (
            <div className="w-6 h-6 flex items-center justify-center">
              <span className="text-[#475569]">○</span>
            </div>
          )}

          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00C7D1] to-[#00e5f0] flex items-center justify-center text-white font-semibold shrink-0">
            {node.name?.charAt(0) || '?'}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-[#f8fafc] font-semibold truncate">{node.name}</h3>
              <Badge variant={getStatusBadgeVariant(node.status)} size="sm">
                {node.status}
              </Badge>
            </div>
            <p className="text-sm text-[#94a3b8] truncate">{node.email}</p>
          </div>

          {/* Stats */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-[#94a3b8] mb-1">Investment</p>
              <p className="text-[#f8fafc] font-semibold">${node.investment.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-[#94a3b8] mb-1">Team</p>
              <p className="text-[#f8fafc] font-semibold">{node.teamSize}</p>
            </div>
            <div className="text-center">
              <p className="text-[#94a3b8] mb-1">Left</p>
              <p className="text-[#10b981] font-semibold">{node.leftLeg}</p>
            </div>
            <div className="text-center">
              <p className="text-[#94a3b8] mb-1">Right</p>
              <p className="text-[#3b82f6] font-semibold">{node.rightLeg}</p>
            </div>
          </div>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div className="ml-4 border-l-2 border-[#334155] pl-4 animate-in slide-in-from-top-2 fade-in duration-200">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] container-padding py-4 sm:py-6 lg:py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#00C7D1] mx-auto mb-4"></div>
              <p className="text-[#cbd5e1] text-lg font-medium">Loading team members...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] container-padding py-4 sm:py-6 lg:py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="heading-1 mb-2">My Team</h1>
          <p className="text-[#94a3b8]">View and manage your team members across all levels</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-[#00C7D1]/10 to-[#00C7D1]/5 border-[#00C7D1]/20">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-[#00C7D1]/20 flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
              </div>
              <h3 className="text-[#94a3b8] text-sm font-medium mb-1">Total Team Size</h3>
              <p className="text-3xl font-bold text-[#f8fafc]">{stats.totalSize}</p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-[#10b981]/10 to-[#10b981]/5 border-[#10b981]/20">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-[#10b981]/20 flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
              </div>
              <h3 className="text-[#94a3b8] text-sm font-medium mb-1">Active Members</h3>
              <p className="text-3xl font-bold text-[#f8fafc]">{stats.activeMembers}</p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-[#f59e0b]/10 to-[#f59e0b]/5 border-[#f59e0b]/20">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-[#f59e0b]/20 flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
              <h3 className="text-[#94a3b8] text-sm font-medium mb-1">Total Volume</h3>
              <p className="text-3xl font-bold text-[#f8fafc]">${stats.totalVolume.toLocaleString()}</p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-[#8b5cf6]/10 to-[#8b5cf6]/5 border-[#8b5cf6]/20">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-[#8b5cf6]/20 flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
              <h3 className="text-[#94a3b8] text-sm font-medium mb-1">Team Earnings</h3>
              <p className="text-3xl font-bold text-[#f8fafc]">${stats.totalEarnings.toLocaleString()}</p>
            </div>
          </Card>
        </div>

        {/* Level-wise Breakdown */}
        <Card>
          <div className="p-6">
            <h2 className="heading-2 mb-4 sm:mb-6">Level-wise Breakdown</h2>
            <div className="space-y-2">
              {levelData.map(level => {
                const isExpanded = expandedLevels.includes(level.level);
                return (
                  <div key={level.level} className={`border rounded-lg overflow-hidden transition-all ${
                    isExpanded ? 'border-[#00C7D1]' : 'border-[#334155]'
                  }`}>
                    <button
                      onClick={() => toggleLevel(level.level)}
                      className={`w-full flex items-center justify-between p-4 transition-all ${
                        isExpanded
                          ? 'bg-[#00C7D1]/10 hover:bg-[#00C7D1]/20'
                          : 'bg-[#1e293b] hover:bg-[#334155]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold transition-all ${
                          isExpanded
                            ? 'bg-gradient-to-br from-[#00C7D1] to-[#00e5f0] scale-110'
                            : 'bg-gradient-to-br from-[#00C7D1] to-[#00e5f0]'
                        }`}>
                          L{level.level}
                        </div>
                        <div className="text-left">
                          <h3 className="text-[#f8fafc] font-semibold">Level {level.level}</h3>
                          <p className="text-sm text-[#94a3b8]">
                            {level.members} members ({level.activeMembers} active)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="hidden sm:block text-right">
                          <p className="text-sm text-[#94a3b8]">Investment</p>
                          <p className="text-[#f8fafc] font-semibold">${level.totalInvestment.toLocaleString()}</p>
                        </div>
                        <div className="hidden sm:block text-right">
                          <p className="text-sm text-[#94a3b8]">Volume</p>
                          <p className="text-[#f8fafc] font-semibold">${level.volume.toLocaleString()}</p>
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          isExpanded ? 'bg-[#00C7D1] rotate-90' : 'bg-[#334155] rotate-0'
                        }`}>
                          <span className="text-white text-sm">▶</span>
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4 bg-[#0f172a] border-t border-[#334155] animate-in slide-in-from-top-2 fade-in duration-200">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-[#1e293b] rounded-lg">
                            <p className="text-sm text-[#94a3b8] mb-1">Total Members</p>
                            <p className="text-2xl font-bold text-[#f8fafc]">{level.members}</p>
                          </div>
                          <div className="text-center p-3 bg-[#1e293b] rounded-lg">
                            <p className="text-sm text-[#94a3b8] mb-1">Active</p>
                            <p className="text-2xl font-bold text-[#10b981]">{level.activeMembers}</p>
                          </div>
                          <div className="text-center p-3 bg-[#1e293b] rounded-lg">
                            <p className="text-sm text-[#94a3b8] mb-1">Investment</p>
                            <p className="text-xl font-bold text-[#f8fafc]">${level.totalInvestment.toLocaleString()}</p>
                          </div>
                          <div className="text-center p-3 bg-[#1e293b] rounded-lg">
                            <p className="text-sm text-[#94a3b8] mb-1">Volume</p>
                            <p className="text-xl font-bold text-[#f8fafc]">${level.volume.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {levelData.length === 0 && (
                <div className="text-center py-8 text-[#94a3b8]">
                  No team members yet. Start building your team!
                </div>
              )}

              {levelData.length > 0 && levelData.length < 30 && (
                <div className="text-center py-4 text-[#94a3b8] text-sm">
                  Showing {levelData.length} of 30 possible levels
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* View Mode Toggle */}
        <div className="flex justify-center sm:justify-end">
          <div className="inline-flex rounded-lg border border-[#334155] overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 sm:px-6 py-2.5 sm:py-2 text-sm sm:text-base font-medium transition-colors touch-target ${
                viewMode === 'table'
                  ? 'bg-[#00C7D1] text-white'
                  : 'bg-[#1e293b] text-[#94a3b8] hover:bg-[#334155]'
              }`}
            >
              📋 Table View
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`px-4 sm:px-6 py-2.5 sm:py-2 text-sm sm:text-base font-medium transition-colors touch-target ${
                viewMode === 'tree'
                  ? 'bg-[#00C7D1] text-white'
                  : 'bg-[#1e293b] text-[#94a3b8] hover:bg-[#334155]'
              }`}
            >
              🌳 Tree View
            </button>
          </div>
        </div>

        {viewMode === 'table' ? (
          /* Team Members Table */
          <Card>
            <div className="p-6">
              <h2 className="heading-2 mb-4 sm:mb-6">Team Members</h2>

              {/* Filters and Search */}
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-3 sm:py-2 text-base sm:text-sm pr-10 bg-[#1e293b] border border-[#334155] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#00C7D1]"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#f8fafc]"
                        aria-label="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#00C7D1]"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                  <select
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                    className="px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#00C7D1]"
                  >
                    <option value="all">All Levels</option>
                    {Array.from({ length: 30 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Level {i + 1}</option>
                    ))}
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'investment' | 'team')}
                    className="px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#00C7D1]"
                  >
                    <option value="date">Sort by Date</option>
                    <option value="investment">Sort by Investment</option>
                    <option value="team">Sort by Team Size</option>
                  </select>
                </div>

                {/* Active Filters Indicator */}
                {(searchTerm || statusFilter !== 'all' || levelFilter !== 'all') && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-[#94a3b8]">Active filters:</span>
                    {searchTerm && (
                      <Badge variant="info">
                        Search: "{searchTerm}"
                        <button
                          onClick={() => setSearchTerm('')}
                          className="ml-2 hover:text-[#f8fafc]"
                        >
                          ✕
                        </button>
                      </Badge>
                    )}
                    {statusFilter !== 'all' && (
                      <Badge variant="info">
                        Status: {statusFilter}
                        <button
                          onClick={() => setStatusFilter('all')}
                          className="ml-2 hover:text-[#f8fafc]"
                        >
                          ✕
                        </button>
                      </Badge>
                    )}
                    {levelFilter !== 'all' && (
                      <Badge variant="info">
                        Level: {levelFilter}
                        <button
                          onClick={() => setLevelFilter('all')}
                          className="ml-2 hover:text-[#f8fafc]"
                        >
                          ✕
                        </button>
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                        setLevelFilter('all');
                        toast.success('Filters cleared');
                      }}
                    >
                      Clear All Filters
                    </Button>
                  </div>
                )}
              </div>

              {/* Table - Responsive */}
              <ResponsiveTable
                columns={[
                  {
                    key: 'name',
                    label: 'Member',
                    mobileLabel: 'Name',
                    render: (value, row) => (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00C7D1] to-[#00e5f0] flex items-center justify-center text-white font-semibold shrink-0">
                          {row.name?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[#f8fafc] font-medium truncate">{row.name}</p>
                          <p className="text-sm text-[#94a3b8] truncate">{row.email}</p>
                        </div>
                      </div>
                    )
                  },
                  {
                    key: 'level',
                    label: 'Level',
                    render: (value) => (
                      <Badge variant="info">L{value}</Badge>
                    )
                  },
                  {
                    key: 'joinDate',
                    label: 'Join Date',
                    mobileLabel: 'Joined',
                    render: (value) => new Date(value).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (value) => (
                      <Badge variant={value === 'active' ? 'success' : value === 'pending' ? 'warning' : 'error'}>
                        {(value?.charAt(0).toUpperCase() || '') + (value?.slice(1) || '')}
                      </Badge>
                    )
                  },
                  {
                    key: 'totalInvestment',
                    label: 'Investment',
                    render: (value) => `$${value.toLocaleString()}`
                  },
                  {
                    key: 'teamSize',
                    label: 'Team Size',
                    mobileLabel: 'Team',
                  },
                  {
                    key: 'volume',
                    label: 'Volume',
                    render: (value) => `$${value.toLocaleString()}`
                  }
                ]}
                data={filteredMembers}
                keyField="id"
                emptyMessage="No team members found"
              />

              {/* Table Summary */}
              {filteredMembers.length > 0 && (
                <div className="mt-6 p-4 bg-[#1e293b] rounded-lg">
                  <div className="text-[#94a3b8]">
                    Showing <span className="text-[#f8fafc] font-semibold">{filteredMembers.length}</span> of{' '}
                    <span className="text-[#f8fafc] font-semibold">{teamMembers.length}</span> team members
                  </div>
                </div>
              )}

            </div>
          </Card>
        ) : (
          /* Team Tree View */
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#f8fafc]">Team Tree Structure</h2>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExpandedNodes([])}
                  >
                    Collapse All
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setExpandedNodes(teamMembers.map(m => m.id))}
                  >
                    Expand All
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {treeData.length === 0 ? (
                  <div className="text-center py-12 text-[#94a3b8]">
                    <div className="text-6xl mb-4">🌳</div>
                    <p>Your team tree will appear here</p>
                  </div>
                ) : (
                  treeData.map(node => renderTreeNode(node))
                )}
              </div>

              <div className="mt-6 p-4 bg-[#1e293b] rounded-lg border border-[#334155]">
                <h3 className="text-[#f8fafc] font-semibold mb-3">Legend</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-[#10b981] font-bold">Left</span>
                    <span className="text-[#94a3b8]">- Left leg members</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#3b82f6] font-bold">Right</span>
                    <span className="text-[#94a3b8]">- Right leg members</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#94a3b8]">+/−</span>
                    <span className="text-[#94a3b8]">- Expand/Collapse</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#94a3b8]">○</span>
                    <span className="text-[#94a3b8]">- No children</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TeamNew;
