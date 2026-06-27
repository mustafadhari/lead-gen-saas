'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Play, Loader2 } from 'lucide-react';

export function CrawlJobModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [businessType, setBusinessType] = useState('');
  const [city, setCity] = useState('');
  const [websiteFilter, setWebsiteFilter] = useState('no_website');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessType || !city) return;

    setIsSubmitting(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('crawl_jobs')
        .insert({
          business_type: businessType,
          city: city,
          website_filter: websiteFilter,
          status: 'pending'
        });

      if (error) {
        throw error;
      }

      setMessage('Job successfully added to the queue! The backend orchestrator will start scraping soon.');
      setTimeout(() => {
        setIsOpen(false);
        setBusinessType('');
        setCity('');
        setWebsiteFilter('no_website');
        setMessage('');
      }, 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Play className="w-4 h-4 mr-2" />
        New Scrape Job
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Start a new crawl</h2>
            <p className="text-sm text-gray-600 mb-6">
              Enter a business type and location to trigger the Playwright crawler. It will fetch Google Maps listings and add them to your pipeline automatically.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Type (e.g. Plumber, Dentist)
                </label>
                <input
                  type="text"
                  required
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
                  placeholder="Plumber"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location (e.g. Austin TX)
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
                  placeholder="Austin TX"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website Filter
                </label>
                <select
                  value={websiteFilter}
                  onChange={(e) => setWebsiteFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  disabled={isSubmitting}
                >
                  <option value="no_website">No Website — needs one built</option>
                  <option value="has_website">Has Website — redesign prospects</option>
                  <option value="any">All Businesses</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {websiteFilter === 'no_website' && 'Only businesses without a website will be saved as leads.'}
                  {websiteFilter === 'has_website' && 'Only businesses that already have a website will be saved.'}
                  {websiteFilter === 'any' && 'All scraped businesses will be saved regardless of website status.'}
                </p>
              </div>

              {message && (
                <div className={`p-3 text-sm rounded-lg ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {message}
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    'Start Scrape'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
