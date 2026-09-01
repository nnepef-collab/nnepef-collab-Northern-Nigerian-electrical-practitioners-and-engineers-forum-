import React, { useState } from 'react';
import { EventItem } from '../types';
import { Calendar, Clock, MapPin, Users, QrCode, CheckCircle2, ArrowLeft } from 'lucide-react';

interface EventsViewProps {
  events: EventItem[];
  setCurrentView: (view: string) => void;
}

export const EventsView: React.FC<EventsViewProps> = ({ events, setCurrentView }) => {
  const [rsvpEvents, setRsvpEvents] = useState<string[]>([]);
  const [activeQrModal, setActiveQrModal] = useState<EventItem | null>(null);

  const handleRsvp = (eventId: string) => {
    if (!rsvpEvents.includes(eventId)) {
      setRsvpEvents([...rsvpEvents, eventId]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentView('home')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-[#0A2E73] dark:hover:text-sky-400"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-sky-100 text-[#0A2E73] dark:bg-sky-950 dark:text-sky-300">
          N-NEPEF Events &amp; Summits
        </span>
      </div>

      <div className="text-center space-y-2">
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">
          Upcoming Power Summits, Workshops &amp; AGMs
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
          Participate in technical training workshops, annual general meetings, and regional energy expos across Northern Nigeria.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {events.map((ev) => {
          const isAttending = rsvpEvents.includes(ev.id);
          return (
            <div key={ev.id} className="glass-card p-8 rounded-3xl space-y-6 shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-sky-100 text-[#0A2E73] dark:bg-sky-950 dark:text-sky-300 text-xs font-extrabold uppercase">
                    {ev.state} Chapter
                  </span>
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <Users className="w-4 h-4 text-[#2EA3F2]" />
                    {ev.rsvpCount + (isAttending ? 1 : 0)} Attending
                  </span>
                </div>

                <h3 className="font-display font-extrabold text-xl text-slate-900 dark:text-white">
                  {ev.title}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {ev.description}
                </p>

                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
                    <Clock className="w-4 h-4 text-[#2EA3F2]" />
                    <span>{ev.date} • {ev.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <MapPin className="w-4 h-4 text-[#2EA3F2]" />
                    <span>{ev.location}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                {isAttending ? (
                  <button
                    onClick={() => setActiveQrModal(ev)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>View QR Pass</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleRsvp(ev.id)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A2E73] text-white font-bold text-xs hover:bg-sky-700 shadow"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#2EA3F2]" />
                    <span>Register / RSVP Now</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
