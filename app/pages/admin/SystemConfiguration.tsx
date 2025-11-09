import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as ConfigService from '../../services/admin-config.service';
import { clearConfigCache } from '../../services/mlm-client';

export const SystemConfiguration: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('level-income');
  const [loading, setLoading] = useState(true);

  // Level Income Configuration State
  const [levelIncomeConfig, setLevelIncomeConfig] = useState<ConfigService.LevelIncomeConfig[]>([]);
  const [editingLevel, setEditingLevel] = useState<number | null>(null);

  // Matching Bonus Tiers State
  const [matchingTiers, setMatchingTiers] = useState<ConfigService.MatchingBonusTier[]>([]);
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [showAddTierModal, setShowAddTierModal] = useState(false);

  // Rank Requirements State
  const [rankRequirements, setRankRequirements] = useState<ConfigService.RankRequirement[]>([]);
  const [editingRank, setEditingRank] = useState<string | null>(null);
  const [showAddRankModal, setShowAddRankModal] = useState(false);

  // Binary Settings State
  const [binarySettings, setBinarySettings] = useState<ConfigService.BinarySetting[]>([]);
  const [editingBinarySetting, setEditingBinarySetting] = useState<string | null>(null);

  // System Settings State
  const [systemSettings, setSystemSettings] = useState<ConfigService.SystemSetting[]>([]);
  const [editingSystemSetting, setEditingSystemSetting] = useState<string | null>(null);

  const tabs = [
    { id: 'level-income', label: 'Level Income', icon: '📊' },
    { id: 'matching-bonus', label: 'Matching Bonus', icon: '🎯' },
    { id: 'rank-requirements', label: 'Rank Requirements', icon: '🏆' },
    { id: 'binary-settings', label: 'Binary Settings', icon: '🌳' },
    { id: 'system-settings', label: 'System Settings', icon: '⚙️' },
  ];

  // Load all configurations on mount
  useEffect(() => {
    loadAllConfigurations();
  }, []);

  const loadAllConfigurations = async () => {
    try {
      setLoading(true);
      const [levels, tiers, ranks, binary, system] = await Promise.all([
        ConfigService.getLevelIncomeConfig(),
        ConfigService.getMatchingBonusTiers(),
        ConfigService.getRankRequirements(),
        ConfigService.getBinarySettings(),
        ConfigService.getSystemSettings(),
      ]);

      setLevelIncomeConfig(levels);
      setMatchingTiers(tiers);
      setRankRequirements(ranks);
      setBinarySettings(binary);
      setSystemSettings(system);
    } catch (error) {
      console.error('Error loading configurations:', error);
      toast.error('Failed to load configurations');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // LEVEL INCOME CONFIGURATION HANDLERS
  // ============================================

  const handleUpdateLevelIncome = async (level: number, percentage: number, amount: number, isActive: boolean) => {
    try {
      toast.loading('Updating level income config...', { id: 'update-level' });

      await ConfigService.updateLevelIncomeConfig(level, {
        percentage,
        amount,
        is_active: isActive,
      });

      // Clear cache after update
      await clearConfigCache();

      toast.success('Level income config updated successfully!', { id: 'update-level' });

      // Reload configurations
      const updatedLevels = await ConfigService.getLevelIncomeConfig();
      setLevelIncomeConfig(updatedLevels);
      setEditingLevel(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update level income config', { id: 'update-level' });
    }
  };

  // ============================================
  // MATCHING BONUS TIERS HANDLERS
  // ============================================

  const handleUpdateMatchingTier = async (tierId: string, tier: Partial<ConfigService.MatchingBonusTier>) => {
    try {
      toast.loading('Updating matching bonus tier...', { id: 'update-tier' });

      await ConfigService.updateMatchingBonusTier(tierId, tier);

      // Clear cache after update
      await clearConfigCache();

      toast.success('Matching bonus tier updated successfully!', { id: 'update-tier' });

      // Reload configurations
      const updatedTiers = await ConfigService.getMatchingBonusTiers();
      setMatchingTiers(updatedTiers);
      setEditingTier(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update matching bonus tier', { id: 'update-tier' });
    }
  };

  const handleCreateMatchingTier = async (tier: Omit<ConfigService.MatchingBonusTier, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      toast.loading('Creating matching bonus tier...', { id: 'create-tier' });

      await ConfigService.createMatchingBonusTier(tier);

      // Clear cache after update
      await clearConfigCache();

      toast.success('Matching bonus tier created successfully!', { id: 'create-tier' });

      // Reload configurations
      const updatedTiers = await ConfigService.getMatchingBonusTiers();
      setMatchingTiers(updatedTiers);
      setShowAddTierModal(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create matching bonus tier', { id: 'create-tier' });
    }
  };

  const handleDeleteMatchingTier = async (tierId: string) => {
    if (!confirm('Are you sure you want to delete this matching bonus tier?')) {
      return;
    }

    try {
      toast.loading('Deleting matching bonus tier...', { id: 'delete-tier' });

      await ConfigService.deleteMatchingBonusTier(tierId);

      // Clear cache after update
      await clearConfigCache();

      toast.success('Matching bonus tier deleted successfully!', { id: 'delete-tier' });

      // Reload configurations
      const updatedTiers = await ConfigService.getMatchingBonusTiers();
      setMatchingTiers(updatedTiers);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete matching bonus tier', { id: 'delete-tier' });
    }
  };

  // ============================================
  // RANK REQUIREMENTS HANDLERS
  // ============================================

  const handleUpdateRankRequirement = async (rankId: string, rank: Partial<ConfigService.RankRequirement>) => {
    try {
      toast.loading('Updating rank requirement...', { id: 'update-rank' });

      await ConfigService.updateRankRequirement(rankId, rank);

      // Clear cache after update
      await clearConfigCache();

      toast.success('Rank requirement updated successfully!', { id: 'update-rank' });

      // Reload configurations
      const updatedRanks = await ConfigService.getRankRequirements();
      setRankRequirements(updatedRanks);
      setEditingRank(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update rank requirement', { id: 'update-rank' });
    }
  };

  const handleCreateRankRequirement = async (rank: Omit<ConfigService.RankRequirement, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      toast.loading('Creating rank requirement...', { id: 'create-rank' });

      await ConfigService.createRankRequirement(rank);

      // Clear cache after update
      await clearConfigCache();

      toast.success('Rank requirement created successfully!', { id: 'create-rank' });

      // Reload configurations
      const updatedRanks = await ConfigService.getRankRequirements();
      setRankRequirements(updatedRanks);
      setShowAddRankModal(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create rank requirement', { id: 'create-rank' });
    }
  };

  const handleDeleteRankRequirement = async (rankId: string) => {
    if (!confirm('Are you sure you want to delete this rank requirement?')) {
      return;
    }

    try {
      toast.loading('Deleting rank requirement...', { id: 'delete-rank' });

      await ConfigService.deleteRankRequirement(rankId);

      // Clear cache after update
      await clearConfigCache();

      toast.success('Rank requirement deleted successfully!', { id: 'delete-rank' });

      // Reload configurations
      const updatedRanks = await ConfigService.getRankRequirements();
      setRankRequirements(updatedRanks);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete rank requirement', { id: 'delete-rank' });
    }
  };

  // ============================================
  // BINARY SETTINGS HANDLERS
  // ============================================

  const handleUpdateBinarySetting = async (settingKey: string, settingValue: string) => {
    try {
      toast.loading('Updating binary setting...', { id: 'update-binary' });

      await ConfigService.updateBinarySetting(settingKey, settingValue);

      // Clear cache after update
      await clearConfigCache();

      toast.success('Binary setting updated successfully!', { id: 'update-binary' });

      // Reload configurations
      const updatedBinary = await ConfigService.getBinarySettings();
      setBinarySettings(updatedBinary);
      setEditingBinarySetting(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update binary setting', { id: 'update-binary' });
    }
  };

  // ============================================
  // SYSTEM SETTINGS HANDLERS
  // ============================================

  const handleUpdateSystemSetting = async (settingKey: string, settingValue: string) => {
    try {
      toast.loading('Updating system setting...', { id: 'update-system' });

      await ConfigService.updateSystemSetting(settingKey, settingValue);

      // Clear cache after update
      await clearConfigCache();

      toast.success('System setting updated successfully!', { id: 'update-system' });

      // Reload configurations
      const updatedSystem = await ConfigService.getSystemSettings();
      setSystemSettings(updatedSystem);
      setEditingSystemSetting(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update system setting', { id: 'update-system' });
    }
  };

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  const renderLevelIncomeConfig = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[#f8fafc]">Level Income Configuration</h3>
          <p className="text-sm text-[#94a3b8]">Configure commission percentages for each of the 30 levels</p>
        </div>
        <button
          onClick={() => {
            clearConfigCache();
            toast.success('Configuration cache cleared!');
          }}
          className="px-4 py-2 bg-[#334155] text-[#f8fafc] rounded-lg text-sm hover:bg-[#475569]"
        >
          🔄 Clear Cache
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#334155]">
              <th className="text-left py-3 px-4 text-sm font-medium text-[#cbd5e1]">Level</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-[#cbd5e1]">Percentage (%)</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-[#cbd5e1]">Fixed Amount ($)</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-[#cbd5e1]">Status</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-[#cbd5e1]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {levelIncomeConfig.map((config) => (
              <LevelIncomeRow
                key={config.level}
                config={config}
                isEditing={editingLevel === config.level}
                onEdit={() => setEditingLevel(config.level)}
                onSave={(percentage, amount, isActive) => handleUpdateLevelIncome(config.level, percentage, amount, isActive)}
                onCancel={() => setEditingLevel(null)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMatchingBonusTiers = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[#f8fafc]">Matching Bonus Tiers</h3>
          <p className="text-sm text-[#94a3b8]">Configure binary matching bonus tiers and rewards</p>
        </div>
        <button
          onClick={() => setShowAddTierModal(true)}
          className="px-4 py-2 bg-[#00C7D1] text-[#0f172a] rounded-lg font-semibold hover:bg-[#00e5f0]"
        >
          ➕ Add Tier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matchingTiers.map((tier) => (
          <MatchingBonusTierCard
            key={tier.id}
            tier={tier}
            isEditing={editingTier === tier.id}
            onEdit={() => setEditingTier(tier.id!)}
            onSave={(updatedTier) => handleUpdateMatchingTier(tier.id!, updatedTier)}
            onDelete={() => handleDeleteMatchingTier(tier.id!)}
            onCancel={() => setEditingTier(null)}
          />
        ))}
      </div>
    </div>
  );

  const renderRankRequirements = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[#f8fafc]">Rank Requirements</h3>
          <p className="text-sm text-[#94a3b8]">Configure rank advancement criteria and rewards</p>
        </div>
        <button
          onClick={() => setShowAddRankModal(true)}
          className="px-4 py-2 bg-[#00C7D1] text-[#0f172a] rounded-lg font-semibold hover:bg-[#00e5f0]"
        >
          ➕ Add Rank
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {rankRequirements.map((rank) => (
          <RankRequirementCard
            key={rank.id}
            rank={rank}
            isEditing={editingRank === rank.id}
            onEdit={() => setEditingRank(rank.id!)}
            onSave={(updatedRank) => handleUpdateRankRequirement(rank.id!, updatedRank)}
            onDelete={() => handleDeleteRankRequirement(rank.id!)}
            onCancel={() => setEditingRank(null)}
          />
        ))}
      </div>
    </div>
  );

  const renderBinarySettings = () => (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[#f8fafc]">Binary Tree Settings</h3>
        <p className="text-sm text-[#94a3b8]">Configure binary tree behavior and calculations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {binarySettings.map((setting) => (
          <BinarySettingCard
            key={setting.setting_key}
            setting={setting}
            isEditing={editingBinarySetting === setting.setting_key}
            onEdit={() => setEditingBinarySetting(setting.setting_key)}
            onSave={(value) => handleUpdateBinarySetting(setting.setting_key, value)}
            onCancel={() => setEditingBinarySetting(null)}
          />
        ))}
      </div>
    </div>
  );

  const renderSystemSettings = () => (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[#f8fafc]">MLM System Settings</h3>
        <p className="text-sm text-[#94a3b8]">Configure general MLM platform settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {systemSettings.map((setting) => (
          <SystemSettingCard
            key={setting.setting_key}
            setting={setting}
            isEditing={editingSystemSetting === setting.setting_key}
            onEdit={() => setEditingSystemSetting(setting.setting_key)}
            onSave={(value) => handleUpdateSystemSetting(setting.setting_key, value)}
            onCancel={() => setEditingSystemSetting(null)}
          />
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <div className="text-[#cbd5e1]">Loading configurations...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#f8fafc] mb-2">System Configuration</h1>
          <p className="text-[#94a3b8]">Manage database-driven business rules and system settings</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#00C7D1] text-[#0f172a]'
                    : 'bg-[#1e293b] text-[#cbd5e1] hover:bg-[#334155]'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-6">
          {activeTab === 'level-income' && renderLevelIncomeConfig()}
          {activeTab === 'matching-bonus' && renderMatchingBonusTiers()}
          {activeTab === 'rank-requirements' && renderRankRequirements()}
          {activeTab === 'binary-settings' && renderBinarySettings()}
          {activeTab === 'system-settings' && renderSystemSettings()}
        </div>

        {/* Back Button */}
        <div className="mt-6">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="px-6 py-3 bg-[#334155] text-[#f8fafc] rounded-lg font-medium hover:bg-[#475569] transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// SUB-COMPONENTS
// ============================================

interface LevelIncomeRowProps {
  config: ConfigService.LevelIncomeConfig;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (percentage: number, amount: number, isActive: boolean) => void;
  onCancel: () => void;
}

const LevelIncomeRow: React.FC<LevelIncomeRowProps> = ({ config, isEditing, onEdit, onSave, onCancel }) => {
  const [percentage, setPercentage] = useState(config.percentage);
  const [amount, setAmount] = useState(config.amount);
  const [isActive, setIsActive] = useState(config.is_active);

  if (isEditing) {
    return (
      <tr className="border-b border-[#334155] bg-[#0f172a]">
        <td className="py-3 px-4 text-sm font-semibold text-[#00C7D1]">Level {config.level}</td>
        <td className="py-3 px-4">
          <input
            type="number"
            value={percentage}
            onChange={(e) => setPercentage(parseFloat(e.target.value))}
            className="w-24 px-2 py-1 bg-[#1e293b] border border-[#334155] rounded text-[#f8fafc] text-sm"
            step="0.1"
          />
        </td>
        <td className="py-3 px-4">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value))}
            className="w-24 px-2 py-1 bg-[#1e293b] border border-[#334155] rounded text-[#f8fafc] text-sm"
            step="0.01"
          />
        </td>
        <td className="py-3 px-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="ml-2 text-sm text-[#cbd5e1]">Active</span>
          </label>
        </td>
        <td className="py-3 px-4 text-right">
          <button
            onClick={() => onSave(percentage, amount, isActive)}
            className="px-3 py-1 bg-[#10b981] text-white rounded text-sm mr-2"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1 bg-[#334155] text-[#f8fafc] rounded text-sm"
          >
            Cancel
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-[#334155] hover:bg-[#0f172a]">
      <td className="py-3 px-4 text-sm font-medium text-[#f8fafc]">Level {config.level}</td>
      <td className="py-3 px-4 text-sm text-[#cbd5e1]">{config.percentage}%</td>
      <td className="py-3 px-4 text-sm text-[#cbd5e1]">${config.amount.toFixed(2)}</td>
      <td className="py-3 px-4">
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          config.is_active
            ? 'bg-[#10b981]/10 text-[#10b981]'
            : 'bg-[#94a3b8]/10 text-[#94a3b8]'
        }`}>
          {config.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="py-3 px-4 text-right">
        <button
          onClick={onEdit}
          className="px-3 py-1 bg-[#334155] text-[#f8fafc] rounded text-sm hover:bg-[#475569]"
        >
          Edit
        </button>
      </td>
    </tr>
  );
};

interface MatchingBonusTierCardProps {
  tier: ConfigService.MatchingBonusTier;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (tier: Partial<ConfigService.MatchingBonusTier>) => void;
  onDelete: () => void;
  onCancel: () => void;
}

const MatchingBonusTierCard: React.FC<MatchingBonusTierCardProps> = ({ tier, isEditing, onEdit, onSave, onDelete, onCancel }) => {
  const [tierName, setTierName] = useState(tier.tier_name);
  const [leftMatches, setLeftMatches] = useState(tier.left_matches_required);
  const [rightMatches, setRightMatches] = useState(tier.right_matches_required);
  const [bonusAmount, setBonusAmount] = useState(tier.bonus_amount);
  const [bonusPercentage, setBonusPercentage] = useState(tier.bonus_percentage);
  const [isActive, setIsActive] = useState(tier.is_active);

  if (isEditing) {
    return (
      <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4">
        <h4 className="font-semibold text-[#f8fafc] mb-4">Edit Tier</h4>
        <div className="space-y-3">
          <input
            type="text"
            value={tierName}
            onChange={(e) => setTierName(e.target.value)}
            placeholder="Tier Name"
            className="w-full px-3 py-2 bg-[#1e293b] border border-[#334155] rounded text-[#f8fafc]"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={leftMatches}
              onChange={(e) => setLeftMatches(parseInt(e.target.value))}
              placeholder="Left Matches"
              className="px-3 py-2 bg-[#1e293b] border border-[#334155] rounded text-[#f8fafc]"
            />
            <input
              type="number"
              value={rightMatches}
              onChange={(e) => setRightMatches(parseInt(e.target.value))}
              placeholder="Right Matches"
              className="px-3 py-2 bg-[#1e293b] border border-[#334155] rounded text-[#f8fafc]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={bonusAmount}
              onChange={(e) => setBonusAmount(parseFloat(e.target.value))}
              placeholder="Bonus Amount"
              className="px-3 py-2 bg-[#1e293b] border border-[#334155] rounded text-[#f8fafc]"
              step="0.01"
            />
            <input
              type="number"
              value={bonusPercentage}
              onChange={(e) => setBonusPercentage(parseFloat(e.target.value))}
              placeholder="Bonus %"
              className="px-3 py-2 bg-[#1e293b] border border-[#334155] rounded text-[#f8fafc]"
              step="0.1"
            />
          </div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="ml-2 text-sm text-[#cbd5e1]">Active</span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => onSave({ tier_name: tierName, left_matches_required: leftMatches, right_matches_required: rightMatches, bonus_amount: bonusAmount, bonus_percentage: bonusPercentage, is_active: isActive })}
              className="flex-1 px-4 py-2 bg-[#10b981] text-white rounded"
            >
              Save
            </button>
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-[#334155] text-[#f8fafc] rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-[#f8fafc]">{tier.tier_name}</h4>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          tier.is_active
            ? 'bg-[#10b981]/10 text-[#10b981]'
            : 'bg-[#94a3b8]/10 text-[#94a3b8]'
        }`}>
          {tier.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div className="space-y-2 mb-4">
        <p className="text-sm text-[#cbd5e1]">
          Left Matches: <span className="text-[#00C7D1]">{tier.left_matches_required}</span>
        </p>
        <p className="text-sm text-[#cbd5e1]">
          Right Matches: <span className="text-[#00C7D1]">{tier.right_matches_required}</span>
        </p>
        <p className="text-sm text-[#cbd5e1]">
          Bonus: <span className="text-[#00C7D1]">${tier.bonus_amount} ({tier.bonus_percentage}%)</span>
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-1 bg-[#334155] text-[#f8fafc] rounded text-sm hover:bg-[#475569]"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex-1 px-3 py-1 bg-[#ef4444]/10 text-[#ef4444] rounded text-sm hover:bg-[#ef4444]/20"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

interface RankRequirementCardProps {
  rank: ConfigService.RankRequirement;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (rank: Partial<ConfigService.RankRequirement>) => void;
  onDelete: () => void;
  onCancel: () => void;
}

const RankRequirementCard: React.FC<RankRequirementCardProps> = ({ rank, isEditing, onEdit, onSave, onDelete, onCancel }) => {
  const [rankName, setRankName] = useState(rank.rank);
  const [minVolume, setMinVolume] = useState(rank.min_volume);
  const [minDirectReferrals, setMinDirectReferrals] = useState(rank.min_direct_referrals);
  const [minTeamSize, setMinTeamSize] = useState(rank.min_team_size);
  const [rewardAmount, setRewardAmount] = useState(rank.reward_amount);
  const [levelsUnlocked, setLevelsUnlocked] = useState(rank.levels_unlocked);
  const [description, setDescription] = useState(rank.description);
  const [isActive, setIsActive] = useState(rank.is_active);

  if (isEditing) {
    return (
      <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4">
        <h4 className="font-semibold text-[#f8fafc] mb-4">Edit Rank</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            value={rankName}
            onChange={(e) => setRankName(e.target.value)}
            placeholder="Rank Name"
            className="px-3 py-2 bg-[#1e293b] border border-[#334155] rounded text-[#f8fafc]"
          />
          <input
            type="number"
            value={minVolume}
            onChange={(e) => setMinVolume(parseInt(e.target.value))}
            placeholder="Min Volume"
            className="px-3 py-2 bg-[#1e293b] border border-[#334155] rounded text-[#f8fafc]"
          />
          <input
            type="number"
            value={minDirectReferrals}
            onChange={(e) => setMinDirectReferrals(parseInt(e.target.value))}
            placeholder="Min Direct Referrals"
            className="px-3 py-2 bg-[#1e293b] border border-[#334155] rounded text-[#f8fafc]"
          />
          <input
            type="number"
            value={minTeamSize}
            onChange={(e) => setMinTeamSize(parseInt(e.target.value))}
            placeholder="Min Team Size"
            className="px-3 py-2 bg-[#1e293b] border border-[#334155] rounded text-[#f8fafc]"
          />
          <input
            type="number"
            value={rewardAmount}
            onChange={(e) => setRewardAmount(parseFloat(e.target.value))}
            placeholder="Reward Amount"
            className="px-3 py-2 bg-[#1e293b] border border-[#334155] rounded text-[#f8fafc]"
            step="0.01"
          />
          <input
            type="number"
            value={levelsUnlocked}
            onChange={(e) => setLevelsUnlocked(parseInt(e.target.value))}
            placeholder="Levels Unlocked"
            className="px-3 py-2 bg-[#1e293b] border border-[#334155] rounded text-[#f8fafc]"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="md:col-span-2 px-3 py-2 bg-[#1e293b] border border-[#334155] rounded text-[#f8fafc]"
            rows={2}
          />
          <label className="flex items-center md:col-span-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="ml-2 text-sm text-[#cbd5e1]">Active</span>
          </label>
          <div className="flex gap-2 md:col-span-2">
            <button
              onClick={() => onSave({
                rank: rankName,
                min_volume: minVolume,
                min_direct_referrals: minDirectReferrals,
                min_team_size: minTeamSize,
                reward_amount: rewardAmount,
                levels_unlocked: levelsUnlocked,
                description,
                is_active: isActive
              })}
              className="flex-1 px-4 py-2 bg-[#10b981] text-white rounded"
            >
              Save
            </button>
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-[#334155] text-[#f8fafc] rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-[#f8fafc] text-lg">{rank.rank}</h4>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          rank.is_active
            ? 'bg-[#10b981]/10 text-[#10b981]'
            : 'bg-[#94a3b8]/10 text-[#94a3b8]'
        }`}>
          {rank.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <p className="text-sm text-[#94a3b8] mb-3">{rank.description}</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div>
          <p className="text-xs text-[#94a3b8]">Min Volume</p>
          <p className="text-sm text-[#f8fafc]">${rank.min_volume.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-[#94a3b8]">Direct Referrals</p>
          <p className="text-sm text-[#f8fafc]">{rank.min_direct_referrals}</p>
        </div>
        <div>
          <p className="text-xs text-[#94a3b8]">Team Size</p>
          <p className="text-sm text-[#f8fafc]">{rank.min_team_size}</p>
        </div>
        <div>
          <p className="text-xs text-[#94a3b8]">Reward</p>
          <p className="text-sm text-[#00C7D1]">${rank.reward_amount.toLocaleString()}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-[#94a3b8]">Levels Unlocked</p>
          <p className="text-sm text-[#f8fafc]">{rank.levels_unlocked}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-1 bg-[#334155] text-[#f8fafc] rounded text-sm hover:bg-[#475569]"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex-1 px-3 py-1 bg-[#ef4444]/10 text-[#ef4444] rounded text-sm hover:bg-[#ef4444]/20"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

interface BinarySettingCardProps {
  setting: ConfigService.BinarySetting;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
}

const BinarySettingCard: React.FC<BinarySettingCardProps> = ({ setting, isEditing, onEdit, onSave, onCancel }) => {
  const [value, setValue] = useState(setting.setting_value);

  if (isEditing) {
    return (
      <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4">
        <h4 className="font-semibold text-[#f8fafc] mb-3">{setting.setting_key.replace(/_/g, ' ').toUpperCase()}</h4>
        <p className="text-sm text-[#94a3b8] mb-3">{setting.description}</p>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-2 bg-[#1e293b] border border-[#334155] rounded text-[#f8fafc] mb-3"
        />
        <div className="flex gap-2">
          <button
            onClick={() => onSave(value)}
            className="flex-1 px-4 py-2 bg-[#10b981] text-white rounded"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-[#334155] text-[#f8fafc] rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4">
      <h4 className="font-semibold text-[#f8fafc] mb-2">{setting.setting_key.replace(/_/g, ' ').toUpperCase()}</h4>
      <p className="text-sm text-[#94a3b8] mb-3">{setting.description}</p>
      <p className="text-lg text-[#00C7D1] mb-3">{setting.setting_value}</p>
      <button
        onClick={onEdit}
        className="w-full px-3 py-1 bg-[#334155] text-[#f8fafc] rounded text-sm hover:bg-[#475569]"
      >
        Edit
      </button>
    </div>
  );
};

interface SystemSettingCardProps {
  setting: ConfigService.SystemSetting;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
}

const SystemSettingCard: React.FC<SystemSettingCardProps> = ({ setting, isEditing, onEdit, onSave, onCancel }) => {
  const [value, setValue] = useState(setting.setting_value);

  if (isEditing) {
    return (
      <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4">
        <h4 className="font-semibold text-[#f8fafc] mb-3">{setting.setting_key.replace(/_/g, ' ').toUpperCase()}</h4>
        <p className="text-sm text-[#94a3b8] mb-1">Type: <span className="text-[#00C7D1]">{setting.setting_type}</span></p>
        <p className="text-sm text-[#94a3b8] mb-3">{setting.description}</p>
        <input
          type={setting.setting_type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-2 bg-[#1e293b] border border-[#334155] rounded text-[#f8fafc] mb-3"
        />
        <div className="flex gap-2">
          <button
            onClick={() => onSave(value)}
            className="flex-1 px-4 py-2 bg-[#10b981] text-white rounded"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-[#334155] text-[#f8fafc] rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4">
      <h4 className="font-semibold text-[#f8fafc] mb-2">{setting.setting_key.replace(/_/g, ' ').toUpperCase()}</h4>
      <p className="text-xs text-[#94a3b8] mb-1">Type: <span className="text-[#00C7D1]">{setting.setting_type}</span></p>
      <p className="text-sm text-[#94a3b8] mb-3">{setting.description}</p>
      <p className="text-lg text-[#00C7D1] mb-3">{setting.setting_value}</p>
      <button
        onClick={onEdit}
        className="w-full px-3 py-1 bg-[#334155] text-[#f8fafc] rounded text-sm hover:bg-[#475569]"
      >
        Edit
      </button>
    </div>
  );
};

export default SystemConfiguration;
