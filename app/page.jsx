'use client';

import { useState } from 'react';
import ProjectForm from './components/ProjectForm';
import RecommendationsDisplay from './components/RecommendationsDisplay';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [recommendationResult, setRecommendationResult] = useState(null);

  const handleProjectSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setRecommendationResult(null);

    const formData = new FormData(event.target);
    const projectData = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/api/recommendations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData),
        });
        const result = await response.json();
        setRecommendationResult(result);
    } catch (error) {
        setRecommendationResult({ success: false, message: 'An unexpected error occurred.' });
        console.error(error);
    } finally {
        setIsLoading(false);
    }
  };

  return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ProjectForm onSubmit={handleProjectSubmit} isLoading={isLoading} />
          <RecommendationsDisplay result={recommendationResult} isLoading={isLoading} />
        </div>
      </main>
  );
}
