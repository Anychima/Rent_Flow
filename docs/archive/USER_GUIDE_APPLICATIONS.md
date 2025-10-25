# 🎓 User Guide: Property Application System

## Quick Start Guide for Testing

### Step 1: Browse Properties (No Login Required)
```
URL: http://localhost:3000
```

**What You'll See:**
- Grid of available properties with beautiful images
- Property cards showing:
  - Property type icon (🏠 house, 🏢 apartment, etc.)
  - Title and location
  - Bedrooms, bathrooms, square footage
  - Monthly rent in USDC
  - Amenities pills
  - "View Details" button

**Actions:**
- Click on any property card
- OR click on property image
- OR click "View Details" button
- All three navigate to property detail page

---

### Step 2: View Property Details
```
URL: http://localhost:3000/property/{property-id}
```

**What You'll See:**
- Image gallery carousel (swipe through photos)
- Property title and location
- Monthly rent and key stats
- AI-generated description
- Amenities grid
- Property statistics (bedrooms, bathrooms, sqft)
- **"Apply Now" button** (prominently displayed)

**Actions:**
- Review property details
- Click "Apply Now" to start application
- If not logged in → Auth Wall appears

---

### Step 3: Authentication (If Not Logged In)

**Auth Wall Modal Appears:**
- Beautiful gradient header
- Two modes: Login / Signup (toggle button)
- Role selection for signup:
  - 🏠 **Prospective Tenant** (looking for a place to rent)
  - 🏢 **Manager** (property manager/landlord)

**Signup Fields:**
- Full Name
- Email Address
- Password
- Confirm Password
- Role Selection

**What Happens:**
- Creates account in Supabase
- Automatically logs you in
- Returns you to the property page
- Now ready to apply!

---

### Step 4: Fill Out Application Form
```
URL: http://localhost:3000/apply/{property-id}
```

**Form Overview:**
- **4-step multi-step form**
- Progress bar at top
- Step indicators (1/4, 2/4, 3/4, 4/4)
- Navigation buttons (Previous/Next)

---

#### **Step 1: Employment Information**

**Required Fields:**
- Employment Status* (dropdown)
  - Employed Full-Time
  - Employed Part-Time
  - Self-Employed
  - Unemployed
  - Student
  - Retired

- Monthly Income (USDC)* (number input)
  - Shows real-time income-to-rent ratio
  - Color-coded feedback:
    - Green checkmark if 3x or higher ✅
    - Orange warning if below 3x ⚠️
  - Example: Income $6,000, Rent $2,000 → 3.00x ratio

**Optional Fields:**
- Employer Name
- Years at Current Job

**Validation:**
- Employment status must be selected
- Monthly income must be > 0

**Click "Next Step" →**

---

#### **Step 2: Rental History**

**Required Fields:**
- Requested Move-In Date* (date picker)

**Optional Fields:**
- Previous Landlord Name
- Previous Landlord Contact (phone/email)
- Years at Previous Address
- Reason for Moving (textarea)
- Pets Description (textarea)
  - If you have pets, describe them here
  - Type, breed, weight, etc.

**Validation:**
- Move-in date must be selected

**Click "Next Step" →**

---

#### **Step 3: References & Emergency Contact**

**References Section:**
- Start with 1 reference form
- Click "+ Add Reference" to add more (up to 3 total)
- Each reference has:
  - Name
  - Relationship (former employer, colleague, etc.)
  - Phone
  - Email
- Remove references with the X button

**Emergency Contact:**
- Name
- Relationship
- Phone

**Cover Letter (Optional but Recommended):**
- Large textarea for personal message
- Tell the property manager why you'd be a great tenant
- Improves your AI score! ✨
- "A well-written cover letter can improve your application score"

**Validation:**
- At least 1 reference with name and phone is required

**Click "Next Step" →**

---

#### **Step 4: Review & Submit**

**What You'll See:**

1. **AI Scoring Information Box** (Blue)
   - Explains how your application will be scored
   - Weight breakdown:
     - Income-to-rent ratio (40%)
     - Employment stability (25%)
     - Rental history (20%)
     - References and cover letter (15%)

2. **Employment Information Summary**
   - Status, Employer, Income, Years at Job

