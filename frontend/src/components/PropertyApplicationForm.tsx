import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

interface Property {
  id: string;
  title: string;
  monthly_rent_usdc: number;
  property_type: string;
  address: string;
  city: string;
  state: string;
  bedrooms: number;
  bathrooms: number;
}

interface Reference {
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

const PropertyApplicationForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Form data
  const [formData, setFormData] = useState({
    // Employment
    employment_status: '',
    employer_name: '',
    monthly_income_usdc: '',
    years_at_current_job: '',
    
    // Rental History
    previous_landlord_name: '',
    previous_landlord_contact: '',
    years_at_previous_address: '',
    reason_for_moving: '',
    
    // Additional Info
    cover_letter: '',
    pets_description: '',
    requested_move_in_date: '',
  });

  const [references, setReferences] = useState<Reference[]>([
    { name: '', relationship: '', phone: '', email: '' }
  ]);

  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>({
    name: '',
    relationship: '',
    phone: ''
  });

  // Fetch property details
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const response = await fetch(`${API_URL}/api/properties/${id}`);
        const result = await response.json();
        
        if (result.success) {
          setProperty(result.data);
        } else {
          setError('Failed to load property details');
        }
      } catch (err) {
        setError('Error loading property');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProperty();
    }
  }, [id]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate(`/property/${id}`);
    }
  }, [user, loading, id, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleReferenceChange = (index: number, field: keyof Reference, value: string) => {
    const newReferences = [...references];
    newReferences[index][field] = value;
    setReferences(newReferences);
  };

  const addReference = () => {
    if (references.length < 3) {
      setReferences([...references, { name: '', relationship: '', phone: '', email: '' }]);
    }
  };

  const removeReference = (index: number) => {
    if (references.length > 1) {
      setReferences(references.filter((_, i) => i !== index));
    }
  };

  const handleEmergencyContactChange = (field: keyof EmergencyContact, value: string) => {
    setEmergencyContact(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    setError('');

    if (step === 1) {
      // Employment validation
      if (!formData.employment_status) {
        setError('Employment status is required');
        return false;
      }
      if (!formData.monthly_income_usdc || parseFloat(formData.monthly_income_usdc) <= 0) {
        setError('Valid monthly income is required');
        return false;
      }
    }

    if (step === 2) {
      // Rental history validation
      if (!formData.requested_move_in_date) {
        setError('Move-in date is required');
        return false;
      }
    }

    if (step === 3) {
      // References validation
      const validReferences = references.filter(ref => ref.name && ref.phone);
      if (validReferences.length === 0) {
        setError('At least one reference is required');
        return false;
      }
    }

    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const applicationData = {
        property_id: id,
        applicant_id: userProfile?.id,
        employment_status: formData.employment_status,
        employer_name: formData.employer_name || null,
        monthly_income_usdc: parseFloat(formData.monthly_income_usdc),
        years_at_current_job: formData.years_at_current_job ? parseFloat(formData.years_at_current_job) : null,
        previous_landlord_name: formData.previous_landlord_name || null,
        previous_landlord_contact: formData.previous_landlord_contact || null,
        years_at_previous_address: formData.years_at_previous_address ? parseFloat(formData.years_at_previous_address) : null,
        reason_for_moving: formData.reason_for_moving || null,
        references: references.filter(ref => ref.name && ref.phone),
        cover_letter: formData.cover_letter || null,
        pets_description: formData.pets_description || null,
        emergency_contact: emergencyContact.name ? emergencyContact : null,
        requested_move_in_date: formData.requested_move_in_date
      };

      console.log('Submitting application:', applicationData);

      const response = await fetch(`${API_URL}/api/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData)
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/my-applications');
        }, 2000);
      } else {
        setError(result.error || 'Failed to submit application');
      }
    } catch (err) {
      setError('Error submitting application. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Application Submitted!</h2>
          <p className="text-gray-600 mb-6">
            Your application for <span className="font-semibold">{property?.title}</span> has been successfully submitted with AI scoring.
          </p>
          <p className="text-sm text-gray-500">Redirecting to your applications...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Property not found</p>
        </div>
      </div>
    );
  }

  const progressPercentage = (currentStep / 4) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Rental Application
          </h1>
          <p className="text-gray-600 mb-4">
            Applying for: <span className="font-semibold text-gray-800">{property.title}</span>
          </p>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Monthly Rent: <span className="font-semibold text-blue-600">${property.monthly_rent_usdc.toLocaleString()} USDC</span></span>
            <span>{property.bedrooms} bed • {property.bathrooms} bath</span>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Step {currentStep} of 4</span>
              <span className="text-sm font-medium text-gray-700">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-between mt-6">
            {['Employment', 'Rental History', 'References', 'Review'].map((stepName, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  currentStep > index + 1 ? 'bg-green-500 text-white' :
                  currentStep === index + 1 ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' :
                  'bg-gray-300 text-gray-600'
                }`}>
                  {currentStep > index + 1 ? '✓' : index + 1}
                </div>
                <span className={`text-xs mt-1 ${currentStep === index + 1 ? 'text-gray-800 font-semibold' : 'text-gray-500'}`}>
                  {stepName}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: Employment Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Employment Information</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employment Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="employment_status"
                  value={formData.employment_status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select status</option>
                  <option value="employed_full_time">Employed Full-Time</option>
                  <option value="employed_part_time">Employed Part-Time</option>
                  <option value="self_employed">Self-Employed</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="student">Student</option>
                  <option value="retired">Retired</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employer Name
                </label>
                <input
                  type="text"
                  name="employer_name"
                  value={formData.employer_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Income (USDC) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="monthly_income_usdc"
                  value={formData.monthly_income_usdc}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="5000"
                  min="0"
                  step="0.01"
                  required
                />
                {formData.monthly_income_usdc && property && (
                  <p className="mt-2 text-sm text-gray-600">
                    Income-to-rent ratio: <span className={`font-semibold ${
                      (parseFloat(formData.monthly_income_usdc) / property.monthly_rent_usdc) >= 3 ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {(parseFloat(formData.monthly_income_usdc) / property.monthly_rent_usdc).toFixed(2)}x
                    </span>
                    {(parseFloat(formData.monthly_income_usdc) / property.monthly_rent_usdc) >= 3 
                      ? ' ✓ Excellent' 
                      : ' (Recommended: 3x or higher)'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years at Current Job
                </label>
                <input
                  type="number"
                  name="years_at_current_job"
                  value={formData.years_at_current_job}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="2.5"
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
          )}

          {/* Step 2: Rental History */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Rental History</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Requested Move-In Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="requested_move_in_date"
                  value={formData.requested_move_in_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Previous Landlord Name
                </label>
                <input
                  type="text"
                  name="previous_landlord_name"
                  value={formData.previous_landlord_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Previous Landlord Contact
                </label>
                <input
                  type="text"
                  name="previous_landlord_contact"
                  value={formData.previous_landlord_contact}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Phone or email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years at Previous Address
                </label>
                <input
                  type="number"
                  name="years_at_previous_address"
                  value={formData.years_at_previous_address}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="3"
                  min="0"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Moving
                </label>
                <textarea
                  name="reason_for_moving"
                  value={formData.reason_for_moving}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief explanation"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pets (if any)
                </label>
                <textarea
                  name="pets_description"
                  value={formData.pets_description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe your pets (type, breed, weight, etc.)"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 3: References */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">References & Emergency Contact</h2>
                {references.length < 3 && (
                  <button
                    type="button"
                    onClick={addReference}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                  >
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Reference
                  </button>
                )}
              </div>

              {/* References */}
              {references.map((reference, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6 relative">
                  <h3 className="font-semibold text-gray-800 mb-4">Reference {index + 1}</h3>
                  {references.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeReference(index)}
                      className="absolute top-4 right-4 text-red-600 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                      <input
                        type="text"
                        value={reference.name}
                        onChange={(e) => handleReferenceChange(index, 'name', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
                      <input
                        type="text"
                        value={reference.relationship}
                        onChange={(e) => handleReferenceChange(index, 'relationship', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Former employer, colleague, etc."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={reference.phone}
                        onChange={(e) => handleReferenceChange(index, 'phone', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={reference.email}
                        onChange={(e) => handleReferenceChange(index, 'email', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="reference@example.com"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Emergency Contact */}
              <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                <h3 className="font-semibold text-gray-800 mb-4">Emergency Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={emergencyContact.name}
                      onChange={(e) => handleEmergencyContactChange('name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
                    <input
                      type="text"
                      value={emergencyContact.relationship}
                      onChange={(e) => handleEmergencyContactChange('relationship', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      placeholder="Mother, friend, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={emergencyContact.phone}
                      onChange={(e) => handleEmergencyContactChange('phone', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              {/* Cover Letter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Letter (Optional)
                </label>
                <textarea
                  name="cover_letter"
                  value={formData.cover_letter}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tell the property manager why you'd be a great tenant..."
                  rows={6}
                />
                <p className="mt-1 text-sm text-gray-500">
                  A well-written cover letter can improve your application score
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Review Your Application</h2>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-4">AI Scoring Information</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Your application will be automatically scored by our AI system based on:
                </p>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Income-to-rent ratio (40% weight)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Employment stability (25% weight)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Rental history (20% weight)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>References and cover letter (15% weight)</span>
                  </li>
                </ul>
              </div>

              {/* Summary Sections */}
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-800 mb-3">Employment Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600">Status:</span> <span className="font-medium">{formData.employment_status || 'Not provided'}</span></p>
                    <p><span className="text-gray-600">Employer:</span> <span className="font-medium">{formData.employer_name || 'Not provided'}</span></p>
                    <p><span className="text-gray-600">Monthly Income:</span> <span className="font-medium">${parseFloat(formData.monthly_income_usdc || '0').toLocaleString()} USDC</span></p>
                    <p><span className="text-gray-600">Years at Job:</span> <span className="font-medium">{formData.years_at_current_job || 'Not provided'}</span></p>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-800 mb-3">Rental History</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600">Move-in Date:</span> <span className="font-medium">{formData.requested_move_in_date}</span></p>
                    <p><span className="text-gray-600">Previous Landlord:</span> <span className="font-medium">{formData.previous_landlord_name || 'Not provided'}</span></p>
                    <p><span className="text-gray-600">Years at Previous:</span> <span className="font-medium">{formData.years_at_previous_address || 'Not provided'}</span></p>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-800 mb-3">References</h3>
                  <p className="text-sm">
                    <span className="font-medium">{references.filter(r => r.name && r.phone).length}</span> reference(s) provided
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                <p className="text-sm text-gray-700">
                  By submitting this application, you confirm that all information provided is accurate and complete.
                  The property manager will review your application along with the AI compatibility score.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Previous
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="ml-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-md hover:shadow-lg"
              >
                Next Step
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="ml-auto px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Submit Application'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default PropertyApplicationForm;
