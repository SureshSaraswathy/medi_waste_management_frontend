// Example: How to migrate StateMasterPage to use reusable table template
// This is a reference file showing the before/after migration

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import MasterPageLayout from '../../components/common/MasterPageLayout';
import { Column } from '../../components/common/DataTable';
import '../desktop/dashboardPage.css';

interface State {
  id: string;
  stateCode: string;
  stateName: string;
  status: 'Active' | 'Inactive';
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

const StateMasterPage = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingState, setEditingState] = useState<State | null>(null);
  const [states, setStates] = useState<State[]>([
    {
      id: '1',
      stateCode: 'MH',
      stateName: 'Maharashtra',
      status: 'Active',
      createdBy: 'Admin',
      createdOn: '2023-01-01',
      modifiedBy: 'Admin',
      modifiedOn: '2023-01-01',
    },
    {
      id: '2',
      stateCode: 'DL',
      stateName: 'Delhi',
      status: 'Active',
      createdBy: 'Admin',
      createdOn: '2023-01-01',
      modifiedBy: 'Admin',
      modifiedOn: '2023-01-01',
    },
  ]);

  // ... navItems and other code (keep same) ...

  const filteredStates = states.filter(state =>
    state.stateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    state.stateCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setEditingState(null);
    setShowModal(true);
  };

  const handleEdit = (state: State) => {
    setEditingState(state);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this state?')) {
      setStates(states.filter(s => s.id !== id));
    }
  };

  const handleSave = (formData: Partial<State>) => {
    if (editingState) {
      setStates(states.map(s => 
        s.id === editingState.id 
          ? { ...s, ...formData, modifiedOn: new Date().toISOString().split('T')[0] }
          : s
      ));
    } else {
      const newState: State = {
        id: Date.now().toString(),
        ...formData as State,
        status: 'Active',
        createdBy: 'Current User',
        createdOn: new Date().toISOString().split('T')[0],
        modifiedBy: 'Current User',
        modifiedOn: new Date().toISOString().split('T')[0],
      };
      setStates([...states, newState]);
    }
    setShowModal(false);
    setEditingState(null);
  };

  // ✨ NEW: Define columns configuration - This replaces the table HTML
  const columns: Column<State>[] = [
    { key: 'stateCode', label: 'State Code', minWidth: 120 },
    { key: 'stateName', label: 'State Name', minWidth: 200, allowWrap: true },
    {
      key: 'status',
      label: 'Status',
      minWidth: 100,
      render: (state) => (
        <span className={`status-badge status-badge--${state.status.toLowerCase()}`}>
          {state.status}
        </span>
      ),
    },
  ];

  return (
    <div className="dashboard-page">
      {/* Sidebar code (keep same) */}
      <aside className="dashboard-sidebar">
        {/* ... existing sidebar code ... */}
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-left">
            <span className="breadcrumb">/ Masters / State Master</span>
          </div>
        </header>

        {/* ✨ NEW: Replace entire table section with MasterPageLayout */}
        <MasterPageLayout
          title="State Master"
          breadcrumb="/ Masters / State Master"
          data={states}
          filteredData={filteredStates}
          columns={columns}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          getId={(state) => state.id}
          addButtonLabel="Add State"
        />
      </main>

      {/* Modal (keep existing) */}
      {showModal && (
        <StateFormModal
          state={editingState}
          onClose={() => {
            setShowModal(false);
            setEditingState(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// ... rest of component (StateFormModal, etc.) ...

export default StateMasterPage;
