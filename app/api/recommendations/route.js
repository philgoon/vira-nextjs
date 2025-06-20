import { NextResponse } from 'next/server';
import { getSheetData } from '@/lib/google-sheets';
import { getAiRecommendations } from '@/lib/openai'; 

function parseServiceCategories(categoriesString) {
  if (!categoriesString || typeof categoriesString !== 'string') return [];
  return categoriesString.split(/\s*[,;\/]\s*/).map(cat => cat.trim().toLowerCase()).filter(Boolean);
}

export async function POST(request) {
  try {
    const projectData = await request.json();
    const [allVendors, allRatings] = await Promise.all([
      getSheetData('Vendors'),
      getSheetData('Ratings'),
    ]);
    const searchTerm = projectData.serviceCategory.toLowerCase().trim();
    const relevantVendors = allVendors.filter(vendor => {
      if (vendor.status !== 'Active') return false;
      const vendorServices = parseServiceCategories(vendor.service_categories);
      return vendorServices.includes(searchTerm);
    });

    if (relevantVendors.length === 0) {
      return NextResponse.json({ success: false, message: 'No active vendors found for the selected service category.' });
    }

    const enhancedVendors = relevantVendors.map(vendor => {
      const recent_ratings = allRatings
        .filter(r => r.vendor_id === vendor.vendor_id)
        .sort((a, b) => new Date(b.rating_date || 0) - new Date(a.rating_date || 0))
        .slice(0, 3);
      return { ...vendor, recent_ratings };
    });

    const recommendations = await getAiRecommendations(projectData, enhancedVendors);

    return NextResponse.json({ success: true, ...recommendations });
  } catch (error) {
    console.error('Recommendation API Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
