import React, { useMemo } from 'react';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface DaysOfWeekSelectorProps {
  value: string; // Comma-separated string of days
  onChange: (newValue: string) => void;
}

const DaysOfWeekSelector: React.FC<DaysOfWeekSelectorProps> = ({ value, onChange }) => {
  // Derive the selected days directly from the value prop for every render.
  // This makes the component fully controlled by its parent and more reliable.
  const selectedDays = useMemo(() => {
    return new Set(value ? value.split(',').map(d => d.trim()).filter(Boolean) : []);
  }, [value]);

  const handleDayChange = (day: string) => {
    // Create a new Set based on the current prop-derived state.
    const newSelectedDays = new Set(selectedDays);
    if (newSelectedDays.has(day)) {
      newSelectedDays.delete(day);
    } else {
      newSelectedDays.add(day);
    }
    
    // Notify the parent component with the newly calculated, ordered string value.
    const orderedSelection = daysOfWeek.filter(d => newSelectedDays.has(d));
    onChange(orderedSelection.join(', '));
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
      {daysOfWeek.map(day => (
        <div key={day}>
            <input
              id={`day-selector-${day}`}
              type="checkbox"
              checked={selectedDays.has(day)}
              onChange={() => handleDayChange(day)}
              className="sr-only peer"
            />
            <label
              htmlFor={`day-selector-${day}`}
              className="block w-full text-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors duration-200 border border-gray-300 bg-white text-gray-700 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 hover:bg-gray-100 peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-blue-500"
            >
              {day}
            </label>
        </div>
      ))}
    </div>
  );
};

export default DaysOfWeekSelector;
