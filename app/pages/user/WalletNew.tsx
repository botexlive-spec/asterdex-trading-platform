import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast, { Toaster } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { Button, Card, Badge, Input, Select, Alert } from '../../components/ui/DesignSystem';
import { Tabs, TabPanel } from '../../components/ui/Tabs';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import {
  getWalletBalance,
  generateDepositAddress as apiGenerateDepositAddress,
  submitDeposit,
  submitWithdrawal,
  transferFunds,
  getTransactionHistory,
  getPendingTransactions,
  getWithdrawalLimits,
  type WalletBalance,
  type Transaction as WalletTransaction,
} from '../../services/mlm-client';

// Validation Schemas
const cryptoDepositSchema = z.object({
  crypto: z.string().min(1, 'Please select a cryptocurrency'),
  network: z.string().min(1, 'Please select a network'),
  transactionId: z.string().optional(),
});

const bankDepositSchema = z.object({
  amount: z.string().min(1, 'Amount is required').refine((val) => parseFloat(val) >= 10, 'Minimum deposit is $10'),
  referenceNumber: z.string().min(1, 'Reference number is required'),
  paymentProof: z.any().optional(),
});

const upiDepositSchema = z.object({
  amount: z.string().min(1, 'Amount is required').refine((val) => parseFloat(val) >= 5, 'Minimum deposit is $5'),
  utrNumber: z.string().min(12, 'Invalid UTR number').max(12),
  screenshot: z.any().optional(),
});

const withdrawalSchema = z.object({
  amount: z.string().min(1, 'Amount is required'),
  method: z.enum(['bank', 'crypto']),
  accountId: z.string().min(1, 'Please select an account'),
  password: z.string().min(1, 'Password is required'),
  verificationCode: z.string().min(6, 'Invalid verification code').max(6),
});

const transferSchema = z.object({
  recipientId: z.string().min(1, 'Recipient ID or email is required'),
  amount: z.string().min(1, 'Amount is required').refine((val) => parseFloat(val) > 0, 'Amount must be greater than 0'),
  note: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
});

interface Transaction {
  id: string;
  date: Date;
  type: 'deposit' | 'withdraw' | 'transfer_in' | 'transfer_out' | 'commission' | 'roi' | 'package' | 'rank_reward';
  description: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  from?: string;
  to?: string;
  method?: string;
}

