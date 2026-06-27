'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { StatCard } from './StatCard';
import { Lead } from './LeadTable';
import { LeadsGroupedView } from './LeadsGroupedView';
import { CrawlJobModal } from './CrawlJobModal';
import { AppointmentsList, Appointment } from './AppointmentsList';
import { CallLogsPanel, CallLog } from './CallLogsPanel';
import {
  Users,
  PhoneCall,
  Mail,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Calendar
} from 'lucide-react';

export function DashboardClient({ initialLeads, initialJobs, initialAppointments, initialCallLogs }: { initialLeads: Lead[], initialJobs: any[], initialAppointments: Appointment[], initialCallLogs: CallLog[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [crawlJobs, setCrawlJobs] = useState<any[]>(initialJobs);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [callLogs] = useState<CallLog[]>(initialCallLogs);

  useEffect(() => {
    // Subscribe to Leads changes
    const leadsChannel = supabase.channel('public:leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setLeads((prev) => [payload.new as Lead, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setLeads((prev) => prev.map(l => l.id === payload.new.id ? (payload.new as Lead) : l));
        } else if (payload.eventType === 'DELETE') {
          setLeads((prev) => prev.filter(l => l.id !== payload.old.id));
        }
      })
      .subscribe();

    // Subscribe to Crawl Jobs changes
    const jobsChannel = supabase.channel('public:crawl_jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crawl_jobs' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setCrawlJobs((prev) => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setCrawlJobs((prev) => prev.map(j => j.id === payload.new.id ? payload.new : j));
        } else if (payload.eventType === 'DELETE') {
          setCrawlJobs((prev) => prev.filter(j => j.id !== payload.old.id));
        }
      })
      .subscribe();

    // Subscribe to Appointments changes
    const appointmentsChannel = supabase.channel('public:appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const { data: appt } = await supabase
            .from('appointments')
            .select(`
              *,
              leads (
                business_name,
                phone_number,
                location
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (appt) {
            if (payload.eventType === 'INSERT') {
              setAppointments((prev) => [appt as Appointment, ...prev]);
            } else {
              setAppointments((prev) => prev.map(a => a.id === appt.id ? (appt as Appointment) : a));
            }
          }
        } else if (payload.eventType === 'DELETE') {
          setAppointments((prev) => prev.filter(a => a.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(jobsChannel);
      supabase.removeChannel(appointmentsChannel);
    };
  }, []);

  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status === 'new').length;
  const queuedLeads = leads.filter(l => l.status === 'queued').length;
  const calledLeads = leads.filter(l => l.status === 'called').length;
  const emailedLeads = leads.filter(l => l.status === 'emailed').length;
  const completedLeads = leads.filter(l => l.status === 'completed').length;

  const handleCancelJob = async (id: string) => {
    // Optimistic UI update
    setCrawlJobs((prev) => prev.map(j => j.id === id ? { ...j, status: 'cancelled' } : j));

    await supabase
      .from('crawl_jobs')
      .update({ status: 'cancelled' })
      .eq('id', id);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              LeadFlow Dashboard
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Live automated AI outreach pipeline. Real-time updates enabled.
            </p>
          </div>
          <div>
            <CrawlJobModal />
          </div>
        </div>

        {/* Recent Scrapes (if any) */}
        {crawlJobs && crawlJobs.length > 0 && (
          <div className="mb-8 p-5 bg-blue-50/50 rounded-xl border border-blue-100 shadow-sm">
            <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" style={{ display: crawlJobs.some(j => j.status === 'running') ? 'block' : 'none' }} />
              Active & Recent Scrape Jobs
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-blue-200">
              {crawlJobs.slice(0, 5).map((job) => (
                <div key={job.id} className="min-w-[280px] bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-semibold text-gray-900 block">{job.business_type}</span>
                      <span className="text-xs text-gray-500">{job.city}</span>
                      <span className="block text-[10px] mt-0.5 font-medium text-purple-600">
                        {job.website_filter === 'no_website' ? 'No website' :
                         job.website_filter === 'has_website' ? 'Has website' : 'All'}
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                      job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      job.status === 'running' ? 'bg-blue-100 text-blue-800 animate-pulse' :
                      job.status === 'completed' ? 'bg-green-100 text-green-800' :
                      job.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {job.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                    <span className="text-xs font-medium text-gray-600">
                      {job.status === 'completed' ? `${job.leads_found || 0} found` :
                       job.status === 'failed' ? 'Error occurred' :
                       job.status === 'cancelled' ? 'Aborted' :
                       'Scraping...'}
                    </span>

                    {(job.status === 'pending' || job.status === 'running') && (
                      <button
                        onClick={() => handleCancelJob(job.id)}
                        className="text-xs flex items-center text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Stop
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard title="Total Leads" value={totalLeads} icon={Users} />
          <StatCard title="Queued / Pending" value={newLeads + queuedLeads} icon={Clock} />
          <StatCard title="Voice Calls" value={calledLeads} icon={PhoneCall} />
          <StatCard title="Emails Sent" value={emailedLeads} icon={Mail} />
          <StatCard title="Completed" value={completedLeads} icon={CheckCircle} />
        </div>

        {/* Upcoming Appointments */}
        {appointments.length > 0 && (
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Upcoming Demo Calls
              </h2>
              <span className="text-sm text-gray-500 font-medium bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
                {appointments.length} scheduled
              </span>
            </div>
            <AppointmentsList appointments={appointments} />
          </div>
        )}

        {/* Interested Call Logs */}
        {callLogs.length > 0 && (
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-green-600" />
                Interested Leads
              </h2>
              <span className="text-sm text-gray-500 font-medium bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
                {callLogs.filter(l => l.outcome?.toLowerCase() === 'interested' || l.outcome?.toLowerCase() === 'maybe' || l.outcome?.toLowerCase() === 'callback').length} to follow up
              </span>
            </div>
            <CallLogsPanel callLogs={callLogs} />
          </div>
        )}

        {/* Leads Grouped by Scrape Job */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Scraped Leads</h2>
          <span className="text-sm text-gray-500 font-medium bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
            {leads.length} total leads
          </span>
        </div>

        <LeadsGroupedView leads={leads} />

      </div>
    </div>
  );
}
