'use client';

import { Calendar, Clock, Phone, MapPin, Video, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useState } from 'react';

export interface Appointment {
  id: string;
  lead_id: string;
  scheduled_at: string;
  customer_email: string | null;
  video_link: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  created_at: string;
  leads: {
    business_name: string;
    phone_number: string | null;
    location: string | null;
  };
}

export function AppointmentsList({ appointments: initialAppointments }: { appointments: Appointment[] }) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [updating, setUpdating] = useState<string | null>(null);

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });

    if (isToday) return `Today at ${timeStr}`;
    if (isTomorrow) return `Tomorrow at ${timeStr}`;

    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const isUpcoming = (scheduledAt: string) => {
    const now = new Date();
    const apptTime = new Date(scheduledAt);
    const hoursUntil = (apptTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil <= 2 && hoursUntil > 0;
  };

  const handleStatusUpdate = async (id: string, newStatus: 'completed' | 'cancelled' | 'no_show') => {
    setUpdating(id);
    
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      console.error('Failed to update appointment:', error);
    } else {
      setAppointments(prev => prev.map(a => 
        a.id === id ? { ...a, status: newStatus } : a
      ));
    }

    setUpdating(null);
  };

  if (appointments.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No upcoming appointments</p>
        <p className="text-gray-400 text-xs mt-1">Scheduled demos will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((appt) => {
        const upcoming = isUpcoming(appt.scheduled_at);
        
        return (
          <div 
            key={appt.id} 
            className={`bg-white rounded-lg shadow-sm border p-4 transition-all ${
              upcoming ? 'border-orange-300 bg-orange-50/30' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{appt.leads.business_name}</h3>
                  {upcoming && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold uppercase rounded-full">
                      Soon
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{formatDateTime(appt.scheduled_at)}</span>
                  </div>

                  {appt.leads.phone_number && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{appt.leads.phone_number}</span>
                    </div>
                  )}

                  {appt.customer_email && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">@</span>
                      <span>{appt.customer_email}</span>
                    </div>
                  )}

                  {appt.leads.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-xs">{appt.leads.location}</span>
                    </div>
                  )}

                  {appt.video_link && (
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-gray-400" />
                      <a 
                        href={appt.video_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Join video call
                      </a>
                    </div>
                  )}

                  {appt.notes && (
                    <div className="mt-2 text-xs text-gray-500 italic">
                      {appt.notes}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleStatusUpdate(appt.id, 'completed')}
                  disabled={updating === appt.id}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Mark as completed"
                >
                  <CheckCircle className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleStatusUpdate(appt.id, 'cancelled')}
                  disabled={updating === appt.id}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Cancel appointment"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
