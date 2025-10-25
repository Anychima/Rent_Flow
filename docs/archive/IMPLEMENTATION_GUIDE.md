# RentFlow AI - Public Browsing & Role-Based System Implementation Guide

## Overview
This guide outlines the complete implementation of the new user flow:
1. **Public Browsing** → View all properties without authentication
2. **Auth Wall** → Login/signup required for applications
3. **Role Selection** → Choose between Prospective Tenant or Manager during signup
4. **Application Management** → Managers review applications, send leases
5. **Digital Signing** → Blockchain-verified lease signatures
6. **Role Transition** → Prospective Tenant → Tenant after signing

## 🗄️ Database Changes Required

### Step 1: Run Migration SQL
**Location**: `database/migrations/001_add_role_system_and_applications.sql`

**How to Apply**:
1. Open Supabase Dashboard: https://app.supabase.com
2. Navigate to SQL Editor → New Query
3. Copy and paste the entire contents of the migration file
4. Click "Run" to execute

**What It Creates**:
- ✅ `role` column in `users` table (prospective_tenant, manager, tenant)
- ✅ `property_applications` table (tracks rental applications)
- ✅ `saved_properties` table (wishlist/favorites)
- ✅ `lease_documents` table (digital signing with blockchain)
- ✅ `property_views` table (analytics)
- ✅ Additional property fields (is_published, view_count, etc.)

---

## 🔧 Backend API Endpoints

### New Endpoints to Add

#### Public Property Listings
```
GET /api/properties/public
- Returns published properties (no auth required)
- Supports filtering, search, pagination
```

#### Property Applications
```
POST /api/applications (Auth required)
- Submit application for a property

GET /api/applications/my-applications (Auth required)
- Get user's submitted applications

GET /api/applications/property/:propertyId (Manager only)
- Get all applications for a property

PUT /api/applications/:id/status (Manager only)
- Update application status (approve/reject)
```

#### Lease Generation & Signing
```
POST /api/leases/generate (Manager only)
- Create lease from approved application
- Generates PDF/document with terms

POST /api/leases/:id/sign (Auth required)
- Sign lease document (manager or tenant)
- Records blockchain signature

GET /api/leases/:id/document
- Retrieve signed lease document
```

#### User Role Management
```
POST /api/auth/signup
- Modified to include role selection

POST /api/users/:id/upgrade-to-tenant
- Transition prospective_tenant → tenant after lease signing
```

#### AI-Powered Features
```
POST /api/ai/score-application
- AI scoring of tenant applications (income, history, etc.)

POST /api/ai/match-properties
- Recommend properties to prospective tenants

POST /api/ai/generate-lease
- AI-assisted lease generation with customization
```

---

## 🎨 Frontend Components

### New Components to Create

#### 1. Public Property Listings (`src/components/PublicPropertyListings.tsx`)
- Grid/list view of properties
- Search bar and filters
- Property cards with images
- "Apply Now" button → triggers auth wall

#### 2. Property Detail View (`src/components/PropertyDetailView.tsx`)
- Photo gallery
- Property details and amenities
- AI-generated description
- Virtual tour integration
- "Save Property" button (auth required)
- "Apply Now" button (auth required)

#### 3. Auth Wall Component (`src/components/AuthWall.tsx`)
- Modal that appears when unauthenticated user clicks "Apply Now"
- Login form
- Signup form with role selection (Prospective Tenant / Manager)

#### 4. Application Form (`src/components/ApplicationForm.tsx`)
- Multi-step form
- Employment details
- Rental history
- References
- Cover letter
- File uploads (ID, pay stubs, etc.)

#### 5. Prospective Tenant Dashboard (`src/components/ProspectiveTenantDashboard.tsx`)
- Saved properties
- Submitted applications with status
- Recommended properties (AI)
- Profile management

#### 6. Manager Application Review (`src/components/ManagerApplicationReview.tsx`)
- List of all applications per property
- AI compatibility score display
- Approve/Reject actions
- Send lease button

#### 7. Lease Signing Interface (`src/components/LeaseSigningInterface.tsx`)
- Display lease terms
- Digital signature pad
- Blockchain signature confirmation
- Download signed PDF

#### 8. Tenant Dashboard (`src/components/TenantDashboard.tsx`)
- Existing dashboard (already built)
- Enhanced with lease documents section

---

## 🔀 Routing Changes

### Updated Route Structure

```typescript
// Public Routes (No Auth)
/                          → PublicPropertyListings
/properties/:id            → PropertyDetailView

// Auth Required Routes
/login                     → AuthWall (Login mode)
/signup                    → AuthWall (Signup mode with role selection)

// Prospective Tenant Routes
/dashboard/prospective     → ProspectiveTenantDashboard
/applications/new/:propertyId → ApplicationForm
/applications/:id          → ApplicationDetailView

// Manager Routes
/dashboard/manager         → ManagerDashboard
/properties/manage         → PropertyManagement (create, edit listings)
/applications/review       → ManagerApplicationReview
/leases/generate/:appId    → LeaseGenerationForm

// Tenant Routes (After signing)
/dashboard/tenant          → TenantDashboard (existing)
/payments                  → PaymentHistory
/maintenance               → MaintenanceRequests
/lease/documents           → LeaseDocuments

// Shared
/profile                   → UserProfile
```

