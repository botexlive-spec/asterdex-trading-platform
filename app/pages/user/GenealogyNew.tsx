import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card, Button, Badge } from '../../components/ui/DesignSystem';
import { Modal } from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getBinaryTree, BinaryTreeNode } from '../../services/genealogy.service';
import * as d3 from 'd3';

// Binary tree node interface
interface BinaryNode {
  id: string;
  name: string;
  email: string;
  investment: number;
  packageStatus: 'active' | 'inactive' | 'new';
  walletBalance: number;
  rank: string;
  roiProgress: number;
  totalEarnings: number;
  isNew: boolean;
  leftVolume: number;
  rightVolume: number;
  joinDate: string;
  leftChild?: BinaryNode;
  rightChild?: BinaryNode;
  position: 'left' | 'right' | 'root';
}

// D3 Hierarchy node with children array
interface D3TreeNode {
  id: string;
  name: string;
  email: string;
  investment: number;
  packageStatus: 'active' | 'inactive' | 'new';
  walletBalance: number;
  rank: string;
  roiProgress: number;
  totalEarnings: number;
  isNew: boolean;
  leftVolume: number;
  rightVolume: number;
  joinDate: string;
  position: 'left' | 'right' | 'root';
  children?: D3TreeNode[];
}

// D3 positioned node (after layout calculation)
interface D3PositionedNode extends d3.HierarchyPointNode<D3TreeNode> {
  data: D3TreeNode;
}

