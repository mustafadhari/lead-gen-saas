'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Mail, Phone, MapPin, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Lead } from './LeadTable';

const statusColors: Record<string, string> = {
  new: 'bg-gray-100 text-gray-800',
  queued: 'bg-yellow-100 text-yellow-800',
  called: 'bg-blue-100 text-blue-800',
  emailed: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  uncontactable: 'bg-red-100 text-red-800',
  failed: 'bg-red-100 text-red-800',
};

interface LeadWithJob extends Lead {
  crawl_jobs?: {
    id: string;
    business_type: string;
    city: string;
    website_filter: string;
    created_at: string;
  } | null;
}

export function LeadsGroupedView({ leads: initialLeads }: { leads: LeadWithJob[] }) {
  const [leads, setLeads] = useState<LeadWithJob[]>(initialLeads);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const handleDelete = async (leadId: string, businessName: string) => {
    if (!confirm(`Delete "${businessName}"? This cannot be undone.`)) {
      return;
    }

    setDeleting(leadId);

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      setLeads(prev => prev.filter(l => l.id !== leadId));
    }

    setDeleting(null);
  };

  const toggleJob = (jobId: string) => {
    setExpandedJobs(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const filteredLeads = leads.filter(lead => {
    if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
    if (searchTerm && !lead.business_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const groupedLeads = filteredLeads.reduce((acc, lead) => {
    const jobId = lead.crawl_job_id || 'ungrouped';
    if (!acc[jobId]) {
      acc[jobId] = [];
    }
    acc[jobId].push(lead);
    return acc;
  }, {} as Record<string, LeadWithJob[]>);

  const uniqueStatuses = Array.from(new Set(leads.map(l => l.status)));

  if (!leads || leads.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <p className="text-gray-500">No leads found in the pipeline.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search business name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
          />
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          >
            <option value="all">All Statuses</option>
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          {(statusFilter !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setSearchTerm('');
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Clear filters
            </button>
          )}

          <div className="ml-auto text-sm text-gray-500 flex items-center">
            Showing {filteredLeads.length} of {leads.length}
          </div>
        </div>
      </div>

      {/* Grouped Leads */}
      {Object.entries(groupedLeads).map(([jobId, jobLeads]) => {
        const firstLead = jobLeads[0];
        const jobInfo = firstLead.crawl_jobs;
        const isExpanded = expandedJobs.has(jobId);

        return (
          <div key={jobId} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Job Header */}
            <button
              onClick={() => toggleJob(jobId)}
              className="w-full px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex items-center justify-between hover:from-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                <div className="text-left">
                  {jobInfo ? (
                    <>
                      <h3 className="font-semibold text-gray-900">
                        {jobInfo.business_type} in {jobInfo.city}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {jobInfo.website_filter === 'no_website' ? 'No website' :
                         jobInfo.website_filter === 'has_website' ? 'Has website' : 'All'} • 
                        Scraped {formatDistanceToNow(new Date(jobInfo.created_at), { addSuffix: true })}
                      </p>
                    </>
                  ) : (
                    <h3 className="font-semibold text-gray-900">Ungrouped Leads</h3>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-bold rounded-full">
                  {jobLeads.length} leads
                </span>
              </div>
            </button>

            {/* Leads Table */}
            {isExpanded && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Business</th>
                      <th className="px-6 py-3">Contact Info</th>
                      <th className="px-6 py-3">Location</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {jobLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3">
                          <div className="font-medium text-gray-900">{lead.business_name}</div>
                          {lead.website && (
                            <a
                              href={lead.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center mt-1"
                            >
                              Website <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex flex-col space-y-1">
                            {lead.phone_number && (
                              <span className="flex items-center text-gray-600 text-xs">
                                <Phone className="w-3 h-3 mr-1.5" /> {lead.phone_number}
                              </span>
                            )}
                            {lead.email && (
                              <span className="flex items-center text-gray-600 text-xs">
                                <Mail className="w-3 h-3 mr-1.5" /> {lead.email}
                              </span>
                            )}
                            {!lead.phone_number && !lead.email && (
                              <span className="text-gray-400 text-xs italic">No contact info</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-gray-600 text-xs">
                          <div className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1.5 text-gray-400" />
                            {lead.location || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                              statusColors[lead.status] || 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <button
                            onClick={() => handleDelete(lead.id, lead.business_name)}
                            disabled={deleting === lead.id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete lead"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {filteredLeads.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-gray-500 text-sm">No leads match your filters.</p>
        </div>
      )}
    </div>
  );
}
