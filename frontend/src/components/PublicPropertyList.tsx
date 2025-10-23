import { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  monthly_rent_usdc: number;
  security_deposit_usdc: number;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  description: string;
  property_type: string;
  amenities: string[];
  images: string[];
}

export default function PublicPropertyList({ onBack }: { onBack: () => void }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/properties`);
      const result = await response.json();

      if (result.success) {
        setProperties(result.data);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading properties...</p>
        </div>
      </div>
    );
  }

  if (selectedProperty) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setSelectedProperty(null)}
            className="mb-6 text-blue-600 hover:text-blue-800 flex items-center"
          >
            ← Back to Properties
          </button>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedProperty.title}</h1>
                  <p className="text-gray-600 mb-4">
                    {selectedProperty.address}, {selectedProperty.city}, {selectedProperty.state}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-600">${selectedProperty.monthly_rent_usdc}</p>
                  <p className="text-gray-600">per month</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Property Type</p>
                  <p className="font-medium capitalize">{selectedProperty.property_type}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Bedrooms</p>
                  <p className="font-medium">{selectedProperty.bedrooms}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Bathrooms</p>
                  <p className="font-medium">{selectedProperty.bathrooms}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Square Feet</p>
                  <p className="font-medium">{selectedProperty.square_feet}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Security Deposit</p>
                  <p className="font-medium">${selectedProperty.security_deposit_usdc}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Amenities</p>
                  <p className="font-medium">
                    {selectedProperty.amenities.length > 0 
                      ? selectedProperty.amenities.join(', ') 
                      : 'None listed'}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Description</h2>
                <p className="text-gray-700">{selectedProperty.description}</p>
              </div>

              <div className="mt-8 flex gap-4">
                <button
                  onClick={() => {
                    // In a real app, this would redirect to a contact form or login
                    alert('Please sign in to apply for this property or contact the property manager.');
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Apply Now
                </button>
                <button
                  onClick={() => {
                    // In a real app, this would redirect to a contact form
                    alert('Contact the property manager for more information.');
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Contact Manager
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={onBack}
              className="mb-2 text-blue-600 hover:text-blue-800 flex items-center"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Available Properties</h1>
            <p className="text-gray-600">Browse our available rental properties</p>
          </div>
          <div className="text-sm text-gray-500">
            {properties.length} property{properties.length !== 1 ? 's' : ''} available
          </div>
        </div>

        {properties.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-5xl mb-4">🏠</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Properties Available</h2>
            <p className="text-gray-600">Check back later for new listings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <div 
                key={property.id} 
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => setSelectedProperty(property)}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{property.title}</h3>
                      <p className="text-gray-600 text-sm">
                        {property.city}, {property.state}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">${property.monthly_rent_usdc}</p>
                      <p className="text-gray-500 text-sm">/month</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center text-sm text-gray-500">
                    <span className="mr-4">🛏️ {property.bedrooms} bed</span>
                    <span className="mr-4">🚿 {property.bathrooms} bath</span>
                    <span>📐 {property.square_feet} sqft</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {property.amenities.slice(0, 3).map((amenity, index) => (
                      <span 
                        key={index} 
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {amenity}
                      </span>
                    ))}
                    {property.amenities.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                        +{property.amenities.length - 3} more
                      </span>
                    )}
                  </div>

                  <button className="mt-6 w-full py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition-colors">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}