import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePlanSettings } from '../../context/PlanSettingsContext';

// Menu item interface
interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path?: string;
  subItems?: MenuItem[];
  planFeatureKey?: 'binary_plan' | 'generation_plan' | 'robot_plan' | 'investment_plan' | 'booster_income' | 'principal_withdrawal' | 'monthly_rewards';
}

// Menu structure
const menuItems: MenuItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: '🏠',
    path: '/',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    path: '/dashboard',
  },
  {
    id: 'packages',
    label: 'Packages',
    icon: '📦',
    path: '/packages',
    planFeatureKey: 'investment_plan',
  },
  {
    id: 'robot',
    label: 'Trading Robot',
    icon: '🤖',
    path: '/robot',
    planFeatureKey: 'robot_plan',
  },
  {
    id: 'wallet',
    label: 'Wallet',
    icon: '💰',
    subItems: [
      { id: 'wallet-overview', label: 'Overview', icon: '👁️', path: '/wallet' },
      { id: 'wallet-deposit', label: 'Deposit', icon: '⬇️', path: '/wallet/deposit' },
      { id: 'wallet-withdraw', label: 'Withdraw', icon: '⬆️', path: '/wallet/withdraw', planFeatureKey: 'principal_withdrawal' },
    ],
  },
  {
    id: 'team',
    label: 'Team',
    icon: '👥',
    subItems: [
      { id: 'team-overview', label: 'My Team', icon: '🌳', path: '/team' },
      { id: 'team-report', label: 'Team Report', icon: '📈', path: '/team-report' },
      { id: 'team-referrals', label: 'Referrals', icon: '🔗', path: '/referrals' },
      { id: 'team-genealogy', label: 'Genealogy', icon: '📊', path: '/genealogy', planFeatureKey: 'binary_plan' },
    ],
  },
  {
    id: 'earnings',
    label: 'Earnings',
    icon: '💵',
    subItems: [
      { id: 'earnings-overview', label: 'Overview', icon: '📈', path: '/earnings' },
      { id: 'earnings-reports', label: 'Reports', icon: '📄', path: '/reports' },
      { id: 'earnings-transactions', label: 'Transactions', icon: '💳', path: '/transactions' },
    ],
  },
  {
    id: 'ranks',
    label: 'Ranks & Rewards',
    icon: '🏆',
    path: '/ranks',
    planFeatureKey: 'monthly_rewards',
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: '👤',
    subItems: [
      { id: 'profile-info', label: 'My Profile', icon: '📝', path: '/profile' },
      { id: 'profile-kyc', label: 'KYC Verification', icon: '🆔', path: '/kyc' },
      { id: 'profile-settings', label: 'Settings', icon: '⚙️', path: '/settings' },
    ],
  },
  {
    id: 'support',
    label: 'Support',
    icon: '💬',
    path: '/support',
  },
];

