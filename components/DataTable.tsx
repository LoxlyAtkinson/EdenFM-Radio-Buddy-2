import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SheetRow, FilterConfig, DataTableColumn } from '../types';
import { fetchData, updateRow, createRow, deleteRow } from '../services/googleSheetService';
import { EditIcon, DeleteIcon, PlusIcon, LoadingIcon } from './icons';
import DaysOfWeekSelector from './DaysOfWeekSelector';

interface DataTableProps<T extends SheetRow> {
  sheetName: string;
  columns: DataTableColumn<T>[];
  title: string;
  filters?: FilterConfig<T>[];
  initialFilter?: { column: string; value: string };
}

// Helper maps for expanding compact formats (Mon–Wed) into full names, for old data.
const shortDayToFull: { [key: string]: string } = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};
const dayOrderArray = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const fullDaysOfWeek = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/**
 * Takes whatever is in the row for the days column and returns *full* day names
 * for the selector:
 *   - If it’s already "Monday, Tuesday..." => returns as-is.
 *   - If it looks like "Mon-Wed,Fri" => expands to "Monday, Tuesday, Wednesday, Friday".
 */
const normaliseDaysForSelector = (raw: string): string => {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // If it doesn't contain any short tokens or '-', assume it's already full names.
  const looksCompressed = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun|-)/i.test(trimmed);
  if (!looksCompressed) return trimmed;

  const fullDays = new Set<string>();
  const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startShort, endShort] = part.split('-');
      const startIndex = dayOrderArray.indexOf(startShort);
      const endIndex = dayOrderArray.indexOf(endShort);
      if (startIndex > -1 && endIndex > -1 && startIndex <= endIndex) {
        for (let i = startIndex; i <= endIndex; i++) {
          const dayName = shortDayToFull[dayOrderArray[i]];
          if (dayName) fullDays.add(dayName);
        }
      }
    } else {
      const dayName = shortDayToFull[part];
      if (dayName) {
        fullDays.add(dayName);
      } else if (fullDaysOfWeek.includes(part)) {
        fullDays.add(part);
      }
    }
  }

  const sortedFullDays = fullDaysOfWeek.filter(day => fullDays.has(day));
  return sortedFullDays.join(', ');
};

