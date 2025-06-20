const RecommendationCard = ({ rec }) => {
  const rankColor = rec.rank === 1 ? 'bg-green-100 text-green-800' : 
                   rec.rank === 2 ? 'bg-blue-100 text-blue-800' : 
                   rec.rank === 3 ? 'bg-yellow-100 text-yellow-800' : 
                   'bg-gray-100 text-gray-800';

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-4 transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center justify-center w-8 h-8 ${rankColor} rounded-full text-sm font-semibold`}>
            {rec.rank}
          </span>
          <div>
            <h3 className="font-semibold text-gray-900">{rec.vendorName}</h3>
            <p className="text-sm text-gray-600">Match Score: {rec.matchScore}/100</p>
          </div>
        </div>
        <span className="inline-block bg-brand-single text-white text-xs px-2 py-1 rounded-full">{rec.recommendation}</span>
      </div>
      <div className="space-y-2 text-sm">
        {rec.strengths && rec.strengths.length > 0 && <div><strong>Strengths:</strong> {rec.strengths.join(', ')}</div>}
        {rec.concerns && rec.concerns.length > 0 && <div className="text-red-600"><strong>Concerns:</strong> {rec.concerns.join(', ')}</div>}
      </div>
    </div>
  );
};


export default function RecommendationsDisplay({ result, isLoading }) {
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-12 text-gray-500">
          <div className="loading-spinner mx-auto mb-4 w-8 h-8 border-4"></div>
          <p>Analyzing vendors and generating recommendations...</p>
        </div>
      );
    }

    if (!result) {
      return (
        <div className="text-center py-12 text-gray-500">
          <p>Submit a project to get vendor recommendations.</p>
        </div>
      );
    }

    if (!result.success) {
      return <div className="text-center py-12 text-red-500"><p>Error: {result.message}</p></div>;
    }

    return (
      <>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-blue-900 mb-2">AI Analysis</h3>
          <p className="text-sm text-blue-700">{result.explanation}</p>
        </div>
        <div>
          {result.recommendations.map((rec) => <RecommendationCard key={rec.vendorId} rec={rec} />)}
        </div>
      </>
    );
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 flex justify-between items-center">
        <div>
            <h2 className="text-lg font-semibold text-gray-900">Vendor Recommendations</h2>
            <p className="text-sm text-gray-600 mt-1">Source: <span className="font-semibold">{isLoading ? 'Loading...' : result?.source || 'N/A'}</span></p>
        </div>
      </div>
      <div className="p-6 min-h-[300px]">
        {renderContent()}
      </div>
    </div>
  );
}
