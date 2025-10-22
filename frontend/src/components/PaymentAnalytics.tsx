import { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

interface PaymentAnalytics {
  total: number;
  byStatus: {
    completed: number;
    pending: number;
    late: number;
    failed: number;
  };
  revenue: {
    total: string;
    expected: string;
    thisMonth: string;
  };
  metrics: {
    collectionRate: string;
    averagePayment: string;
  };
}

export default function PaymentAnalytics() {
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/payments/analytics`);
      const result = await response.json();
      
      if (result.success) {
        setAnalytics(result.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMonthlyPayments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/payments/generate-monthly`, {
        method: 'POST',
      });
      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Generated ${result.data.created} payment(s)\n\n${result.data.details.join('\n')}`);
        fetchAnalytics();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error generating payments:', error);
      alert('❌ Failed to generate payments');
    }
  };

  const handleMarkOverdue = async () => {
    try {
      const response = await fetch(`${API_URL}/api/payments/mark-overdue`, {
        method: 'POST',
      });
      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Marked ${result.data.updated} payment(s) as late`);
        fetchAnalytics();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error marking overdue:', error);
      alert('❌ Failed to mark overdue payments');
    }
  };

  const handleSendReminders = async () => {
    try {
      const response = await fetch(`${API_URL}/api/payments/send-reminders`, {
        method: 'POST',
      });
      const result = await response.json();
      
      if (result.success) {
        const preview = result.data.details.slice(0, 5).join('\n');
        const more = result.data.details.length > 5 ? '\n...' : '';
        alert(`✅ Sent ${result.data.sent} reminder(s)\n\n${preview}${more}`);
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      alert('❌ Failed to send reminders');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-8 text-center text-gray-500">
        No payment data available
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'late': return 'bg-red-100 text-red-800';
      case 'failed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Payment Analytics</h2>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Revenue</p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                ${analytics.revenue.total}
              </p>
              <p className="text-xs text-green-600 mt-1">USDC Collected</p>
            </div>
            <div className="bg-green-200 p-3 rounded-full">
              <svg className="w-8 h-8 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">This Month</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                ${analytics.revenue.thisMonth}
              </p>
              <p className="text-xs text-blue-600 mt-1">Current Period</p>
            </div>
            <div className="bg-blue-200 p-3 rounded-full">
              <svg className="w-8 h-8 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Collection Rate</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">
                {analytics.metrics.collectionRate}%
              </p>
              <p className="text-xs text-purple-600 mt-1">Success Rate</p>
            </div>
            <div className="bg-purple-200 p-3 rounded-full">
              <svg className="w-8 h-8 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Status Breakdown */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(analytics.byStatus).map(([status, count]) => (
            <div key={status} className="text-center">
              <div className={`${getStatusColor(status)} px-4 py-3 rounded-lg`}>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-sm font-medium capitalize mt-1">{status}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Payments:</span>
              <span className="ml-2 font-semibold text-gray-900">{analytics.total}</span>
            </div>
            <div>
              <span className="text-gray-600">Average Payment:</span>
              <span className="ml-2 font-semibold text-gray-900">${analytics.metrics.averagePayment}</span>
            </div>
            <div>
              <span className="text-gray-600">Expected Revenue:</span>
              <span className="ml-2 font-semibold text-gray-900">${analytics.revenue.expected}</span>
            </div>
            <div>
              <span className="text-gray-600">Outstanding:</span>
              <span className="ml-2 font-semibold text-red-600">
                ${(parseFloat(analytics.revenue.expected) - parseFloat(analytics.revenue.total)).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Automated Tasks */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Automated Payment Tasks</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <p className="font-medium text-gray-900">Generate Monthly Payments</p>
              <p className="text-sm text-gray-600">Create payment records for all active leases (current + next 2 months)</p>
            </div>
            <button
              onClick={handleGenerateMonthlyPayments}
              className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              ⚡ Generate Now
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <p className="font-medium text-gray-900">Mark Overdue Payments</p>
              <p className="text-sm text-gray-600">Automatically mark pending payments past due date as "late"</p>
            </div>
            <button
              onClick={handleMarkOverdue}
              className="ml-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap"
            >
              ⏰ Mark Now
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <p className="font-medium text-gray-900">Send Payment Reminders</p>
              <p className="text-sm text-gray-600">Send reminders to tenants for payments due in 3 days or 1 day</p>
            </div>
            <button
              onClick={handleSendReminders}
              className="ml-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
            >
              📧 Send Now
            </button>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-900">Automation Tip</p>
              <p className="text-sm text-blue-700 mt-1">
                These tasks should be scheduled to run automatically via cron jobs. 
                Recommended: Generate payments (monthly), Mark overdue (daily), Send reminders (daily).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
