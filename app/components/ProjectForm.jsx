export default function ProjectForm({ onSubmit, isLoading }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Project Requirements</h2>
        <p className="text-sm text-gray-600 mt-1">Describe your project to get AI-powered recommendations</p>
      </div>
      <form onSubmit={onSubmit} className="p-6 space-y-6">
        <div>
          <label htmlFor="projectTitle" className="block text-sm font-medium text-gray-700 mb-2">Project Title <span className="text-red-500">*</span></label>
          <input type="text" id="projectTitle" name="projectTitle" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-single transition-colors" placeholder="e.g., Q3 Content Marketing Campaign" />
        </div>
        <div>
          <label htmlFor="serviceCategory" className="block text-sm font-medium text-gray-700 mb-2">Service Category <span className="text-red-500">*</span></label>
          <select id="serviceCategory" name="serviceCategory" required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-single transition-colors">
            <option value="">Select a service...</option>
            <option value="web">Web</option>
            <option value="content">Content</option>
            <option value="graphic design">Graphic Design</option>
            <option value="seo">SEO</option>
            <option value="proofreading">Proofreading</option>
            <option value="social media">Social Media</option>
            <option value="paid media">Paid Media</option>
            <option value="dev & support">Dev & Support</option>
            <option value="data">Data</option>
          </select>
        </div>
        <div>
          <label htmlFor="projectDescription" className="block text-sm font-medium text-gray-700 mb-2">Project Scope <span className="text-red-500">*</span></label>
          <textarea id="projectDescription" name="projectDescription" required rows="6" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-single transition-colors resize-none" placeholder="Describe scope, deliverables, key skills, and any specific requirements..."></textarea>
        </div>
        <button type="submit" disabled={isLoading} className="w-full bg-brand-single text-white py-3 px-4 rounded-lg font-medium hover:bg-opacity-90 transition-all flex items-center justify-center disabled:bg-gray-400">
          {isLoading ? 'Getting Recommendations...' : 'Get AI Recommendations'}
          {isLoading && <div className="loading-spinner ml-3"></div>}
        </button>
      </form>
    </div>
  );
}