const DataTable = <T extends SheetRow,>({
  sheetName,
  columns,
  title,
  filters: filterConfigs,
  initialFilter,
}: DataTableProps<T>) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<Partial<T> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [filterValues, setFilterValues] = useState<Record<string, string>>(
    initialFilter ? { [initialFilter.column]: initialFilter.value } : {}
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchData<T>(sheetName);
      if (sheetName === 'TimeSlots') {
        console.log(`Data loaded for sheet "${sheetName}":`, result);
      }
      setData(result);
    } catch (err) {
      setError('Failed to load data. Please check the Google Sheet setup and script URL.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sheetName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (initialFilter) {
      setFilterValues({ [initialFilter.column]: initialFilter.value });
    }
  }, [initialFilter]);

  const handleFilterChange = (column: string, value: string) => {
    setFilterValues(prev => ({ ...prev, [column]: value }));
  };

  const filteredData = useMemo(() => {
    const isFilterActive = Object.values(filterValues).some(v => v);
    if (!isFilterActive) return data;

    return data.filter(row =>
      Object.entries(filterValues).every(([key, value]) => {
        if (!value || value === 'all') return true;
        const rowValue = row[key as keyof T];

        if (value === 'has_value') {
          return rowValue != null && String(rowValue).trim() !== '';
        }
        if (value === 'no_value') {
          return rowValue == null || String(rowValue).trim() === '';
        }

        if (rowValue == null) return false;
        return String(rowValue).toLowerCase().includes(value.toLowerCase());
      })
    );
  }, [data, filterValues]);

  const handleEdit = (row: T) => {
    setCurrentRow(row);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    const newRow: Partial<T> = columns.reduce(
      (acc, col) => ({ ...acc, [col.key]: '' }),
      {}
    );
    setCurrentRow(newRow);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (rowIndex: number) => {
    if (!window.confirm('Are you sure you want to delete this row?')) return;

    console.log(`Attempting to delete row ${rowIndex} from sheet: ${sheetName}`);
    try {
      await deleteRow(sheetName, rowIndex);
      console.log(`Successfully deleted row ${rowIndex} from sheet: ${sheetName}`);
      loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Failed to delete row ${rowIndex} from sheet: ${sheetName}`, err);
      alert(`Failed to delete row. Reason: ${errorMessage}`);
    }
  };

  const handleSave = async () => {
    if (!currentRow) return;

    setIsSaving(true);
    setModalError(null);

    const payload: any = { ...currentRow };

    // 🔑 SPECIAL CASE: TimeSlots must send "Day" (full names) to backend.
    if (sheetName === 'TimeSlots') {
      const rawDay =
        (payload.Day as string | undefined) ??
        (payload['Day(s) of Week'] as string | undefined) ??
        '';

      if (rawDay) {
        // Ensure full, comma-separated names before sending.
        payload.Day = normaliseDaysForSelector(String(rawDay));
      }

      // Do NOT send compact field from frontend – backend owns it.
      delete payload['Day(s) of Week'];
    }

    try {
      if ('rowIndex' in payload && payload.rowIndex) {
        console.log(`Attempting to update row in sheet: ${sheetName}`, { payload });
        await updateRow(sheetName, payload as T);
        console.log(`Successfully updated row in sheet: ${sheetName}`);
      } else {
        console.log(`Attempting to create row in sheet: ${sheetName}`, { payload });
        await createRow(sheetName, payload);
        console.log(`Successfully created row in sheet: ${sheetName}`);
      }
      setIsModalOpen(false);
      setCurrentRow(null);
      loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Failed to save data to sheet: ${sheetName}`, {
        error: err,
        payload: currentRow,
      });
      setModalError(`Failed to save data. Reason: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleModalInputChange = (value: string, key: keyof T) => {
    setCurrentRow(prev => (prev ? { ...prev, [key]: value } : null));
  };

  if (loading) return <div className="p-8 text-center">Loading data...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-white rounded-lg shadow border border-gray-200">
      <div className="sm:flex sm:items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <button
          onClick={handleAdd}
          className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <PlusIcon /> Add New
        </button>
      </div>

      {filterConfigs && filterConfigs.length > 0 && (
        <div className="my-4 p-4 bg-gray-50 border border-gray-200 rounded-lg flex flex-wrap items-center gap-x-6 gap-y-4">
          <span className="font-semibold text-gray-700">Filter by:</span>
          {filterConfigs.map(filter => (
            <div key={String(filter.column)} className="flex items-center gap-2">
              <label
                htmlFor={`filter-${String(filter.column)}`}
                className="text-sm font-medium text-gray-600"
              >
                {String(filter.column)}:
              </label>
              {filter.type === 'dropdown' ? (
                <select
                  id={`filter-${String(filter.column)}`}
                  value={filterValues[String(filter.column)] || 'all'}
                  onChange={e => handleFilterChange(String(filter.column), e.target.value)}
                  className="w-full sm:w-auto px-3 py-1.5 text-sm text-gray-800 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {filter.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`filter-${String(filter.column)}`}
                  type="text"
                  placeholder={`Search ${String(filter.column)}...`}
                  value={filterValues[String(filter.column)] || ''}
                  onChange={e => handleFilterChange(String(filter.column), e.target.value)}
                  className="w-full sm:w-auto px-3 py-1.5 text-sm text-gray-800 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  {columns.map((col, index) => (
                    <th
                      key={index}
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0"
                    >
                      {String(col.label)}
                    </th>
                  ))}
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredData.map(row => (
                  <tr key={row.rowIndex}>
                    {columns.map((col, index) => (
                      <td
                        key={index}
                        className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-600 sm:pl-0"
                      >
                        {String(row[col.key] ?? '')}
                      </td>
                    ))}
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                      <button
                        onClick={() => handleEdit(row)}
                        className="text-blue-600 hover:text-blue-800 p-2"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => handleDelete(row.rowIndex)}
                        className="text-red-600 hover:text-red-800 p-2 ml-2"
                      >
                        <DeleteIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && currentRow && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              {currentRow.rowIndex ? 'Edit' : 'Add'} Entry
            </h2>

            {modalError && (
              <div
                className="my-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm"
                role="alert"
              >
                {modalError}
              </div>
            )}

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {columns.map((col, i) => (
                <div key={i}>
                  <label className="block text-sm font-medium text-gray-600">
                    {String(col.label)}
                  </label>
                  {col.inputType === 'daysOfWeek' ? (
                    <DaysOfWeekSelector
                      // Use "Day" if present, otherwise fall back to "Day(s) of Week", normalised to full names.
                      value={normaliseDaysForSelector(
                        String(
                          (currentRow as any).Day ??
                            (currentRow as any)['Day(s) of Week'] ??
                            ''
                        )
                      )}
                      onChange={newValue => handleModalInputChange(newValue, col.key)}
                    />
                  ) : (
                    <input
                      type="text"
                      value={String(currentRow[col.key] ?? '')}
                      onChange={e => handleModalInputChange(e.target.value, col.key)}
                      className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center min-w-[5rem]"
                disabled={isSaving}
              >
                {isSaving ? <LoadingIcon /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
