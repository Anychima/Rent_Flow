import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://rent-flow.onrender.com';

interface VoiceNotification {
  id: string;
  user_id: string;
  type: string;
  audio_url: string;
  related_id?: string;
  status: string;
  sent_at?: string;
  created_at: string;
}

interface VoiceNotificationsProps {
  userId?: string;
}

const VoiceNotifications: React.FC<VoiceNotificationsProps> = ({ userId }) => {
  const [notifications, setNotifications] = useState<VoiceNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedNotification, setSelectedNotification] = useState<VoiceNotification | null>(null);

  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [userId]);

  const fetchNotifications = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/voice/notifications/${userId}`);
      const result = await response.json();

      if (result.success) {
        setNotifications(result.data);
      }
    } catch (error) {
      console.error('Error fetching voice notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestRentReminder = async () => {
    if (!userId) {
      alert('Please select a user first');
      return;
    }

    try {
      setLoading(true);
      // This would need a valid payment ID in production
      const response = await fetch(`${API_URL}/api/voice/rent-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: userId,
          paymentId: 'test-payment-id' // Replace with actual payment ID
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Rent reminder generated successfully!');
        fetchNotifications();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error generating rent reminder:', error);
      alert('Failed to generate rent reminder');
    } finally {
      setLoading(false);
    }
  };

  const playNotification = (notification: VoiceNotification) => {
    setSelectedNotification(notification);
  };

  const filteredNotifications = selectedType === 'all'
    ? notifications
    : notifications.filter(n => n.type === selectedType);

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      rent_reminder: '💰',
      maintenance_update: '🔧',
      payment_confirmation: '✅',
      lease_expiration: '📅',
      custom: '📢'
    };
    return icons[type] || '🔔';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      generated: 'bg-blue-100 text-blue-800',
      sent: 'bg-yellow-100 text-yellow-800',
      delivered: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      archived: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🔔 Voice Notifications</h2>
          <p className="text-gray-600 text-sm mt-1">AI-generated voice messages for tenants</p>
        </div>
        <button
          onClick={handleTestRentReminder}
          disabled={loading || !userId}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
        >
          🎤 Test Voice Notification
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 mb-6 overflow-x-auto">
        {['all', 'rent_reminder', 'maintenance_update', 'payment_confirmation', 'lease_expiration', 'custom'].map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
              selectedType === type
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {type === 'all' ? '🔔 All' : `${getTypeIcon(type)} ${type.replace('_', ' ')}`}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Loading notifications...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">No voice notifications yet</p>
          <p className="text-gray-400 text-sm mt-2">
            Voice notifications will appear here when generated
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">{getTypeIcon(notification.type)}</span>
                    <div>
                      <h3 className="font-semibold text-gray-800 capitalize">
                        {notification.type.replace('_', ' ')}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 mb-3">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(notification.status)}`}>
                      {notification.status}
                    </span>
                    {notification.sent_at && (
                      <span className="text-xs text-gray-500">
                        Sent: {new Date(notification.sent_at).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => playNotification(notification)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <span>▶️</span>
                    <span>Play Voice Message</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audio Player Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  {getTypeIcon(selectedNotification.type)} Voice Message
                </h3>
                <p className="text-sm text-gray-600 capitalize">
                  {selectedNotification.type.replace('_', ' ')}
                </p>
              </div>
              <button
                onClick={() => setSelectedNotification(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-6 mb-4">
              <audio
                controls
                autoPlay
                className="w-full"
                src={`${API_URL}${selectedNotification.audio_url}`}
              >
                Your browser does not support the audio element.
              </audio>
            </div>

            <div className="text-sm text-gray-600">
              <p>Created: {new Date(selectedNotification.created_at).toLocaleString()}</p>
              {selectedNotification.sent_at && (
                <p>Sent: {new Date(selectedNotification.sent_at).toLocaleString()}</p>
              )}
            </div>

            <button
              onClick={() => setSelectedNotification(null)}
              className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">💡</div>
          <div className="flex-1 text-sm">
            <h4 className="font-bold text-purple-900 mb-2">About Voice Notifications</h4>
            <ul className="text-purple-800 space-y-1">
              <li>• Automated AI-generated voice messages powered by ElevenLabs</li>
              <li>• Rent reminders sent 3 days before due date</li>
              <li>• Maintenance updates when status changes</li>
              <li>• Payment confirmations upon successful transactions</li>
              <li>• Lease expiration warnings at 30, 14, and 7 days</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceNotifications;
