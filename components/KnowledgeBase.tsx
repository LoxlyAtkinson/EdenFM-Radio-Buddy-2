import React from 'react';
import DataTable from './DataTable';
import { KnowledgeBaseItem, DataTableColumn } from '../types';

const KnowledgeBase: React.FC = () => {
  const columns: DataTableColumn<KnowledgeBaseItem>[] = [
    { key: 'Topic', label: 'Topic' },
    { key: 'Information', label: 'Information' },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Agent Knowledge Base</h2>
      <p className="text-sm text-gray-500 mb-6">
        Add or edit information here to train the WhatsApp agent. The agent will use this data to answer user questions.
        Keep topics clear and information concise for best results.
      </p>
      <DataTable<KnowledgeBaseItem>
        sheetName="KnowledgeBase"
        columns={columns}
        title="Knowledge Base Entries"
      />
    </div>
  );
};

export default KnowledgeBase;