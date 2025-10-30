import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ChatBox from './ChatBox';

interface Property {
  id: string;
  owner_id?: string;
  title: string;
  address: string;
  city: string;
  state: string;
  monthly_rent_usdc: number;
  bedrooms: number;
  bathrooms: number;
  property_type: string;
}

interface Application {
  id: string;
  property_id: string;
  applicant_id: string;
  status: string;
  employment_status: string;
  monthly_income_usdc: number;
  ai_compatibility_score: number;
  ai_risk_score: number;
  ai_analysis: any;
  requested_move_in_date: string;
  created_at: string;
  property: Property;
  manager_notes?: string;
  rejection_reason?: string;
}

const MyApplications: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [chatApplication, setChatApplication] = useState<Application | null>(null);
  const [leaseStatus, setLeaseStatus] = useState<Record<string, { exists: boolean; signed: boolean }>>({});

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchApplications();
  }, [user, userProfile]);

  const checkLeaseStatus = async (apps: Application[]) => {
    const approvedApps = apps.filter(app => app.status === 'approved');
    const statusMap: Record<string, { exists: boolean; signed: boolean; tenantSigned: boolean; managerSigned: boolean }> = {};
    
    for (const app of approvedApps) {
      try {
        const response = await fetch(`${API_URL}/api/leases/by-application/${app.id}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          const lease = result.data;
          statusMap[app.id] = {
            exists: true,
            signed: !!lease.tenant_signature && !!lease.landlord_signature,
            tenantSigned: !!lease.tenant_signature,
            managerSigned: !!lease.landlord_signature
          };
        } else {
          statusMap[app.id] = { exists: false, signed: false, tenantSigned: false, managerSigned: false };
        }
      } catch (err) {
        console.error('Error checking lease status:', err);
        statusMap[app.id] = { exists: false, signed: false, tenantSigned: false, managerSigned: false };
      }
    }
    
    setLeaseStatus(statusMap);
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching applications for user:', userProfile?.id);
      
      const response = await fetch(`${API_URL}/api/applications/my-applications?user_id=${userProfile?.id}`);
      const result = await response.json();

      console.log('📥 Applications response:', result);

      if (result.success) {
        // Filter out applications with missing property data
        const validApplications = result.data.filter((app: Application) => {
          if (!app.property) {
            console.warn('⚠️ Application missing property data:', app);
            return false;
          }
          return true;
        });
        
        console.log(`✅ Loaded ${validApplications.length} valid applications out of ${result.data.length} total`);
        setApplications(validApplications);
        
        // Check lease status for approved applications
        checkLeaseStatus(validApplications);
      } else {
        setError('Failed to load applications');
      }
    } catch (err) {
      setError('Error loading applications');
      console.error('❌ Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'lease_signed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return '📝';
      case 'under_review':
        return '🔍';
      case 'approved':
        return '✅';
      case 'rejected':
        return '❌';
      case 'withdrawn':
        return '🚫';
      case 'lease_signed':
        return '📄';
      default:
        return '📋';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 45) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 75) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 45) return 'Fair';
    return 'Needs Improvement';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                My Applications
              </h1>
              <p className="text-gray-600 mt-1">Track your rental application status</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-md hover:shadow-lg"
            >
              ← Browse Properties
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {applications.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="mb-6">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-5xl">📋</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Applications Yet</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              You haven't submitted any rental applications. Browse our properties to find your perfect home!
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-md hover:shadow-lg"
            >
              Browse Available Properties
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {applications.map((application) => (
              <div
                key={application.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-start space-x-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-3xl">
                            {application.property?.property_type === 'house' ? '🏠' :
                             application.property?.property_type === 'apartment' ? '🏢' :
                             application.property?.property_type === 'condo' ? '🏘️' :
                             application.property?.property_type === 'studio' ? '🏙️' : '🏠'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800 mb-1">
                            {application.property?.title || 'Property'}
                          </h3>
                          <p className="text-gray-600 text-sm mb-2">
                            {application.property?.address}, {application.property?.city}, {application.property?.state}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>🛏️ {application.property?.bedrooms || 0} bed</span>
                            <span>🚿 {application.property?.bathrooms || 0} bath</span>
                            <span>💰 ${application.property?.monthly_rent_usdc?.toLocaleString() || '0'}/mo</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <span className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 ${getStatusColor(application.status)}`}>
                        {getStatusIcon(application.status)} {application.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        Applied {new Date(application.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* AI Scores */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                      <p className="text-xs text-gray-600 mb-1">Compatibility Score</p>
                      <div className="flex items-end justify-between">
                        <span className={`text-3xl font-bold ${getScoreColor(application.ai_compatibility_score)}`}>
                          {application.ai_compatibility_score}
                        </span>
                        <span className="text-xs text-gray-500">/100</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{getScoreLabel(application.ai_compatibility_score)}</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                      <p className="text-xs text-gray-600 mb-1">Risk Score</p>
                      <div className="flex items-end justify-between">
                        <span className={`text-3xl font-bold ${getScoreColor(100 - application.ai_risk_score)}`}>
                          {application.ai_risk_score}
                        </span>
                        <span className="text-xs text-gray-500">/100</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{application.ai_risk_score < 30 ? 'Low Risk' : application.ai_risk_score < 60 ? 'Medium Risk' : 'High Risk'}</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-lg p-4 border border-green-100">
                      <p className="text-xs text-gray-600 mb-1">Move-in Date</p>
                      <p className="text-lg font-bold text-gray-800">
                        {new Date(application.requested_move_in_date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">Requested</p>
                    </div>
                  </div>

                  {/* AI Analysis Summary */}
                  {application.ai_analysis && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-gray-800 text-sm mb-2">AI Analysis</h4>
                      <p className="text-sm text-gray-700 mb-2">
                        <span className="font-medium">Recommendation:</span> {application.ai_analysis.recommendation}
                      </p>
                      {application.ai_analysis.factors && application.ai_analysis.factors.length > 0 && (
                        <div className="space-y-1">
                          {application.ai_analysis.factors.slice(0, 3).map((factor: string, index: number) => (
                            <p key={index} className="text-xs text-gray-600">
                              {factor}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manager Notes or Rejection Reason */}
                  {application.manager_notes && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-blue-900 text-sm mb-2">Manager Notes</h4>
                      <p className="text-sm text-blue-800">{application.manager_notes}</p>
                    </div>
                  )}

                  {application.rejection_reason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-red-900 text-sm mb-2">Rejection Reason</h4>
                      <p className="text-sm text-red-800">{application.rejection_reason}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setSelectedApplication(application)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View Full Details →
                    </button>
                    
                    <div className="flex items-center gap-3">
                      {application.status === 'approved' && (
                        <>
                          <button
                            onClick={() => setChatApplication(application)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                          >
                            💬 Chat with Landlord
                          </button>
                          
                          {leaseStatus[application.id]?.exists ? (
                            <button
                              onClick={() => navigate(`/lease/sign/${application.id}`)}
                              className="px-6 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all font-medium shadow-md hover:shadow-lg"
                            >
                              📄 {leaseStatus[application.id]?.signed ? 'View Lease' : 'Sign Lease'}
                            </button>
                          ) : (
                            <div className="px-6 py-2 bg-yellow-50 border-2 border-yellow-200 text-yellow-700 rounded-lg font-medium">
                              ⏳ Awaiting Lease from Landlord
                            </div>
                          )}
                        </>
                      )}
                      
                      {(application.status === 'submitted' || application.status === 'under_review') && (
                        <button
                          onClick={() => navigate(`/property/${application.property_id}`)}
                          className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
                        >
                          View Property
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Modal */}
      {chatApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full">
            <ChatBox
              applicationId={chatApplication.id}
              conversationType="application"
              currentUserId={user?.id || ''}
              otherUserId={chatApplication.property.owner_id || ''}
              otherUserName="Property Manager"
              otherUserRole="manager"
              onClose={() => setChatApplication(null)}
            />
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Application Details</h2>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Property Info */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Property Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <p><span className="text-gray-600">Property:</span> <span className="font-medium">{selectedApplication.property?.title || 'N/A'}</span></p>
                  <p><span className="text-gray-600">Address:</span> <span className="font-medium">{selectedApplication.property?.address}, {selectedApplication.property?.city}, {selectedApplication.property?.state}</span></p>
                  <p><span className="text-gray-600">Monthly Rent:</span> <span className="font-medium">${selectedApplication.property?.monthly_rent_usdc?.toLocaleString() || '0'} USDC</span></p>
                </div>
              </div>

              {/* Application Info */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Your Application</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <p><span className="text-gray-600">Employment Status:</span> <span className="font-medium">{selectedApplication.employment_status}</span></p>
                  <p><span className="text-gray-600">Monthly Income:</span> <span className="font-medium">${selectedApplication.monthly_income_usdc.toLocaleString()} USDC</span></p>
                  <p><span className="text-gray-600">Income-to-Rent Ratio:</span> <span className="font-medium">
                    {selectedApplication.property?.monthly_rent_usdc 
                      ? (selectedApplication.monthly_income_usdc / selectedApplication.property.monthly_rent_usdc).toFixed(2) 
                      : 'N/A'}x
                  </span></p>
                  <p><span className="text-gray-600">Requested Move-in:</span> <span className="font-medium">
                    {new Date(selectedApplication.requested_move_in_date).toLocaleDateString()}
                  </span></p>
                </div>
              </div>

              {/* Full AI Analysis */}
              {selectedApplication.ai_analysis && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Detailed AI Analysis</h3>
                  <div className="bg-blue-50 rounded-lg p-4 space-y-3 text-sm">
                    <p><span className="text-gray-700">Recommendation:</span> <span className="font-semibold text-blue-900">{selectedApplication.ai_analysis.recommendation}</span></p>
                    
                    {selectedApplication.ai_analysis.factors && (
                      <div>
                        <p className="text-gray-700 font-medium mb-2">Evaluation Factors:</p>
                        <ul className="space-y-1 pl-4">
                          {selectedApplication.ai_analysis.factors.map((factor: string, index: number) => (
                            <li key={index} className="text-gray-600">{factor}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyApplications;
