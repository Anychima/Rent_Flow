import { useState, useEffect } from 'react';
import { Wallet, Plus, Trash2, CheckCircle, AlertCircle, Star, Copy } from 'lucide-react';
import axios from 'axios';
import WalletConnectionModal from './WalletConnectionModal';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://rent-flow.onrender.com';

interface WalletItem {
  id: string;
  wallet_address: string;
  wallet_type: 'circle' | 'external';
  circle_wallet_id?: string;
  is_primary: boolean;
  label?: string;
  created_at: string;
}

interface WalletManagementProps {
  userId: string;
  userEmail: string;
}

export default function WalletManagement({ userId, userEmail }: WalletManagementProps) {
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchWallets();
  }, [userId]);

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/users/${userId}/wallets`);
      
      if (response.data.success) {
        setWallets(response.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching wallets:', err);
      setError('Failed to load wallets');
    } finally {
      setLoading(false);
    }
  };

  const handleWalletAdded = async () => {
    setShowAddModal(false);
    setSuccess('Wallet added successfully!');
    setTimeout(() => setSuccess(''), 3000);
    await fetchWallets();
  };

  const handleSetPrimary = async (walletId: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/users/${userId}/wallets/${walletId}/set-primary`);
      
      if (response.data.success) {
        setSuccess('Primary wallet updated!');
        setTimeout(() => setSuccess(''), 3000);
        await fetchWallets();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to set primary wallet');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRemoveWallet = async (walletId: string) => {
    if (!window.confirm('Are you sure you want to remove this wallet?')) {
      return;
    }

    try {
      const response = await axios.delete(`${API_URL}/api/users/${userId}/wallets/${walletId}`);
      
      if (response.data.success) {
        setSuccess('Wallet removed!');
        setTimeout(() => setSuccess(''), 3000);
        
        // Clear from localStorage
        localStorage.removeItem('rentflow_wallet');
        
        // Refresh wallet list
        await fetchWallets();
        
        // Force page reload to ensure all components sync
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove wallet');
      setTimeout(() => setError(''), 3000);
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setSuccess('Address copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Wallets</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage your Arc wallets for payments and lease signing
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Wallet
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Wallet List */}
      {wallets.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Wallets Added</h3>
          <p className="text-gray-600 mb-6">
            Add your first Arc wallet to start making payments and signing leases
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Your First Wallet
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className={`bg-white rounded-xl border-2 p-6 transition-all ${
                wallet.is_primary
                  ? 'border-blue-500 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      wallet.wallet_type === 'circle'
                        ? 'bg-blue-100'
                        : 'bg-gray-100'
                    }`}>
                      <Wallet className={`w-6 h-6 ${
                        wallet.wallet_type === 'circle'
                          ? 'text-blue-600'
                          : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {wallet.label || (wallet.wallet_type === 'circle' ? 'Circle Wallet' : 'External Wallet')}
                        </h3>
                        {wallet.is_primary && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                            <Star className="w-3 h-3 fill-current" />
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {wallet.wallet_type === 'circle' ? 'Managed by Circle' : 'External Wallet'}
                      </p>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-600 mb-1">Wallet Address</p>
                        <p className="font-mono text-sm text-gray-900 break-all">
                          {wallet.wallet_address}
                        </p>
                      </div>
                      <button
                        onClick={() => copyAddress(wallet.wallet_address)}
                        className="ml-3 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Copy address"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Wallet ID (for Circle wallets) */}
                  {wallet.circle_wallet_id && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-4">
                      <p className="text-xs font-medium text-blue-700 mb-1">Circle Wallet ID</p>
                      <p className="font-mono text-xs text-blue-900">{wallet.circle_wallet_id}</p>
                    </div>
                  )}

                  {/* Added Date */}
                  <p className="text-xs text-gray-500">
                    Added {new Date(wallet.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="ml-4 flex flex-col gap-2">
                  {!wallet.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(wallet.id)}
                      className="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Set as primary"
                    >
                      Set Primary
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveWallet(wallet.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove wallet"
                    disabled={wallet.is_primary && wallets.length > 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Primary Wallet Info */}
              {wallet.is_primary && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-xs text-blue-700">
                    ℹ️ This is your primary wallet. It will be used by default for payments and lease signing.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900 mb-1">About Multiple Wallets</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• You can add multiple Arc wallets for different purposes</li>
              <li>• Your primary wallet is used by default for all transactions</li>
              <li>• You can switch primary wallet or select specific wallets for payments</li>
              <li>• Circle wallets are managed securely by our system</li>
              <li>• External wallets require you to manage your own keys</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Add Wallet Modal */}
      {showAddModal && (
        <WalletConnectionModal
          userId={userId}
          userEmail={userEmail}
          onClose={() => setShowAddModal(false)}
          onWalletConnected={handleWalletAdded}
        />
      )}
    </div>
  );
}
