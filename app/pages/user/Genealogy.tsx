import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { getBinaryTree, BinaryNode } from '../../services/admin-binary.service';
import toast from 'react-hot-toast';

interface TreeStats {
  total: number;
  leftLeg: number;
  rightLeg: number;
  maxDepth: number;
}

interface UnilevelMember {
  id: string;
  full_name: string;
  email: string;
  level: number;
  is_active: boolean;
  total_investment: number;
}

export const Genealogy: React.FC = () => {
  const navigate = useNavigate();
  const [viewType, setViewType] = useState<'binary' | 'unilevel'>('binary');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [binaryTree, setBinaryTree] = useState<BinaryNode | null>(null);
  const [treeStats, setTreeStats] = useState<TreeStats>({
    total: 0,
    leftLeg: 0,
    rightLeg: 0,
    maxDepth: 0
  });
  const [unilevelData, setUnilevelData] = useState<Map<number, UnilevelMember[]>>(new Map());

  useEffect(() => {
    loadTreeData();
  }, []);

  const loadTreeData = async () => {
    try {
      setLoading(true);

      // Get current user
      ;
      if (authError) throw authError;
      if (!user) throw new Error('User not authenticated');

      // Get user details
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      setCurrentUserId(userData.id);
      setCurrentUserName(userData.full_name || 'You');

      // Load binary tree
      const tree = await getBinaryTree(user.id);
      setBinaryTree(tree);

      // Calculate binary tree statistics
      if (tree) {
        const stats = calculateBinaryStats(tree);
        setTreeStats(stats);
      }

      // Load unilevel data (30 levels)
      await loadUnilevelTree(user.id);

    } catch (error: any) {
      console.error('Error loading tree data:', error);
      toast.error(error.message || 'Failed to load tree data');
    } finally {
      setLoading(false);
    }
  };

  const calculateBinaryStats = (node: BinaryNode): TreeStats => {
    let total = 0;
    let leftLeg = 0;
    let rightLeg = 0;
    let maxDepth = 0;

    const countNodes = (n: BinaryNode | undefined, depth: number, isLeft: boolean): number => {
      if (!n) return 0;

      let count = 1;
      if (depth > maxDepth) maxDepth = depth;

      if (isLeft) {
        leftLeg++;
      } else if (depth > 0) { // Don't count root as right leg
        rightLeg++;
      }

      if (n.left_child) {
        count += countNodes(n.left_child, depth + 1, isLeft || depth === 0);
      }
      if (n.right_child) {
        count += countNodes(n.right_child, depth + 1, false);
      }

      return count;
    };

    // Count left subtree
    if (node.left_child) {
      countNodes(node.left_child, 1, true);
    }

    // Reset for right subtree
    const tempLeftLeg = leftLeg;
    leftLeg = 0;

    // Count right subtree
    if (node.right_child) {
      countNodes(node.right_child, 1, false);
    }

    // Restore left leg count
    const rightLegCount = leftLeg;
    leftLeg = tempLeftLeg;
    rightLeg = rightLegCount;

    total = leftLeg + rightLeg;

    return { total, leftLeg, rightLeg, maxDepth };
  };

  const loadUnilevelTree = async (userId: string) => {
    try {
      const levelMap = new Map<number, UnilevelMember[]>();

      // Load up to 30 levels
      for (let level = 1; level <= 30; level++) {
        let levelMembers: UnilevelMember[] = [];

        if (level === 1) {
          // Direct referrals
          const { data, error } = await supabase
            .from('users')
            .select('id, full_name, email, is_active, total_investment')
            .eq('sponsor_id', userId);

          if (error) throw error;
          levelMembers = data?.map(m => ({ ...m, level: 1 })) || [];
        } else {
          // Get members from previous level
          const previousLevel = levelMap.get(level - 1);
          if (!previousLevel || previousLevel.length === 0) break;

          // Get all children of previous level members
          const previousIds = previousLevel.map(m => m.id);
          const { data, error } = await supabase
            .from('users')
            .select('id, full_name, email, is_active, total_investment')
            .in('sponsor_id', previousIds);

          if (error) throw error;
          levelMembers = data?.map(m => ({ ...m, level })) || [];
        }

        if (levelMembers.length === 0) break;
        levelMap.set(level, levelMembers);
      }

      setUnilevelData(levelMap);
    } catch (error: any) {
      console.error('Error loading unilevel tree:', error);
    }
  };

  const renderBinaryNode = (node: BinaryNode | undefined, position: 'root' | 'left' | 'right') => {
    if (!node) {
      // Empty position
      return (
        <div style={{
          width: '100px',
          padding: '15px',
          background: '#f5f5f5',
          borderRadius: '8px',
          border: '2px dashed #ddd'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '5px' }}>
            {position === 'left' ? '⬅️' : '➡️'}
          </div>
          <div style={{ fontSize: '12px', color: '#999' }}>Empty</div>
          <div style={{ fontSize: '11px', color: '#999', marginTop: '3px' }}>
            {position === 'left' ? 'Left Position' : 'Right Position'}
          </div>
        </div>
      );
    }

    const bgColor = position === 'root'
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      : node.is_active ? '#4caf50' : '#9e9e9e';

    return (
      <div style={{
        width: position === 'root' ? '120px' : '100px',
        padding: position === 'root' ? '20px' : '15px',
        background: bgColor,
        borderRadius: position === 'root' ? '10px' : '8px',
        color: 'white',
        cursor: 'pointer',
        transition: 'transform 0.2s'
      }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <div style={{ fontSize: position === 'root' ? '32px' : '24px', marginBottom: '5px' }}>
          {node.is_active ? '👤' : '😴'}
        </div>
        <div style={{ fontWeight: '600', fontSize: position === 'root' ? '14px' : '12px' }}>
          {node.user_name || 'Unknown'}
        </div>
        <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '3px' }}>
          Vol: ${node.personal_volume.toFixed(0)}
        </div>
        {position === 'root' && (
          <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '3px' }}>
            L: {node.left_volume.toFixed(0)} | R: {node.right_volume.toFixed(0)}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🌳</div>
        <p>Loading genealogy tree...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '20px', padding: '10px 20px', cursor: 'pointer' }}>
        ← Back to Dashboard
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: '0 0 5px 0' }}>Genealogy Tree</h1>
          <p style={{ margin: '0' }}>Visualize your team structure</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setViewType('binary')}
            style={{
              padding: '10px 20px',
              background: viewType === 'binary' ? '#667eea' : '#fff',
              color: viewType === 'binary' ? 'white' : '#333',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Binary Tree
          </button>
          <button
            onClick={() => setViewType('unilevel')}
            style={{
              padding: '10px 20px',
              background: viewType === 'unilevel' ? '#667eea' : '#fff',
              color: viewType === 'unilevel' ? 'white' : '#333',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Unilevel Tree
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '5px' }}>👥</div>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '28px', color: '#667eea' }}>{treeStats.total}</h3>
          <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>Total Team</p>
        </div>

        <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '5px' }}>⬅️</div>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '28px', color: '#4caf50' }}>{treeStats.leftLeg}</h3>
          <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>Left Leg</p>
        </div>

        <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '5px' }}>➡️</div>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '28px', color: '#2196f3' }}>{treeStats.rightLeg}</h3>
          <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>Right Leg</p>
        </div>

        <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '5px' }}>📊</div>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '28px', color: '#ff9800' }}>{treeStats.maxDepth}</h3>
          <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>Max Depth</p>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #ddd', padding: '40px', minHeight: '500px' }}>
        <div style={{ textAlign: 'center' }}>
          {viewType === 'binary' ? (
            <>
              <h3 style={{ margin: '0 0 30px 0' }}>Binary Tree Structure</h3>

              {binaryTree ? (
                <>
                  {/* Root Node (You) */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
                    {renderBinaryNode(binaryTree, 'root')}
                  </div>

                  {/* Level 1 */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '100px', marginBottom: '40px' }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        position: 'absolute',
                        width: '2px',
                        height: '40px',
                        background: '#ddd',
                        left: '50%',
                        top: '-40px',
                        transform: 'translateX(-50%) rotate(-45deg)',
                        transformOrigin: 'top'
                      }} />
                      {renderBinaryNode(binaryTree.left_child, 'left')}
                    </div>

                    <div style={{ position: 'relative' }}>
                      <div style={{
                        position: 'absolute',
                        width: '2px',
                        height: '40px',
                        background: '#ddd',
                        left: '50%',
                        top: '-40px',
                        transform: 'translateX(-50%) rotate(45deg)',
                        transformOrigin: 'top'
                      }} />
                      {renderBinaryNode(binaryTree.right_child, 'right')}
                    </div>
                  </div>

                  {/* Level 2 - Left subtree */}
                  {(binaryTree.left_child?.left_child || binaryTree.left_child?.right_child) && (
                    <div style={{ marginBottom: '40px' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '50px' }}>
                        <div style={{ display: 'flex', gap: '30px' }}>
                          {binaryTree.left_child?.left_child && renderBinaryNode(binaryTree.left_child.left_child, 'left')}
                          {binaryTree.left_child?.right_child && renderBinaryNode(binaryTree.left_child.right_child, 'right')}
                        </div>
                        <div style={{ display: 'flex', gap: '30px' }}>
                          {binaryTree.right_child?.left_child && renderBinaryNode(binaryTree.right_child.left_child, 'left')}
                          {binaryTree.right_child?.right_child && renderBinaryNode(binaryTree.right_child.right_child, 'right')}
                        </div>
                      </div>
                    </div>
                  )}

                  {treeStats.maxDepth > 2 && (
                    <div style={{ marginTop: '30px', padding: '20px', background: '#e3f2fd', borderRadius: '8px' }}>
                      <p style={{ margin: '0', color: '#1976d2', fontSize: '14px' }}>
                        🌳 Your tree has {treeStats.maxDepth} levels. Showing first 3 levels. Click on members to explore deeper.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ marginTop: '60px', padding: '30px', background: '#f5f5f5', borderRadius: '8px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>🌳</div>
                  <p style={{ margin: '0', fontSize: '16px', color: '#666' }}>Your binary tree is empty</p>
                  <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#999' }}>
                    Start building your team by sharing your referral link
                  </p>
                  <button
                    onClick={() => navigate('/referrals')}
                    style={{
                      marginTop: '20px',
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
              )}
            </>
          ) : (
            <>
              <h3 style={{ margin: '0 0 30px 0' }}>Unilevel Tree Structure (30 Levels)</h3>

              {/* Root Node */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
                <div style={{
                  width: '120px',
                  padding: '20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '10px',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>👤</div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>{currentUserName}</div>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '5px' }}>Level 0</div>
                </div>
              </div>

              {/* Unilevel Levels */}
              {unilevelData.size > 0 ? (
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  {Array.from(unilevelData.entries()).map(([level, members]) => (
                    <div key={level} style={{ marginBottom: '20px' }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        background: '#667eea',
                        color: 'white',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '600',
                        marginBottom: '15px'
                      }}>
                        📍 Level {level}: {members.length} member{members.length !== 1 ? 's' : ''}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' }}>
                        {members.map((member) => (
                          <div
                            key={member.id}
                            style={{
                              width: '150px',
                              padding: '15px',
                              background: member.is_active ? '#4caf5020' : '#9e9e9e20',
                              border: `2px solid ${member.is_active ? '#4caf50' : '#9e9e9e'}`,
                              borderRadius: '8px',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                              {member.is_active ? '✅' : '😴'}
                            </div>
                            <div style={{ fontWeight: '600', fontSize: '13px', color: '#333', marginBottom: '4px' }}>
                              {member.full_name || 'Unknown'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#666' }}>
                              ${(member.total_investment || 0).toFixed(0)} invested
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: '30px', padding: '20px', background: '#e8f5e9', borderRadius: '8px' }}>
                    <p style={{ margin: '0', color: '#2e7d32', fontSize: '14px' }}>
                      🎯 Total team across {unilevelData.size} levels: {Array.from(unilevelData.values()).reduce((sum, members) => sum + members.length, 0)} members
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '60px', padding: '30px', background: '#f5f5f5', borderRadius: '8px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>🌲</div>
                  <p style={{ margin: '0', fontSize: '16px', color: '#666' }}>Your unilevel tree is empty</p>
                  <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#999' }}>
                    Build your 30-level deep organization and earn commissions on all levels
                  </p>
                  <button
                    onClick={() => navigate('/referrals')}
                    style={{
                      marginTop: '20px',
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
              )}
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '20px', background: '#e3f2fd', borderRadius: '8px', border: '1px solid #2196f3' }}>
        <strong>ℹ️ Tree Information:</strong>
        <ul style={{ marginTop: '10px', fontSize: '14px', marginBottom: '0' }}>
          <li><strong>Binary Tree:</strong> Each member can have maximum 2 direct referrals (left & right)</li>
          <li><strong>Unilevel Tree:</strong> Unlimited width, up to 30 levels deep for commission earnings</li>
          <li><strong>Active Members:</strong> Shown in green with ✅ | Inactive: Gray with 😴</li>
          <li><strong>Volume Tracking:</strong> Binary tree tracks left and right leg volumes for matching bonus</li>
          <li><strong>Commission Levels:</strong> Your rank determines how many levels you earn from (up to 30)</li>
        </ul>
      </div>
    </div>
  );
};

export default Genealogy;
