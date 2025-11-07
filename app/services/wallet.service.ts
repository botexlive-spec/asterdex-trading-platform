/**
 * Wallet Service
 * Complete wallet operations: deposits, withdrawals, transfers, transactions
 */



// ============================================
// TYPES & INTERFACES
// ============================================

export interface WalletBalance {
  total: number;
  available: number;
  locked: number;
  pending: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  transaction_type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'package_investment' | 'level_income' | 'matching_bonus' | 'roi_income' | 'rank_reward';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  method?: string;
  description: string;
  from_user_id?: string;
  metadata?: any;
  created_at: string;
  completed_at?: string;
}

export interface DepositRequest {
  method: 'crypto' | 'bank' | 'upi' | 'card';
  amount: number;
  crypto?: string;
  network?: string;
  transactionId?: string;
  referenceNumber?: string;
  utrNumber?: string;
  proofFile?: File;
}

export interface WithdrawalRequest {
  amount: number;
  method: 'bank' | 'crypto';
  accountId: string;
  password: string;
  verificationCode?: string;
}

export interface TransferRequest {
  recipientId: string;
  amount: number;
  note?: string;
  password: string;
}

export interface DepositAddress {
  address: string;
  network: string;
  qrCode: string;
  minDeposit: number;
  confirmations: number;
}

// ============================================
// WALLET BALANCE
// ============================================

/**
 * Get user's wallet balance
 */
export const getWalletBalance = async (): Promise<WalletBalance> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    // Fetch wallet data from wallets table
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('available_balance, total_balance, locked_balance')
      .eq('user_id', user.id)
      .single();

    if (walletError) {
      console.error('Wallet fetch error:', walletError);
      // Return default balance if wallet doesn't exist
      return {
        total: 0,
        available: 0,
        locked: 0,
        pending: 0
      };
    }

    // Calculate pending balance from pending transactions
    const { data: pendingTxs } = await supabase
      .from('mlm_transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .in('transaction_type', ['deposit', 'withdrawal']);

    const pendingAmount = pendingTxs?.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0) || 0;

    const totalBalance = parseFloat(walletData.total_balance?.toString() || '0');
    const availableBalance = parseFloat(walletData.available_balance?.toString() || '0');
    const lockedBalance = parseFloat(walletData.locked_balance?.toString() || '0');

    return {
      total: totalBalance,
      available: availableBalance,
      locked: lockedBalance,
      pending: pendingAmount
    };
  } catch (error: any) {
    console.error('Get wallet balance error:', error);
    // Return default balance instead of throwing
    return {
      total: 0,
      available: 0,
      locked: 0,
      pending: 0
    };
  }
};

// ============================================
// DEPOSITS
// ============================================

/**
 * Generate crypto deposit address
 */
export const generateDepositAddress = async (crypto: string, network: string): Promise<DepositAddress> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // In production, you would call a crypto payment gateway API here
    // For now, generate a deterministic address based on user ID
    const addresses: Record<string, Record<string, string>> = {
      'BTC': {
        'Bitcoin': `bc1q${user.id.substring(0, 39)}`,
        'Lightning': `lnbc1q${user.id.substring(0, 38)}`
      },
      'ETH': {
        'Ethereum': `0x${user.id.replace(/-/g, '').substring(0, 40)}`,
        'BSC': `0x${user.id.replace(/-/g, '').substring(0, 40)}`,
        'Polygon': `0x${user.id.replace(/-/g, '').substring(0, 40)}`
      },
      'USDT': {
        'ERC20': `0x${user.id.replace(/-/g, '').substring(0, 40)}`,
        'TRC20': `T${user.id.replace(/-/g, '').substring(0, 33)}`,
        'BSC': `0x${user.id.replace(/-/g, '').substring(0, 40)}`
      },
      'USDC': {
        'ERC20': `0x${user.id.replace(/-/g, '').substring(0, 40)}`,
        'Polygon': `0x${user.id.replace(/-/g, '').substring(0, 40)}`
      }
    };

    const address = addresses[crypto]?.[network];
    if (!address) throw new Error('Unsupported crypto/network combination');

    const minDeposits: Record<string, number> = {
      'BTC': 0.0001,
      'ETH': 0.001,
      'USDT': 10,
      'USDC': 10
    };

    const confirmations: Record<string, number> = {
      'BTC': 3,
      'ETH': 12,
      'USDT': 12,
      'USDC': 12
    };

    return {
      address,
      network,
      qrCode: address, // In production, generate actual QR code
      minDeposit: minDeposits[crypto] || 10,
      confirmations: confirmations[crypto] || 12
    };
  } catch (error: any) {
    console.error('Generate deposit address error:', error);
    throw new Error(error.message || 'Failed to generate deposit address');
  }
};

