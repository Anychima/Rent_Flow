import React, { useState } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

interface Tenant {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  wallet_address?: string;
  role: string;
  is_active: boolean;
}

interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  monthly_rent_usdc: number;
}

interface Lease {
  id: string;
  property_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  monthly_rent_usdc: number;
  security_deposit_usdc: number;
  status: string;
  property: Property;
}

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Payment {
  id: string;
  lease_id: string;
  amount_usdc: number;
  payment_type: string;
  status: string;
  due_date: string;
  paid_at?: string;
  transaction_hash?: string;
  created_at: string;
}

interface DashboardData {
  tenant: Tenant;
  lease: Lease | null;
  maintenanceRequests: MaintenanceRequest[];
  payments: Payment[];
}

interface TenantPortalProps {
  onBack: () => void;
}

const TenantPortal: React.FC<TenantPortalProps> = ({ onBack }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginWallet, setLoginWallet] = useState('');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'maintenance' | 'payments' | 'wallet'>('overview');
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    title: '',
    description: '',
    category: 'plumbing',
    priority: 'medium'
  });
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [walletType, setWalletType] = useState<'circle' | 'external'>('circle');

  const handleLogin = async () => {
    if (!loginEmail && !loginWallet) {
      alert('Please enter email or wallet address');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/tenant/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail || undefined,
          wallet_address: loginWallet || undefined
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsLoggedIn(true);
        await fetchDashboard(result.data.tenant.id);
      } else {
        alert(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboard = async (tenantId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/tenant/${tenantId}/dashboard`);
      const result = await response.json();

      if (result.success) {
        setDashboardData(result.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMaintenance = async () => {
    if (!dashboardData?.tenant?.id) return;

    if (!maintenanceForm.title || !maintenanceForm.description) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/tenant/${dashboardData.tenant.id}/maintenance`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(maintenanceForm),
        }
      );

      const result = await response.json();

      if (result.success) {
        alert('✅ Maintenance request submitted successfully!');
        setShowMaintenanceForm(false);
        setMaintenanceForm({ title: '', description: '', category: 'plumbing', priority: 'medium' });
        await fetchDashboard(dashboardData.tenant.id);
      } else {
        alert(result.error || 'Submission failed');
      }
    } catch (error) {
      console.error('Error submitting maintenance:', error);
      alert('Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInitiatePayment = async (paymentId: string) => {
    if (!dashboardData?.tenant?.id) return;

    const walletAddress = prompt('Enter your wallet address to pay from:');
    if (!walletAddress) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/tenant/${dashboardData.tenant.id}/payments/initiate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId,
            fromAddress: walletAddress
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        alert(`✅ Payment initiated!\n\nTransaction: ${result.data.transactionHash || 'Processing...'}`);
        await fetchDashboard(dashboardData.tenant.id);
      } else {
        alert(result.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Error initiating payment:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWallet = async () => {
    if (!dashboardData?.tenant?.id) return;

    if (!newWalletAddress) {
      alert('Please enter a wallet address');
      return;
    }

    // Validate wallet address format
    if (walletType === 'circle') {
      // UUID format for Circle wallets
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(newWalletAddress)) {
        alert('Invalid Circle wallet ID format. Must be a UUID.');
        return;
      }
    } else {
      // EVM address format (0x...)
      if (!/^0x[0-9a-fA-F]{40}$/.test(newWalletAddress)) {
        alert('Invalid wallet address format. Must be an EVM address (0x...)');
        return;
      }
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/users/${dashboardData.tenant.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: newWalletAddress,
            circle_wallet_id: walletType === 'circle' ? newWalletAddress : undefined
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        alert('✅ Wallet address updated successfully!');
        setNewWalletAddress('');
        await fetchDashboard(dashboardData.tenant.id);
      } else {
        alert(result.error || 'Failed to update wallet');
      }
    } catch (error) {
      console.error('Error updating wallet:', error);
      alert('Failed to update wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-md mx-auto">
          <button
            onClick={onBack}
            className="mb-4 text-blue-600 hover:text-blue-800 flex items-center"
          >
            ← Back to Dashboard
          </button>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">🏠 Tenant Portal</h1>
              <p className="text-gray-600">Access your rental information</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="tenant@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="text-center text-gray-500 text-sm">OR</div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wallet Address
                </label>
                <input
                  type="text"
                  value={loginWallet}
                  onChange={(e) => setLoginWallet(e.target.value)}
                  placeholder="Your Arc wallet address"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const { tenant, lease, maintenanceRequests, payments } = dashboardData || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={onBack}
              className="mb-2 text-blue-600 hover:text-blue-800 flex items-center"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-800">Welcome, {tenant?.full_name}!</h1>
            <p className="text-gray-600">{tenant?.email}</p>
          </div>
          <button
            onClick={() => {
              setIsLoggedIn(false);
              setDashboardData(null);
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Logout
          </button>
        </div>

        {/* Lease Summary Card */}
        {lease && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  🏡 {lease.property.title}
                </h2>
                <p className="text-gray-600 mb-4">
                  {lease.property.address}, {lease.property.city}, {lease.property.state}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Monthly Rent</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ${lease.monthly_rent_usdc} USDC
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Lease Period</p>
                    <p className="text-lg font-medium">
                      {new Date(lease.start_date).toLocaleDateString()} - {new Date(lease.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-full font-medium">
                  ✓ Active Lease
                </span>
              </div>
            </div>
          </div>
        )}

        {!lease && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
            <p className="text-yellow-800">⚠️ No active lease found. Please contact your landlord.</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-lg font-medium ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`px-6 py-3 rounded-lg font-medium ${
              activeTab === 'maintenance'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            🔧 Maintenance
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-6 py-3 rounded-lg font-medium ${
              activeTab === 'payments'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            💳 Payments
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`px-6 py-3 rounded-lg font-medium ${
              activeTab === 'wallet'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            👛 Wallet
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="text-3xl mb-2">🔧</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Maintenance</h3>
              <p className="text-3xl font-bold text-blue-600">{maintenanceRequests?.length || 0}</p>
              <p className="text-sm text-gray-600">Total Requests</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="text-3xl mb-2">💳</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Payments</h3>
              <p className="text-3xl font-bold text-green-600">
                {payments?.filter(p => p.status === 'completed').length || 0}
              </p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="text-3xl mb-2">⏰</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Pending</h3>
              <p className="text-3xl font-bold text-orange-600">
                {payments?.filter(p => p.status === 'pending').length || 0}
              </p>
              <p className="text-sm text-gray-600">Due Payments</p>
            </div>
          </div>
        )}

        {/* Maintenance Tab */}
        {activeTab === 'maintenance' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Maintenance Requests</h2>
              <button
                onClick={() => setShowMaintenanceForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + New Request
              </button>
            </div>

            {showMaintenanceForm && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h3 className="text-xl font-bold mb-4">Submit Maintenance Request</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input
                      type="text"
                      value={maintenanceForm.title}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Leaking faucet in bathroom"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={maintenanceForm.description}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows={4}
                      placeholder="Describe the issue in detail..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select
                        value={maintenanceForm.category}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, category: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="plumbing">Plumbing</option>
                        <option value="electrical">Electrical</option>
                        <option value="hvac">HVAC</option>
                        <option value="appliance">Appliance</option>
                        <option value="structural">Structural</option>
                        <option value="pest_control">Pest Control</option>
                        <option value="landscaping">Landscaping</option>
                        <option value="security">Security</option>
                        <option value="cleaning">Cleaning</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                      <select
                        value={maintenanceForm.priority}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, priority: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex space-x-4">
                    <button
                      onClick={handleSubmitMaintenance}
                      disabled={loading}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {loading ? 'Submitting...' : 'Submit Request'}
                    </button>
                    <button
                      onClick={() => setShowMaintenanceForm(false)}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {maintenanceRequests?.length === 0 && (
                <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">
                  No maintenance requests yet
                </div>
              )}

              {maintenanceRequests?.map((request) => (
                <div key={request.id} className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">{request.title}</h3>
                      <p className="text-gray-600 mb-4">{request.description}</p>
                      <div className="flex space-x-4 text-sm">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full capitalize">
                          {request.category.replace('_', ' ')}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full capitalize ${
                            request.priority === 'urgent'
                              ? 'bg-red-100 text-red-800'
                              : request.priority === 'high'
                              ? 'bg-orange-100 text-orange-800'
                              : request.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {request.priority}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full capitalize ${
                            request.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : request.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : request.status === 'approved'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {request.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Payment History</h2>

            <div className="space-y-4">
              {payments?.length === 0 && (
                <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">
                  No payment records yet
                </div>
              )}

              {payments?.map((payment) => (
                <div key={payment.id} className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800 mb-2">
                        ${payment.amount_usdc} USDC
                      </h3>
                      <p className="text-gray-600 mb-2 capitalize">
                        {payment.payment_type.replace('_', ' ')}
                      </p>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full ${
                            payment.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : payment.status === 'processing'
                              ? 'bg-blue-100 text-blue-800'
                              : payment.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {payment.status}
                        </span>
                        {payment.transaction_hash && (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-500">TX:</span>
                            <a
                              href={`https://testnet.arcscan.app/tx/${payment.transaction_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline font-mono"
                              title={payment.transaction_hash}
                            >
                              {payment.transaction_hash.substring(0, 10)}...{payment.transaction_hash.substring(payment.transaction_hash.length - 8)}
                            </a>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(payment.transaction_hash!);
                                alert('✅ Transaction hash copied to clipboard!');
                              }}
                              className="text-gray-500 hover:text-gray-700"
                              title="Copy transaction hash"
                            >
                              📋
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm text-gray-500 mb-2">
                        Due: {new Date(payment.due_date).toLocaleDateString()}
                      </p>
                      {payment.paid_at && (
                        <p className="text-sm text-green-600">
                          Paid: {new Date(payment.paid_at).toLocaleDateString()}
                        </p>
                      )}
                      {payment.status === 'pending' && (
                        <button
                          onClick={() => handleInitiatePayment(payment.id)}
                          disabled={loading}
                          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                        >
                          Pay Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wallet Tab */}
        {activeTab === 'wallet' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Wallet Management</h2>

            {/* Current Wallet Info */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">👛 Current Wallet</h3>
              <div className="space-y-3">
                {tenant?.wallet_address ? (
                  <>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Wallet Address</p>
                      <div className="flex items-center space-x-2">
                        <p className="font-mono text-sm bg-gray-100 px-3 py-2 rounded break-all flex-1">
                          {tenant.wallet_address}
                        </p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(tenant.wallet_address!);
                            alert('✅ Wallet address copied to clipboard!');
                          }}
                          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                          title="Copy address"
                        >
                          📋 Copy
                        </button>
                      </div>
                    </div>
                    {(tenant as any).circle_wallet_id && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Circle Wallet ID</p>
                        <div className="flex items-center space-x-2">
                          <p className="font-mono text-sm bg-gray-100 px-3 py-2 rounded break-all flex-1">
                            {(tenant as any).circle_wallet_id}
                          </p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText((tenant as any).circle_wallet_id);
                              alert('✅ Circle wallet ID copied to clipboard!');
                            }}
                            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            title="Copy wallet ID"
                          >
                            📋 Copy
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800">⚠️ No wallet configured yet. Add a wallet below to make payments.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Add/Update Wallet */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">➕ Add/Update Wallet</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wallet Type
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="circle"
                        checked={walletType === 'circle'}
                        onChange={(e) => setWalletType(e.target.value as 'circle' | 'external')}
                        className="mr-2"
                      />
                      <span>Circle Wallet (Arc Testnet)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="external"
                        checked={walletType === 'external'}
                        onChange={(e) => setWalletType(e.target.value as 'circle' | 'external')}
                        className="mr-2"
                      />
                      <span>External Wallet (EVM Address)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {walletType === 'circle' ? 'Circle Wallet ID (UUID)' : 'Wallet Address (0x...)'}
                  </label>
                  <input
                    type="text"
                    value={newWalletAddress}
                    onChange={(e) => setNewWalletAddress(e.target.value)}
                    placeholder={walletType === 'circle' ? 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' : '0x...'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {walletType === 'circle'
                      ? 'Enter your Circle wallet UUID from the Circle dashboard'
                      : 'Enter your EVM-compatible wallet address (e.g., MetaMask, Arc wallet)'}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> For Arc Testnet payments, we recommend using a Circle wallet.
                    You can create one at{' '}
                    <a
                      href="https://console.circle.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-900"
                    >
                      Circle Console
                    </a>
                  </p>
                </div>

                <button
                  onClick={handleAddWallet}
                  disabled={loading || !newWalletAddress}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                >
                  {loading ? 'Updating...' : tenant?.wallet_address ? 'Update Wallet' : 'Add Wallet'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantPortal;
