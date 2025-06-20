function buildRecommendationPrompt(projectData, vendors) {
    const vendorSummaries = vendors.map(vendor => {
      let summary = `- Vendor ID: ${vendor.vendor_id}\n  Name: ${vendor.vendor_name}\n  Services: ${vendor.service_categories}\n  Rating: ${vendor.avg_overall_rating}/5 (${vendor.total_projects} projects)\n  Notes: ${vendor.vendor_notes || 'No notes provided.'}`;
      if (vendor.recent_ratings && vendor.recent_ratings.length > 0) {
        summary += `\n  Recent Project Feedback:`;
        vendor.recent_ratings.forEach(rating => {
          summary += `\n    - Success: ${rating.project_success_rating}/5, Quality: ${rating.vendor_quality_rating}/5, Comm: ${rating.vendor_communication_rating}/5. On Time: ${rating.project_on_time ? 'Yes':'No'}. Strengths: "${rating.what_went_well || 'N/A'}"`;
        });
      }
      return summary;
    }).join('\n\n');
    
    return `You are a vendor selection expert. Your task is to rank vendors for a project based on the provided details.

PROJECT REQUIREMENTS:
- Title: ${projectData.projectTitle}
- Service Category: ${projectData.serviceCategory}
- Description & Key Skills: ${projectData.projectDescription}

CANDIDATE VENDORS:
${vendorSummaries}

INSTRUCTIONS:
1.  Analyze all vendors against the project requirements.
2.  Prioritize factors in this order:
    a.  **Service Category Match:** This is the most critical factor.
    b.  **Keyword Relevance:** Analyze the vendor's "Notes" and "Recent Project Feedback" for keywords matching the project description. This is the second most important factor, especially if ratings are similar or absent.
    c.  **Recent Feedback:** Give more weight to detailed recent feedback than the overall average rating. Look for patterns in strengths and concerns.
    d.  **Overall Rating and Experience:** Use this as a supporting factor.
3.  Provide your response in this EXACT JSON format, including ALL vendors provided:
{
  "recommendations": [
    {
      "rank": 1,
      "vendorId": "vendor_id_here",
      "vendorName": "vendor_name_here",
      "matchScore": 95,
      "strengths": ["list of key strengths"],
      "concerns": ["list of potential concerns"],
      "recommendation": "A brief sentence justifying the rank."
    }
  ],
  "explanation": "A 2-3 sentence summary of your overall ranking logic and the key decision factors.",
  "budgetAnalysis": "Brief analysis of budget compatibility if data is available.",
  "riskFactors": "Any potential risks or considerations for the top recommended vendors."
}`;
}

function generateFallbackRecommendation(projectData, vendors) {
    console.log('Using ENHANCED fallback recommendation algorithm');
    const weights = { serviceMatch: 0.40, notesMatch: 0.30, rating: 0.15, experience: 0.15 };
    const extractKeywords = (text) => {
      if (!text) return [];
      const commonWords = new Set(['the', 'a', 'an', 'is', 'are', 'in', 'on', 'for', 'with', 'and', 'to', 'of']);
      return [...new Set(text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(word => word.length > 2 && !commonWords.has(word)))];
    };
    const projectKeywords = extractKeywords(projectData.projectDescription);
    const scoredVendors = vendors.map(vendor => {
        const vendorServices = (vendor.service_categories || '').toLowerCase().split(',').map(s => s.trim());
        const serviceMatchScore = vendorServices.includes(projectData.serviceCategory.toLowerCase()) ? 100 : 0;
        const vendorKeywords = extractKeywords(vendor.vendor_notes);
        const matchedKeywords = projectKeywords.filter(pk => vendorKeywords.includes(pk));
        const notesMatchScore = projectKeywords.length > 0 ? (matchedKeywords.length / projectKeywords.length) * 100 : 0;
        const ratingScore = (parseFloat(vendor.avg_overall_rating) || 0) * 20;
        const experienceScore = Math.min(100, (parseInt(vendor.total_projects) || 0) * 5);
        const weightedScore = (weights.serviceMatch * serviceMatchScore) + (weights.notesMatch * notesMatchScore) + (weights.rating * ratingScore) + (weights.experience * experienceScore);
        const strengths = [];
        if (serviceMatchScore > 0) strengths.push('Strong service match');
        if (notesMatchScore > 50) strengths.push('Relevant skills in notes');
        const concerns = [];
        if (notesMatchScore < 20 && projectKeywords.length > 0) concerns.push('Lacks specific skills');
        return { vendor, score: weightedScore, strengths, concerns };
    });
    scoredVendors.sort((a, b) => b.score - a.score);
    const recommendations = scoredVendors.map((item, index) => ({
      rank: index + 1,
      vendorId: item.vendor.vendor_id,
      vendorName: item.vendor.vendor_name,
      matchScore: Math.round(item.score),
      strengths: item.strengths.length > 0 ? item.strengths : ['General fit'],
      concerns: item.concerns,
      recommendation: item.score >= 70 ? 'Strong recommendation' : item.score >= 50 ? 'Good fit' : 'Consider with caution'
    }));
    return { recommendations, explanation: 'Vendors ranked by a weighted algorithm considering service match, keyword relevance in notes, experience, and ratings.', source: 'Fallback Algorithm' };
}

export async function getAiRecommendations(projectData, candidateVendors) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || candidateVendors.length === 0) {
    return generateFallbackRecommendation(projectData, candidateVendors);
  }
  const prompt = buildRecommendationPrompt(projectData, candidateVendors);
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });
    if (!response.ok) throw new Error('OpenAI API call failed.');
    const data = await response.json();
    return { ...JSON.parse(data.choices[0].message.content), source: 'OpenAI' };
  } catch (error) {
    console.error('AI Recommendation Error:', error);
    return generateFallbackRecommendation(projectData, candidateVendors);
  }
}