/**
 * Submit deposit request
 */
export const submitDeposit = async (request: DepositRequest): Promise<Transaction> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    // Upload proof file if provided
    let proofUrl: string | undefined;
    if (request.proofFile) {
      const fileName = `deposits/${user.id}/${Date.now()}_${request.proofFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, request.proofFile);

      if (uploadError) {
        console.warn('File upload failed:', uploadError);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName);
        proofUrl = publicUrl;
      }
    }

    // Create metadata
    const metadata: any = {
      method: request.method
    };

    if (request.method === 'crypto') {
      metadata.crypto = request.crypto;
      metadata.network = request.network;
      metadata.transactionId = request.transactionId;
    } else if (request.method === 'bank') {
      metadata.referenceNumber = request.referenceNumber;
      metadata.proofUrl = proofUrl;
    } else if (request.method === 'upi') {
      metadata.utrNumber = request.utrNumber;
      metadata.proofUrl = proofUrl;
    }

    // Create deposit transaction
    const { data: transaction, error: txError } = await supabase
      .from('mlm_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'deposit',
        amount: request.amount,
        status: 'pending',
        method: request.method,
        description: `Deposit via ${request.method.toUpperCase()}`,
        metadata
      })
      .select()
      .single();

    if (txError) throw txError;

    return transaction as Transaction;
  } catch (error: any) {
    console.error('Submit deposit error:', error);
    throw new Error(error.message || 'Failed to submit deposit');
  }
};

// ============================================
// WITHDRAWALS
// ============================================

/**
 * Get withdrawal limits
 */
export const getWithdrawalLimits = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const weekStart = new Date(now.setDate(now.getDate() - 7)).toISOString();
    const monthStart = new Date(now.setMonth(now.getMonth() - 1)).toISOString();

    // Get completed withdrawals for each period
    const { data: dailyWithdrawals } = await supabase
      .from('mlm_transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('transaction_type', 'withdrawal')
      .eq('status', 'completed')
      .gte('completed_at', todayStart);

    const { data: weeklyWithdrawals } = await supabase
      .from('mlm_transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('transaction_type', 'withdrawal')
      .eq('status', 'completed')
      .gte('completed_at', weekStart);

    const { data: monthlyWithdrawals } = await supabase
      .from('mlm_transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('transaction_type', 'withdrawal')
      .eq('status', 'completed')
      .gte('completed_at', monthStart);

    const dailyUsed = dailyWithdrawals?.reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount.toString())), 0) || 0;
    const weeklyUsed = weeklyWithdrawals?.reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount.toString())), 0) || 0;
    const monthlyUsed = monthlyWithdrawals?.reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount.toString())), 0) || 0;

    return {
      daily: { limit: 10000, used: dailyUsed },
      weekly: { limit: 50000, used: weeklyUsed },
      monthly: { limit: 200000, used: monthlyUsed }
    };
  } catch (error: any) {
    console.error('Get withdrawal limits error:', error);
    return {
      daily: { limit: 10000, used: 0 },
      weekly: { limit: 50000, used: 0 },
      monthly: { limit: 200000, used: 0 }
    };
  }
};

/**
 * Submit withdrawal request
 */
export const submitWithdrawal = async (request: WithdrawalRequest): Promise<Transaction> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    // Verify password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: request.password
    });

    if (signInError) throw new Error('Invalid password');

    // Check wallet balance
    const balance = await getWalletBalance();
    if (balance.available < request.amount) {
      throw new Error('Insufficient available balance');
    }

    // Check KYC status
    const { data: userData } = await supabase
      .from('users')
      .select('kyc_status')
      .eq('id', user.id)
      .single();

    if (userData?.kyc_status !== 'approved') {
      throw new Error('KYC approval required for withdrawals');
    }

    // Check withdrawal limits
    const limits = await getWithdrawalLimits();
    if (limits.daily.used + request.amount > limits.daily.limit) {
      throw new Error(`Daily withdrawal limit exceeded. Available: $${limits.daily.limit - limits.daily.used}`);
    }

    // Create withdrawal transaction
    const { data: transaction, error: txError } = await supabase
      .from('mlm_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'withdrawal',
        amount: -request.amount, // Negative for withdrawal
        status: 'pending',
        method: request.method,
        description: `Withdrawal via ${request.method.toUpperCase()}`,
        metadata: {
          accountId: request.accountId,
          method: request.method
        }
      })
      .select()
      .single();

    if (txError) throw txError;

    return transaction as Transaction;
  } catch (error: any) {
    console.error('Submit withdrawal error:', error);
    throw new Error(error.message || 'Failed to submit withdrawal');
  }
};

// ============================================
// INTERNAL TRANSFERS
// ============================================

/**
 * Transfer funds to another user
 */
export const transferFunds = async (request: TransferRequest): Promise<{ transaction: Transaction; recipientName: string }> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    // Verify password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: request.password
    });

    if (signInError) throw new Error('Invalid password');

    // Find recipient by ID or email
    const { data: recipient, error: recipientError } = await supabase
      .from('users')
      .select('id, email, full_name, wallet_balance')
      .or(`id.eq.${request.recipientId},email.eq.${request.recipientId}`)
      .maybeSingle();

    if (recipientError || !recipient) {
      throw new Error('Recipient not found');
    }

    if (recipient.id === user.id) {
      throw new Error('Cannot transfer to yourself');
    }

    // Check sender balance
    const balance = await getWalletBalance();
    const fee = request.amount * 0.01; // 1% transfer fee
    const totalAmount = request.amount + fee;

    if (balance.available < totalAmount) {
      throw new Error(`Insufficient balance. Required: $${totalAmount.toFixed(2)} (including $${fee.toFixed(2)} fee)`);
    }

    // Get sender data
    const { data: senderData } = await supabase
      .from('users')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();

    if (!senderData) throw new Error('Sender data not found');

    // Perform transfer (deduct from sender, credit to recipient)
    const { error: senderUpdateError } = await supabase
      .from('users')
      .update({
        wallet_balance: senderData.wallet_balance - totalAmount
      })
      .eq('id', user.id);

    if (senderUpdateError) throw senderUpdateError;

    const { error: recipientUpdateError } = await supabase
      .from('users')
      .update({
        wallet_balance: recipient.wallet_balance + request.amount
      })
      .eq('id', recipient.id);

    if (recipientUpdateError) {
      // Rollback sender update
      await supabase
        .from('users')
        .update({ wallet_balance: senderData.wallet_balance })
        .eq('id', user.id);
      throw recipientUpdateError;
    }

    // Create transaction records
    const { data: senderTx } = await supabase
      .from('mlm_transactions')
      .insert({
        user_id: user.id,
        from_user_id: user.id,
        transaction_type: 'transfer_out',
        amount: -totalAmount,
        status: 'completed',
        description: `Transfer to ${recipient.full_name || recipient.email}`,
        metadata: {
          recipientId: recipient.id,
          transferAmount: request.amount,
          fee: fee,
          note: request.note
        },
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    await supabase
      .from('mlm_transactions')
      .insert({
        user_id: recipient.id,
        from_user_id: user.id,
        transaction_type: 'transfer_in',
        amount: request.amount,
        status: 'completed',
        description: `Transfer from ${user.email}`,
        metadata: {
          senderId: user.id,
          note: request.note
        },
        completed_at: new Date().toISOString()
      });

    // Record transfer fee
    await supabase
      .from('mlm_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'transfer_out',
        amount: -fee,
        status: 'completed',
        description: 'Transfer fee (1%)',
        completed_at: new Date().toISOString()
      });

    return {
      transaction: senderTx as Transaction,
      recipientName: recipient.full_name || recipient.email
    };
  } catch (error: any) {
    console.error('Transfer funds error:', error);
    throw new Error(error.message || 'Failed to transfer funds');
  }
};

// ============================================
// TRANSACTION HISTORY
// ============================================

/**
 * Get user's transaction history
 */
export const getTransactionHistory = async (limit: number = 50, offset: number = 0): Promise<Transaction[]> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { data: transactions, error: txError } = await supabase
      .from('mlm_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (txError) throw txError;

    return (transactions || []) as Transaction[];
  } catch (error: any) {
    console.error('Get transaction history error:', error);
    throw new Error(error.message || 'Failed to fetch transaction history');
  }
};

/**
 * Get pending deposits/withdrawals
 */
export const getPendingTransactions = async (): Promise<Transaction[]> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { data: transactions, error: txError } = await supabase
      .from('mlm_transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .in('transaction_type', ['deposit', 'withdrawal'])
      .order('created_at', { ascending: false });

    if (txError) throw txError;

    return (transactions || []) as Transaction[];
  } catch (error: any) {
    console.error('Get pending transactions error:', error);
    return [];
  }
};
