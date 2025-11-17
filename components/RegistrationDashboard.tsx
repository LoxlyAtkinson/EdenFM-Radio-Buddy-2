import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Registration, RadioShow } from '../types';
import { fetchData } from '../services/googleSheetService';
import { LoadingIcon, PeopleIcon } from './icons';
import { ViewPayload } from './Dashboard';

interface RegistrationDashboardProps {
    setActiveView: (view: string, payload?: ViewPayload) => void;
}

// ADDED: Helper constants for parsing formatted day strings (e.g., "Mon-Wed").
const shortDayToFull: { [key: string]: string } = {
    'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday', 'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday'
};
const dayOrderArray = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const fullDaysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']; // NEW: For robust parsing

// Maps JS Date's getDay() index to a full day name.
const dayFullNameMap: { [key: number]: string } = { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };

/**
 * FIXED: Determines if a show is on air at a specific date and time.
 * This function now correctly parses day formats like "Mon-Wed, Fri" and handles
 * shows that cross midnight (e.g., 22:00 - 02:00) to accurately match registrations to shows.
 * @param show - The RadioShow object.
 * @param date - The Date object of the registration.
 * @returns boolean - True if the show is on air.
 */
const isShowOnAir = (show: RadioShow, date: Date): boolean => {
  // FIX: Use the backend-provided 'Day' field first, which has expanded day names, for accurate matching.
  const formattedDayString = String(
    (show as any).Day ?? show['Day(s) of Week'] ?? ''
  );
  const startTimeValue = show['Start'];
  const endTimeValue = show['End'];

  if (!formattedDayString || !startTimeValue || !endTimeValue) return false;

  const scheduledDays = new Set<string>();
  const parts = formattedDayString.split(',').map(p => p.trim()).filter(Boolean);

  for (const part of parts) {
      if (part.includes('-')) {
          const [startShort, endShort] = part.split('-');
          const startIndex = dayOrderArray.indexOf(startShort);
          const endIndex = dayOrderArray.indexOf(endShort);
          if (startIndex > -1 && endIndex > -1 && startIndex <= endIndex) {
              for (let i = startIndex; i <= endIndex; i++) {
                  const dayName = shortDayToFull[dayOrderArray[i]];
                  if (dayName) scheduledDays.add(dayName);
              }
          }
      } else {
          const dayName = shortDayToFull[part];
          if (dayName) {
              scheduledDays.add(dayName);
          } else if (fullDaysOfWeek.includes(part)) {
              scheduledDays.add(part);
          }
      }
  }

  const currentDayName = dayFullNameMap[date.getDay()];
  const previousDayName = dayFullNameMap[(date.getDay() + 6) % 7]; // The day before the event's date

  const startTimeStr = String(startTimeValue).replace('h', ':');
  const [startH, startM] = startTimeStr.split(':').map(Number);
  if (isNaN(startH) || isNaN(startM)) return false;
  const startTime = startH * 60 + startM;

  const endTimeStr = String(endTimeValue).replace('h', ':');
  const [endH, endM] = endTimeStr.split(':').map(Number);
  if (isNaN(endH) || isNaN(endM)) return false;
  const endTime = endH * 60 + endM;
  
  const currentTime = date.getHours() * 60 + date.getMinutes();

  const crossesMidnight = endTime < startTime;

  if (crossesMidnight) {
    // For an overnight show (e.g., Fri 22:00 - Sat 02:00):
    // Match if it's the start day (Fri) AND the time is after the start time.
    const isAfterStartTimeOnStartDay = scheduledDays.has(currentDayName) && currentTime >= startTime;
    // OR match if it's the day after the start day (Sat) AND the time is before the end time.
    // We check `scheduledDays` for the *previous* day name because the schedule lists the start day.
    const isBeforeEndTimeOnNextDay = scheduledDays.has(previousDayName) && currentTime < endTime;
    
    return isAfterStartTimeOnStartDay || isBeforeEndTimeOnNextDay;
  } else {
    // For a same-day show (e.g., Mon 09:00 - Mon 12:00):
    // Match if it's the correct day AND the time is within the start/end bounds.
    return scheduledDays.has(currentDayName) && currentTime >= startTime && currentTime < endTime;
  }
};


