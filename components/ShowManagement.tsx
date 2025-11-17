import React from 'react';
import DataTable from './DataTable';
import { RadioShow, DataTableColumn } from '../types';

const ShowManagement: React.FC = () => {
  const columns: DataTableColumn<RadioShow>[] = [
    { key: 'Day', label: 'Day(s) of Week', inputType: 'daysOfWeek' },
    { key: 'Show', label: 'Show Name' },
    { key: 'Presenter', label: 'Presenter' },
    { key: 'Start', label: 'Start Time (24h)' },
    { key: 'End', label: 'End Time (24h)' },
    { key: 'Aliases', label: 'Aliases (Optional)' },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Show Schedule Management</h2>
      <p className="text-sm text-gray-500 mb-6">
        Manage the weekly radio show schedule here. To add a show for multiple days, select the days in the modal. A separate entry will be created for each selected day.
      </p>
      
      <DataTable<RadioShow>
        sheetName="TimeSlots"
        columns={columns}
        title="Radio Shows"
      />
    </div>
  );
};

export default ShowManagement;