export const WalletNew: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active tab state
  const [activeTab, setActiveTab] = useState('deposit');

  // Wallet balance state
  const [balance, setBalance] = useState<WalletBalance>({
    total: 0,
    available: 0,
    locked: 0,
    pending: 0,
  });
  const [balanceLoading, setBalanceLoading] = useState(true);

  // KYC status
  const [kycApproved, setKycApproved] = useState(false);

  // Load wallet data on mount
  useEffect(() => {
    loadWalletData();
    loadTransactions();
    loadPendingTransactions();
    loadWithdrawalLimits();
  }, []);

  const loadWalletData = async () => {
    try {
      setBalanceLoading(true);
      const walletBalance = await getWalletBalance();
      setBalance(walletBalance);
    } catch (error: any) {
      console.error('Failed to load wallet balance:', error);
      toast.error(error.message || 'Failed to load wallet balance');
    } finally {
      setBalanceLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const txHistory = await getTransactionHistory(50);
      setTransactions(txHistory as any[]);
    } catch (error: any) {
      console.error('Failed to load transactions:', error);
    }
  };

  const loadPendingTransactions = async () => {
    try {
      const pending = await getPendingTransactions();
      const withdrawals = pending
        .filter(tx => tx.transaction_type === 'withdrawal')
        .map(tx => ({
          id: tx.id,
          date: new Date(tx.created_at),
          amount: Math.abs(tx.amount),
          method: tx.method || 'Bank Transfer',
          status: tx.status as 'pending'
        }));
      setPendingWithdrawals(withdrawals);
    } catch (error: any) {
      console.error('Failed to load pending transactions:', error);
    }
  };

  const loadWithdrawalLimits = async () => {
    try {
      const limits = await getWithdrawalLimits();
      setWithdrawalLimits(limits);
    } catch (error: any) {
      console.error('Failed to load withdrawal limits:', error);
    }
  };

  // Deposit state
  const [selectedDepositMethod, setSelectedDepositMethod] = useState<string | null>(null);
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [depositAddress, setDepositAddress] = useState('');

  // Withdrawal state
  const [withdrawalMethod, setWithdrawalMethod] = useState<'bank' | 'crypto'>('bank');
  const [withdrawalLimits, setWithdrawalLimits] = useState({
    daily: { limit: 10000, used: 2000 },
    weekly: { limit: 50000, used: 5000 },
    monthly: { limit: 200000, used: 15000 },
  });

  const [pendingWithdrawals, setPendingWithdrawals] = useState([
    {
      id: '1',
      date: new Date('2024-01-15'),
      amount: 1000,
      method: 'Bank Transfer',
      status: 'pending' as const,
    },
  ]);

  // Transfer state
  const [recipientInfo, setRecipientInfo] = useState<{ id: string; name: string; email: string } | null>(null);
  const [transferFee, setTransferFee] = useState(0);
  const [transferAmount, setTransferAmount] = useState('');

  // Transaction history state
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionFilters, setTransactionFilters] = useState({
    type: [] as string[],
    status: 'all',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
  });

  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 'TXN001',
      date: new Date('2024-01-15'),
      type: 'deposit',
      description: 'Deposit via Bank Transfer',
      amount: 1000,
      status: 'completed',
      method: 'Bank Transfer',
    },
    {
      id: 'TXN002',
      date: new Date('2024-01-14'),
      type: 'withdraw',
      description: 'Withdrawal to Bank Account',
      amount: -500,
      status: 'pending',
      method: 'Bank Transfer',
    },
    {
      id: 'TXN003',
      date: new Date('2024-01-13'),
      type: 'transfer_out',
      description: 'Transfer to user@example.com',
      amount: -200,
      status: 'completed',
      to: 'user@example.com',
    },
    {
      id: 'TXN004',
      date: new Date('2024-01-12'),
      type: 'commission',
      description: 'Referral Commission',
      amount: 150,
      status: 'completed',
    },
    {
      id: 'TXN005',
      date: new Date('2024-01-11'),
      type: 'roi',
      description: 'Daily ROI Payment',
      amount: 50,
      status: 'completed',
    },
  ]);

  // Payment methods
  const paymentMethods = [
    { id: 'crypto', name: 'Cryptocurrency', icon: '₿', description: 'Bitcoin, USDT, Ethereum' },
    { id: 'bank', name: 'Bank Transfer', icon: '🏦', description: 'Direct bank deposit' },
    { id: 'upi', name: 'UPI Payment', icon: '📱', description: 'Indian UPI (GPay, PhonePe)' },
    { id: 'card', name: 'Credit/Debit Card', icon: '💳', description: 'Visa, Mastercard' },
    { id: 'paypal', name: 'PayPal', icon: 'P', description: 'PayPal account' },
  ];

  const cryptoOptions = [
    { value: 'BTC', label: 'Bitcoin (BTC)', networks: ['BTC'] },
    { value: 'ETH', label: 'Ethereum (ETH)', networks: ['ERC20'] },
    { value: 'USDT', label: 'Tether (USDT)', networks: ['ERC20', 'TRC20', 'BEP20'] },
    { value: 'USDC', label: 'USD Coin (USDC)', networks: ['ERC20', 'TRC20', 'BEP20'] },
    { value: 'BNB', label: 'Binance Coin (BNB)', networks: ['BEP20'] },
    { value: 'TRX', label: 'TRON (TRX)', networks: ['TRC20'] },
  ];

  // Handlers
  const handleSelectDepositMethod = (methodId: string) => {
    setSelectedDepositMethod(methodId);
    if (methodId === 'crypto') {
      generateDepositAddress(selectedCrypto, selectedNetwork);
    }
  };

  const generateDepositAddress = async (crypto: string, network: string) => {
    try {
      const depositInfo = await apiGenerateDepositAddress(crypto, network);
      setDepositAddress(depositInfo.address);
      toast.success(`Deposit address generated for ${crypto} (${network})`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate deposit address');
    }
  };

  const handleCryptoChange = (crypto: string) => {
    setSelectedCrypto(crypto);
    setSelectedNetwork('');
    setDepositAddress('');
  };

  const handleNetworkChange = (network: string) => {
    setSelectedNetwork(network);
    if (selectedCrypto) {
      generateDepositAddress(selectedCrypto, network);
    }
  };

  const handleCryptoDepositSubmit = async (transactionId?: string) => {
    try {
      await submitDeposit({
        method: 'crypto',
        amount: 0, // Crypto deposits amount is determined by blockchain
        crypto: selectedCrypto,
        network: selectedNetwork,
        transactionId
      });

      toast.success('Deposit request submitted! We will credit your account once confirmed on blockchain.');
      setSelectedDepositMethod(null);
      loadPendingTransactions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit deposit');
    }
  };

  const handleBankDepositSubmit = async (data: any) => {
    try {
      await submitDeposit({
        method: 'bank',
        amount: parseFloat(data.amount),
        referenceNumber: data.referenceNumber,
        proofFile: data.paymentProof?.[0]
      });

      toast.success('Deposit request submitted! Awaiting admin verification.');
      setSelectedDepositMethod(null);
      loadPendingTransactions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit deposit');
    }
  };

  const handleWithdrawalSubmit = async (data: any) => {
    try {
      const amount = parseFloat(data.amount);

      await submitWithdrawal({
        amount,
        method: withdrawalMethod,
        accountId: data.accountId,
        password: data.password,
        verificationCode: data.verificationCode
      });

      toast.success(`Withdrawal request submitted! Awaiting admin approval.`);
      loadPendingTransactions();
      loadWalletData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process withdrawal');
    }
  };

  const handleCancelWithdrawal = (id: string) => {
    // In production, would call API to cancel withdrawal
    setPendingWithdrawals(pendingWithdrawals.filter((w) => w.id !== id));
    toast.success('Withdrawal cancelled');
  };

  const handleSearchRecipient = (searchTerm: string) => {
    // Note: In production, this would validate against actual user database
    // For now, simulating to show the UI flow works
    setTimeout(() => {
      if (searchTerm) {
        setRecipientInfo({
          id: 'USR123456',
          name: 'John Doe',
          email: 'john@example.com',
        });
        toast.success('Recipient found!');
      }
    }, 1000);
  };

  const handleTransferSubmit = async (data: any) => {
    try {
      const amount = parseFloat(data.amount);

      const result = await transferFunds({
        recipientId: data.recipientId,
        amount,
        note: data.note,
        password: data.password
      });

      toast.success(`Transfer successful! $${amount.toFixed(2)} sent to ${result.recipientName}`);
      setRecipientInfo(null);
      setTransferFee(0);
      setTransferAmount('');
      loadWalletData();
      loadTransactions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process transfer');
    }
  };

  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionModal(true);
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      deposit: 'Deposit',
      withdraw: 'Withdrawal',
      transfer_in: 'Transfer In',
      transfer_out: 'Transfer Out',
      commission: 'Commission',
      roi: 'ROI',
      package: 'Package Purchase',
      rank_reward: 'Rank Reward',
    };
    return labels[type] || type;
  };

  const getTransactionTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      deposit: '⬇️',
      withdraw: '⬆️',
      transfer_in: '📥',
      transfer_out: '📤',
      commission: '💰',
      roi: '📈',
      package: '📦',
      rank_reward: '🏆',
    };
    return icons[type] || '💵';
  };

  const tabs = [
    { id: 'deposit', label: 'Deposit', icon: '⬇️' },
    { id: 'withdraw', label: 'Withdraw', icon: '⬆️' },
    { id: 'transfer', label: 'Transfer', icon: '🔄' },
    { id: 'history', label: 'History', icon: '📊' },
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] p-5 max-w-7xl mx-auto">
      <Toaster position="top-right" />

      <Button variant="secondary" onClick={() => navigate('/dashboard')} className="mb-5">
        ← Back to Dashboard
      </Button>

      {/* Balance Header */}
      <Card className="mb-6 bg-gradient-to-br from-[#334155] to-[#1e293b]">
        <div className="text-center py-8">
          <p className="text-[#cbd5e1] text-lg mb-3">Total Balance</p>
          <h1 className="text-6xl font-bold text-[#00C7D1] mb-8">${balance.total.toFixed(2)}</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl mb-2">💰</div>
              <p className="text-[#cbd5e1] text-sm mb-1">Available</p>
              <p className="text-2xl font-bold text-[#10b981]">${balance.available.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🔒</div>
              <p className="text-[#cbd5e1] text-sm mb-1">Locked</p>
              <p className="text-2xl font-bold text-[#f59e0b]">${balance.locked.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">⏳</div>
              <p className="text-[#cbd5e1] text-sm mb-1">Pending</p>
              <p className="text-2xl font-bold text-[#94a3b8]">${balance.pending.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Button
          variant="primary"
          className="h-16 text-lg"
          onClick={() => setActiveTab('deposit')}
        >
          ⬇️ Deposit
        </Button>
        <Button
          variant="primary"
          className="h-16 text-lg"
          onClick={() => setActiveTab('withdraw')}
        >
          ⬆️ Withdraw
        </Button>
        <Button
          variant="secondary"
          className="h-16 text-lg"
          onClick={() => setActiveTab('transfer')}
        >
          🔄 Transfer
        </Button>
      </div>

      {/* Tabs */}
      <Card>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab 1: Deposit */}
        <TabPanel activeTab={activeTab} tabId="deposit">
          {!selectedDepositMethod ? (
            <>
              <h3 className="text-xl font-bold text-[#f8fafc] mb-4">Select Deposit Method</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {paymentMethods.map((method) => (
                  <Card
                    key={method.id}
                    className="bg-[#1e293b] cursor-pointer hover:bg-[#334155] transition-all hover:-translate-y-1"
                    onClick={() => handleSelectDepositMethod(method.id)}
                  >
                    <div className="text-center py-6">
                      <div className="text-5xl mb-3">{method.icon}</div>
                      <h4 className="text-lg font-bold text-[#f8fafc] mb-2">{method.name}</h4>
                      <p className="text-sm text-[#94a3b8]">{method.description}</p>
                      <Button variant="primary" className="mt-4 w-full">
                        Select
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          ) : selectedDepositMethod === 'crypto' ? (
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[#f8fafc]">Cryptocurrency Deposit</h3>
                <Button variant="secondary" size="sm" onClick={() => setSelectedDepositMethod(null)}>
                  ← Back
                </Button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Select Cryptocurrency"
                    value={selectedCrypto}
                    onChange={(e) => handleCryptoChange(e.target.value)}
                  >
                    {cryptoOptions.map((crypto) => (
                      <option key={crypto.value} value={crypto.value}>
                        {crypto.label}
                      </option>
                    ))}
                  </Select>

                  <Select
                    label="Select Network"
                    value={selectedNetwork}
                    onChange={(e) => handleNetworkChange(e.target.value)}
                    disabled={!selectedCrypto}
                  >
                    <option value="">Select Network</option>
                    {cryptoOptions
                      .find((c) => c.value === selectedCrypto)
                      ?.networks.map((network) => (
                        <option key={network} value={network}>
                          {network}
                        </option>
                      ))}
                  </Select>
                </div>

                {depositAddress && (
                  <>
                    <Alert variant="warning">
                      <strong>⚠️ Important:</strong> Ensure you send {selectedCrypto} on the <strong>{selectedNetwork}</strong> network only. Sending on wrong network will result in loss of funds.
                    </Alert>

                    <Card className="bg-[#1e293b]">
                      <h4 className="text-lg font-bold text-[#f8fafc] mb-4">Deposit Address</h4>
                      <div className="flex gap-2 mb-4">
                        <input
                          type="text"
                          value={depositAddress}
                          readOnly
                          className="flex-1 px-4 py-3 bg-[#0f172a] border border-[#475569] rounded-lg text-[#f8fafc] font-mono text-sm"
                        />
                        <Button variant="primary" onClick={() => handleCopyToClipboard(depositAddress)}>
                          📋 Copy
                        </Button>
                      </div>

                      <div className="flex justify-center p-6 bg-white rounded-lg">
                        <QRCodeSVG value={depositAddress} size={250} level="H" includeMargin={true} />
                      </div>
                    </Card>

                    <Alert variant="info">
                      <strong>Minimum Deposit:</strong> 0.001 {selectedCrypto} (~$10)
                      <br />
                      <strong>Processing Time:</strong> 2-10 network confirmations
                    </Alert>

                    <Card className="bg-[#1e293b]">
                      <h4 className="text-lg font-bold text-[#f8fafc] mb-4">Instructions</h4>
                      <ol className="text-[#cbd5e1] space-y-2 list-decimal list-inside">
                        <li>Copy the deposit address or scan the QR code</li>
                        <li>Send {selectedCrypto} from your wallet to this address</li>
                        <li>Ensure you're using the {selectedNetwork} network</li>
                        <li>Wait for network confirmations</li>
                        <li>Funds will be credited automatically</li>
                      </ol>
                    </Card>

                    <Input
                      label="Transaction ID (Optional)"
                      placeholder="Enter transaction hash for tracking"
                    />

                    <Button variant="success" className="w-full" onClick={handleCryptoDepositSubmit}>
                      I've Made the Payment
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : selectedDepositMethod === 'bank' ? (
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[#f8fafc]">Bank Transfer Deposit</h3>
                <Button variant="secondary" size="sm" onClick={() => setSelectedDepositMethod(null)}>
                  ← Back
                </Button>
              </div>

              <Card className="bg-[#1e293b] mb-6">
                <h4 className="text-lg font-bold text-[#f8fafc] mb-4">Bank Account Details</h4>
                <div className="space-y-3 text-[#cbd5e1]">
                  <div className="flex justify-between py-2 border-b border-[#475569]">
                    <span className="text-[#94a3b8]">Bank Name:</span>
                    <span className="font-medium">Chase Bank</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#475569]">
                    <span className="text-[#94a3b8]">Account Holder:</span>
                    <span className="font-medium">Finaster LLC</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#475569]">
                    <span className="text-[#94a3b8]">Account Number:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">1234567890</span>
                      <button
                        onClick={() => handleCopyToClipboard('1234567890')}
                        className="text-[#00C7D1] hover:text-[#00e5f0] text-sm"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#475569]">
                    <span className="text-[#94a3b8]">Routing Number:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">021000021</span>
                      <button
                        onClick={() => handleCopyToClipboard('021000021')}
                        className="text-[#00C7D1] hover:text-[#00e5f0] text-sm"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-[#94a3b8]">Branch:</span>
                    <span className="font-medium">New York Main Branch</span>
                  </div>
                </div>
              </Card>

              <div className="space-y-4">
                <Input
                  label="Amount *"
                  type="number"
                  placeholder="Enter deposit amount"
                  min="10"
                />

                <div>
                  <label className="block text-sm font-medium text-[#f8fafc] mb-2">
                    Upload Payment Proof *
                  </label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="w-full px-4 py-3 bg-[#1e293b] border border-[#475569] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#00C7D1]"
                  />
                  <p className="text-sm text-[#94a3b8] mt-1">Upload bank receipt or screenshot (Max 5MB)</p>
                </div>

                <Input
                  label="Reference Number *"
                  placeholder="Enter bank reference/transaction number"
                />

                <Alert variant="info">
                  <strong>Instructions:</strong>
                  <ol className="mt-2 list-decimal list-inside space-y-1">
                    <li>Transfer the amount to above bank account</li>
                    <li>Upload payment proof (receipt/screenshot)</li>
                    <li>Enter the reference number from your bank</li>
                    <li>Submit the form</li>
                    <li>Your deposit will be credited within 24 hours after verification</li>
                  </ol>
                </Alert>

                <Button variant="success" className="w-full">
                  Submit Deposit Request
                </Button>
              </div>
            </div>
          ) : selectedDepositMethod === 'upi' ? (
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[#f8fafc]">UPI Payment</h3>
                <Button variant="secondary" size="sm" onClick={() => setSelectedDepositMethod(null)}>
                  ← Back
                </Button>
              </div>

              <div className="space-y-6">
                <Card className="bg-[#1e293b]">
                  <div className="text-center">
                    <h4 className="text-lg font-bold text-[#f8fafc] mb-4">UPI ID</h4>
                    <div className="flex items-center justify-center gap-2 mb-6">
                      <p className="text-2xl font-mono text-[#00C7D1]">finaster@paytm</p>
                      <button
                        onClick={() => handleCopyToClipboard('finaster@paytm')}
                        className="text-[#00C7D1] hover:text-[#00e5f0]"
                      >
                        📋
                      </button>
                    </div>

                    <div className="flex justify-center p-6 bg-white rounded-lg">
                      <QRCodeSVG value="upi://pay?pa=finaster@paytm&pn=Finaster" size={250} level="H" includeMargin={true} />
                    </div>
                  </div>
                </Card>

                <Input
                  label="Amount *"
                  type="number"
                  placeholder="Enter amount"
                  min="5"
                />

                <div>
                  <label className="block text-sm font-medium text-[#f8fafc] mb-2">
                    Upload Payment Screenshot *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full px-4 py-3 bg-[#1e293b] border border-[#475569] rounded-lg text-[#f8fafc] focus:outline-none focus:border-[#00C7D1]"
                  />
                </div>

                <Input
                  label="UTR Number *"
                  placeholder="12-digit UTR number"
                  maxLength={12}
                />

                <Alert variant="info">
                  <strong>How to deposit via UPI:</strong>
                  <ol className="mt-2 list-decimal list-inside space-y-1">
                    <li>Open any UPI app (GPay, PhonePe, Paytm)</li>
                    <li>Scan the QR code or enter UPI ID</li>
                    <li>Enter amount and complete payment</li>
                    <li>Take screenshot of successful transaction</li>
                    <li>Upload screenshot and enter UTR number here</li>
                  </ol>
                </Alert>

                <Button variant="success" className="w-full">
                  Submit Deposit Request
                </Button>
              </div>
            </div>
          ) : selectedDepositMethod === 'card' ? (
            <div className="max-w-2xl mx-auto text-center py-12">
              <div className="text-6xl mb-4">💳</div>
              <h3 className="text-2xl font-bold text-[#f8fafc] mb-4">Credit/Debit Card Payment</h3>
              <p className="text-[#cbd5e1] mb-8">Enter amount and proceed to secure payment gateway</p>

              <div className="max-w-md mx-auto mb-8">
                <Input
                  label="Amount"
                  type="number"
                  placeholder="Enter amount"
                  min="10"
                />
              </div>

              <Button variant="primary" className="px-12">
                Proceed to Payment Gateway
              </Button>

              <div className="flex items-center justify-center gap-4 mt-8 text-[#94a3b8]">
                <span>Powered by</span>
                <span className="font-bold text-[#f8fafc]">Stripe</span>
                <span>•</span>
                <span className="font-bold text-[#f8fafc]">Razorpay</span>
              </div>

              <Button variant="secondary" onClick={() => setSelectedDepositMethod(null)} className="mt-8">
                ← Back to Methods
              </Button>
            </div>
          ) : null}
        </TabPanel>

        {/* Tab 2: Withdraw */}
        <TabPanel activeTab={activeTab} tabId="withdraw">
          {!kycApproved ? (
            <Alert variant="warning">
              <div className="flex items-center justify-between">
                <div>
                  <strong>⚠️ KYC Verification Required</strong>
                  <p className="mt-1">You must complete KYC verification before making withdrawals.</p>
                </div>
                <Button variant="primary" onClick={() => navigate('/kyc')}>
                  Complete KYC
                </Button>
              </div>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Withdrawal Form */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-[#1e293b]">
                  <div className="text-center mb-6">
                    <p className="text-[#cbd5e1] mb-2">Available Balance</p>
                    <h2 className="text-4xl font-bold text-[#10b981]">${balance.available.toFixed(2)}</h2>
                  </div>
                </Card>

                <Card className="bg-[#1e293b]">
                  <h3 className="text-xl font-bold text-[#f8fafc] mb-4">Withdrawal Details</h3>

                  <div className="space-y-4">
                    <div>
                      <Input
                        label="Amount *"
                        type="number"
                        placeholder="Enter withdrawal amount"
                        min="10"
                        max={balance.available}
                      />
                      <div className="flex justify-between mt-2">
                        <Button variant="outline" size="sm">
                          Withdraw All
                        </Button>
                        <p className="text-sm text-[#94a3b8]">Min: $10, Max: ${balance.available.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-[#334155] rounded-lg">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[#cbd5e1]">Processing Fee (2%)</span>
                        <span className="text-[#f8fafc] font-medium">$0.00</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold">
                        <span className="text-[#f8fafc]">You will receive</span>
                        <span className="text-[#10b981]">$0.00</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#f8fafc] mb-3">Withdrawal Method</label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setWithdrawalMethod('bank')}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            withdrawalMethod === 'bank'
                              ? 'border-[#00C7D1] bg-[#00C7D1]/10'
                              : 'border-[#475569] hover:border-[#00C7D1]/50'
                          }`}
                        >
                          <div className="text-3xl mb-2">🏦</div>
                          <div className="text-[#f8fafc] font-medium">Bank Account</div>
                        </button>
                        <button
                          onClick={() => setWithdrawalMethod('crypto')}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            withdrawalMethod === 'crypto'
                              ? 'border-[#00C7D1] bg-[#00C7D1]/10'
                              : 'border-[#475569] hover:border-[#00C7D1]/50'
                          }`}
                        >
                          <div className="text-3xl mb-2">₿</div>
                          <div className="text-[#f8fafc] font-medium">Crypto Wallet</div>
                        </button>
                      </div>
                    </div>

                    {withdrawalMethod === 'bank' ? (
                      <Select label="Select Bank Account *">
                        <option value="">Select account</option>
                        <option value="1">Chase Bank - ****1234</option>
                        <option value="new">+ Add New Bank Account</option>
                      </Select>
                    ) : (
                      <>
                        <Select label="Cryptocurrency *">
                          <option value="">Select cryptocurrency</option>
                          <option value="BTC">Bitcoin (BTC)</option>
                          <option value="USDT">Tether (USDT)</option>
                          <option value="ETH">Ethereum (ETH)</option>
                        </Select>
                        <Select label="Network *">
                          <option value="">Select network</option>
                          <option value="ERC20">ERC20</option>
                          <option value="TRC20">TRC20</option>
                          <option value="BEP20">BEP20</option>
                        </Select>
                        <Select label="Select Wallet *">
                          <option value="">Select wallet</option>
                          <option value="1">Main Wallet - 0x742d...bEbF</option>
                          <option value="new">+ Add New Wallet</option>
                        </Select>
                        <Alert variant="warning">
                          <strong>⚠️ Warning:</strong> Ensure you select the correct network. Sending to wrong network will result in loss of funds.
                        </Alert>
                      </>
                    )}

                    <div className="border-t border-[#475569] pt-4">
                      <h4 className="text-lg font-bold text-[#f8fafc] mb-4">Security Verification</h4>
                      <div className="space-y-4">
                        <Input
                          label="Password *"
                          type="password"
                          placeholder="Enter your password"
                        />
                        <div className="flex gap-2">
                          <Input
                            label="Email Verification Code *"
                            placeholder="6-digit code"
                            maxLength={6}
                          />
                          <Button variant="secondary" className="mt-7">
                            Send Code
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <input type="checkbox" className="mt-1" />
                      <label className="text-sm text-[#cbd5e1]">
                        I understand that withdrawals are processed within 24-48 hours and cannot be cancelled once approved.
                      </label>
                    </div>

                    <Button variant="success" className="w-full h-12 text-lg">
                      Submit Withdrawal Request
                    </Button>
                  </div>
                </Card>

                {/* Pending Withdrawals */}
                {pendingWithdrawals.length > 0 && (
                  <Card className="bg-[#1e293b]">
                    <h3 className="text-xl font-bold text-[#f8fafc] mb-4">Pending Withdrawals</h3>
                    <div className="space-y-3">
                      {pendingWithdrawals.map((withdrawal) => (
                        <div
                          key={withdrawal.id}
                          className="flex items-center justify-between p-4 bg-[#334155] rounded-lg"
                        >
                          <div>
                            <p className="text-[#f8fafc] font-medium">${withdrawal.amount.toFixed(2)}</p>
                            <p className="text-sm text-[#94a3b8]">
                              {format(withdrawal.date, 'MMM dd, yyyy')} • {withdrawal.method}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="warning">Pending</Badge>
                            {withdrawal.status === 'pending' && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleCancelWithdrawal(withdrawal.id)}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              {/* Withdrawal Limits Sidebar */}
              <div className="space-y-6">
                <Card className="bg-[#1e293b]">
                  <h4 className="text-lg font-bold text-[#f8fafc] mb-4">Withdrawal Limits</h4>
                  <div className="space-y-4">
                    {/* Daily */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[#cbd5e1]">Daily Limit</span>
                        <span className="text-[#f8fafc] font-medium">
                          ${withdrawalLimits.daily.used.toLocaleString()} / ${withdrawalLimits.daily.limit.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 bg-[#334155] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#00C7D1]"
                          style={{ width: `${(withdrawalLimits.daily.used / withdrawalLimits.daily.limit) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Weekly */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[#cbd5e1]">Weekly Limit</span>
                        <span className="text-[#f8fafc] font-medium">
                          ${withdrawalLimits.weekly.used.toLocaleString()} / ${withdrawalLimits.weekly.limit.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 bg-[#334155] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#10b981]"
                          style={{ width: `${(withdrawalLimits.weekly.used / withdrawalLimits.weekly.limit) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Monthly */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[#cbd5e1]">Monthly Limit</span>
                        <span className="text-[#f8fafc] font-medium">
                          ${withdrawalLimits.monthly.used.toLocaleString()} / ${withdrawalLimits.monthly.limit.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 bg-[#334155] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#f59e0b]"
                          style={{ width: `${(withdrawalLimits.monthly.used / withdrawalLimits.monthly.limit) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                <Alert variant="info">
                  <strong>Processing Time</strong>
                  <ul className="mt-2 text-sm space-y-1">
                    <li>• Bank: 24-48 hours</li>
                    <li>• Crypto: 2-6 hours</li>
                  </ul>
                </Alert>
              </div>
            </div>
          )}
        </TabPanel>

        {/* Tab 3: Transfer */}
        <TabPanel activeTab={activeTab} tabId="transfer">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-xl font-bold text-[#f8fafc] mb-6">Internal Transfer</h3>

            <Card className="bg-[#1e293b]">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#f8fafc] mb-2">Recipient</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter User ID or Email"
                      className="flex-1"
                    />
                    <Button variant="primary" onClick={() => handleSearchRecipient('test')}>
                      Search
                    </Button>
                  </div>
                </div>

                {recipientInfo && (
                  <Card className="bg-[#334155]">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00C7D1] to-[#667eea] flex items-center justify-center text-2xl text-white font-bold">
                        {recipientInfo.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[#f8fafc] font-bold text-lg">{recipientInfo.name}</p>
                        <p className="text-[#94a3b8] text-sm">{recipientInfo.email}</p>
                        <p className="text-[#94a3b8] text-xs">ID: {recipientInfo.id}</p>
                      </div>
                    </div>
                  </Card>
                )}

                <div>
                  <Input
                    label="Amount *"
                    type="number"
                    placeholder="Enter transfer amount"
                    min="1"
                    value={transferAmount}
                    onChange={(e) => {
                      const amount = e.target.value;
                      setTransferAmount(amount);
                      const numAmount = parseFloat(amount || '0');
                      const fee = numAmount * 0.01; // 1% fee
                      setTransferFee(fee);
                    }}
                  />
                  <p className="text-sm text-[#94a3b8] mt-1">Available: ${balance.available.toFixed(2)}</p>
                </div>

                <div className="p-4 bg-[#334155] rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#cbd5e1]">Transfer Amount</span>
                    <span className="text-[#f8fafc]">${parseFloat(transferAmount || '0').toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#cbd5e1]">Transfer Fee (1%)</span>
                    <span className="text-[#f8fafc]">${transferFee.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-[#475569] pt-2 flex justify-between">
                    <span className="text-[#f8fafc] font-bold">Recipient Receives</span>
                    <span className="text-[#10b981] font-bold text-lg">${(parseFloat(transferAmount || '0') - transferFee).toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#f8fafc] mb-2">Note (Optional)</label>
                  <textarea
                    className="w-full px-4 py-3 bg-[#0f172a] border border-[#475569] rounded-lg text-[#f8fafc] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#00C7D1] focus:ring-2 focus:ring-[#00C7D1]/20"
                    rows={3}
                    placeholder="Add a note for this transfer"
                  />
                </div>

                <Input
                  label="Password *"
                  type="password"
                  placeholder="Enter your password"
                />

                <Button variant="success" className="w-full h-12">
                  Transfer Funds
                </Button>
              </div>
            </Card>

            <Card className="bg-[#1e293b] mt-6">
              <h4 className="text-lg font-bold text-[#f8fafc] mb-4">Recent Transfers</h4>
              <div className="space-y-3">
                {transactions
                  .filter((t) => t.type === 'transfer_out' || t.type === 'transfer_in')
                  .slice(0, 5)
                  .map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 bg-[#334155] rounded-lg"
                    >
                      <div>
                        <p className="text-[#f8fafc] font-medium">{transaction.description}</p>
                        <p className="text-sm text-[#94a3b8]">{format(transaction.date, 'MMM dd, yyyy HH:mm')}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${transaction.amount > 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                          {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                        </p>
                        <Badge variant="success">Completed</Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </TabPanel>

        {/* Tab 4: Transaction History */}
        <TabPanel activeTab={activeTab} tabId="history">
          <div className="space-y-6">
            {/* Filters */}
            <Card className="bg-[#1e293b]">
              <h3 className="text-lg font-bold text-[#f8fafc] mb-4">Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select label="Type">
                  <option value="all">All Types</option>
                  <option value="deposit">Deposit</option>
                  <option value="withdraw">Withdraw</option>
                  <option value="transfer">Transfer</option>
                  <option value="commission">Commission</option>
                  <option value="roi">ROI</option>
                </Select>

                <Select label="Status">
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </Select>

                <Input label="From Date" type="date" />
                <Input label="To Date" type="date" />
              </div>
              <div className="flex gap-3 mt-4">
                <Button variant="primary">Apply Filters</Button>
                <Button variant="secondary">Clear</Button>
                <Button variant="outline" className="ml-auto">
                  📥 Export CSV
                </Button>
              </div>
            </Card>

            {/* Transactions Table */}
            <Card className="bg-[#1e293b] overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#475569]">
                    <th className="text-left py-3 px-4 text-[#f8fafc] font-semibold">Transaction ID</th>
                    <th className="text-left py-3 px-4 text-[#f8fafc] font-semibold">Date & Time</th>
                    <th className="text-left py-3 px-4 text-[#f8fafc] font-semibold">Type</th>
                    <th className="text-left py-3 px-4 text-[#f8fafc] font-semibold">Description</th>
                    <th className="text-right py-3 px-4 text-[#f8fafc] font-semibold">Amount</th>
                    <th className="text-center py-3 px-4 text-[#f8fafc] font-semibold">Status</th>
                    <th className="text-center py-3 px-4 text-[#f8fafc] font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b border-[#475569] hover:bg-[#334155] transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[#cbd5e1] font-mono text-sm">{transaction.id}</span>
                          <button
                            onClick={() => handleCopyToClipboard(transaction.id)}
                            className="text-[#94a3b8] hover:text-[#00C7D1]"
                          >
                            📋
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[#cbd5e1] text-sm">
                        {format(transaction.date, 'MMM dd, yyyy')}
                        <br />
                        {format(transaction.date, 'HH:mm')}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span>{getTransactionTypeIcon(transaction.type)}</span>
                          <span className="text-[#cbd5e1] text-sm">{getTransactionTypeLabel(transaction.type)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[#cbd5e1]">{transaction.description}</td>
                      <td className="py-4 px-4 text-right">
                        <span
                          className={`font-bold ${
                            transaction.amount > 0 ? 'text-[#10b981]' : 'text-[#ef4444]'
                          }`}
                        >
                          {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge
                          variant={
                            transaction.status === 'completed'
                              ? 'success'
                              : transaction.status === 'pending'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleViewTransaction(transaction)}
                          className="text-[#00C7D1] hover:text-[#00e5f0] font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <div className="text-[#cbd5e1]">
                Showing 1-{transactions.length} of {transactions.length} transactions
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="primary" size="sm">
                  1
                </Button>
                <Button variant="secondary" size="sm" disabled>
                  Next
                </Button>
              </div>
            </div>
          </div>
        </TabPanel>
      </Card>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <Modal
          isOpen={showTransactionModal}
          onClose={() => setShowTransactionModal(false)}
          title="Transaction Details"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#94a3b8] text-sm mb-1">Transaction ID</p>
                <div className="flex items-center gap-2">
                  <p className="text-[#f8fafc] font-mono font-bold text-lg">{selectedTransaction.id}</p>
                  <button
                    onClick={() => handleCopyToClipboard(selectedTransaction.id)}
                    className="text-[#00C7D1] hover:text-[#00e5f0]"
                  >
                    📋
                  </button>
                </div>
              </div>
              <Badge
                variant={
                  selectedTransaction.status === 'completed'
                    ? 'success'
                    : selectedTransaction.status === 'pending'
                    ? 'warning'
                    : 'danger'
                }
                className="text-lg px-4 py-2"
              >
                {selectedTransaction.status.toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-[#1e293b] rounded-lg">
              <div>
                <p className="text-[#94a3b8] text-sm mb-1">Date & Time</p>
                <p className="text-[#f8fafc] font-medium">
                  {format(selectedTransaction.date, 'MMM dd, yyyy HH:mm:ss')}
                </p>
              </div>
              <div>
                <p className="text-[#94a3b8] text-sm mb-1">Type</p>
                <p className="text-[#f8fafc] font-medium">
                  {getTransactionTypeIcon(selectedTransaction.type)} {getTransactionTypeLabel(selectedTransaction.type)}
                </p>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-[#334155] to-[#1e293b] rounded-lg text-center">
              <p className="text-[#cbd5e1] mb-2">Amount</p>
              <p
                className={`text-4xl font-bold ${
                  selectedTransaction.amount > 0 ? 'text-[#10b981]' : 'text-[#ef4444]'
                }`}
              >
                {selectedTransaction.amount > 0 ? '+' : ''}${Math.abs(selectedTransaction.amount).toFixed(2)}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-[#475569]">
                <span className="text-[#94a3b8]">Description:</span>
                <span className="text-[#f8fafc] font-medium">{selectedTransaction.description}</span>
              </div>
              {selectedTransaction.method && (
                <div className="flex justify-between py-2 border-b border-[#475569]">
                  <span className="text-[#94a3b8]">Method:</span>
                  <span className="text-[#f8fafc] font-medium">{selectedTransaction.method}</span>
                </div>
              )}
              {selectedTransaction.from && (
                <div className="flex justify-between py-2 border-b border-[#475569]">
                  <span className="text-[#94a3b8]">From:</span>
                  <span className="text-[#f8fafc] font-medium">{selectedTransaction.from}</span>
                </div>
              )}
              {selectedTransaction.to && (
                <div className="flex justify-between py-2 border-b border-[#475569]">
                  <span className="text-[#94a3b8]">To:</span>
                  <span className="text-[#f8fafc] font-medium">{selectedTransaction.to}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="primary" className="flex-1">
                📥 Download Receipt
              </Button>
              <Button variant="secondary" className="flex-1">
                📞 Contact Support
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default WalletNew;
