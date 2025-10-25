import React from 'react';
import { X, Check, MapPin, Bed, Bath, Home, DollarSign } from 'lucide-react';

interface Property {
  id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  monthly_rent_usdc: number;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  property_type: string;
  image_urls?: string[];
  amenities: string[];
  pet_friendly: boolean;
  parking_available: boolean;
}

interface PropertyComparisonModalProps {
  properties: Property[];
  onClose: () => void;
  onRemove: (propertyId: string) => void;
}

const PropertyComparisonModal: React.FC<PropertyComparisonModalProps> = ({
  properties,
  onClose,
  onRemove
}) => {
  if (properties.length === 0) return null;

  // Get all unique amenities across compared properties
  const allAmenities = Array.from(
    new Set(properties.flatMap(p => p.amenities || []))
  ).sort();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Property Comparison</h2>
            <p className="text-gray-600 mt-1">Compare up to 3 properties side-by-side</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Comparison Table */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-${properties.length} gap-6">
            {properties.map((property) => (
              <div key={property.id} className="space-y-4">
                {/* Property Card Header */}
                <div className="relative">
                  <img
                    src={property.image_urls?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop'}
                    alt={property.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => onRemove(property.id)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Property Title */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{property.title}</h3>
                  <div className="flex items-center text-gray-600 text-sm mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    {property.city}, {property.state}
                  </div>
                </div>

                {/* Price */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                    <span className="text-3xl font-bold text-gray-900">
                      {property.monthly_rent_usdc.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-center text-sm text-gray-600 mt-1">USDC per month</p>
                </div>

                {/* Property Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-600">Property Type</span>
                    <span className="font-semibold capitalize">{property.property_type}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-600 flex items-center">
                      <Bed className="w-4 h-4 mr-1" /> Bedrooms
                    </span>
                    <span className="font-semibold">{property.bedrooms}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-600 flex items-center">
                      <Bath className="w-4 h-4 mr-1" /> Bathrooms
                    </span>
                    <span className="font-semibold">{property.bathrooms}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-gray-600 flex items-center">
                      <Home className="w-4 h-4 mr-1" /> Sq Ft
                    </span>
                    <span className="font-semibold">{property.square_feet.toLocaleString()}</span>
                  </div>
                </div>

                {/* Amenities Checklist */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900">Amenities</h4>
                  {allAmenities.map((amenity) => (
                    <div key={amenity} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 capitalize">{amenity.replace(/_/g, ' ')}</span>
                      {property.amenities?.includes(amenity) ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <X className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                  ))}
                </div>

                {/* View Details Button */}
                <button
                  onClick={() => window.location.href = `/property/${property.id}`}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                >
                  View Full Details
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyComparisonModal;
