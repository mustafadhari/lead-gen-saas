'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Mail, Phone, MapPin, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface Lead {
  id: string;
  business_name: string;
  phone_number: string | null;
  email: string | null;
  website: string | null;
  location: string | null;
  source_url: string | null;
  crawl_job_id: string | null;
  status: 'new' | 'queued' | 'called' | 'emailed' | 'completed' | 'uncontactable' | string;
  contact_method: 'call' | 'email' | 'none' | string;
  created_at: string;
  updated_at: string;
  call_logs?: any[];
}

const statusColors: Record<string, string> = {
  new: 'bg-gray-100 text-gray-800',
  queued: 'bg-yellow-100 text-yellow-800',
  called: 'bg-blue-100 text-blue-800',
  emailed: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  uncontactable: 'bg-red-100 text-red-800',
  failed: 'bg-red-100 text-red-800',
};

export function LeadTable({ leads: initialLeads }: { leads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [contactFilter, setContactFilter] = useState<string>('all');
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

  const filteredLeads = leads.filter(lead => {
    if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
    if (contactFilter !== 'all' && lead.contact_method !== contactFilter) return false;
    if (searchTerm && !lead.business_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const uniqueStatuses = Array.from(new Set(leads.map(l => l.status)));
  const uniqueContactMethods = Array.from(new Set(leads.map(l => l.contact_method)));

  if (!leads || leads.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <p className="text-gray-500">No leads found in the pipeline.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Filters */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
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

          <select
            value={contactFilter}
            onChange={(e) => setContactFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          >
            <option value="all">All Contact Methods</option>
            {uniqueContactMethods.map(method => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>

          {(statusFilter !== 'all' || contactFilter !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setContactFilter('all');
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

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold tracking-wider">
            <tr>
              <th className="px-6 py-4">Business</th>
              <th className="px-6 py-4">Contact Info</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Method</th>
              <th className="px-6 py-4 text-right">Added</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredLeads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
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
                <td className="px-6 py-4">
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
                <td className="px-6 py-4 text-gray-600">
                  <div className="flex items-center">
                    <MapPin className="w-3 h-3 mr-1.5 text-gray-400" />
                    {lead.location || '-'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      statusColors[lead.status] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {lead.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600 capitalize">
                  {lead.contact_method}
                </td>
                <td className="px-6 py-4 text-right text-gray-500 whitespace-nowrap">
                  {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                </td>
                <td className="px-6 py-4 text-center">
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

      {filteredLeads.length === 0 && (
        <div className="p-8 text-center text-gray-500 text-sm">
          No leads match your filters.
        </div>
      )}
    </div>
  );
}
