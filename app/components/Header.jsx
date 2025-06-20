export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-brand-single rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">
              <span className="text-brand-single">Vi</span><span className="text-brand-throw">R</span><span className="text-brand-marketing">A</span>
            </h1>
            <span className="text-sm text-gray-500 hidden sm:inline">Next.js Edition</span>
          </div>
        </div>
      </div>
    </header>
  );
}
