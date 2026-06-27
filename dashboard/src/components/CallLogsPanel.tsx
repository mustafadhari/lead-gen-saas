'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Phone, Calendar, ChevronDown, ChevronUp, Plus } from 'lucide-react';

export interface CallLog {
  id: string;
  lead_id: string;
  vapi_call_id: string | null;
  outcome: string | null;
  transcript: string | null;
  recording_url: string | null;
  duration_seconds: number | null;
  created_at: string;
  leads: {
    id: string;
    business_name: string;
    phone_number: string | null;
    email: string | null;
    location: string | null;
  };
}

export function CallLogsPanel({ callLogs: initialCallLogs }: { callLogs: CallLog[] }) {
  const [callLogs] = useState<CallLog[]>(initialCallLogs);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [creatingAppt, setCreatingAppt] = useState<string | null>(null);
  const [apptForm, setApptForm] = useState<{
    scheduledAt: string;
    customerEmail: string;
    videoLink: string;
    notes: string;
  }>({
    scheduledAt: '',
    customerEmail: '',
    videoLink: '',
    notes: ''
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getOutcomeBadge = (outcome: string | null) => {
    const o = outcome?.toLowerCase() || 'unknown';
    
    if (o === 'interested') return 'bg-green-100 text-green-800';
    if (o === 'maybe') return 'bg-yellow-100 text-yellow-800';
    if (o === 'not_interested' || o === 'do_not_contact') return 'bg-red-100 text-red-800';
    if (o === 'voicemail' || o === 'no_answer') return 'bg-gray-100 text-gray-800';
    if (o === 'callback') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-600';
  };

  const handleCreateAppointment = async (callLog: CallLog) => {
    if (!apptForm.scheduledAt) {
      alert('Please select a date and time');
      return;
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .insert({
          lead_id: callLog.lead_id,
          call_log_id: callLog.id,
          scheduled_at: new Date(apptForm.scheduledAt).toISOString(),
          customer_email: apptForm.customerEmail || callLog.leads.email || null,
          video_link: apptForm.videoLink || null,
          notes: apptForm.notes || null,
          status: 'scheduled'
        });

      if (error) throw error;

      setCreatingAppt(null);
      setApptForm({ scheduledAt: '', customerEmail: '', videoLink: '', notes: '' });
      alert('Appointment created successfully!');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const interestedLogs = callLogs.filter(log => 
    log.outcome?.toLowerCase() === 'interested' || 
    log.outcome?.toLowerCase() === 'maybe' ||
    log.outcome?.toLowerCase() === 'callback'
  );

  if (interestedLogs.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <Phone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No interested leads yet</p>
        <p className="text-gray-400 text-xs mt-1">Call logs with positive outcomes will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {interestedLogs.map((log) => (
        <div key={log.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{log.leads.business_name}</h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {log.leads.phone_number}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getOutcomeBadge(log.outcome)}`}>
                  {log.outcome || 'unknown'}
                </span>
                <span className="text-xs text-gray-400">{formatDate(log.created_at)}</span>
                <span className="text-xs text-gray-400">{formatDuration(log.duration_seconds)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCreatingAppt(creatingAppt === log.id ? null : log.id)}
                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-3 h-3 mr-1" />
                Schedule Demo
              </button>
              <button
                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {expandedLog === log.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Appointment Creation Form */}
          {creatingAppt === log.id && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-gray-900 mb-3 text-sm">Create Appointment</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={apptForm.scheduledAt}
                    onChange={(e) => setApptForm({ ...apptForm, scheduledAt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Customer Email
                  </label>
                  <input
                    type="email"
                    value={apptForm.customerEmail}
                    onChange={(e) => setApptForm({ ...apptForm, customerEmail: e.target.value })}
                    placeholder={log.leads.email || 'customer@example.com'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Video Call Link
                  </label>
                  <input
                    type="url"
                    value={apptForm.videoLink}
                    onChange={(e) => setApptForm({ ...apptForm, videoLink: e.target.value })}
                    placeholder="https://meet.google.com/..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={apptForm.notes}
                    onChange={(e) => setApptForm({ ...apptForm, notes: e.target.value })}
                    placeholder="Any additional notes..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setCreatingAppt(null);
                      setApptForm({ scheduledAt: '', customerEmail: '', videoLink: '', notes: '' });
                    }}
                    className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleCreateAppointment(log)}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    Create Appointment
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Transcript */}
          {expandedLog === log.id && log.transcript && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2 text-xs uppercase tracking-wide">Transcript</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{log.transcript}</p>
              {log.recording_url && (
                <a 
                  href={log.recording_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block mt-3 text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Listen to recording
                </a>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