const GenealogyNew: React.FC = () => {
  const { user } = useAuth();
  const [binaryTree, setBinaryTree] = useState<BinaryNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<BinaryNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [maxLevel, setMaxLevel] = useState(5);
  const [hoveredNode, setHoveredNode] = useState<BinaryNode | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState<{ node: BinaryNode; position: 'left' | 'right' } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [d3Transform, setD3Transform] = useState<d3.ZoomTransform>(d3.zoomIdentity);





  // Fetch binary tree data
  useEffect(() => {
    const fetchBinaryTree = async () => {
      if (!user?.id) {
        console.log('⚠️ No user ID available for binary tree');
        return;
      }

      console.log('🌳 Fetching binary tree for user:', user.email, 'ID:', user.id);
      setLoading(true);
      try {
        // Add 10-second timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out after 10 seconds')), 10000)
        );

        // New MySQL-based service - no userId needed (uses JWT)
        const treePromise = getBinaryTree(maxLevel);

        const treeData = await Promise.race([treePromise, timeoutPromise]) as BinaryTreeNode;
        console.log('✅ Binary tree data received:', treeData);
        console.log('📊 Children count:', treeData?.children?.length || 0);

        // Transform the data to match the BinaryNode interface
        const transformNode = (node: BinaryTreeNode): BinaryNode | undefined => {
          if (!node) return undefined;

          console.log(`🔄 Transforming node: ${node.email}, children: ${node.children?.length || 0}`);

          // Find left and right children from the children array
          const leftChild = node.children?.find(c => c.position === 'left');
          const rightChild = node.children?.find(c => c.position === 'right');

          console.log(`  Left child found: ${leftChild?.email || 'none'}, Right child found: ${rightChild?.email || 'none'}`);

          return {
            id: node.user_id,
            name: node.full_name || 'Unknown',
            email: node.email || '',
            investment: node.total_investment || 0,
            packageStatus: node.is_active ? 'active' : 'inactive',
            leftVolume: node.left_volume || 0,
            rightVolume: node.right_volume || 0,
            joinDate: node.created_at || new Date().toISOString(),
            walletBalance: node.wallet_balance || 0,
            rank: node.current_rank || 'starter',
            roiProgress: Math.min((node.roi_earnings || 0) / Math.max(node.total_investment || 1, 1), 1),
            totalEarnings: node.total_earnings || 0,
            isNew: new Date().getTime() - new Date(node.created_at).getTime() < 7 * 24 * 60 * 60 * 1000,
            position: node.position,
            leftChild: leftChild ? transformNode(leftChild) : undefined,
            rightChild: rightChild ? transformNode(rightChild) : undefined,
          };
        };

        const transformedTree = treeData ? transformNode(treeData) : null;
        console.log('🎯 Final transformed tree:', {
          root: transformedTree?.email,
          hasLeftChild: !!transformedTree?.leftChild,
          hasRightChild: !!transformedTree?.rightChild,
          leftChildEmail: transformedTree?.leftChild?.email,
          rightChildEmail: transformedTree?.rightChild?.email
        });
        setBinaryTree(transformedTree);
      } catch (error: any) {
        console.error('❌ Error fetching binary tree:', error);
        toast.error(error.message || 'Failed to load binary tree');
        setBinaryTree(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBinaryTree();
  }, [user?.id, maxLevel, refreshTrigger]);

  const nodeWidth = 200;
  const nodeHeight = 200;
  const levelHeight = 180;
  const horizontalSpacing = 60;

  // Calculate statistics
  const stats = {
    leftLegVolume: binaryTree?.leftVolume || 0,
    rightLegVolume: binaryTree?.rightVolume || 0,
    weakerLeg: (binaryTree?.leftVolume || 0) < (binaryTree?.rightVolume || 0) ? 'left' : 'right',
    weakerLegVolume: Math.min(binaryTree?.leftVolume || 0, binaryTree?.rightVolume || 0),
    totalBinaryPoints: Math.min(binaryTree?.leftVolume || 0, binaryTree?.rightVolume || 0),
    matchingBonusToday: 250,
    matchingBonusWeek: 1500,
    matchingBonusMonth: 5800,
    matchingBonusTotal: 28500,
    carryForward: 7000,
    nextMatchingDate: '2024-11-01',
  };

  // Get node color based on status
  const getNodeColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'inactive':
        return '#6b7280';
      case 'new':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  // Get node border color
  const getNodeBorderColor = (status: string, isRoot: boolean) => {
    if (isRoot) return '#00C7D1';
    return getNodeColor(status);
  };


  // Convert BinaryNode (leftChild/rightChild) to D3 format (children array)
  const convertToD3Format = (node: BinaryNode | undefined): D3TreeNode | null => {
    if (!node) return null;

    const children: D3TreeNode[] = [];

    if (node.leftChild) {
      const leftD3 = convertToD3Format(node.leftChild);
      if (leftD3) children.push(leftD3);
    }

    if (node.rightChild) {
      const rightD3 = convertToD3Format(node.rightChild);
      if (rightD3) children.push(rightD3);
    }

    return {
      id: node.id,
      name: node.name,
      email: node.email,
      investment: node.investment,
      packageStatus: node.packageStatus,
      walletBalance: node.walletBalance,
      rank: node.rank,
      roiProgress: node.roiProgress,
      totalEarnings: node.totalEarnings,
      isNew: node.isNew,
      leftVolume: node.leftVolume,
      rightVolume: node.rightVolume,
      joinDate: node.joinDate,
      position: node.position,
      children: children.length > 0 ? children : undefined,
    };
  };

  // D3-based tree layout calculation
  const calculateD3TreeLayout = (node: BinaryNode | undefined): D3PositionedNode | null => {
    if (!node) return null;

    // Convert to D3 format
    const d3Data = convertToD3Format(node);
    if (!d3Data) return null;

    // Create D3 hierarchy
    const root = d3.hierarchy<D3TreeNode>(d3Data);

    // Define tree layout with proper spacing
    const treeWidth = 2000;
    const treeHeight = Math.max(600, (maxLevel + 1) * 280);

    const treeLayout = d3.tree<D3TreeNode>()
      .size([treeWidth, treeHeight])
      .separation((a, b) => {
        // More spacing at higher levels
        const level = a.depth;
        const baseSeparation = level === 0 ? 2 : level === 1 ? 1.5 : 1;
        return (a.parent === b.parent ? baseSeparation : baseSeparation * 1.5);
      });

    // Calculate positions
    const positionedRoot = treeLayout(root);

    console.log(`🌳 D3 tree calculated: ${positionedRoot.descendants().length} nodes`);

    return positionedRoot as D3PositionedNode;
  };

  // Count nodes at each level
  const countNodesAtLevel = (node: BinaryNode | undefined, level: number): number => {
    if (!node || level < 0) return 0;
    if (level === 0) return 1;
    return countNodesAtLevel(node.leftChild, level - 1) + countNodesAtLevel(node.rightChild, level - 1);
  };

  // Calculate tree width
  const calculateTreeWidth = (level: number): number => {
    const nodesAtLevel = Math.pow(2, level);
    return nodesAtLevel * nodeWidth + (nodesAtLevel - 1) * horizontalSpacing;
  };

  // Check if node matches filters/search
  const nodeMatchesFilters = (node: BinaryNode): boolean => {
    // Check status filter
    if (filterStatus !== 'all' && node.packageStatus !== filterStatus) {
      return false;
    }

    // Check search filter
    if (searchTerm &&
        !node.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !node.email.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !node.id.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    return true;
  };

  // Calculate D3 tree layout using useMemo for proper memoization
  const d3Tree = useMemo(() => {
    if (!binaryTree) return null;
    return calculateD3TreeLayout(binaryTree);
  }, [binaryTree, maxLevel]);

  // Setup D3 zoom behavior and auto-fit
  useEffect(() => {
    if (!svgRef.current || !d3Tree) return;

    const svg = d3.select(svgRef.current);
    const container = svgRef.current.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Define zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        setD3Transform(event.transform);
      });

    // Apply zoom behavior
    svg.call(zoom);

    // Calculate tree bounds for auto-fit
    const descendants = d3Tree.descendants();
    if (descendants.length === 0) return;

    const xs = descendants.map(d => d.x);
    const ys = descendants.map(d => d.y);
    const minX = Math.min(...xs) - nodeWidth;
    const maxX = Math.max(...xs) + nodeWidth;
    const minY = Math.min(...ys) - nodeHeight;
    const maxY = Math.max(...ys) + nodeHeight;

    const treeWidth = maxX - minX;
    const treeHeight = maxY - minY;

    // Calculate scale to fit
    const scaleX = containerWidth / treeWidth;
    const scaleY = containerHeight / treeHeight;
    const scale = Math.min(scaleX, scaleY, 1) * 0.9; // 90% of container

    // Calculate translate to center
    const translateX = (containerWidth - treeWidth * scale) / 2 - minX * scale;
    const translateY = (containerHeight - treeHeight * scale) / 2 - minY * scale + 50;

    // Apply initial transform to fit and center tree
    const initialTransform = d3.zoomIdentity
      .translate(translateX, translateY)
      .scale(scale);

    svg.transition()
      .duration(750)
      .call(zoom.transform as any, initialTransform);

    return () => {
      svg.on('.zoom', null);
    };
  }, [svgRef.current, d3Tree, nodeWidth, nodeHeight]);

  // Fit to screen handler
  const handleFitToScreen = () => {
    if (!svgRef.current || !d3Tree) return;

    const svg = d3.select(svgRef.current);
    const container = svgRef.current.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const descendants = d3Tree.descendants();
    const xs = descendants.map(d => d.x);
    const ys = descendants.map(d => d.y);
    const minX = Math.min(...xs) - nodeWidth;
    const maxX = Math.max(...xs) + nodeWidth;
    const minY = Math.min(...ys) - nodeHeight;
    const maxY = Math.max(...ys) + nodeHeight;

    const treeWidth = maxX - minX;
    const treeHeight = maxY - minY;

    const scaleX = containerWidth / treeWidth;
    const scaleY = containerHeight / treeHeight;
    const scale = Math.min(scaleX, scaleY, 1) * 0.9;

    const translateX = (containerWidth - treeWidth * scale) / 2 - minX * scale;
    const translateY = (containerHeight - treeHeight * scale) / 2 - minY * scale + 50;

    const fitTransform = d3.zoomIdentity
      .translate(translateX, translateY)
      .scale(scale);

    svg.transition()
      .duration(750)
      .call(d3.zoom<SVGSVGElement, unknown>().transform as any, fitTransform);
  };

  // Zoom handler functions
  const handleZoomIn = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const newZoom = d3Transform.k * 1.2;
    svg.transition().duration(300).call(
      d3.zoom<SVGSVGElement, unknown>().scaleTo as any,
      newZoom
    );
  };

  const handleZoomOut = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const newZoom = d3Transform.k * 0.8;
    svg.transition().duration(300).call(
      d3.zoom<SVGSVGElement, unknown>().scaleTo as any,
      newZoom
    );
  };

  const handleResetZoom = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const initialTransform = d3.zoomIdentity.translate(200, 100).scale(1);
    svg.transition().duration(500).call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      initialTransform
    );
  };

  // Add keyboard shortcuts for zoom control
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          handleResetZoom();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [d3Transform]);

  // Simple and robust binary tree positioning algorithm
  // Uses index-based positioning where each node gets a position based on its path from root
  const calculateNodePositions = (
    node: BinaryNode | undefined,
    level: number = 0,
    horizontalIndex: number = 0
  ): PositionedNode | undefined => {
    console.log(`🔍 calculateNodePositions called: level=${level}, index=${horizontalIndex}, node=${node?.email || 'undefined'}, hasLeft=${!!node?.leftChild}, hasRight=${!!node?.rightChild}`);

    if (!node || level > maxLevel) {
      console.log(`⏹️ Skipping: ${!node ? 'no node' : `level ${level} > maxLevel ${maxLevel}`}`);
      return undefined;
    }

    // Calculate how many nodes can fit at this level (2^level)
    const maxNodesAtLevel = Math.pow(2, level);

    // Calculate total width needed for this level
    const levelWidth = maxNodesAtLevel * (nodeWidth + horizontalSpacing);

    // Calculate this node's x position
    // Divide the level width into maxNodesAtLevel slots, place node in its slot
    const slotWidth = levelWidth / maxNodesAtLevel;
    const x = (horizontalIndex * slotWidth) + (slotWidth / 2);

    // Calculate y position (simple level-based)
    const y = level * (nodeHeight + levelHeight + 40); // Extra spacing between levels

    console.log(`  📐 Position calculated: x=${x.toFixed(0)}, y=${y}`);
    console.log(`  👶 About to position children: left=${node.leftChild?.email || 'none'}, right=${node.rightChild?.email || 'none'}`);

    // Recursively position children
    // Left child is at index 2*horizontalIndex at next level
    // Right child is at index 2*horizontalIndex + 1 at next level
    const positionedLeftChild = calculateNodePositions(
      node.leftChild,
      level + 1,
      2 * horizontalIndex
    );

    const positionedRightChild = calculateNodePositions(
      node.rightChild,
      level + 1,
      2 * horizontalIndex + 1
    );

    console.log(`  ✅ Children positioned: left=${positionedLeftChild ? 'YES' : 'NO'}, right=${positionedRightChild ? 'YES' : 'NO'}`);
    console.log(`📍 Positioned ${node.email} at level ${level}, index ${horizontalIndex}, x=${x.toFixed(0)}, y=${y}`);

    // Explicitly create the positioned node with all properties
    const positioned: PositionedNode = {
      id: node.id,
      name: node.name,
      email: node.email,
      investment: node.investment,
      packageStatus: node.packageStatus,
      walletBalance: node.walletBalance,
      rank: node.rank,
      roiProgress: node.roiProgress,
      totalEarnings: node.totalEarnings,
      isNew: node.isNew,
      leftVolume: node.leftVolume,
      rightVolume: node.rightVolume,
      joinDate: node.joinDate,
      position: node.position,
      x,
      y,
      leftChild: positionedLeftChild,
      rightChild: positionedRightChild,
    };

    console.log(`  🔍 Final positioned node has children: left=${!!positioned.leftChild}, right=${!!positioned.rightChild}`);

    return positioned;
  };

  // Helper function: Get rank color
  const getRankColor = (rank: string): string => {
    const colors: Record<string, string> = {
      starter: "#94a3b8",
      bronze: "#cd7f32",
      silver: "#c0c0c0",
      gold: "#ffd700",
      platinum: "#e5e4e2",
      diamond: "#b9f2ff",
    };
    return colors[rank?.toLowerCase() || "starter"] || "#94a3b8";
  };

  // Helper function: Get status color (enhanced with isNew logic)
  const getStatusColor = (node: BinaryNode): string => {
    if (node.isNew) return "#f59e0b"; // Orange for new members
    if (node.packageStatus === "inactive") return "#6b7280"; // Grey
    return "#10b981"; // Green for active
  };

  // Render binary tree nodes recursively using pre-calculated positions
  const renderNode = (node: PositionedNode | undefined, level: number = 0): JSX.Element[] => {
    if (!node || level > maxLevel) {
      console.log(`⚠️ RenderNode skipped - node: ${!!node}, level: ${level}, maxLevel: ${maxLevel}`);
      return [];
    }

    console.log(`🎨 Rendering node: ${node.email} at level ${level}, hasLeft: ${!!node.leftChild}, hasRight: ${!!node.rightChild}, x: ${node.x}, y: ${node.y}`);

    const elements: JSX.Element[] = [];
    const isRoot = node.id === binaryTree?.id;
    const nodeColor = getStatusColor(node);
    const borderColor = getNodeBorderColor(node.packageStatus, isRoot);
    const matchesFilters = nodeMatchesFilters(node);
    const isFiltered = !matchesFilters;

    // Draw Bézier curve connections to children
    if (node.leftChild && level < maxLevel) {
      const parentX = node.x;
      const parentY = node.y + nodeHeight;
      const childX = node.leftChild.x;
      const childY = node.leftChild.y;

      // Calculate control points for smooth Bézier curve
      const controlY = (parentY + childY) / 2;
      const controlX1 = parentX - (parentX - childX) * 0.3;
      const controlX2 = childX + (parentX - childX) * 0.3;

      elements.push(
        <g key={`line-left-${node.id}`}>
          <defs>
            <linearGradient id={`line-gradient-left-${node.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.6"/>
              <stop offset="100%" stopColor="#059669" stopOpacity="0.3"/>
            </linearGradient>
          </defs>
          {/* Glow path */}
          <path
            d={`M ${parentX} ${parentY} C ${controlX1} ${controlY}, ${controlX2} ${controlY}, ${childX} ${childY}`}
            stroke={`url(#line-gradient-left-${node.id})`}
            strokeWidth="4"
            fill="none"
            opacity="0.3"
          />
          {/* Main path */}
          <path
            d={`M ${parentX} ${parentY} C ${controlX1} ${controlY}, ${controlX2} ${controlY}, ${childX} ${childY}`}
            stroke="#10b981"
            strokeWidth="2"
            fill="none"
            strokeDasharray={hoveredNode?.id === node.leftChild?.id || hoveredNode?.id === node.id ? "0" : "5,5"}
          >
            {(hoveredNode?.id === node.leftChild?.id || hoveredNode?.id === node.id) && (
              <animate
                attributeName="stroke-opacity"
                values="0.5;1;0.5"
                dur="1s"
                repeatCount="indefinite"
              />
            )}
          </path>
        </g>
      );
    }

    if (node.rightChild && level < maxLevel) {
      const parentX = node.x;
      const parentY = node.y + nodeHeight;
      const childX = node.rightChild.x;
      const childY = node.rightChild.y;

      // Calculate control points for smooth Bézier curve
      const controlY = (parentY + childY) / 2;
      const controlX1 = parentX + (childX - parentX) * 0.3;
      const controlX2 = childX - (childX - parentX) * 0.3;

      elements.push(
        <g key={`line-right-${node.id}`}>
          <defs>
            <linearGradient id={`line-gradient-right-${node.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6"/>
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.3"/>
            </linearGradient>
          </defs>
          {/* Glow path */}
          <path
            d={`M ${parentX} ${parentY} C ${controlX1} ${controlY}, ${controlX2} ${controlY}, ${childX} ${childY}`}
            stroke={`url(#line-gradient-right-${node.id})`}
            strokeWidth="4"
            fill="none"
            opacity="0.3"
          />
          {/* Main path */}
          <path
            d={`M ${parentX} ${parentY} C ${controlX1} ${controlY}, ${controlX2} ${controlY}, ${childX} ${childY}`}
            stroke="#3b82f6"
            strokeWidth="2"
            fill="none"
            strokeDasharray={hoveredNode?.id === node.rightChild?.id || hoveredNode?.id === node.id ? "0" : "5,5"}
          >
            {(hoveredNode?.id === node.rightChild?.id || hoveredNode?.id === node.id) && (
              <animate
                attributeName="stroke-opacity"
                values="0.5;1;0.5"
                dur="1s"
                repeatCount="indefinite"
              />
            )}
          </path>
        </g>
      );
    }

    // Draw node using pre-calculated position
    const hasLeftChild = !!node.leftChild;
    const hasRightChild = !!node.rightChild;

    elements.push(
      <g
        key={`node-${node.id}`}
        transform={`translate(${node.x - nodeWidth / 2}, ${node.y})`}
        style={{
          cursor: "pointer",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: hoveredNode?.id === node.id ? "scale(1.05)" : "scale(1)",
        }}
      >
        {/* Highlight border for matching nodes */}
        {matchesFilters && (searchTerm || filterStatus !== 'all') && (
          <rect
            x="-5"
            y="-5"
            width={nodeWidth + 10}
            height={nodeHeight + 10}
            rx="12"
            fill="none"
            stroke="#00C7D1"
            strokeWidth="3"
            opacity="0.6"
          >
            <animate
              attributeName="opacity"
              values="0.6;1;0.6"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </rect>
        )}

        {/* Node shadow */}
        <rect
          x="3"
          y="3"
          width={nodeWidth}
          height={nodeHeight}
          rx="12"
          fill="rgba(0,0,0,0.3)"
        />

        {/* Enhanced gradients and glow filter */}
        <defs>
          <linearGradient id={`gradient-${node.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isRoot ? "#1e3a8a" : "#1e293b"} />
            <stop offset="50%" stopColor={isRoot ? "#1e293b" : "#0f172a"} />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <filter id={`glow-${node.id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <filter id={`card-glow-${node.id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feFlood flood-color={isRoot ? "#00C7D1" : nodeColor} flood-opacity="0.4"/>
            <feComposite in2="coloredBlur" operator="in"/>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Card glow effect on hover */}
        {hoveredNode?.id === node.id && (
          <rect
            width={nodeWidth}
            height={nodeHeight}
            rx="12"
            fill="none"
            stroke={isRoot ? "#00C7D1" : nodeColor}
            strokeWidth="4"
            filter={`url(#card-glow-${node.id})`}
            opacity="0.6"
          >
            <animate
              attributeName="opacity"
              values="0.4;0.8;0.4"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </rect>
        )}

        <rect
          width={nodeWidth}
          height={nodeHeight}
          rx="12"
          fill={`url(#gradient-${node.id})`}
          stroke={borderColor}
          strokeWidth={isRoot ? "3" : "2"}
          style={{ cursor: 'pointer', opacity: isFiltered ? 0.3 : 1, transition: 'all 0.3s ease' }}
          onClick={() => {
            setSelectedNode(node);
            setShowDetailsModal(true);
          }}
          onMouseEnter={() => setHoveredNode(node)}
          onMouseLeave={() => setHoveredNode(null)}
        />

        {/* Status indicator with enhanced glow */}
        <circle
          cx="15"
          cy="15"
          r="10"
          fill={nodeColor}
          filter={`url(#glow-${node.id})`}
        >
          <animate
            attributeName="r"
            values="9;11;9"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Inner pulse circle */}
        <circle
          cx="15"
          cy="15"
          r="6"
          fill={nodeColor}
          opacity="0.6"
        >
          <animate
            attributeName="opacity"
            values="0.6;0.2;0.6"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>

        {/* User name */}
        <text
          x={nodeWidth / 2}
          y="32"
          textAnchor="middle"
          fill="#f8fafc"
          fontSize="15"
          fontWeight={isRoot ? "bold" : "600"}
          style={{ cursor: 'pointer' }}
          onClick={() => {
            setSelectedNode(node);
            setShowDetailsModal(true);
          }}
        >
          {node.name.length > 16 ? node.name.substring(0, 14) + '...' : node.name}
        </text>

        {/* Email */}
        <text
          x={nodeWidth / 2}
          y="50"
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="10"
        >
          {node.email.length > 20 ? node.email.substring(0, 18) + '...' : node.email}
        </text>

        {/* Investment amount */}
        <text
          x={nodeWidth / 2}
          y="72"
          textAnchor="middle"
          fill="#00C7D1"
          fontSize="16"
          fontWeight="bold"
        >
          ${node.investment.toLocaleString()}
        </text>

        {/* Wallet Balance */}
        <text
          x={nodeWidth / 2}
          y="87"
          textAnchor="middle"
          fill="#10b981"
          fontSize="11"
        >
          💳 ${node.walletBalance.toLocaleString()}
        </text>

        {/* Volume badges */}
        <g transform="translate(10, 102)">
          <rect width="35" height="16" rx="8" fill="#10b981" fillOpacity="0.2" />
          <text x="18" y="12" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold">
            L: {node.leftVolume > 1000 ? (node.leftVolume / 1000).toFixed(0) + 'K' : node.leftVolume}
          </text>
        </g>

        <g transform={`translate(${nodeWidth - 45}, 102)`}>
          <rect width="35" height="16" rx="8" fill="#3b82f6" fillOpacity="0.2" />
          <text x="18" y="12" textAnchor="middle" fill="#3b82f6" fontSize="9" fontWeight="bold">
            R: {node.rightVolume > 1000 ? (node.rightVolume / 1000).toFixed(0) + 'K' : node.rightVolume}
          </text>
        </g>

        {/* Rank Badge */}
        <g transform="translate(65, 125)">
          <rect width="70" height="18" rx="9" fill={getRankColor(node.rank)} fillOpacity="0.2" stroke={getRankColor(node.rank)} strokeWidth="1" />
          <text x="35" y="13" textAnchor="middle" fill={getRankColor(node.rank)} fontSize="10" fontWeight="bold">
            🎖️ {node.rank?.toUpperCase() || 'STARTER'}
          </text>
        </g>

        {/* Join Date */}
        <text
          x={nodeWidth / 2}
          y="157"
          textAnchor="middle"
          fill="#64748b"
          fontSize="9"
        >
          📅 {new Date(node.joinDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
        </text>

        {/* ROI Progress Bar */}
        <g transform="translate(10, 163)">
          <text x={(nodeWidth - 20) / 2} y="-2" textAnchor="middle" fill="#10b981" fontSize="8" fontWeight="bold">
            ROI: {(node.roiProgress * 100).toFixed(0)}%
          </text>
          <rect width={nodeWidth - 20} height="6" rx="3" fill="#1e293b" />
          <rect
            width={(nodeWidth - 20) * node.roiProgress}
            height="6"
            rx="3"
            fill="url(#roi-gradient)"
          >
            <animate
              attributeName="opacity"
              values="1;0.7;1"
              dur="2s"
              repeatCount="indefinite"
            />
          </rect>
        </g>

        {/* Total Earnings Badge */}
        <g transform="translate(60, 180)">
          <rect width="80" height="16" rx="8" fill="#b084e9" fillOpacity="0.2" />
          <text x="40" y="12" textAnchor="middle" fill="#b084e9" fontSize="9" fontWeight="bold">
            💵 ${node.totalEarnings.toLocaleString()}
          </text>
        </g>

        {/* NEW Member Badge */}
        {node.isNew && (
          <g transform="translate(170, 5)">
            <rect width="25" height="14" rx="7" fill="#f59e0b" fillOpacity="0.3" stroke="#f59e0b" strokeWidth="1" />
            <text x="12.5" y="10" textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="bold">
              NEW
            </text>
          </g>
        )}
      </g>
    );

    // Add placement buttons (Left button)
    if (!hasLeftChild && level < maxLevel) {
      elements.push(
        <g
          key={`add-left-${node.id}`}
          transform={`translate(${node.x - nodeWidth / 2 - 35}, ${node.y + nodeHeight + 15})`}
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedParent({ node, position: 'left' });
            setShowAddUserModal(true);
          }}
        >
          <circle
            cx="15"
            cy="15"
            r="15"
            fill="#10b981"
            stroke="#059669"
            strokeWidth="2"
          >
            <animate
              attributeName="opacity"
              values="1;0.7;1"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <text
            x="15"
            y="21"
            textAnchor="middle"
            fill="white"
            fontSize="20"
            fontWeight="bold"
          >
            +
          </text>
          <text
            x="15"
            y="40"
            textAnchor="middle"
            fill="#10b981"
            fontSize="10"
            fontWeight="bold"
          >
            Left
          </text>
        </g>
      );
    }

    // Add placement buttons (Right button)
    if (!hasRightChild && level < maxLevel) {
      elements.push(
        <g
          key={`add-right-${node.id}`}
          transform={`translate(${node.x + nodeWidth / 2 + 5}, ${node.y + nodeHeight + 15})`}
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedParent({ node, position: 'right' });
            setShowAddUserModal(true);
          }}
        >
          <circle
            cx="15"
            cy="15"
            r="15"
            fill="#3b82f6"
            stroke="#2563eb"
            strokeWidth="2"
          >
            <animate
              attributeName="opacity"
              values="1;0.7;1"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <text
            x="15"
            y="21"
            textAnchor="middle"
            fill="white"
            fontSize="20"
            fontWeight="bold"
          >
            +
          </text>
          <text
            x="15"
            y="40"
            textAnchor="middle"
            fill="#3b82f6"
            fontSize="10"
            fontWeight="bold"
          >
            Right
          </text>
        </g>
      );
    }

    // Render children recursively (non-positional recursion)
    if (level < maxLevel) {
      console.log(`  ↳ Recursing to children at level ${level + 1}, leftChild: ${node.leftChild?.email || 'none'}, rightChild: ${node.rightChild?.email || 'none'}`);
      const leftElements = renderNode(node.leftChild, level + 1);
      const rightElements = renderNode(node.rightChild, level + 1);
      console.log(`  ↳ Got ${leftElements.length} left elements, ${rightElements.length} right elements`);
      elements.push(...leftElements);
      elements.push(...rightElements);
    }

    console.log(`  ✅ Returning ${elements.length} total elements for ${node.email}`);
    return elements;
  };

  // Render tree using D3-calculated positions
  const renderD3Tree = (root: D3PositionedNode | null): JSX.Element[] => {
    if (!root) return [];

    const elements: JSX.Element[] = [];
    const descendants = root.descendants();
    const links = root.links();

    console.log(`🎨 Rendering ${descendants.length} nodes with ${links.length} links`);

    // Draw connection lines first (so they appear behind nodes)
    links.forEach((link, idx) => {
      const sourceX = link.source.x;
      const sourceY = link.source.y + nodeHeight / 2;
      const targetX = link.target.x;
      const targetY = link.target.y - nodeHeight / 2;

      // Calculate control points for smooth Bézier curve
      const controlY = (sourceY + targetY) / 2;

      elements.push(
        <path
          key={`link-${idx}`}
          d={`M ${sourceX} ${sourceY} C ${sourceX} ${controlY}, ${targetX} ${controlY}, ${targetX} ${targetY}`}
          stroke={link.target.data.position === 'left' ? '#10b981' : '#3b82f6'}
          strokeWidth="2.5"
          fill="none"
          opacity={hoveredNode?.id === link.target.data.id || hoveredNode?.id === link.source.data.id ? "0.9" : "0.5"}
          style={{
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: hoveredNode?.id === link.target.data.id || hoveredNode?.id === link.source.data.id
              ? 'drop-shadow(0 0 4px rgba(0, 199, 209, 0.5))'
              : 'none',
          }}
          strokeDasharray={hoveredNode?.id === link.target.data.id || hoveredNode?.id === link.source.data.id ? "0" : "0"}
        />
      );
    });

    // Draw nodes
    descendants.forEach((d3Node) => {
      const node = d3Node.data;
      const isRoot = d3Node.depth === 0;

      if (d3Node.depth > maxLevel) return;

      const nodeX = d3Node.x - nodeWidth / 2;
      const nodeY = d3Node.y - nodeHeight / 2;

      const getRankColor = (rank: string) => {
        const colors: Record<string, string> = {
          starter: '#64748b',
          bronze: '#cd7f32',
          silver: '#c0c0c0',
          gold: '#ffd700',
          platinum: '#e5e4e2',
          diamond: '#b9f2ff',
        };
        return colors[rank.toLowerCase()] || colors.starter;
      };

      const getStatusColor = (status: string) => {
        return status === 'active' ? '#10b981' : status === 'new' ? '#f59e0b' : '#6b7280';
      };

      elements.push(
        <g
          key={`node-${node.id}`}
          transform={`translate(${nodeX}, ${nodeY})`}
          style={{
            cursor: 'pointer',
            transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transformOrigin: 'center',
          }}
          onClick={() => setSelectedNode(node as any)}
          onDoubleClick={() => {
            setSelectedNode(node as any);
            setShowDetailsModal(true);
          }}
          onMouseEnter={() => setHoveredNode(node as any)}
          onMouseLeave={() => setHoveredNode(null)}
        >
          {/* Enhanced node card with gradient background */}
          <defs>
            <linearGradient id={`gradient-${node.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isRoot ? '#00C7D1' : getStatusColor(node.packageStatus)} stopOpacity="0.2" />
              <stop offset="100%" stopColor={isRoot ? '#0066FF' : getStatusColor(node.packageStatus)} stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Card background with shadow and border */}
          <rect
            width={nodeWidth}
            height={nodeHeight}
            rx="16"
            fill={`url(#gradient-${node.id})`}
            stroke={isRoot ? '#00C7D1' : getStatusColor(node.packageStatus)}
            strokeWidth={hoveredNode?.id === node.id ? (isRoot ? '4' : '3') : (isRoot ? '3' : '2')}
            filter={hoveredNode?.id === node.id
              ? "drop-shadow(0 8px 16px rgba(0, 199, 209, 0.4))"
              : "drop-shadow(0 4px 6px rgba(0,0,0,0.3))"
            }
            style={{
              transform: hoveredNode?.id === node.id ? 'scale(1.08)' : 'scale(1)',
              transformOrigin: 'center',
              transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />

          {/* Status indicator dot */}
          <circle
            cx={nodeWidth - 20}
            cy={20}
            r="6"
            fill={getStatusColor(node.packageStatus)}
            stroke="#0f172a"
            strokeWidth="2"
          />

          {/* Header Section with Name and Status */}
          <g>
            {/* Member name - larger and bolder */}
            <text
              x={nodeWidth / 2}
              y={32}
              textAnchor="middle"
              fill="white"
              fontSize="15"
              fontWeight="700"
              letterSpacing="0.3"
            >
              {node.name.length > 18 ? node.name.substring(0, 16) + '..' : node.name}
            </text>

            {/* Email - subtle */}
            <text
              x={nodeWidth / 2}
              y={50}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="10"
              opacity="0.8"
            >
              {node.email.length > 24 ? node.email.substring(0, 22) + '..' : node.email}
            </text>
          </g>

          {/* Divider Line */}
          <line
            x1={15}
            y1={60}
            x2={nodeWidth - 15}
            y2={60}
            stroke="#334155"
            strokeWidth="1"
            opacity="0.5"
          />

          {/* Financial Info Section */}
          <g>
            {/* Investment amount - prominent */}
            <text
              x={nodeWidth / 2}
              y={80}
              textAnchor="middle"
              fill="#10b981"
              fontSize="20"
              fontWeight="800"
            >
              ${node.investment.toLocaleString()}
            </text>

            {/* Label */}
            <text
              x={nodeWidth / 2}
              y={93}
              textAnchor="middle"
              fill="#64748b"
              fontSize="9"
              fontWeight="500"
            >
              Investment
            </text>

            {/* Wallet balance - smaller */}
            <g>
              <text
                x={nodeWidth / 2 - 35}
                y={110}
                textAnchor="start"
                fill="#fbbf24"
                fontSize="11"
                fontWeight="600"
              >
                💰 ${node.walletBalance.toFixed(0)}
              </text>

              {/* Rank badge - compact */}
              <rect
                x={nodeWidth / 2 + 15}
                y={99}
                width="60"
                height="14"
                rx="7"
                fill={getRankColor(node.rank)}
                opacity="0.85"
              />
              <text
                x={nodeWidth / 2 + 45}
                y={109}
                textAnchor="middle"
                fill="white"
                fontSize="9"
                fontWeight="700"
              >
                {node.rank.toUpperCase().substring(0, 6)}
              </text>
            </g>
          </g>

          {/* ROI Progress Section */}
          <g>
            {/* Progress bar background */}
            <rect
              x={20}
              y={125}
              width={nodeWidth - 40}
              height="6"
              rx="3"
              fill="#1e293b"
            />
            {/* Progress bar fill */}
            <rect
              x={20}
              y={125}
              width={(nodeWidth - 40) * Math.min(node.roiProgress, 1)}
              height="6"
              rx="3"
              fill="url(#roi-gradient)"
            />

            {/* ROI percentage and earnings */}
            <text
              x={25}
              y={143}
              textAnchor="start"
              fill="#cbd5e1"
              fontSize="10"
              fontWeight="500"
            >
              ROI: {(node.roiProgress * 100).toFixed(0)}%
            </text>

            <text
              x={nodeWidth - 25}
              y={143}
              textAnchor="end"
              fill="#22c55e"
              fontSize="10"
              fontWeight="600"
            >
              ${node.totalEarnings.toFixed(0)}
            </text>
          </g>

          {/* Bottom Info */}
          <g>
            {/* Join date - very subtle */}
            <text
              x={nodeWidth / 2}
              y={160}
              textAnchor="middle"
              fill="#64748b"
              fontSize="9"
              opacity="0.7"
            >
              {new Date(node.joinDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
            </text>

            {/* Volume info - small icons */}
            <g opacity="0.6">
              <text
                x={25}
                y={178}
                textAnchor="start"
                fill="#10b981"
                fontSize="9"
                fontWeight="500"
              >
                ← ${node.leftVolume.toFixed(0)}
              </text>

              <text
                x={nodeWidth - 25}
                y={178}
                textAnchor="end"
                fill="#3b82f6"
                fontSize="9"
                fontWeight="500"
              >
                ${node.rightVolume.toFixed(0)} →
              </text>
            </g>
          </g>

          {/* New badge if applicable */}
          {node.isNew && (
            <>
              <rect
                x={10}
                y={10}
                width="50"
                height="18"
                rx="9"
                fill="#f59e0b"
              />
              <text
                x={35}
                y={23}
                textAnchor="middle"
                fill="white"
                fontSize="10"
                fontWeight="700"
              >
                NEW
              </text>
            </>
          )}

          {/* Add Member Buttons - Show only if position is available */}
          {d3Node.depth < maxLevel && (
            <>
              {/* Check if left child exists in the D3 hierarchy */}
              {!d3Node.children?.some(child => child.data.position === 'left') && (
                <g
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedParent({ node: node as any, position: 'left' });
                    setShowAddUserModal(true);
                  }}
                  style={{ cursor: 'pointer' }}
                  className="add-button-left"
                >
                  <circle
                    cx={30}
                    cy={nodeHeight - 15}
                    r="18"
                    fill="#10b981"
                    stroke="#0f172a"
                    strokeWidth="2"
                    opacity="0.9"
                    style={{
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.setAttribute('opacity', '1');
                      e.currentTarget.setAttribute('r', '20');
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.setAttribute('opacity', '0.9');
                      e.currentTarget.setAttribute('r', '18');
                    }}
                  />
                  <text
                    x={30}
                    y={nodeHeight - 10}
                    textAnchor="middle"
                    fill="white"
                    fontSize="24"
                    fontWeight="700"
                    pointerEvents="none"
                  >
                    +
                  </text>
                  <text
                    x={30}
                    y={nodeHeight + 10}
                    textAnchor="middle"
                    fill="#10b981"
                    fontSize="9"
                    fontWeight="600"
                    pointerEvents="none"
                  >
                    LEFT
                  </text>
                </g>
              )}

              {/* Check if right child exists */}
              {!d3Node.children?.some(child => child.data.position === 'right') && (
                <g
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedParent({ node: node as any, position: 'right' });
                    setShowAddUserModal(true);
                  }}
                  style={{ cursor: 'pointer' }}
                  className="add-button-right"
                >
                  <circle
                    cx={nodeWidth - 30}
                    cy={nodeHeight - 15}
                    r="18"
                    fill="#3b82f6"
                    stroke="#0f172a"
                    strokeWidth="2"
                    opacity="0.9"
                    style={{
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.setAttribute('opacity', '1');
                      e.currentTarget.setAttribute('r', '20');
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.setAttribute('opacity', '0.9');
                      e.currentTarget.setAttribute('r', '18');
                    }}
                  />
                  <text
                    x={nodeWidth - 30}
                    y={nodeHeight - 10}
                    textAnchor="middle"
                    fill="white"
                    fontSize="24"
                    fontWeight="700"
                    pointerEvents="none"
                  >
                    +
                  </text>
                  <text
                    x={nodeWidth - 30}
                    y={nodeHeight + 10}
                    textAnchor="middle"
                    fill="#3b82f6"
                    fontSize="9"
                    fontWeight="600"
                    pointerEvents="none"
                  >
                    RIGHT
                  </text>
                </g>
              )}
            </>
          )}
        </g>
      );
    });

    return elements;
  };


  // Handle zoom


  // Handle mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    // e.preventDefault(); // Removed to avoid passive event warnings
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel(prev => Math.min(Math.max(prev + delta, 0.3), 2.5));
  };

  // Handle pan
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start dragging if not clicking on a node/button
    const target = e.target as SVGElement;
    if (target.tagName === 'svg' || target.tagName === 'line') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };





  // Calculate tree bounds from D3 layout
  const bounds = d3Tree
    ? {
        minX: Math.min(...d3Tree.descendants().map(d => d.x)) - nodeWidth / 2,
        maxX: Math.max(...d3Tree.descendants().map(d => d.x)) + nodeWidth / 2,
        minY: Math.min(...d3Tree.descendants().map(d => d.y)) - nodeHeight / 2,
        maxY: Math.max(...d3Tree.descendants().map(d => d.y)) + nodeHeight / 2,
      }
    : { minX: 0, maxX: 1200, minY: 0, maxY: 600 };

  const svgWidth = Math.max(1400, bounds.maxX - bounds.minX + 400);
  const svgHeight = Math.max(700, bounds.maxY - bounds.minY + 300);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#00C7D1] mx-auto mb-4"></div>
              <p className="text-[#cbd5e1] text-lg font-medium">Loading genealogy tree...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state - no tree data
  if (!binaryTree) {
    return (
      <div className="min-h-screen bg-[#0f172a] p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#f8fafc] mb-2">Binary Genealogy</h1>
            <p className="text-[#94a3b8]">Visual representation of your binary network structure</p>
          </div>
          <Card>
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">🌳</div>
              <h3 className="text-xl font-bold text-[#f8fafc] mb-2">No Binary Tree Data</h3>
              <p className="text-[#94a3b8]">You don't have any binary tree structure yet. Start building your network!</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#f8fafc] mb-2">Binary Genealogy</h1>
            <p className="text-[#94a3b8]">Visual representation of your binary network structure</p>
          </div>
        </div>

        {/* Quick Guide Banner */}
        <div className="bg-gradient-to-r from-[#00C7D1]/10 via-[#00e5f0]/5 to-[#00C7D1]/10 border border-[#00C7D1]/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div className="flex-1">
              <h3 className="text-[#00C7D1] font-bold text-base mb-2">How to Add New Members</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-[#cbd5e1]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#10b981] flex items-center justify-center text-white font-bold text-xs">+</div>
                  <span><strong className="text-[#10b981]">Green +</strong> = Add to Left position</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#3b82f6] flex items-center justify-center text-white font-bold text-xs">+</div>
                  <span><strong className="text-[#3b82f6]">Blue +</strong> = Add to Right position</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🖱️</span>
                  <span>Click node for details</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Leg Statistics */}
          <Card className="bg-gradient-to-br from-[#10b981]/10 to-[#10b981]/5 border-[#10b981]/20">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-[#f8fafc]">Left Leg</h3>
                {stats.weakerLeg === 'left' && (
                  <Badge variant="warning" size="sm">Weaker Leg</Badge>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[#94a3b8]">Total Volume</span>
                  <span className="text-2xl font-bold text-[#10b981]">
                    ${stats.leftLegVolume.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-[#334155] rounded-full h-3">
                  <div
                    className="bg-[#10b981] h-3 rounded-full transition-all"
                    style={{
                      width: `${(stats.leftLegVolume / (stats.leftLegVolume + stats.rightLegVolume)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Right Leg Statistics */}
          <Card className="bg-gradient-to-br from-[#3b82f6]/10 to-[#3b82f6]/5 border-[#3b82f6]/20">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-[#f8fafc]">Right Leg</h3>
                {stats.weakerLeg === 'right' && (
                  <Badge variant="warning" size="sm">Weaker Leg</Badge>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[#94a3b8]">Total Volume</span>
                  <span className="text-2xl font-bold text-[#3b82f6]">
                    ${stats.rightLegVolume.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-[#334155] rounded-full h-3">
                  <div
                    className="bg-[#3b82f6] h-3 rounded-full transition-all"
                    style={{
                      width: `${(stats.rightLegVolume / (stats.leftLegVolume + stats.rightLegVolume)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Binary Matching Statistics */}
        <Card>
          <div className="p-6">
            <h3 className="text-xl font-bold text-[#f8fafc] mb-6">Binary Matching Bonus</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center p-4 bg-[#1e293b] rounded-lg">
                <p className="text-sm text-[#94a3b8] mb-2">Binary Points</p>
                <p className="text-2xl font-bold text-[#00C7D1]">{stats.totalBinaryPoints.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-[#1e293b] rounded-lg">
                <p className="text-sm text-[#94a3b8] mb-2">Today</p>
                <p className="text-2xl font-bold text-[#10b981]">${stats.matchingBonusToday}</p>
              </div>
              <div className="text-center p-4 bg-[#1e293b] rounded-lg">
                <p className="text-sm text-[#94a3b8] mb-2">This Week</p>
                <p className="text-2xl font-bold text-[#10b981]">${stats.matchingBonusWeek.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-[#1e293b] rounded-lg">
                <p className="text-sm text-[#94a3b8] mb-2">This Month</p>
                <p className="text-2xl font-bold text-[#10b981]">${stats.matchingBonusMonth.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-[#1e293b] rounded-lg">
                <p className="text-sm text-[#94a3b8] mb-2">Total Earned</p>
                <p className="text-2xl font-bold text-[#f59e0b]">${stats.matchingBonusTotal.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-[#1e293b] rounded-lg">
                <p className="text-sm text-[#94a3b8] mb-2">Carry Forward</p>
                <p className="text-2xl font-bold text-[#8b5cf6]">${stats.carryForward.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-[#3b82f6]/10 border border-[#3b82f6]/30 rounded-lg">
              <p className="text-sm text-[#60a5fa]">
                <span className="font-semibold">Next Matching Bonus:</span> {stats.nextMatchingDate}
              </p>
            </div>
          </div>
        </Card>

        {/* Controls and Tree */}
        <Card>
          <div className="p-6">
            {/* Controls */}
            <div className="space-y-4 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Search by name, email, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 pr-10 bg-[#1e293b] border border-[#334155] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#00C7D1]"
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

                {/* Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#00C7D1]"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="new">New This Week</option>
                </select>

                {/* Level selector */}
                <select
                  value={maxLevel}
                  onChange={(e) => setMaxLevel(parseInt(e.target.value))}
                  className="px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#00C7D1]"
                >
                  <option value="3">Show 3 Levels</option>
                  <option value="5">Show 5 Levels</option>
                  <option value="7">Show 7 Levels</option>
                  <option value="10">Show 10 Levels</option>
                </select>

                {/* Enhanced Zoom controls */}
                <div className="flex gap-2 bg-[#1e293b] p-1 rounded-lg border border-[#334155]">
                  <button
                    onClick={handleZoomOut}
                    className="px-3 py-2 bg-gradient-to-br from-[#334155] to-[#1e293b] hover:from-[#475569] hover:to-[#334155] text-[#f8fafc] rounded-md transition-all duration-200 font-bold text-lg border border-[#475569] hover:border-[#00C7D1] hover:shadow-lg hover:shadow-[#00C7D1]/20"
                    title="Zoom Out (or Ctrl + -)"
                  >
                    −
                  </button>
                  <button
                    onClick={handleFitToScreen}
                    className="px-3 py-2 bg-gradient-to-br from-[#334155] to-[#1e293b] hover:from-[#475569] hover:to-[#334155] text-[#10b981] rounded-md transition-all duration-200 font-bold text-base border border-[#475569] hover:border-[#00C7D1] hover:shadow-lg hover:shadow-[#00C7D1]/20"
                    title="Fit to Screen"
                  >
                    ⊡
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="px-3 py-2 bg-gradient-to-br from-[#334155] to-[#1e293b] hover:from-[#475569] hover:to-[#334155] text-[#00C7D1] rounded-md transition-all duration-200 font-bold text-base border border-[#475569] hover:border-[#00C7D1] hover:shadow-lg hover:shadow-[#00C7D1]/20"
                    title="Reset View (or Ctrl + 0)"
                  >
                    ⟲
                  </button>
                  <button
                    onClick={handleZoomIn}
                    className="px-3 py-2 bg-gradient-to-br from-[#334155] to-[#1e293b] hover:from-[#475569] hover:to-[#334155] text-[#f8fafc] rounded-md transition-all duration-200 font-bold text-lg border border-[#475569] hover:border-[#00C7D1] hover:shadow-lg hover:shadow-[#00C7D1]/20"
                    title="Zoom In (or Ctrl + +)"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Active Filters Indicator */}
              {(searchTerm || filterStatus !== 'all') && (
                <div className="flex items-center gap-3 p-3 bg-[#00C7D1]/10 border border-[#00C7D1]/30 rounded-lg">
                  <span className="text-sm text-[#00C7D1] font-semibold">
                    🔍 Filtering active - Matching nodes are highlighted
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterStatus('all');
                      toast.success('Filters cleared');
                    }}
                    className="ml-auto"
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-6 p-4 bg-[#1e293b] rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#10b981]" />
                <span className="text-sm text-[#94a3b8]">Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#6b7280]" />
                <span className="text-sm text-[#94a3b8]">Inactive</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#f59e0b]" />
                <span className="text-sm text-[#94a3b8]">New This Week</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 border-2 border-[#00C7D1] rounded" />
                <span className="text-sm text-[#94a3b8]">You (Root)</span>
              </div>
              {(searchTerm || filterStatus !== 'all') && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-4 border-2 border-[#00C7D1] rounded animate-pulse" />
                  <span className="text-sm text-[#00C7D1] font-semibold">Matching Filter</span>
                </div>
              )}
            </div>

            {/* Tree Container */}
            <div
              ref={containerRef}
              className="relative overflow-auto bg-[#0f172a] rounded-lg border border-[#334155]"
              style={{ height: '600px', cursor: 'grab' }}
              onMouseMove={(e) => {
                if (hoveredNode) {
                  setTooltipPosition({ x: e.clientX, y: e.clientY });
                }
              }}
            >
              <svg
                ref={svgRef}
                width={svgWidth}
                height={svgHeight}
              >
                <defs>
                  {/* ROI Progress Bar Gradient */}
                  <linearGradient id="roi-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#00C7D1" />
                  </linearGradient>
                </defs>
                <g transform={`translate(${d3Transform.x}, ${d3Transform.y}) scale(${d3Transform.k})`}>
                  {d3Tree && renderD3Tree(d3Tree)}
                </g>
              </svg>

              {/* Zoom Level Indicator */}
              <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <div className="bg-[#1e293b]/90 backdrop-blur border border-[#334155] rounded-lg px-4 py-2 flex items-center gap-3">
                  <span className="text-[#94a3b8] text-sm">Zoom:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-[#334155] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#00C7D1] to-[#00e5f0] rounded-full transition-all duration-300"
                        style={{ width: `${((d3Transform.k - 0.3) / (2.5 - 0.3)) * 100}%` }}
                      />
                    </div>
                    <span className="text-[#00C7D1] font-bold text-sm min-w-[3rem]">
                      {(d3Transform.k * 100).toFixed(0)}%
                    </span>
                  </div>
                  <span className="text-[#64748b] text-xs">
                    🖱️ Scroll to zoom
                  </span>
                </div>
              </div>

              {/* Hover Tooltip - Follows cursor */}
              {hoveredNode && (
                <div
                  className="fixed p-4 bg-[#1e293b]/98 backdrop-blur-md border-2 border-[#00C7D1] rounded-xl shadow-2xl z-50 max-w-xs"
                  style={{
                    left: `${tooltipPosition.x + 20}px`,
                    top: `${tooltipPosition.y - 20}px`,
                    pointerEvents: 'none',
                    transform: 'translateZ(0)',
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                    animation: 'tooltipFadeIn 0.2s ease-out',
                  }}
                >
                  <h4 className="text-[#f8fafc] font-bold mb-3 text-lg flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#00C7D1] animate-pulse"></span>
                    {hoveredNode.name}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-[#94a3b8]"><span className="text-[#64748b]">ID:</span> {hoveredNode.id.substring(0, 8)}...</p>
                    <p className="text-[#94a3b8]"><span className="text-[#64748b]">Email:</span> {hoveredNode.email}</p>
                    <p className="text-[#94a3b8]"><span className="text-[#64748b]">Joined:</span> {new Date(hoveredNode.joinDate).toLocaleDateString()}</p>
                    <div className="border-t border-[#334155] pt-2 mt-2">
                      <p className="text-[#00C7D1] font-semibold">💰 Investment: ${hoveredNode.investment.toLocaleString()}</p>
                      <p className="text-[#10b981] flex items-center gap-1">
                        <span className="text-lg">◀</span> Left: ${hoveredNode.leftVolume.toLocaleString()}
                      </p>
                      <p className="text-[#3b82f6] flex items-center gap-1">
                        <span className="text-lg">▶</span> Right: ${hoveredNode.rightVolume.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 text-center text-sm text-[#94a3b8]">
              <p>💡 Tip: Click and drag to pan, use zoom buttons to zoom in/out, click nodes for details</p>
            </div>
          </div>
        </Card>

        {/* Node Details Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title="Member Details"
        >
          {selectedNode && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00C7D1] to-[#00e5f0] flex items-center justify-center text-white text-2xl font-bold">
                  {selectedNode.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#f8fafc]">{selectedNode.name}</h3>
                  <p className="text-[#94a3b8]">{selectedNode.email}</p>
                  <Badge variant={selectedNode.packageStatus === 'active' ? 'success' : 'error'}>
                    {selectedNode.packageStatus.toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#1e293b] rounded-lg">
                  <p className="text-sm text-[#94a3b8] mb-1">User ID</p>
                  <p className="text-[#f8fafc] font-semibold">{selectedNode.id}</p>
                </div>
                <div className="p-4 bg-[#1e293b] rounded-lg">
                  <p className="text-sm text-[#94a3b8] mb-1">Join Date</p>
                  <p className="text-[#f8fafc] font-semibold">{selectedNode.joinDate}</p>
                </div>
                <div className="p-4 bg-[#1e293b] rounded-lg">
                  <p className="text-sm text-[#94a3b8] mb-1">Position</p>
                  <p className="text-[#f8fafc] font-semibold">{selectedNode.position.toUpperCase()}</p>
                </div>
                <div className="p-4 bg-[#1e293b] rounded-lg">
                  <p className="text-sm text-[#94a3b8] mb-1">Investment</p>
                  <p className="text-[#00C7D1] font-bold text-xl">${selectedNode.investment.toLocaleString()}</p>
                </div>
              </div>

              {/* Binary Volumes */}
              <div className="space-y-3">
                <h4 className="text-[#f8fafc] font-semibold">Binary Volumes</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg">
                    <p className="text-sm text-[#94a3b8] mb-1">Left Leg</p>
                    <p className="text-[#10b981] font-bold text-xl">${selectedNode.leftVolume.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-[#3b82f6]/10 border border-[#3b82f6]/30 rounded-lg">
                    <p className="text-sm text-[#94a3b8] mb-1">Right Leg</p>
                    <p className="text-[#3b82f6] font-bold text-xl">${selectedNode.rightVolume.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    toast.success('Viewing full details for ' + selectedNode.name);
                    setShowDetailsModal(false);
                  }}
                  className="flex-1"
                >
                  View Full Profile
                </Button>
                <Button
                  onClick={() => setShowDetailsModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Add User Modal */}
        <Modal
          isOpen={showAddUserModal}
          onClose={() => {
            setShowAddUserModal(false);
            setSelectedParent(null);
          }}
          title={`Add New Member - ${selectedParent?.position === 'left' ? 'Left' : 'Right'} Position`}
        >
          {selectedParent && (
            <div className="space-y-6">
              {/* Placement Info */}
              <div className="p-4 bg-gradient-to-br from-[#00C7D1]/10 to-[#00e5f0]/5 border border-[#00C7D1]/30 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00C7D1] to-[#00e5f0] flex items-center justify-center text-white text-xl font-bold">
                    {selectedParent.node.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-[#f8fafc] font-semibold">{selectedParent.node.name}</p>
                    <p className="text-[#94a3b8] text-sm">{selectedParent.node.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-[#1e293b] rounded-lg">
                  <div className={`px-3 py-1 rounded-full ${
                    selectedParent.position === 'left' ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#3b82f6]/20 text-[#3b82f6]'
                  }`}>
                    <span className="font-bold text-sm">
                      {selectedParent.position.toUpperCase()} POSITION
                    </span>
                  </div>
                  <span className="text-[#94a3b8] text-sm ml-auto">
                    Parent: {selectedParent.node.name}
                  </span>
                </div>
              </div>

              {/* User Form */}
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const userData = {
                  fullName: formData.get('fullName') as string,
                  email: formData.get('email') as string,
                  phone: formData.get('phone') as string || undefined,
                  password: formData.get('password') as string,
                  initialInvestment: parseFloat(formData.get('investment') as string || '0'),
                  parentId: selectedParent.node.id,
                  position: selectedParent.position,
                };

                console.log('Creating new user:', userData);

                try {
                  // Import createMember dynamically to avoid top-level import
                  const { createMember } = await import('../../services/genealogy.service');

                  const loadingToast = toast.loading(`Creating member ${userData.fullName}...`);

                  const response = await createMember(userData);

                  toast.dismiss(loadingToast);
                  toast.success(response.message);

                  setShowAddUserModal(false);
                  setSelectedParent(null);

                  // Refresh the tree to show the new member
                  console.log('🔄 Refreshing tree to show new member...');
                  setRefreshTrigger(prev => prev + 1);
                } catch (error: any) {
                  console.error('❌ Error creating member:', error);
                  toast.error(error.message || 'Failed to create member');
                }
              }}>
                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-[#f8fafc] mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      required
                      className="w-full px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#00C7D1]"
                      placeholder="John Doe"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-[#f8fafc] mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="w-full px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#00C7D1]"
                      placeholder="john@example.com"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-[#f8fafc] mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      className="w-full px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#00C7D1]"
                      placeholder="+1 234 567 8900"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-[#f8fafc] mb-2">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      minLength={6}
                      className="w-full px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#00C7D1]"
                      placeholder="Min. 6 characters"
                    />
                  </div>

                  {/* Initial Investment */}
                  <div>
                    <label className="block text-sm font-medium text-[#f8fafc] mb-2">
                      Initial Investment (USD)
                    </label>
                    <input
                      type="number"
                      name="investment"
                      min="0"
                      step="0.01"
                      defaultValue="0"
                      className="w-full px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#00C7D1]"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Info Box */}
                  <div className="p-4 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg">
                    <p className="text-sm text-[#fbbf24]">
                      <strong>Note:</strong> This user will be placed directly under{' '}
                      <strong>{selectedParent.node.name}</strong> in the{' '}
                      <strong className={selectedParent.position === 'left' ? 'text-[#10b981]' : 'text-[#3b82f6]'}>
                        {selectedParent.position.toUpperCase()}
                      </strong> position.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button type="submit" className="flex-1">
                      Create Member
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowAddUserModal(false);
                        setSelectedParent(null);
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default GenealogyNew;