// Admin menu items (shown only for admin users)
const adminMenuItems: MenuItem[] = [
  {
    id: 'admin-dashboard',
    label: 'Admin Dashboard',
    icon: '📊',
    path: '/admin/dashboard',
  },
  {
    id: 'admin-users',
    label: 'User Management',
    icon: '👥',
    path: '/admin/users',
  },
  {
    id: 'admin-kyc',
    label: 'KYC Management',
    icon: '🆔',
    path: '/admin/kyc',
  },
  {
    id: 'admin-packages',
    label: 'Package Management',
    icon: '📦',
    path: '/admin/packages',
  },
  {
    id: 'admin-financial',
    label: 'Financial Management',
    icon: '💰',
    path: '/admin/financial',
  },
  {
    id: 'admin-commissions',
    label: 'Commission Management',
    icon: '💵',
    path: '/admin/commissions',
  },
  {
    id: 'admin-income-simulator',
    label: 'Income Simulator',
    icon: '🧮',
    path: '/admin/income-simulator',
  },
  {
    id: 'admin-ranks',
    label: 'Rank Management',
    icon: '🏆',
    path: '/admin/ranks',
  },
  {
    id: 'admin-binary',
    label: 'Binary Tree',
    icon: '🌳',
    path: '/admin/binary',
  },
  {
    id: 'admin-team-report',
    label: 'Team Report',
    icon: '📊',
    path: '/admin/team-report',
  },
  {
    id: 'admin-reports',
    label: 'Reports',
    icon: '📈',
    path: '/admin/reports',
  },
  {
    id: 'admin-reports-enhanced',
    label: 'Enhanced Reports',
    icon: '📊',
    path: '/admin/reports-enhanced',
  },
  {
    id: 'admin-communications',
    label: 'Communications',
    icon: '📧',
    path: '/admin/communications',
  },
  {
    id: 'admin-support',
    label: 'Support Management',
    icon: '🎫',
    path: '/admin/support',
  },
  {
    id: 'admin-audit',
    label: 'Audit Logs',
    icon: '📋',
    path: '/admin/audit',
  },
  {
    id: 'admin-configuration',
    label: 'System Configuration',
    icon: '🔧',
    path: '/admin/configuration',
  },
  {
    id: 'admin-settings',
    label: 'System Settings',
    icon: '⚙️',
    path: '/admin/settings',
  },
  {
    id: 'admin-plan-settings',
    label: 'Plan Settings',
    icon: '🎛️',
    path: '/admin/plan-settings',
  },
];

interface UserSidebarProps {
  className?: string;
  isAdmin?: boolean;
}

