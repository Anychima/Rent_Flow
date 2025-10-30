import React, { useState, useEffect } from 'react';
import { Wallet, Plus, RefreshCw, Copy, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

interface ArcWalletConnectProps {
  onWalletConnected?: (address: string, walletId: string) => void;
  showBalance?: boolean;
}

const ArcWalletConnect: React.FC<ArcWalletConnectProps> = ({ 
  onWalletConnected,
  showBalance = true 
}) => {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [walletId, setWalletId] = useState('');
  const [balance, setBalance] = useState<string>('0');
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'select' | 'connect' | 'create'>('select');

  useEffect(() => {
    // Check if user already has a wallet
    if (userProfile?.wallet_address && userProfile?.circle_wallet_id) {
      setWalletAddress(userProfile.wallet_address);
      setWalletId(userProfile.circle_wallet_id);
      setMode('connect'); // Already connected
      if (showBalance) {
        fetchBalance(userProfile.circle_wallet_id);
      }
    }
  }, [userProfile, showBalance]);

  const fetchBalance = async (wId: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/arc/wallet/${wId}/balance`);
      if (response.data.success) {
        setBalance(response.data.data.usdcBalance || '0');
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  };

  const createNewWallet = async () => {
    if (!user || !userProfile) {
      setError('Please login first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('🎯 Creating new Arc Testnet wallet...');
      
      const response = await axios.post(`${API_URL}/api/arc/wallet/create`, {
        userId: userProfile.id,
        userEmail: userProfile.email
      });

      if (response.data.success) {
        const { address, walletId: wId } = response.data.data;
        setWalletAddress(address);
        setWalletId(wId);
        setSuccess(`✅ Arc wallet created! Address: ${address.substring(0, 8)}...`);
        setMode('connect');

        if (onWalletConnected) {
          onWalletConnected(address, wId);
        }

        if (showBalance) {
          fetchBalance(wId);
        }
      } else {
        setError(response.data.error || 'Failed to create wallet');
      }
    } catch (err: any) {
      console.error('Error creating wallet:', err);
      setError(err.response?.data?.error || 'Failed to create Arc wallet');
    } finally {
      setLoading(false);
    }
  };

  const connectExistingWallet = async (address: string) => {
    // For now, just validate the address format
    // In a real implementation, you'd verify ownership
    if (!address || address.length < 20) {
      setError('Please enter a valid Arc wallet address');
      return;
    }

    setWalletAddress(address);
    setSuccess('✅ Wallet connected successfully!');
    setMode('connect');

    if (onWalletConnected) {
      onWalletConnected(address, '');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const refreshBalance = () => {
    if (walletId) {
      fetchBalance(walletId);
    }
  };

  // Selection Mode: Choose to connect or create
  if (mode === 'select') {
    return (
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Wallet className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Arc Testnet Wallet</h3>
            <p className="text-sm text-gray-600">Connect or create your wallet</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Create New Wallet */}
          <button
            onClick={createNewWallet}
            disabled={loading}
            className="p-6 border-2 border-blue-200 hover:border-blue-500 rounded-xl transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-4 bg-blue-50 rounded-full">
                <Plus className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-1">Create New Wallet</h4>
                <p className="text-xs text-gray-600">
                  Generate a new Arc Testnet wallet with Circle
                </p>
              </div>
              {loading && (
                <Loader className="w-5 h-5 text-blue-600 animate-spin" />
              )}
            </div>
          </button>

          {/* Connect Existing Wallet */}
          <button
            onClick={() => setMode('create')}
            disabled={loading}
            className="p-6 border-2 border-gray-200 hover:border-blue-500 rounded-xl transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-4 bg-gray-50 rounded-full">
                <Wallet className="w-8 h-8 text-gray-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-1">Connect Existing</h4>
                <p className="text-xs text-gray-600">
                  Use your existing Arc wallet address
                </p>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>🌐 Arc Testnet:</strong> All transactions use test USDC on Arc Testnet. No real funds required.
          </p>
        </div>
      </div>
    );
  }

  // Connect Existing Wallet Mode
  if (mode === 'create') {
    return (
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6 space-y-4">
        <button
          onClick={() => setMode('select')}
          className="text-sm text-blue-600 hover:text-blue-700 mb-2"
        >
          ← Back
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Wallet className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Connect Existing Wallet</h3>
            <p className="text-sm text-gray-600">Enter your Arc wallet address</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Arc Wallet Address
          </label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-sm"
          />
        </div>

        <button
          onClick={() => connectExistingWallet(walletAddress)}
          disabled={!walletAddress || loading}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  // Connected Mode: Show wallet details
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 rounded-lg">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Arc Wallet Connected</h3>
            <p className="text-sm text-gray-600">Arc Testnet</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 border border-green-300 rounded-full">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-xs font-semibold text-green-700">Connected</span>
        </div>
      </div>

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Wallet Address */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          WALLET ADDRESS
        </label>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm font-mono text-gray-900 break-all">
            {walletAddress}
          </code>
          <button
            onClick={() => copyToClipboard(walletAddress)}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Copy address"
          >
            {copied ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Balance */}
      {showBalance && walletId && (
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-gray-600">
              USDC BALANCE
            </label>
            <button
              onClick={refreshBalance}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Refresh balance"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {parseFloat(balance).toFixed(2)} USDC
          </div>
        </div>
      )}

      {/* Testnet Notice */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-xs text-yellow-800">
          <strong>⚠️ Testnet Wallet:</strong> This wallet uses Arc Testnet. Get test USDC from the{' '}
          <a
            href="https://faucet.circle.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-yellow-900"
          >
            Circle Faucet
          </a>
        </p>
      </div>
    </div>
  );
};

export default ArcWalletConnect;
