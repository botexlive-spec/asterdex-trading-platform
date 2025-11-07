/**
 * DEX Trading Terminal Component
 * Embeds the DEX interface from localhost:5173
 */

import React, { useEffect, useRef, useState } from 'react';


interface DEXTerminalProps {
  symbol?: string;
  fullscreen?: boolean;
  onTradeExecuted?: (trade: any) => void;
}

export const DEXTerminal: React.FC<DEXTerminalProps> = ({
  symbol = 'PERP_BTC_USDC',
  fullscreen = false,
  onTradeExecuted,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const DEX_BASE_URL = 'http://localhost:5173';
  const DEX_URL = `${DEX_BASE_URL}/perp/${symbol}`;

  useEffect(() => {
    // Listen for messages from DEX iframe
    const handleMessage = async (event: MessageEvent) => {
      // Security: Only accept messages from DEX origin
      if (event.origin !== DEX_BASE_URL) return;

      console.log('Received message from DEX:', event.data);

      // Handle different message types
      switch (event.data.type) {
        case 'tradeExecuted':
          await handleTradeExecuted(event.data.trade);
          if (onTradeExecuted) {
            onTradeExecuted(event.data.trade);
          }
          break;

        case 'orderPlaced':
          await handleOrderPlaced(event.data.order);
          break;

        case 'positionUpdated':
          await handlePositionUpdated(event.data.position);
          break;

        case 'balanceUpdated':
          await handleBalanceUpdated(event.data.balance);
          break;

        default:
          console.log('Unknown message type:', event.data.type);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  /**
   * Handle trade execution
   */
  const handleTradeExecuted = async (trade: any) => {
    try {
      // MySQL backend handles auth
      if (!user) return;

      // Record trade in database
      const { error } = await supabase
        .from('dex_trades')
        .insert({
          user_id: user.id,
          trade_type: trade.side, // 'buy' or 'sell'
          symbol: trade.symbol,
          amount: trade.amount,
          price: trade.price,
          total_value: trade.total,
          fee: trade.fee || 0,
          status: 'completed',
          trade_data: trade,
        });

      if (error) {
        console.error('Failed to record trade:', error);
      } else {
        // Create notification
        await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            title: 'Trade Executed',
            message: `${trade.side.toUpperCase()} ${trade.amount} ${trade.symbol} at $${trade.price}`,
            notification_type: 'trade',
          });

        // Create transaction record
        await supabase
          .from('mlm_transactions')
          .insert({
            user_id: user.id,
            transaction_type: 'dex_trade',
            amount: trade.total,
            status: 'completed',
            description: `DEX Trade: ${trade.side} ${trade.symbol}`,
            metadata: trade,
          });
      }
    } catch (error) {
      console.error('Error handling trade execution:', error);
    }
  };

  /**
   * Handle order placement
   */
  const handleOrderPlaced = async (order: any) => {
    try {
      // MySQL backend handles auth
      if (!user) return;

      // Create notification for pending order
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Order Placed',
          message: `${order.type.toUpperCase()} order placed: ${order.side} ${order.amount} ${order.symbol}`,
          notification_type: 'order',
        });
    } catch (error) {
      console.error('Error handling order placement:', error);
    }
  };

  /**
   * Handle position updates
   */
  const handlePositionUpdated = async (position: any) => {
    try {
      // Update position tracking if needed
      console.log('Position updated:', position);
    } catch (error) {
      console.error('Error handling position update:', error);
    }
  };

  /**
   * Handle balance updates
   */
  const handleBalanceUpdated = async (balance: any) => {
    try {
      // MySQL backend handles auth
      if (!user) return;

      // Optionally sync DEX balance with wallet balance
      // This depends on your business logic
      console.log('Balance updated:', balance);
    } catch (error) {
      console.error('Error handling balance update:', error);
    }
  };

  /**
   * Send command to DEX
   */
  const sendCommandToDEX = (command: string, data: any) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: command,
          data,
        },
        DEX_BASE_URL
      );
    }
  };

  /**
   * Place order programmatically
   */
  const placeOrder = (orderData: {
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    amount: number;
    price?: number;
  }) => {
    sendCommandToDEX('placeOrder', orderData);
  };

  /**
   * Handle iframe load
   */
  const handleIframeLoad = () => {
    setIsLoading(false);
    console.log('DEX terminal loaded successfully');
  };

  /**
   * Handle iframe error
   */
  const handleIframeError = () => {
    setIsLoading(false);
    setError('Failed to load DEX terminal. Please make sure it is running at http://localhost:5173');
  };

  return (
    <div className={`dex-terminal ${fullscreen ? 'fullscreen' : ''}`}>
      {/* Loading indicator */}
      {isLoading && (
        <div className="dex-loading">
          <div className="spinner"></div>
          <p>Loading DEX Terminal...</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="dex-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      )}

      {/* DEX iframe */}
      <iframe
        ref={iframeRef}
        src={DEX_URL}
        title="DEX Trading Terminal"
        width="100%"
        height={fullscreen ? '100vh' : '800px'}
        frameBorder="0"
        allow="clipboard-read; clipboard-write; fullscreen"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        style={{
          border: 'none',
          borderRadius: fullscreen ? '0' : '8px',
          display: isLoading ? 'none' : 'block',
        }}
      />

      {/* Quick actions toolbar (optional) */}
      {!fullscreen && (
        <div className="dex-toolbar">
          <button onClick={() => sendCommandToDEX('refresh', {})}>
            Refresh
          </button>
          <button onClick={() => window.open(DEX_URL, '_blank')}>
            Open in New Tab
          </button>
        </div>
      )}

      <style jsx>{`
        .dex-terminal {
          position: relative;
          width: 100%;
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 8px;
          overflow: hidden;
        }

        .dex-terminal.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999;
          border-radius: 0;
        }

        .dex-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 800px;
          color: var(--text-primary, #ffffff);
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255, 255, 255, 0.1);
          border-top-color: var(--primary-color, #b084e9);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .dex-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 800px;
          color: var(--error-color, #ff4444);
          padding: 20px;
          text-align: center;
        }

        .dex-error button {
          margin-top: 20px;
          padding: 10px 20px;
          background: var(--primary-color, #b084e9);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .dex-toolbar {
          display: flex;
          gap: 10px;
          padding: 10px;
          background: var(--bg-tertiary, #2a2a2a);
          border-top: 1px solid var(--border-color, #333);
        }

        .dex-toolbar button {
          padding: 8px 16px;
          background: var(--bg-secondary, #1a1a1a);
          color: var(--text-primary, #ffffff);
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .dex-toolbar button:hover {
          background: var(--primary-color, #b084e9);
          border-color: var(--primary-color, #b084e9);
        }
      `}</style>
    </div>
  );
};

export default DEXTerminal;
