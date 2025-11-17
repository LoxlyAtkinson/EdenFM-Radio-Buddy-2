import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SongRequest, RadioShow } from '../types';
import { fetchData } from '../services/googleSheetService';
import { LoadingIcon, MusicNoteIcon, TrendingUpIcon } from './icons';

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
 * shows that cross midnight (e.g., 22:00 - 02:00) to accurately match requests to shows.
 * @param show - The RadioShow object.
 * @param date - The Date object of the request.
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

const RequestAnalytics: React.FC = () => {
    const [requests, setRequests] = useState<SongRequest[]>([]);
    const [schedule, setSchedule] = useState<RadioShow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [reqResult, scheduleResult] = await Promise.all([
                fetchData<SongRequest>('Listeners Choice'),
                fetchData<RadioShow>('TimeSlots')
            ]);
            setRequests(reqResult);
            setSchedule(scheduleResult);
        } catch (err) {
            setError('Failed to load analytics data.');
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
        const total = requests.length;
        const priorities = { high: 0, medium: 0, low: 0 };
        const songCounts: { [song: string]: number } = {};
        const occasionCounts: { [occasion: string]: number } = {};
        
        requests.forEach(req => {
            const occasion = req.Occasion?.toLowerCase() || '';
            if (occasion.includes('birthday') || occasion.includes('anniversary')) priorities.high++;
            else if (req['Dedication to']?.trim()) priorities.medium++;
            else priorities.low++;

            const song = req['Song requested']?.trim();
            if(song) songCounts[song] = (songCounts[song] || 0) + 1;

            const occasionType = req.Occasion?.trim();
            if (occasionType) {
                occasionCounts[occasionType] = (occasionCounts[occasionType] || 0) + 1;
            }
        });
        
        const topSongs = Object.entries(songCounts).sort(([,a],[,b]) => b-a).slice(0, 5);
        const topOccasions = Object.entries(occasionCounts).sort(([,a],[,b]) => b-a).slice(0, 5);

        const reqsPerShow: { [show: string]: number } = {};
        if (schedule.length > 0) {
            requests.forEach(req => {
                if (!req.Date || !req.Time) return;
                try {
                    // Robust handling of both plain and ISO-like date/time values
                    let rawDate = String(req.Date);
                    let rawTime = String(req.Time);

                    // If Date looks like "2025-11-16T00:00:00.000Z", keep only "2025-11-16"
                    const datePart = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;

                    // If Time came from a Time column as ISO, or text with spaces, extract HH:MM:SS
                    let timePart = rawTime;
                    if (timePart.includes('T')) {
                        // e.g. "1970-01-01T14:30:00.000Z" -> "14:30:00"
                        timePart = timePart.split('T')[1].slice(0, 8);
                    } else {
                        // e.g. "14:30:00 GMT+2" or "14:30:00"
                        timePart = timePart.split(' ')[0].slice(0, 8);
                    }

                    const reqDate = new Date(`${datePart}T${timePart}`);
                    if (isNaN(reqDate.getTime())) return;

                    const matchedShow = schedule.find(show => isShowOnAir(show, reqDate));

                    if (matchedShow) {
                        reqsPerShow[matchedShow.Show] = (reqsPerShow[matchedShow.Show] || 0) + 1;
                    }
                } catch (e) {
                    // ignore invalid rows
                }
            });
        }
        const topShows = Object.entries(reqsPerShow).sort(([,a],[,b]) => b-a).slice(0, 5);

        return { total, priorities, topSongs, topOccasions, topShows };
    }, [requests, schedule]);

    if (loading) return <div className="mt-8 flex justify-center"><LoadingIcon /></div>;
    if (error) return <div className="mt-8 text-center text-red-500">{error}</div>;

    return (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Requests Overview</h2>
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-lg">
                        <span className="font-medium text-gray-600">Total Requests</span>
                        <span className="font-bold text-gray-900">{analytics.total}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-red-600 font-medium">High Priority</span>
                        <span className="text-lg font-bold">{analytics.priorities.high}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-yellow-600 font-medium">Medium Priority</span>
                        <span className="text-lg font-bold">{analytics.priorities.medium}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-green-600 font-medium">Low Priority</span>
                        <span className="text-lg font-bold">{analytics.priorities.low}</span>
                    </div>
                </div>
            </div>
             <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Top 5 Requested Songs</h2>
                 {analytics.topSongs.length > 0 ? (
                    <ul className="space-y-3">
                        {analytics.topSongs.map(([title, count]) => (
                            <li key={title} className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200">
                                <span className="font-medium text-gray-700 flex items-center gap-2"><MusicNoteIcon/> {title}</span>
                                <span className="font-bold text-blue-600">{count} times</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">Not enough data to show top songs.</p>
                )}
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUpIcon /> Top 5 Occasions</h2>
                 {analytics.topOccasions.length > 0 ? (
                    <ul className="space-y-3">
                        {analytics.topOccasions.map(([occasion, count]) => (
                            <li key={occasion} className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200">
                                <span className="font-medium text-gray-700">{occasion}</span>
                                <span className="font-bold text-blue-600">{count} requests</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">No occasion data to show.</p>
                )}
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Top 5 Shows by Requests</h2>
                 {analytics.topShows.length > 0 ? (
                    <ul className="space-y-3">
                        {analytics.topShows.map(([show, count]) => (
                            <li key={show} className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200">
                                <span className="font-medium text-gray-700">{show}</span>
                                <span className="font-bold text-blue-600">{count} requests</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">Not enough data to link requests to shows.</p>
                )}
            </div>
        </div>
    );
};

export default RequestAnalytics;