export const UserSidebar: React.FC<UserSidebarProps> = ({ className = '', isAdmin = true }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState<string[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isPlanActive } = usePlanSettings();

  // Auto-expand submenu if a child item is active
  React.useEffect(() => {
    const menuList = isAdmin ? adminMenuItems : menuItems;
    menuList.forEach((item) => {
      if (item.subItems && isSubMenuActive(item.subItems)) {
        setOpenSubMenus((prev) =>
          prev.includes(item.id) ? prev : [...prev, item.id]
        );
      }
    });
  }, [location.pathname, isAdmin]);

  const toggleSubMenu = (menuId: string) => {
    setOpenSubMenus((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId]
    );
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    // Exact match or starts with path (for nested routes)
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isSubMenuActive = (subItems?: MenuItem[]) => {
    if (!subItems) return false;
    return subItems.some((item) => {
      if (!item.path) return false;
      // Check if current path matches or starts with the sub-item path
      return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Check if menu item should be visible based on plan settings
  const isMenuItemVisible = (item: MenuItem): boolean => {
    // If no plan feature key, always show
    if (!item.planFeatureKey) return true;
    // Check if the plan is active
    return isPlanActive(item.planFeatureKey);
  };

  // Filter menu items based on plan settings
  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items
      .map(item => {
        // If item has subitems, filter them too
        if (item.subItems) {
          const filteredSubItems = item.subItems.filter(isMenuItemVisible);
          // If all subitems are filtered out, hide the parent too (unless parent itself has a path)
          if (filteredSubItems.length === 0 && !item.path) {
            return null;
          }
          return { ...item, subItems: filteredSubItems };
        }
        return item;
      })
      .filter((item): item is MenuItem => item !== null && isMenuItemVisible(item));
  };

  const renderMenuItem = (item: MenuItem) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isSubMenuOpen = openSubMenus.includes(item.id);
    const isItemActive = isActive(item.path) || isSubMenuActive(item.subItems);

    return (
      <li key={item.id} className="mb-1">
        {hasSubItems ? (
          // Menu item with sub-menu
          <div>
            <button
              onClick={() => toggleSubMenu(item.id)}
              className={`flex items-center justify-between w-full px-4 py-4 rounded-lg transition-all hover:bg-[#334155] min-h-[48px] ${
                isItemActive ? 'bg-[#334155] text-[#00C7D1]' : 'text-[#cbd5e1]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </div>
              <svg
                className={`w-4 h-4 transition-transform duration-300 ease-out ${
                  isSubMenuOpen ? 'rotate-180' : 'rotate-0'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {/* Sub-menu items with smooth animation */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isSubMenuOpen ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'
              }`}
            >
              <ul className="ml-6 space-y-1 border-l-2 border-[#334155] pl-3">
                {item.subItems?.map((subItem) => (
                  <li key={subItem.id}>
                    <Link
                      to={subItem.path || '#'}
                      onClick={closeMobileMenu}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all hover:bg-[#334155] min-h-[44px] relative ${
                        isActive(subItem.path)
                          ? 'bg-[#334155] text-[#00C7D1]'
                          : 'text-[#cbd5e1]'
                      }`}
                    >
                      {isActive(subItem.path) && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#00C7D1] rounded-r-full -ml-3" />
                      )}
                      <span className="text-base">{subItem.icon}</span>
                      <span className="font-medium text-sm">{subItem.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          // Regular menu item without sub-menu
          <Link
            to={item.path || '#'}
            onClick={closeMobileMenu}
            className={`flex items-center gap-3 px-4 py-4 rounded-lg transition-all hover:bg-[#334155] min-h-[48px] ${
              isItemActive ? 'bg-[#334155] text-[#00C7D1]' : 'text-[#cbd5e1]'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </Link>
        )}
      </li>
    );
  };

  return (
    <>
      {/* Mobile Menu Toggle Button - Improved Design */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className={`fixed top-4 left-4 z-50 lg:hidden p-3 rounded-xl shadow-xl transition-all duration-300 min-w-[48px] min-h-[48px] flex items-center justify-center ${
          isMobileMenuOpen
            ? 'bg-[#00C7D1] rotate-90 scale-110'
            : 'bg-gradient-to-br from-[#334155] to-[#475569] hover:scale-105'
        }`}
        style={{
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden transition-all duration-300"
          onClick={closeMobileMenu}
          style={{
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-[280px] sm:w-64 shadow-2xl z-50 transform transition-all duration-300 ease-out overflow-y-auto ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${className}`}
        style={{
          background: 'rgba(30, 41, 59, 0.98)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand with Close Button */}
          <div className="p-6 border-b border-[#334155]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00C7D1] to-[#00e5f0] flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">F</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#f8fafc]">Finaster</h1>
                  <p className="text-xs text-[#94a3b8]">MLM Platform</p>
                </div>
              </div>
              {/* Close button for mobile */}
              <button
                onClick={closeMobileMenu}
                className="lg:hidden p-2 rounded-lg hover:bg-[#334155] transition-colors"
                aria-label="Close menu"
              >
                <svg className="w-6 h-6 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 p-4 overflow-y-auto">
            {/* User Menu - Only show if NOT admin */}
            {!isAdmin && (
              <ul className="space-y-1">
                {filterMenuItems(menuItems).map((item) => renderMenuItem(item))}
              </ul>
            )}

            {/* Admin Menu - Only show if IS admin */}
            {isAdmin && (
              <>
                <div className="px-4 py-2 mb-2">
                  <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Admin Panel</p>
                </div>
                <ul className="space-y-1">
                  {adminMenuItems.map((item) => renderMenuItem(item))}
                </ul>
              </>
            )}
          </nav>

          {/* Bottom Section - Logout & Home */}
          <div className="p-4 border-t border-[#334155] space-y-2">
            <Link
              to="/"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 px-4 py-4 rounded-lg transition-all hover:bg-[#334155] text-[#cbd5e1] min-h-[48px]"
            >
              <span className="text-xl">🌐</span>
              <span className="font-medium">Visit DEX</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-4 rounded-lg transition-all hover:bg-[#ef4444]/10 text-[#ef4444] w-full text-left min-h-[48px]"
            >
              <span className="text-xl">🚪</span>
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Spacer for desktop to prevent content overlap */}
      <div className="hidden lg:block w-64 flex-shrink-0" />
    </>
  );
};

export default UserSidebar;
