import { useState, useEffect } from 'react';

interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  monthly_rent_usdc: number;
  security_deposit_usdc: number;
}

interface Tenant {
  id: string;
  full_name: string;
  email: string;
  phone: string;
}

interface Lease {
  id?: string;
  property_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  monthly_rent_usdc: number;
  security_deposit_usdc: number;
  rent_due_day: number;
  status: string;
}

interface LeaseFormProps {
  lease?: Lease | null;
  onClose: () => void;
  onSubmit: (lease: Partial<Lease>) => Promise<void>;
}

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

export default function LeaseForm({ lease, onClose, onSubmit }: LeaseFormProps) {
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [formData, setFormData] = useState<Partial<Lease>>({
    property_id: '',
    tenant_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    monthly_rent_usdc: 0,
    security_deposit_usdc: 0,
    rent_due_day: 1,
    status: 'active',
  });

  useEffect(() => {
    fetchData();
    if (lease) {
      setFormData(lease);
    }
  }, [lease]);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      const [propsRes, tenantsRes] = await Promise.all([
        fetch(`${API_URL}/api/properties/available`),
        fetch(`${API_URL}/api/tenants`)
      ]);

      const [propsData, tenantsData] = await Promise.all([
        propsRes.json(),
        tenantsRes.json()
      ]);

      if (propsData.success) setProperties(propsData.data || []);
      if (tenantsData.success) setTenants(tenantsData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handlePropertyChange = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    if (property) {
      setFormData(prev => ({
        ...prev,
        property_id: propertyId,
        monthly_rent_usdc: property.monthly_rent_usdc,
        security_deposit_usdc: property.security_deposit_usdc,
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      console.error('Error submitting lease:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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
            {lease ? 'Edit Lease' : 'Create New Lease'}
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
          {/* Property Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Property & Tenant</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property *
                </label>
                <select
                  name="property_id"
                  required
                  disabled={!!lease}
                  value={formData.property_id}
                  onChange={(e) => handlePropertyChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Select a property</option>
                  {properties.map(property => (
                    <option key={property.id} value={property.id}>
                      {property.title} - {property.city} (${property.monthly_rent_usdc}/mo)
                    </option>
                  ))}
                </select>
                {properties.length === 0 && (
                  <p className="mt-1 text-xs text-red-600">No available properties</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tenant *
                </label>
                <select
                  name="tenant_id"
                  required
                  disabled={!!lease}
                  value={formData.tenant_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Select a tenant</option>
                  {tenants.map(tenant => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.full_name} ({tenant.email})
                    </option>
                  ))}
                </select>
                {tenants.length === 0 && (
                  <p className="mt-1 text-xs text-red-600">No available tenants</p>
                )}
              </div>
            </div>
          </div>

          {/* Lease Dates */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Lease Period</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="start_date"
                  required
                  value={formData.start_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  name="end_date"
                  required
                  value={formData.end_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rent Due Day (1-28) *
                </label>
                <input
                  type="number"
                  name="rent_due_day"
                  required
                  min="1"
                  max="28"
                  value={formData.rent_due_day}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">Day of the month rent is due</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent capitalize"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="terminated">Terminated</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Financial Terms */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Terms (USDC)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Rent (USDC) *
                </label>
                <input
                  type="number"
                  name="monthly_rent_usdc"
                  required
                  min="0"
                  step="0.01"
                  value={formData.monthly_rent_usdc}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Security Deposit (USDC) *
                </label>
                <input
                  type="number"
                  name="security_deposit_usdc"
                  required
                  min="0"
                  step="0.01"
                  value={formData.security_deposit_usdc}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          {formData.property_id && formData.tenant_id && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Lease Summary</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Property: {properties.find(p => p.id === formData.property_id)?.title}</p>
                <p>• Tenant: {tenants.find(t => t.id === formData.tenant_id)?.full_name}</p>
                <p>• Duration: {formData.start_date} to {formData.end_date}</p>
                <p>• Monthly Rent: ${formData.monthly_rent_usdc} USDC (due on day {formData.rent_due_day})</p>
                <p>• Security Deposit: ${formData.security_deposit_usdc} USDC</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || properties.length === 0 || tenants.length === 0}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                lease ? 'Update Lease' : 'Create Lease'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
