import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPin, Home, Bed, Bath, Square, DollarSign, Heart, 
  ArrowLeft, Calendar, CheckCircle, XCircle, Share2, 
  Wifi, Car, Dumbbell, TreePine, Dog, Utensils, Shield,
  Sparkles, Building2, ChevronLeft, ChevronRight
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import AuthWall from './AuthWall';

interface Property {
  id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  monthly_rent_usdc: number;
  security_deposit_usdc: number;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  property_type: string;
  amenities: string[];
  image_urls?: string[]; // Changed from images to match database schema
  is_active: boolean;
  available_date: string | null;
  pet_friendly: boolean;
  parking_available: boolean;
  ai_generated_description: string | null;
  view_count: number;
  application_count: number;
  owner_id: string;
  created_at: string;
}

const PropertyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAuthWall, setShowAuthWall] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPropertyDetails();
      incrementViewCount();
    }
  }, [id]);

  const fetchPropertyDetails = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/properties/${id}`);
      if (response.data.success) {
        setProperty(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching property details:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async () => {
    try {
      await axios.post(`${API_URL}/api/properties/${id}/view`);
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  const handleApplyNow = () => {
    if (!user) {
      // Show auth wall modal
      setShowAuthWall(true);
    } else {
      // Show application form
      navigate(`/apply/${id}`);
    }
  };

  const handleSaveProperty = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      if (isSaved) {
        // Unsave property
        await axios.delete(`${API_URL}/api/saved-properties/${id}`, {
          params: { user_id: user.id }
        });
        setIsSaved(false);
      } else {
        // Save property (use camelCase to match backend)
        await axios.post(`${API_URL}/api/saved-properties`, {
          userId: user.id,
          propertyId: id
        });
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Error saving property:', error);
    }
  };

  const getPlaceholderImages = (type: string) => {
    const images: { [key: string]: string[] } = {
      apartment: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=800&fit=crop',
      ],
      house: [
        'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop',
      ],
      condo: [
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=800&fit=crop',
      ],
      studio: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&h=800&fit=crop',
      ],
    };
    return images[type] || images.apartment;
  };

  const getAmenityIcon = (amenity: string) => {
    const iconMap: { [key: string]: JSX.Element } = {
      wifi: <Wifi className="w-5 h-5" />,
      parking: <Car className="w-5 h-5" />,
      gym: <Dumbbell className="w-5 h-5" />,
      pool: <TreePine className="w-5 h-5" />,
      pet_friendly: <Dog className="w-5 h-5" />,
      dishwasher: <Utensils className="w-5 h-5" />,
      security: <Shield className="w-5 h-5" />,
      concierge: <Building2 className="w-5 h-5" />,
    };
    return iconMap[amenity] || <CheckCircle className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Property Not Found</h2>
          <p className="text-gray-600 mb-6">The property you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Listings
          </button>
        </div>
      </div>
    );
  }

  const images = (property.image_urls && property.image_urls.length > 0) 
    ? property.image_urls 
    : getPlaceholderImages(property.property_type);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const previousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Listings</span>
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowShareModal(true)}
                className="p-2.5 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-all"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                onClick={handleSaveProperty}
                className={`p-2.5 border-2 rounded-lg transition-all ${
                  isSaved
                    ? 'bg-red-50 border-red-500 text-red-600'
                    : 'border-gray-200 hover:border-red-500 hover:text-red-600'
                }`}
              >
                <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="relative h-96 md:h-[500px] bg-gray-900 group">
        <img
          src={images[currentImageIndex]}
          alt={`${property.title} - Image ${currentImageIndex + 1}`}
          className="w-full h-full object-cover"
        />
        
        {/* Image Navigation */}
        {images.length > 1 && (
          <>
            <button
              onClick={previousImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            >
              <ChevronLeft className="w-6 h-6 text-gray-800" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            >
              <ChevronRight className="w-6 h-6 text-gray-800" />
            </button>
            
            {/* Image Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentImageIndex
                      ? 'w-8 bg-white'
                      : 'w-2 bg-white/50 hover:bg-white/75'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Property Type Badge */}
        <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-full font-semibold uppercase text-sm shadow-lg">
          {property.property_type}
        </div>

        {/* Stats Badge */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              {property.view_count} views
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              {property.application_count} apps
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Property Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Price */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{property.title}</h1>
              
              <div className="flex items-center text-gray-600 mb-6">
                <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                <span className="text-lg">
                  {property.address}, {property.city}, {property.state} {property.zip_code}
                </span>
              </div>

              <div className="flex items-baseline gap-2 mb-6">
                <DollarSign className="w-8 h-8 text-green-600" />
                <span className="text-5xl font-bold text-gray-900">
                  {property.monthly_rent_usdc.toLocaleString()}
                </span>
                <span className="text-xl text-gray-600">USDC / month</span>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <Bed className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold text-gray-900">{property.bedrooms}</div>
                  <div className="text-sm text-gray-600">Bedrooms</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <Bath className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold text-gray-900">{property.bathrooms}</div>
                  <div className="text-sm text-gray-600">Bathrooms</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <Square className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold text-gray-900">{property.square_feet.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Sq Ft</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <Home className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold text-gray-900">{property.property_type}</div>
                  <div className="text-sm text-gray-600">Type</div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                {property.ai_generated_description && <Sparkles className="w-6 h-6 text-yellow-500" />}
                Description
              </h2>
              <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-line">
                {property.ai_generated_description || property.description}
              </p>
            </div>

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {property.amenities.map((amenity, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <div className="text-blue-600">
                        {getAmenityIcon(amenity)}
                      </div>
                      <span className="text-gray-700 font-medium capitalize">
                        {amenity.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Details */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Additional Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">
                    Security Deposit: <strong>${property.security_deposit_usdc.toLocaleString()} USDC</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {property.pet_friendly ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700">Pet Friendly</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="text-gray-700">No Pets</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {property.parking_available ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700">Parking Available</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="text-gray-700">No Parking</span>
                    </>
                  )}
                </div>
                {property.available_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <span className="text-gray-700">
                      Available: <strong>{new Date(property.available_date).toLocaleDateString()}</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Action Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  <span className="text-3xl font-bold text-gray-900">
                    {property.monthly_rent_usdc.toLocaleString()}
                  </span>
                  <span className="text-gray-600">USDC/mo</span>
                </div>
                <p className="text-sm text-gray-600">
                  Security deposit: ${property.security_deposit_usdc.toLocaleString()} USDC
                </p>
              </div>

              <button
                onClick={handleApplyNow}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 mb-4"
              >
                Apply Now
              </button>

              <button
                onClick={handleSaveProperty}
                className="w-full py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-blue-500 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
              >
                <Heart className={`w-5 h-5 ${isSaved ? 'fill-current text-red-600' : ''}`} />
                {isSaved ? 'Saved' : 'Save Property'}
              </button>

              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold text-gray-900 mb-3">Contact Property Manager</h3>
                <button className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                  Send Message
                </button>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Blockchain Verified
                </h4>
                <p className="text-sm text-gray-600">
                  This property is verified on Arc blockchain with secure USDC payments
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-4">Share Property</h3>
            <div className="space-y-3">
              <button className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Copy Link
              </button>
              <button className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                Share via Email
              </button>
            </div>
            <button
              onClick={() => setShowShareModal(false)}
              className="mt-4 w-full py-3 text-gray-600 hover:text-gray-900"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Auth Wall Modal */}
      {showAuthWall && (
        <AuthWall
          onClose={() => setShowAuthWall(false)}
          returnUrl={`/property/${id}`}
          mode="signup"
        />
      )}
    </div>
  );
};

export default PropertyDetail;
