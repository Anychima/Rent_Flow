import React, { useState, useEffect, useRef } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  message_body: string;
  created_at: string;
  is_read: boolean;
  sender?: {
    id: string;
    full_name: string;
    email: string;
    role?: string;
  };
  recipient?: {
    id: string;
    full_name: string;
    email: string;
    role?: string;
  };
}

interface ChatBoxProps {
  applicationId?: string;  // Optional - for pre-lease chat
  leaseId?: string;        // Optional - for post-lease chat
  conversationType: 'application' | 'lease';
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserRole: string;
  onClose?: () => void;
}

export default function ChatBox({
  applicationId,
  leaseId,
  conversationType,
  currentUserId,
  otherUserId,
  otherUserName,
  otherUserRole,
  onClose
}: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const endpoint = conversationType === 'application'
        ? `${API_URL}/api/applications/${applicationId}/messages`
        : `${API_URL}/api/leases/${leaseId}/messages`;
      
      const response = await fetch(endpoint);
      const result = await response.json();
      
      if (result.success) {
        setMessages(result.data);
        
        // Mark unread messages as read
        const unreadMessages = result.data.filter(
          (msg: Message) => !msg.is_read && msg.recipient_id === currentUserId
        );
        
        if (unreadMessages.length > 0) {
          await fetch(`${API_URL}/api/messages/mark-read`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message_ids: unreadMessages.map((msg: Message) => msg.id),
              user_id: currentUserId
            })
          });
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const endpoint = conversationType === 'application'
        ? `${API_URL}/api/applications/${applicationId}/messages`
        : `${API_URL}/api/leases/${leaseId}/messages`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: currentUserId,
          recipient_id: otherUserId,
          message_body: newMessage.trim()
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setMessages([...messages, result.data]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch messages on mount and poll every 10 seconds
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [conversationType, applicationId, leaseId, currentUserId]);

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col h-[600px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">💬 Chat with {otherUserName}</h3>
          <p className="text-sm text-blue-100">
            {otherUserRole === 'manager' ? '🏢 Property Manager' : '👤 ' + (conversationType === 'lease' ? 'Tenant' : 'Prospective Tenant')}
          </p>
          {conversationType === 'lease' && (
            <p className="text-xs text-blue-200 mt-1">📋 Lease Conversation</p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 rounded-full p-2 transition-colors"
            aria-label="Close chat"
          >
            ✕
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p className="text-lg mb-2">💬</p>
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender_id === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    isOwnMessage
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">
                      {isOwnMessage ? 'You' : message.sender?.full_name || 'User'}
                    </span>
                    <span className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-400'}`}>
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.message_body}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white rounded-b-lg">
        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (Press Enter to send)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {sending ? '⏳' : '📤 Send'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  );
}