---

## 🤖 AI Integration Points

### 1. Property Recommendations
**When**: Prospective tenant views dashboard
**How**: Analyze browsing history, saved properties, budget
**Service**: `openaiService.recommendProperties(userPreferences)`

### 2. Application Screening
**When**: Manager reviews applications
**How**: Score based on income ratio, employment stability, rental history
**Service**: `openaiService.scoreApplication(applicationData)`
**Output**: Compatibility score (0-100), risk assessment, red flags

### 3. Lease Generation Assistant
**When**: Manager creates lease from approved application
**How**: Pre-fill terms, suggest clauses based on property type
**Service**: `openaiService.generateLeaseTemplate(property, tenant, terms)`

### 4. Property Description Enhancement
**When**: Manager creates/edits property listing
**How**: Generate compelling descriptions from basic details
**Service**: `openaiService.enhancePropertyDescription(propertyData)`

---

## 🔗 Blockchain Integration Points

### 1. Lease Signing (Solana)
**Process**:
1. Generate lease document hash
2. Both parties sign with Solana wallet
3. Store signatures on-chain via Circle API
4. Transaction hash stored in `lease_documents` table

**Implementation**:
```typescript
// In circlePaymentService.ts
async signDocument(walletId: string, documentHash: string) {
  // Create signature transaction
  // Return transaction hash
}
```

### 2. Security Deposit Escrow
**When**: Lease is signed
**How**: Automatically lock security deposit in smart contract
**Release**: Upon lease completion or dispute resolution

### 3. Micropayment for Application Fee
**When**: Submitting application (optional)
**Amount**: $25-50 USDC
**Purpose**: Reduce spam applications, compensate landlord time

---

## 🎤 ElevenLabs Voice Integration

### 1. Welcome Message for New Tenants
**Trigger**: After lease signing (role transition)
**Content**: Personalized welcome, next steps, contact info
**Service**: `elevenLabsService.generateWelcomeMessage(tenantName, propertyAddress)`

### 2. Application Status Updates
**Trigger**: Application approved/rejected
**Content**: Notification of decision with next steps
**Delivery**: SMS with audio link

### 3. Lease Reminder
**Trigger**: 48 hours before lease start date
**Content**: Move-in checklist, important dates
**Delivery**: Email with embedded audio

---

## 📊 Implementation Priority

### Phase 1: Foundation (Do First)
1. ✅ Run database migration
2. ✅ Create backend API endpoints for applications
3. ✅ Build public property listings component
4. ✅ Implement auth wall with role selection

### Phase 2: Core Functionality
5. Build application form and submission flow
6. Create prospective tenant dashboard
7. Implement manager application review interface
8. Add AI application scoring

### Phase 3: Lease Management
9. Build lease generation API
10. Create digital signing interface
11. Implement blockchain signature verification
12. Add role transition logic

### Phase 4: Enhancements
13. Add property recommendations (AI)
14. Implement voice notifications
15. Create analytics dashboard
16. Add property view tracking

---

## 🧪 Testing Checklist

### User Journey Testing
- [ ] Browse properties without login
- [ ] Click "Apply Now" → Auth wall appears
- [ ] Signup as Prospective Tenant
- [ ] Submit application for property
- [ ] Save property to wishlist
- [ ] Login as Manager
- [ ] View applications for property
- [ ] Review AI compatibility score
- [ ] Approve application
- [ ] Generate lease document
- [ ] Send lease to tenant
- [ ] Tenant signs lease
- [ ] Verify blockchain signature
- [ ] Confirm role transition (prospective_tenant → tenant)
- [ ] Tenant accesses tenant dashboard
- [ ] Make rent payment via micropayment

---

## 🔐 Security Considerations

### Row-Level Security (RLS) in Supabase
```sql
-- Property Applications: Users can only see their own applications
CREATE POLICY "Users can view own applications"
ON property_applications FOR SELECT
USING (auth.uid() = applicant_id OR auth.uid() IN (
  SELECT owner_id FROM properties WHERE id = property_id
));

-- Lease Documents: Only parties involved can access
CREATE POLICY "Access own lease documents"
ON lease_documents FOR SELECT
USING (auth.uid() IN (
  SELECT tenant_id FROM leases WHERE id = lease_id
  UNION
  SELECT owner_id FROM properties 
  JOIN leases ON leases.property_id = properties.id
  WHERE leases.id = lease_id
));
```

---

## 📝 Next Steps

1. **Apply Database Migration** (manually via Supabase dashboard)
2. **Start with Phase 1 implementation**
3. **Test each feature incrementally**
4. **Deploy to production after full testing**

This is a comprehensive redesign. Would you like me to start implementing specific components?
