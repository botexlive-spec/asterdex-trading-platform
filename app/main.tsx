import React, { lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { withBasePath } from './utils/base-path';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { PlanSettingsProvider } from './context/PlanSettingsContext';
import { UserRole } from './types/auth.types';
import UserLayoutComponent from './layouts/UserLayout';
import AdminLayoutComponent from './layouts/AdminLayout';

import './styles/index.css';

const IndexPage = lazy(() => import('./pages/Index'));
const PerpLayout = lazy(() => import('./pages/perp/Layout'));
const PerpIndex = lazy(() => import('./pages/perp/Index'));
const PerpSymbol = lazy(() => import('./pages/perp/Symbol'));
const PortfolioLayout = lazy(() => import('./pages/portfolio/Layout'));
const PortfolioIndex = lazy(() => import('./pages/portfolio/Index'));
const PortfolioPositions = lazy(() => import('./pages/portfolio/Positions'));
const PortfolioOrders = lazy(() => import('./pages/portfolio/Orders'));
const PortfolioAssets = lazy(() => import('./pages/portfolio/Assets'));
const PortfolioApiKey = lazy(() => import('./pages/portfolio/ApiKey'));
const PortfolioFee = lazy(() => import('./pages/portfolio/Fee'));
const PortfolioHistory = lazy(() => import('./pages/portfolio/History'));
const PortfolioSetting = lazy(() => import('./pages/portfolio/Setting'));
const MarketsLayout = lazy(() => import('./pages/markets/Layout'));
const MarketsIndex = lazy(() => import('./pages/markets/Index'));
const LeaderboardLayout = lazy(() => import('./pages/leaderboard/Layout'));
const LeaderboardIndex = lazy(() => import('./pages/leaderboard/Index'));
const RewardsLayout = lazy(() => import('./pages/rewards/Layout'));
const RewardsIndex = lazy(() => import('./pages/rewards/Index'));
const RewardsAffiliate = lazy(() => import('./pages/rewards/Affiliate'));
const VaultsLayout = lazy(() => import('./pages/vaults/Layout'));
const VaultsIndex = lazy(() => import('./pages/vaults/Index'));
const SwapLayout = lazy(() => import('./pages/swap/Layout'));
const SwapIndex = lazy(() => import('./pages/swap/Index'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const UserDashboard = lazy(() => import('./pages/user/DashboardNew'));

// User Pages
const Packages = lazy(() => import('./pages/user/Packages')); // Changed from PackagesEnhanced (broken)
const Robot = lazy(() => import('./pages/user/RobotNew'));
const KYC = lazy(() => import('./pages/user/KYCNew'));
const Wallet = lazy(() => import('./pages/user/WalletNew'));
const Deposit = lazy(() => import('./pages/user/Deposit'));
const Withdraw = lazy(() => import('./pages/user/Withdraw'));
const WithdrawNew = lazy(() => import('./pages/user/WithdrawNew'));
const Team = lazy(() => import('./pages/user/TeamNew'));
const TeamReport = lazy(() => import('./pages/user/TeamReport'));
const Referrals = lazy(() => import('./pages/user/ReferralsNew'));
const Transactions = lazy(() => import('./pages/user/TransactionsNew'));
const Profile = lazy(() => import('./pages/user/ProfileNew'));
const Settings = lazy(() => import('./pages/user/SettingsNew'));
const Reports = lazy(() => import('./pages/user/Reports'));
const Ranks = lazy(() => import('./pages/user/RanksNew'));
const Earnings = lazy(() => import('./pages/user/EarningsNew'));
const Genealogy = lazy(() => import('./pages/user/GenealogyNew'));
const Support = lazy(() => import('./pages/user/Support'));
const Logout = lazy(() => import('./pages/user/Logout'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const KYCManagement = lazy(() => import('./pages/admin/KYCManagement'));
const PackageManagement = lazy(() => import('./pages/admin/PackageManagementComplete'));
const FinancialManagement = lazy(() => import('./pages/admin/FinancialManagement'));
const CommissionManagement = lazy(() => import('./pages/admin/CommissionManagement'));
const CommissionManagementPlaceholder = lazy(() => import('./pages/admin/CommissionManagementPlaceholder'));
const RankManagement = lazy(() => import('./pages/admin/RankManagement'));
const BinaryManagement = lazy(() => import('./pages/admin/BinaryManagement'));
const BinaryTreePlaceholder = lazy(() => import('./pages/admin/BinaryTreePlaceholder'));
const ReportsAdmin = lazy(() => import('./pages/admin/ReportsAdmin'));
const SettingsAdmin = lazy(() => import('./pages/admin/SettingsAdmin'));
const CommunicationsAdmin = lazy(() => import('./pages/admin/CommunicationsAdmin'));
const SupportManagement = lazy(() => import('./pages/admin/SupportManagement'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const SystemConfiguration = lazy(() => import('./pages/admin/SystemConfiguration'));
const IncomeSimulator = lazy(() => import('./pages/admin/IncomeSimulator'));
const WithdrawalApproval = lazy(() => import('./pages/admin/WithdrawalApproval'));
const PlanSettings = lazy(() => import('./pages/admin/PlanSettings'));
const ReportsEnhanced = lazy(() => import('./pages/admin/ReportsEnhanced'));

async function loadRuntimeConfig() {
  return new Promise<void>((resolve) => {
    const script = document.createElement('script');
    script.src = withBasePath('/config.js');
    script.onload = () => {
      console.log('Runtime config loaded successfully');
      resolve();
    };
    script.onerror = () => {
      console.log('Runtime config not found, using build-time env vars');
      resolve();
    };
    document.head.appendChild(script);
  });
}

const basePath = import.meta.env.BASE_URL || '/';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <IndexPage /> },
      {
        path: 'perp',
        element: <PerpLayout />,
        children: [
          { index: true, element: <PerpIndex /> },
          { path: ':symbol', element: <PerpSymbol /> },
        ],
      },
      {
        path: 'portfolio',
        element: <PortfolioLayout />,
        children: [
          { index: true, element: <PortfolioIndex /> },
          { path: 'positions', element: <PortfolioPositions /> },
          { path: 'orders', element: <PortfolioOrders /> },
          { path: 'assets', element: <PortfolioAssets /> },
          { path: 'api-key', element: <PortfolioApiKey /> },
          { path: 'fee', element: <PortfolioFee /> },
          { path: 'history', element: <PortfolioHistory /> },
          { path: 'setting', element: <PortfolioSetting /> },
        ],
      },
      {
        path: 'markets',
        element: <MarketsLayout />,
        children: [
          { index: true, element: <MarketsIndex /> },
        ],
      },
      {
        path: 'leaderboard',
        element: <LeaderboardLayout />,
        children: [
          { index: true, element: <LeaderboardIndex /> },
        ],
      },
      {
        path: 'rewards',
        element: <RewardsLayout />,
        children: [
          { index: true, element: <RewardsIndex /> },
          { path: 'affiliate', element: <RewardsAffiliate /> },
        ],
      },
      {
        path: 'vaults',
        element: <VaultsLayout />,
        children: [
          { index: true, element: <VaultsIndex /> },
        ],
      },
      {
        path: 'swap',
        element: <SwapLayout />,
        children: [
          { index: true, element: <SwapIndex /> },
        ],
      },
      {
        path: 'login',
        element: <Navigate to="/auth/login" replace />,
      },
      {
        path: 'auth/login',
        element: <Login />,
      },
      {
        path: 'register',
        element: <Register />,
      },
      {
        path: 'logout',
        element: <Logout />,
      },
      // User Dashboard Routes (with Sidebar Navigation)
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.USER, 'user']}>
            <UserLayoutComponent />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <UserDashboard /> },
        ],
      },
      {
        path: 'packages',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.USER, 'user']}>
            <UserLayoutComponent />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Packages /> },
        ],
      },
      {
        path: 'robot',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.USER, 'user']}>
            <UserLayoutComponent />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Robot /> },
        ],
      },
      {
        path: 'kyc',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.USER, 'user']}>
            <UserLayoutComponent />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <KYC /> },
        ],
      },
      {
        path: 'wallet',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.USER, 'user']}>
            <UserLayoutComponent />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Wallet /> },
          { path: 'deposit', element: <Deposit /> },
          { path: 'withdraw', element: <WithdrawNew /> },
        ],
      },
      {
        path: 'team',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.USER, 'user']}>
            <UserLayoutComponent />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Team /> },
        ],
      },
      {
        path: 'team-report',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.USER, 'user']}>
            <UserLayoutComponent />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <TeamReport /> },
        ],
      },
      {
        path: 'referrals',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.USER, 'user']}>
            <UserLayoutComponent />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Referrals /> },
        ],
      },
      {
        path: 'transactions',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.USER, 'user']}>
            <UserLayoutComponent />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Transactions /> },
        ],
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.USER, 'user']}>
            <UserLayoutComponent />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Profile /> },
        ],
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.USER, 'user']}>
            <UserLayoutComponent />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Settings /> },
        ],
      },
      {
        path: 'reports',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.USER, 'user']}>
            <UserLayoutComponent />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Reports /> },
        ],
      },
      {
        path: 'ranks',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.USER, 'user']}>
            <UserLayoutComponent />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Ranks /> },
        ],
      },
      {
        path: 'earnings',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.USER, 'user']}>
            <UserLayoutComponent />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Earnings /> },
        ],
      },
      {
        path: 'genealogy',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.USER, 'user']}>
            <UserLayoutComponent />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Genealogy /> },
        ],
      },
      {
        path: 'support',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.USER, 'user']}>
            <UserLayoutComponent />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Support /> },
        ],
      },
      // Admin Routes (with Admin Sidebar Navigation)
      {
        path: 'admin',
        element: (
          <ProtectedRoute allowedRoles={[UserRole.ADMIN, 'admin']}>
            <AdminLayoutComponent />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: 'dashboard', element: <AdminDashboard /> },
          { path: 'users', element: <UserManagement /> },
          { path: 'user-management', element: <Navigate to="/admin/users" replace /> },
          { path: 'kyc', element: <KYCManagement /> },
          { path: 'packages', element: <PackageManagement /> },
          { path: 'withdrawals', element: <WithdrawalApproval /> },
          { path: 'financial', element: <FinancialManagement /> },
          { path: 'commissions', element: <CommissionManagement /> },
          { path: 'commission', element: <CommissionManagementPlaceholder /> },
          { path: 'income-simulator', element: <IncomeSimulator /> },
          { path: 'ranks', element: <RankManagement /> },
          { path: 'binary', element: <BinaryManagement /> },
          { path: 'binary-tree', element: <BinaryTreePlaceholder /> },
          { path: 'team-report', element: <TeamReport /> },
          { path: 'reports', element: <ReportsAdmin /> },
          { path: 'communications', element: <CommunicationsAdmin /> },
          { path: 'support', element: <SupportManagement /> },
          { path: 'audit', element: <AuditLogs /> },
          { path: 'settings', element: <SettingsAdmin /> },
          { path: 'configuration', element: <SystemConfiguration /> },
          { path: 'plan-settings', element: <PlanSettings /> },
          { path: 'reports-enhanced', element: <ReportsEnhanced /> },
        ],
      },
    ],
  },
], { basename: basePath });

loadRuntimeConfig().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <HelmetProvider>
        <SettingsProvider>
          <AuthProvider>
            <PlanSettingsProvider>
              <RouterProvider router={router} />
              <Toaster
                position="top-right"
                reverseOrder={false}
                gutter={8}
                containerStyle={{
                  top: 20,
                  right: 20,
                  bottom: 20,
                  left: 20,
                }}
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#1e293b',
                    color: '#f8fafc',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                    maxWidth: '420px',
                  },
                  success: {
                    iconTheme: {
                      primary: '#10b981',
                      secondary: '#f8fafc',
                    },
                    style: {
                      border: '1px solid #10b981',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#f8fafc',
                    },
                    style: {
                      border: '1px solid #ef4444',
                    },
                  },
                  loading: {
                    iconTheme: {
                      primary: '#00C7D1',
                      secondary: '#f8fafc',
                    },
                    style: {
                      border: '1px solid #00C7D1',
                    },
                  },
                }}
              />
            </PlanSettingsProvider>
          </AuthProvider>
        </SettingsProvider>
      </HelmetProvider>
    </React.StrictMode>
  );
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(withBasePath('/sw.js'))
      .then((registration) => {
        console.log('SW registered:', registration);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}

