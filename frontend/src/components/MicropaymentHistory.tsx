import { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

interface Micropayment {
  id: string;
  from_user_id: string;
  to_user_id: string;
  amount_usdc: number;
  purpose: string;
  transaction_hash: string;
  status: string;
  blockchain_network: string;
  created_at: string;
  from_user?: {
    full_name: string;
    email: string;
  };
  to_user?: {
    full_name: string;
    email: string;
  };
}

interface MicropaymentHistoryProps {
  userId: string;
  userName?: string;
}

export default function MicropaymentHistory({ userId }: MicropaymentHistoryProps) {
  const [micropayments, setMicropayments] = useState<Micropayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMicropayments();
  }, [userId]);

  const fetchMicropayments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/api/micropayments/user/${userId}`);
      const result = await response.json();

      if (result.success) {
        setMicropayments(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch micropayments');
      }
    } catch (err) {
      console.error('Error fetching micropayments:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getExplorerLink = (transactionHash: string, network: string) => {
    if (transactionHash.startsWith('SIMULATED_')) {
      return null; // Simulated transaction, no real blockchain link
    }
    
    // For Arc Testnet
    if (network === 'arc') {
      return `https://testnet.arcscan.app/tx/${transactionHash}`;
    }
    
    return null;
  };

  const getFilteredMicropayments = () => {
    if (filter === 'sent') {
      return micropayments.filter(m => m.from_user_id === userId);
    } else if (filter === 'received') {
      return micropayments.filter(m => m.to_user_id === userId);
    }
    return micropayments;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalSent = () => {
    return micropayments
      .filter(m => m.from_user_id === userId && m.status === 'completed')
      .reduce((sum, m) => sum + m.amount_usdc, 0);
  };

  const getTotalReceived = () => {
    return micropayments
      .filter(m => m.to_user_id === userId && m.status === 'completed')
      .reduce((sum, m) => sum + m.amount_usdc, 0);
  };

  const filteredMicropayments = getFilteredMicropayments();

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
          <h2 className="text-2xl font-bold text-gray-900">💸 Micropayment History</h2>
          <p className="text-gray-600 mt-1">Track your USDC micropayments</p>
        </div>
        <button
          onClick={fetchMicropayments}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Received</p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                ${getTotalReceived().toFixed(2)}
              </p>
              <p className="text-xs text-green-600 mt-1">USDC</p>
            </div>
            <div className="bg-green-200 p-3 rounded-full">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Sent</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                ${getTotalSent().toFixed(2)}
              </p>
              <p className="text-xs text-blue-600 mt-1">USDC</p>
            </div>
            <div className="bg-blue-200 p-3 rounded-full">
              <span className="text-2xl">📤</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Total Transactions</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">
                {micropayments.length}
              </p>
              <p className="text-xs text-purple-600 mt-1">All Time</p>
            </div>
            <div className="bg-purple-200 p-3 rounded-full">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`px-6 py-3 font-medium transition-colors ${
            filter === 'all'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All ({micropayments.length})
        </button>
        <button
          onClick={() => setFilter('received')}
          className={`px-6 py-3 font-medium transition-colors ${
            filter === 'received'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Received ({micropayments.filter(m => m.to_user_id === userId).length})
        </button>
        <button
          onClick={() => setFilter('sent')}
          className={`px-6 py-3 font-medium transition-colors ${
            filter === 'sent'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Sent ({micropayments.filter(m => m.from_user_id === userId).length})
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">❌ {error}</p>
        </div>
      )}

      {/* Micropayments List */}
      <div className="space-y-4">
        {filteredMicropayments.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <span className="text-6xl mb-4 block">💸</span>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Micropayments Yet</h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? "You haven't sent or received any micropayments yet."
                : filter === 'sent'
                ? "You haven't sent any micropayments yet."
                : "You haven't received any micropayments yet."}
            </p>
          </div>
        ) : (
          filteredMicropayments.map((micropayment) => {
            const isSent = micropayment.from_user_id === userId;
            const explorerLink = getExplorerLink(micropayment.transaction_hash, micropayment.blockchain_network);
            const isSimulated = micropayment.transaction_hash.startsWith('SIMULATED_');

            return (
              <div key={micropayment.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Direction Indicator */}
                    <div className="flex items-center space-x-3 mb-3">
                      <span className={`text-2xl ${isSent ? '📤' : '📥'}`}>
                        {isSent ? '📤' : '📥'}
                      </span>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {isSent ? 'Sent' : 'Received'} ${micropayment.amount_usdc.toFixed(2)} USDC
                        </h3>
                        <p className="text-sm text-gray-500">
                          {isSent ? 'To' : 'From'}: {isSent ? micropayment.to_user?.full_name || micropayment.to_user?.email || 'Unknown' : micropayment.from_user?.full_name || micropayment.from_user?.email || 'Unknown'}
                        </p>
                      </div>
                    </div>

                    {/* Purpose */}
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700">Purpose:</p>
                      <p className="text-gray-900">{micropayment.purpose}</p>
                    </div>

                    {/* Transaction Hash */}
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Transaction:</p>
                      <div className="flex items-center space-x-2">
                        <code className="text-xs bg-gray-100 px-3 py-1 rounded font-mono">
                          {micropayment.transaction_hash.substring(0, 20)}...
                        </code>
                        {explorerLink ? (
                          <a
                            href={explorerLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                          >
                            <span>View on Solscan</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        ) : isSimulated ? (
                          <span className="text-xs text-gray-500 italic">
                            (Simulated - Circle API not configured)
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <span>🕒</span>
                        <span>{formatDate(micropayment.created_at)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>⛓️</span>
                        <span className="capitalize">{micropayment.blockchain_network}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="ml-4">
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold capitalize ${getStatusColor(micropayment.status)}`}>
                      {micropayment.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Info Box */}
      {micropayments.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <span className="text-blue-600 text-xl">💡</span>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">About Micropayments</p>
              <p>
                Micropayments are small USDC transfers (up to $10) processed on the {' '}
                {micropayments[0]?.blockchain_network === 'arc' ? 'Arc Testnet' : 'blockchain'}.
                {' '}Transactions marked as "SIMULATED" are created in development mode. 
                Configure Circle API keys for real blockchain transactions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
