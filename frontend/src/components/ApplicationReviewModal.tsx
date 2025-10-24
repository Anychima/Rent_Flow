import React, { useState } from 'react';

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
  property: {
    title: string;
    address: string;
    city: string;
    state: string;
    monthly_rent_usdc: number;
  };
  applicant: {
    id: string;
    full_name: string;
    email: string;
  };
  manager_notes?: string;
}

interface ApplicationReviewModalProps {
  application: Application | null;
  onClose: () => void;
  onApprove: (notes: string) => Promise<void>;
  onReject: (notes: string) => Promise<void>;
  userId?: string;
}

const ApplicationReviewModal: React.FC<ApplicationReviewModalProps> = ({
  application,
  onClose,
  onApprove,
  onReject,
}) => {
  const [managerNotes, setManagerNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!application) return null;

  const incomeRatio = application.monthly_income_usdc / (application.property?.monthly_rent_usdc || 1);

  const handleApprove = async () => {
    setProcessing(true);
    try {
      await onApprove(managerNotes);
      setManagerNotes(''); // Clear notes on success
    } catch (error) {
      console.error('Error in handleApprove:', error);
      // Error will be shown by parent component
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Please provide a reason for rejection (optional):');
    setProcessing(true);
    try {
      await onReject(managerNotes + (reason ? `\nRejection reason: ${reason}` : ''));
      setManagerNotes(''); // Clear notes on success
    } catch (error) {
      console.error('Error in handleReject:', error);
      // Error will be shown by parent component
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-6xl w-full my-8">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Application Review</h2>
              <p className="text-blue-100 text-sm mt-1">
                {application.applicant?.full_name} - {application.property?.title}
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                setManagerNotes('');
              }}
              className="text-white hover:text-gray-200 text-3xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* AI Analysis Section - Enhanced */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-blue-600 rounded-lg mr-3">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800">AI Analysis & Recommendations</h3>
            </div>

            {/* Score Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600 mb-1">Compatibility Score</p>
                <div className="flex items-end justify-between">
                  <p
                    className={`text-5xl font-bold ${
                      application.ai_compatibility_score >= 75
                        ? 'text-green-600'
                        : application.ai_compatibility_score >= 60
                        ? 'text-blue-600'
                        : application.ai_compatibility_score >= 45
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}
                  >
                    {application.ai_compatibility_score}
                  </p>
                  <span className="text-gray-500 text-lg">/100</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {application.ai_compatibility_score >= 75
                    ? '✅ Excellent Match'
                    : application.ai_compatibility_score >= 60
                    ? '👍 Good Match'
                    : application.ai_compatibility_score >= 45
                    ? '⚠️ Fair Match'
                    : '❌ Poor Match'}
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600 mb-1">Risk Score</p>
                <div className="flex items-end justify-between">
                  <p
                    className={`text-5xl font-bold ${
                      application.ai_risk_score < 30
                        ? 'text-green-600'
                        : application.ai_risk_score < 60
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}
                  >
                    {application.ai_risk_score}
                  </p>
                  <span className="text-gray-500 text-lg">/100</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {application.ai_risk_score < 30
                    ? '✅ Low Risk'
                    : application.ai_risk_score < 60
                    ? '⚠️ Medium Risk'
                    : '❌ High Risk'}
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600 mb-1">Income-to-Rent Ratio</p>
                <p className="text-5xl font-bold text-blue-600">{incomeRatio.toFixed(1)}x</p>
                <p className="text-xs text-gray-500 mt-2">
                  {incomeRatio >= 3 ? '✅ Meets 3x requirement' : '⚠️ Below 3x requirement'}
                </p>
              </div>
            </div>

            {/* AI Recommendation */}
            {application.ai_analysis?.recommendation && (
              <div className="bg-white rounded-lg p-4 mb-4 border-l-4 border-blue-600">
                <p className="text-sm font-semibold text-gray-700 mb-1">AI Recommendation</p>
                <p className="text-gray-800">{application.ai_analysis.recommendation}</p>
              </div>
            )}

            {/* Key Factors */}
            {application.ai_analysis?.factors && application.ai_analysis.factors.length > 0 && (
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Key Evaluation Factors</p>
                <ul className="space-y-2">
                  {application.ai_analysis.factors.map((factor: string, i: number) => (
                    <li key={i} className="flex items-start">
                      <span className="text-blue-600 mr-2 mt-1">•</span>
                      <span className="text-sm text-gray-700">{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Applicant Details */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Applicant Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Full Name</p>
                <p className="font-semibold text-gray-800">{application.applicant?.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold text-gray-800">{application.applicant?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Employment Status</p>
                <p className="font-semibold text-gray-800">{application.employment_status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Monthly Income</p>
                <p className="font-semibold text-gray-800">
                  ${application.monthly_income_usdc.toLocaleString()} USDC
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Requested Move-in Date</p>
                <p className="font-semibold text-gray-800">
                  {new Date(application.requested_move_in_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Application Date</p>
                <p className="font-semibold text-gray-800">
                  {new Date(application.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Property Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Property</p>
                <p className="font-semibold text-gray-800">{application.property?.title}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Monthly Rent</p>
                <p className="font-semibold text-gray-800">
                  ${application.property?.monthly_rent_usdc.toLocaleString()} USDC
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-600">Address</p>
                <p className="font-semibold text-gray-800">
                  {application.property?.address}, {application.property?.city},{' '}
                  {application.property?.state}
                </p>
              </div>
            </div>
          </div>

          {/* Manager Notes */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3">Manager Notes</h3>
            <textarea
              value={managerNotes}
              onChange={(e) => setManagerNotes(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              placeholder="Add notes about this application (e.g., follow-up required, special conditions, verification status)..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t-2">
            {application.status === 'submitted' || application.status === 'under_review' ? (
              <>
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className="flex-1 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold text-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-2xl">✓</span>
                  <span>{processing ? 'Approving...' : 'Approve Application'}</span>
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing}
                  className="flex-1 px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold text-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-2xl">✕</span>
                  <span>{processing ? 'Rejecting...' : 'Reject Application'}</span>
                </button>
              </>
            ) : (
              <div className="flex-1 bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">
                <p className="text-blue-800 font-semibold">
                  Application Status: <span className="uppercase">{application.status}</span>
                </p>
                {application.status === 'approved' && (
                  <p className="text-sm text-blue-600 mt-1">
                    Use the "Generate Lease" button to proceed with lease creation
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationReviewModal;