3. **Rental History Summary**
   - Move-in date, Previous landlord, Years at previous

4. **References Count**
   - "X reference(s) provided"

5. **Terms Acknowledgment**
   - "By submitting this application, you confirm that all information provided is accurate and complete."

**Final Action:**
- Click **"Submit Application"** button (Green gradient, large)
- Button shows loading spinner while submitting
- Cannot click again while submitting (disabled state)

---

### Step 5: Success & Redirect

**Success Screen Appears:**
- ✅ Green checkmark icon in gradient circle
- "Application Submitted!" headline
- Property name confirmation
- "Your application for [Property Name] has been successfully submitted with AI scoring"
- "Redirecting to your applications..." message
- **Auto-redirects after 2 seconds**

---

### Step 6: View Your Applications
```
URL: http://localhost:3000/my-applications
```

**What You'll See:**

**Header:**
- "My Applications" title (gradient text)
- "Track your rental application status" subtitle
- "← Browse Properties" button (top right)

**Application Cards** (if you have applications):

Each card shows:
- **Property thumbnail** with type icon
- **Property name** and address
- **Bed/bath/rent** stats
- **Status badge** (color-coded)
  - 📝 SUBMITTED (Blue)
  - 🔍 UNDER REVIEW (Yellow)
  - ✅ APPROVED (Green)
  - ❌ REJECTED (Red)
  - 📄 LEASE SIGNED (Purple)
- **Application date** ("Applied [date]")

**AI Score Cards** (3 metrics):
1. **Compatibility Score**
   - Your score / 100
   - Label: Excellent/Good/Fair/Needs Improvement
   - Color-coded

2. **Risk Score**
   - Your score / 100
   - Label: Low/Medium/High Risk
   - Lower is better

3. **Move-in Date**
   - Your requested date
   - Formatted nicely

**AI Analysis Summary:**
- Recommendation (Highly Recommended, etc.)
- Top 3 evaluation factors
  - Examples:
    - "✅ Excellent income-to-rent ratio (3.5x or higher)"
    - "✅ Stable employment (2+ years)"
    - "⚠️ Adequate income-to-rent ratio (2.5x)"

**Manager Notes** (if provided):
- Blue box with manager's comments

**Rejection Reason** (if rejected):
- Red box explaining why

**Action Buttons:**
- "View Full Details →" - Opens detailed modal
- "📄 Sign Lease" - If approved (not implemented yet)
- "View Property" - Returns to property page

---

### Detailed Modal

**Opened by:** Clicking "View Full Details"

**Contains:**
- **Header** (Gradient, sticky)
  - "Application Details" title
  - X close button

**Sections:**

1. **Property Information**
   - Property name
   - Full address
   - Monthly rent

2. **Your Application**
   - Employment status
   - Monthly income
   - Income-to-rent ratio (calculated)
   - Requested move-in date

3. **Detailed AI Analysis**
   - Full recommendation
   - Complete list of evaluation factors
   - All scoring details

**Close:** Click X or click outside modal

---

## 🎯 Example Application Flow

### Scenario: Jane Doe Applies for "Sunset Villa Apartment"

1. **Browses Properties**
   - Sees "Sunset Villa Apartment" - $2,000/mo
   - Clicks to view details

2. **Reviews Property**
   - Loves the 2bed/2bath layout
   - Amenities: Pool, Gym, Parking
   - Clicks "Apply Now"

3. **Signs Up** (first time user)
   - Creates account as "Prospective Tenant"
   - Email: jane.doe@example.com
   - Password: ********

