import { supabase } from '../lib/supabase';
import { DashboardClient } from '../components/DashboardClient';
import { Lead } from '../components/LeadTable';

export const revalidate = 0; // Disable static rendering for this page to always fetch fresh data

export default async function DashboardPage() {
  const { data: leads, error } = await supabase
    .from('leads')
    .select(`
      *,
      crawl_jobs (
        id,
        business_type,
        city,
        website_filter,
        created_at
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching leads:', error);
  }

  // Also fetch recent crawl jobs
  const { data: crawlJobs } = await supabase
    .from('crawl_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch upcoming appointments with lead details
  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      *,
      leads (
        business_name,
        phone_number,
        location
      )
    `)
    .in('status', ['scheduled'])
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(20);

  // Fetch recent call logs with lead details (for appointment creation)
  const { data: callLogs } = await supabase
    .from('call_logs')
    .select(`
      *,
      leads (
        id,
        business_name,
        phone_number,
        email,
        location
      )
    `)
    .not('transcript', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);

  const leadsList = (leads || []) as Lead[];
  const crawlJobsList = crawlJobs || [];
  const appointmentsList = appointments || [];
  const callLogsList = callLogs || [];

  return <DashboardClient initialLeads={leadsList} initialJobs={crawlJobsList} initialAppointments={appointmentsList} initialCallLogs={callLogsList} />;
}

