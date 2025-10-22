import { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
}

interface MaintenanceRequest {
  id?: string;
  property_id: string;
  requestor_id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  estimated_cost_usdc?: number;
  actual_cost_usdc?: number;
  assigned_to?: string;
  notes?: string;
}

interface MaintenanceFormProps {
  maintenance?: MaintenanceRequest | null;
  onClose: () => void;
  onSubmit: (maintenance: Partial<MaintenanceRequest>) => Promise<void>;
}

const CATEGORIES = [
  'plumbing',
  'electrical',
  'hvac',
  'appliance',
  'structural',
  'pest_control',
  'landscaping',
  'security',
  'cleaning',
  'other'
];

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES = ['pending', 'approved', 'in_progress', 'completed', 'rejected'];

export default function MaintenanceForm({ maintenance, onClose, onSubmit }: MaintenanceFormProps) {
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [formData, setFormData] = useState<Partial<MaintenanceRequest>>({
    property_id: '',
    requestor_id: 'a0000000-0000-0000-0000-000000000001', // Default manager
    title: '',
    description: '',
    category: 'other',
    priority: 'medium',
    status: 'pending',
    estimated_cost_usdc: 0,
    actual_cost_usdc: 0,
    assigned_to: '',
    notes: '',
  });

  useEffect(() => {
    fetchProperties();
    if (maintenance) {
      setFormData(maintenance);
    }
  }, [maintenance]);

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true);
      const response = await fetch(`${API_URL}/api/properties`);
      const result = await response.json();
      
      if (result.success) {
        setProperties(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoadingProperties(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting maintenance request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (!formData.title || !formData.description) {
      alert('Please enter title and description first');
      return;
    }

    try {
      setAnalyzingAI(true);
      const propertyType = properties.find(p => p.id === formData.property_id)?.title || '';
      
      const response = await fetch(`${API_URL}/api/maintenance/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          propertyType
        }),
      });

      const result = await response.json();

      if (result.success) {
        const analysis = result.data;
        setAiAnalysis(analysis);
        
        // Apply AI suggestions to form
        setFormData(prev => ({
          ...prev,
          priority: analysis.suggestedPriority,
          category: analysis.suggestedCategory,
          estimated_cost_usdc: analysis.estimatedCost.average,
        }));

        alert(`🤖 AI Analysis Complete!

Priority: ${analysis.suggestedPriority}
Category: ${analysis.suggestedCategory}
Est. Cost: $${analysis.estimatedCost.average}

${analysis.reasoning}`);
      } else {
        alert('AI analysis failed. Please try again.');
      }
    } catch (error) {
      console.error('Error analyzing with AI:', error);
      alert('AI analysis error. Please try again.');
    } finally {
      setAnalyzingAI(false);
    }
  };

  if (loadingProperties) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {maintenance ? 'Edit Maintenance Request' : 'Create Maintenance Request'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property *
                </label>
                <select
                  name="property_id"
                  required
                  value={formData.property_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a property</option>
                  {properties.map(property => (
                    <option key={property.id} value={property.id}>
                      {property.title} - {property.address}, {property.city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Leaking faucet in kitchen"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  required
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Provide detailed description of the issue..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* AI Analysis Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAIAnalysis}
                  disabled={analyzingAI || !formData.title || !formData.description}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {analyzingAI ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>🤖 Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <span>🤖</span>
                      <span>Analyze with AI</span>
                    </>
                  )}
                </button>
              </div>

              {/* AI Analysis Results */}
              {aiAnalysis && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-3xl">🤖</div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-purple-900 mb-2">AI Analysis Results</h4>
                      <div className="space-y-2 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-purple-600 font-medium">Priority:</span>
                            <span className="ml-2 text-purple-900 capitalize">{aiAnalysis.suggestedPriority}</span>
                          </div>
                          <div>
                            <span className="text-purple-600 font-medium">Category:</span>
                            <span className="ml-2 text-purple-900 capitalize">{aiAnalysis.suggestedCategory.replace('_', ' ')}</span>
                          </div>
                          <div>
                            <span className="text-purple-600 font-medium">Est. Cost:</span>
                            <span className="ml-2 text-purple-900">${aiAnalysis.estimatedCost.min} - ${aiAnalysis.estimatedCost.max}</span>
                          </div>
                          <div>
                            <span className="text-purple-600 font-medium">Urgency:</span>
                            <span className="ml-2 text-purple-900">{aiAnalysis.urgencyScore}/10</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-purple-200">
                          <p className="text-purple-700 italic">{aiAnalysis.reasoning}</p>
                        </div>
                        {aiAnalysis.recommendedActions && aiAnalysis.recommendedActions.length > 0 && (
                          <div className="pt-2">
                            <p className="text-purple-600 font-medium mb-1">Recommended Actions:</p>
                            <ul className="list-disc list-inside space-y-1">
                              {aiAnalysis.recommendedActions.map((action: string, idx: number) => (
                                <li key={idx} className="text-purple-700 text-xs">{action}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Classification */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Classification</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority *
                </label>
                <select
                  name="priority"
                  required
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {PRIORITIES.map(priority => (
                    <option key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {STATUSES.map(status => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Cost & Assignment */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost & Assignment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Cost (USDC)
                </label>
                <input
                  type="number"
                  name="estimated_cost_usdc"
                  min="0"
                  step="0.01"
                  value={formData.estimated_cost_usdc}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Actual Cost (USDC)
                </label>
                <input
                  type="number"
                  name="actual_cost_usdc"
                  min="0"
                  step="0.01"
                  value={formData.actual_cost_usdc}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned To (Contractor Name)
                </label>
                <input
                  type="text"
                  name="assigned_to"
                  value={formData.assigned_to}
                  onChange={handleChange}
                  placeholder="e.g., John's Plumbing Service"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Any additional information or special instructions..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Summary Panel */}
          {formData.property_id && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Request Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-blue-600">Property:</span>
                  <span className="ml-2 text-blue-900 font-medium">
                    {properties.find(p => p.id === formData.property_id)?.title || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-blue-600">Category:</span>
                  <span className="ml-2 text-blue-900 font-medium capitalize">
                    {formData.category?.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-blue-600">Priority:</span>
                  <span className={`ml-2 font-medium capitalize ${
                    formData.priority === 'urgent' ? 'text-red-600' :
                    formData.priority === 'high' ? 'text-orange-600' :
                    formData.priority === 'medium' ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {formData.priority}
                  </span>
                </div>
                <div>
                  <span className="text-blue-600">Est. Cost:</span>
                  <span className="ml-2 text-blue-900 font-medium">
                    ${formData.estimated_cost_usdc || 0} USDC
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <span>{maintenance ? 'Update Request' : 'Create Request'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