4. **Fills Application:**

   **Step 1: Employment**
   - Status: Employed Full-Time
   - Employer: Tech Corp Inc
   - Income: $7,500 USDC/month
   - Years at job: 3.5 years
   - ✅ Income ratio: 3.75x (Excellent!)

   **Step 2: Rental History**
   - Move-in: March 1, 2025
   - Previous landlord: John Smith
   - Contact: (555) 123-4567
   - Years at previous: 4 years
   - Reason: Relocating for work
   - Pets: None

   **Step 3: References**
   - Reference 1:
     - Name: Sarah Johnson
     - Relationship: Former Manager
     - Phone: (555) 987-6543
     - Email: sarah.j@example.com
   
   - Reference 2:
     - Name: Mike Chen
     - Relationship: Colleague
     - Phone: (555) 555-1234
     - Email: mike.chen@example.com
   
   - Emergency Contact:
     - Name: Mary Doe
     - Relationship: Mother
     - Phone: (555) 999-8888
   
   - Cover Letter:
     "I am a responsible professional seeking a long-term rental. I have always maintained excellent relationships with previous landlords and take great pride in keeping my living space clean and well-maintained. I am excited about this property's amenities and convenient location near my workplace. I look forward to being a respectful and reliable tenant."

   **Step 4: Review**
   - Reviews all information
   - Sees AI scoring explanation
   - Confirms accuracy
   - Clicks "Submit Application"

5. **Success!**
   - "Application Submitted!" message
   - AI scores calculated:
     - Compatibility: 85/100 (Excellent!)
     - Risk: 25/100 (Low Risk)
   - Redirected to My Applications

6. **Checks Status**
   - Sees application card
   - Status: SUBMITTED 📝
   - Compatibility Score: 85 (Excellent)
   - AI Analysis:
     - ✅ Excellent income-to-rent ratio (3.75x)
     - ✅ Stable employment (3.5 years)
     - ✅ Long-term rental history (4 years)
     - ✅ Multiple references provided
     - ✅ Detailed cover letter

7. **Waits for Manager Review**
   - Manager will see application in their dashboard
   - AI score of 85 = "Highly Recommended"
   - Manager can approve/reject

8. **If Approved:**
   - Status changes to: APPROVED ✅
   - "Sign Lease" button appears
   - Can proceed to lease signing (coming soon)

---

## 🐛 Common Issues & Solutions

### Issue: "No applications found"
**Solution:** 
- Make sure you're logged in with the same account used to submit
- Check that application submission was successful
- Refresh the page

### Issue: Income-to-rent ratio showing as orange
**Explanation:**
- Recommended ratio is 3x rent or higher
- Example: For $2,000 rent, you need $6,000+ income
- Orange = below 3x (still acceptable but may affect score)

### Issue: Can't submit application (button disabled)
**Check:**
- Step 1: Employment status selected? Income > 0?
- Step 2: Move-in date selected?
- Step 3: At least 1 reference with name and phone?

### Issue: Auth wall appears when clicking "Apply Now"
**Explanation:**
- This is expected behavior
- Applications require authentication
- Sign up as "Prospective Tenant"
- You'll return to the property after signup

---

## 📊 Understanding Your AI Score

### Compatibility Score Breakdown:

**75-100: Highly Recommended** ✅ (Green)
- Excellent income ratio (3.5x+)
- Stable long-term employment
- Strong rental history
- Multiple references

**60-74: Recommended** ✅ (Blue)
- Good income ratio (3x+)
- Recent stable employment
- Rental history provided
- References included

**45-59: Consider with Caution** ⚠️ (Yellow)
- Adequate income ratio (2.5x+)
- Newer employment
- Some rental history
- May need additional verification

**0-44: Not Recommended** ❌ (Red)
- Below recommended income ratio
- Unstable employment
- Limited rental history
- May need co-signer

### How to Improve Your Score:

1. **Increase Income-to-Rent Ratio** (40% weight)
   - Look for properties within budget
   - Consider roommates to split costs
   - Include all income sources

2. **Show Employment Stability** (25% weight)
   - Provide employer details
   - Include years at current job
   - Mention career growth

3. **Demonstrate Rental Responsibility** (20% weight)
   - Include previous landlord references
   - Explain any gaps positively
   - Show long-term tenancy

4. **Add Strong References** (15% weight)
   - Include 2-3 professional references
   - Provide complete contact information
   - Write a thoughtful cover letter

---

## 🎉 You're All Set!

The application system is now fully functional and ready to use. Happy house hunting! 🏡

**Questions or Issues?**
- Check the console for debugging info
- Verify both servers are running (ports 3000 and 3001)
- Review the APPLICATION_SYSTEM_SUMMARY.md for technical details

---

**Built with ❤️ by RentFlow AI**
Powered by React, TypeScript, Supabase, and OpenAI
