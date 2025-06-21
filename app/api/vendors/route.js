// app/api/vendors/route.js
import { readAllRows, addRow, validateVendorData, generateNextId } from '@/lib/google-sheets';

export async function GET() {
  try {
    console.log('Fetching vendors from Google Sheets...');
    const vendors = await readAllRows('vendors');
    
    // Transform data to ensure consistent format
    const formattedVendors = vendors.map(vendor => ({
      vendor_id: vendor.vendor_id,
      vendor_name: vendor.vendor_name,
      contact_name: vendor.contact_name,
      contact_email: vendor.contact_email,
      contact_phone: vendor.contact_phone,
      location: vendor.location,
      time_zone: vendor.time_zone,
      service_categories: vendor.service_categories,
      specialties: vendor.specialties,
      pricing_notes: vendor.pricing_notes,
      status: vendor.status,
      onboarding_date: vendor.onboarding_date,
      vendor_notes: vendor.vendor_notes,
      created_date: vendor.created_date
    }));

    console.log(`Successfully fetched ${formattedVendors.length} vendors`);
    return Response.json(formattedVendors);
    
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return Response.json(
      { 
        error: 'Failed to fetch vendors', 
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const requestData = await request.json();
    console.log('Creating new vendor with data:', requestData);

    // Validate vendor data
    const validationErrors = validateVendorData(requestData);
    if (validationErrors.length > 0) {
      return Response.json(
        { 
          error: 'Validation failed', 
          details: validationErrors 
        }, 
        { status: 400 }
      );
    }

    // Auto-generate vendor ID if not provided
    if (!requestData.vendor_id) {
      requestData.vendor_id = await generateNextId('vendors');
      console.log('Generated vendor ID:', requestData.vendor_id);
    }

    // Add timestamp
    requestData.created_date = new Date().toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    // Ensure service_categories is pipe-separated string
    if (Array.isArray(requestData.service_categories)) {
      requestData.service_categories = requestData.service_categories.join('|');
    }

    // Create the vendor
    const newVendor = await addRow('vendors', requestData);
    console.log('Successfully created vendor:', newVendor.vendor_id);

    return Response.json(newVendor, { status: 201 });
    
  } catch (error) {
    console.error('Error creating vendor:', error);
    return Response.json(
      { 
        error: 'Failed to create vendor', 
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}