const RegistrationDashboard: React.FC<RegistrationDashboardProps> = ({ setActiveView }) => {
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [schedule, setSchedule] = useState<RadioShow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [regData, scheduleData] = await Promise.all([
                fetchData<Registration>('Registered Users'),
                fetchData<RadioShow>('TimeSlots')
            ]);
            setRegistrations(regData);
            setSchedule(scheduleData);
        } catch (err) {
            setError('Failed to load registration analytics.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5 * 60 * 1000); // Poll every 5 minutes
        return () => clearInterval(interval);
    }, [loadData]);

    const analytics = useMemo(() => {
        const total = registrations.length;
        
        const areaCounts: { [area: string]: number } = {};
        registrations.forEach(reg => {
            const area = reg.Area?.trim();
            if (area) areaCounts[area] = (areaCounts[area] || 0) + 1;
        });
        const topAreas = Object.entries(areaCounts).sort(([,a],[,b]) => b-a).slice(0, 5);

        const regsPerShow: { [show: string]: number } = {};
        if (schedule.length > 0) {
            registrations.forEach(reg => {
              try {
                let regDate: Date | null = null;
                // FIX: Construct date from 'Registration Date' and 'Registration Time' columns instead of non-existent 'Timestamp'.
                if (reg['Registration Date']) {
                    const rawDate = String(reg['Registration Date']);
                    const datePart = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;

                    let timePart = '00:00:00';
                    if (reg['Registration Time']) {
                        const rawTime = String(reg['Registration Time']);
                        timePart = rawTime.split(' ')[0].slice(0, 8);
                    }
                    regDate = new Date(`${datePart}T${timePart}`);
                }
                
                if (!regDate || isNaN(regDate.getTime())) return;
                
                const matchedShow = schedule.find(show => isShowOnAir(show, regDate));

                if (matchedShow) {
                    regsPerShow[matchedShow.Show] = (regsPerShow[matchedShow.Show] || 0) + 1;
                }
              } catch(e) { /* ignore invalid dates */ }
            });
        }
        const topShows = Object.entries(regsPerShow).sort(([,a],[,b]) => b-a).slice(0, 5);

        return { total, topAreas, topShows };
    }, [registrations, schedule]);

    const handleAreaClick = (area: string) => {
        setActiveView('registrations-list', { filter: { column: 'Area', value: area }});
    };

    if (loading) return <div className="mt-8 flex justify-center"><LoadingIcon /></div>;
    if (error) return <div className="mt-8 text-center text-red-500">{error}</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg col-span-1 lg:col-span-2 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><PeopleIcon/></div>
                    <div>
                        <p className="text-sm text-gray-500">Total Registered Users</p>
                        <p className="text-3xl font-bold text-gray-900">{analytics.total}</p>
                    </div>
                </div>
            </div>
             <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Top 5 Areas</h2>
                 {analytics.topAreas.length > 0 ? (
                    <ul className="space-y-3">
                        {analytics.topAreas.map(([area, count]) => (
                            <li key={area} className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200">
                                <button onClick={() => handleAreaClick(area)} className="font-medium text-gray-700 hover:text-blue-600 hover:underline">
                                    {area}
                                </button>
                                <span className="font-bold text-blue-600">{count} users</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">Not enough data to show top areas.</p>
                )}
            </div>
             <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Top 5 Shows by Registrations</h2>
                 {analytics.topShows.length > 0 ? (
                    <ul className="space-y-3">
                        {analytics.topShows.map(([show, count]) => (
                            <li key={show} className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200">
                                <span className="font-medium text-gray-700">{show}</span>
                                <span className="font-bold text-blue-600">{count} signups</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">Not enough data to show top shows.</p>
                )}
            </div>
        </div>
    );
};

export default RegistrationDashboard;