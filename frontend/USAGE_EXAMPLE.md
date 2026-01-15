# Reusable CRUD Table Template - Usage Guide

This guide explains how to use the reusable table components for all CRUD operations in your master pages.

## Components Created

1. **DataTable** - Reusable table component with built-in styling and alignment
2. **MasterPageLayout** - Complete layout wrapper for master pages
3. **Tabs** - Reusable tabs component

## Quick Start Example - State Master Page

Here's how to refactor an existing master page to use the new reusable template:

### Before (Old Code):

```tsx
// Old StateMasterPage.tsx - Using custom table styling
<div className="state-table-container">
  <table className="state-table">
    <thead>
      <tr>
        <th>State Code</th>
        <th>State Name</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {filteredStates.map((state) => (
        <tr key={state.id}>
          <td>{state.stateCode}</td>
          <td>{state.stateName}</td>
          <td>
            <span className={`status-badge status-badge--${state.status.toLowerCase()}`}>
              {state.status}
            </span>
          </td>
          <td>
            <button onClick={() => handleEdit(state)}>Edit</button>
            <button onClick={() => handleDelete(state.id)}>Delete</button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### After (Using Reusable Template):

```tsx
import MasterPageLayout from '../../components/common/MasterPageLayout';
import { Column } from '../../components/common/DataTable';

const StateMasterPage = () => {
  const [states, setStates] = useState<State[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Define columns configuration
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

  const filteredStates = states.filter(state =>
    state.stateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    state.stateCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dashboard-page">
      {/* Sidebar and header code... */}
      
      <main className="dashboard-main">
        <header className="dashboard-header">
          <span className="breadcrumb">/ Masters / State Master</span>
        </header>

        <MasterPageLayout
          title="State Master"
          breadcrumb="/ Masters / State Master"
          data={states}
          filteredData={filteredStates}
          columns={columns}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAdd={() => setShowModal(true)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          getId={(state) => state.id}
          addButtonLabel="Add State"
        />
      </main>
    </div>
  );
};
```

## Column Configuration Options

The `Column<T>` interface supports:

```tsx
interface Column<T> {
  key: string;              // Property name from your data object
  label: string;            // Header label (use short labels for better alignment)
  minWidth?: number;        // Minimum column width in pixels (optional)
  render?: (item: T) => React.ReactNode;  // Custom render function (optional)
  allowWrap?: boolean;      // Allow text wrapping (default: false, no wrap)
}
```

### Column Examples:

```tsx
// Simple column
{ key: 'name', label: 'Name', minWidth: 150 }

// Column with custom rendering (for status badges)
{
  key: 'status',
  label: 'Status',
  minWidth: 100,
  render: (item) => (
    <span className={`status-badge status-badge--${item.status.toLowerCase()}`}>
      {item.status}
    </span>
  )
}

// Column that allows wrapping (for long text)
{ key: 'description', label: 'Description', minWidth: 200, allowWrap: true }

// Column with date formatting
{
  key: 'createdOn',
  label: 'Created Date',
  minWidth: 130,
  render: (item) => new Date(item.createdOn).toLocaleDateString()
}
```

## Features Included

### ✅ Automatic Features:
- **Proper column alignment** - No more wrapping headers
- **Horizontal scrolling** - Smooth scrolling with styled scrollbar
- **Sticky header** - Header stays visible when scrolling
- **Responsive design** - Mobile-friendly
- **Empty state handling** - Shows message when no data
- **Edit/Delete actions** - Built-in action buttons
- **Status badges** - Pre-styled status indicators
- **Search functionality** - Built-in search bar
- **Pagination info** - Shows record counts

### ✅ Best Practices:
- Short header labels prevent wrapping
- Consistent styling across all tables
- Proper text overflow handling
- Accessible button controls

## Migration Checklist

To migrate an existing master page:

1. ✅ Import the reusable components
2. ✅ Define column configuration array
3. ✅ Replace custom table HTML with `<MasterPageLayout>`
4. ✅ Remove old CSS classes (they're now in shared CSS)
5. ✅ Test search and CRUD operations
6. ✅ Verify alignment and scrolling

## Example: Category Master Page

```tsx
import MasterPageLayout from '../../components/common/MasterPageLayout';
import { Column } from '../../components/common/DataTable';

const CategoryMasterPage = () => {
  // ... state and handlers ...

  const columns: Column<Category>[] = [
    { key: 'categoryCode', label: 'Code', minWidth: 120 },
    { key: 'categoryName', label: 'Name', minWidth: 200, allowWrap: true },
    {
      key: 'status',
      label: 'Status',
      minWidth: 100,
      render: (cat) => (
        <span className={`status-badge status-badge--${cat.status.toLowerCase()}`}>
          {cat.status}
        </span>
      ),
    },
  ];

  return (
    <MasterPageLayout
      title="Category Master"
      breadcrumb="/ Masters / Category Master"
      data={categories}
      filteredData={filteredCategories}
      columns={columns}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      getId={(cat) => cat.id}
      addButtonLabel="Add Category"
    />
  );
};
```

## Benefits

1. **Consistency** - All tables look and behave the same
2. **Maintainability** - Update styling in one place
3. **Speed** - Faster development of new master pages
4. **Quality** - Built-in best practices and accessibility
5. **Less Code** - Significantly less boilerplate

## Files Location

- `src/components/common/DataTable.tsx` - Reusable table component
- `src/components/common/dataTable.css` - Shared table styles
- `src/components/common/MasterPageLayout.tsx` - Layout wrapper
- `src/components/common/masterPageLayout.css` - Layout styles
- `src/components/common/Tabs.tsx` - Tabs component
- `src/components/common/tabs.css` - Tabs styles

## Support

All master pages can now use this template:
- ✅ Company Master
- ✅ State Master
- ✅ Category Master
- ✅ Route Master
- ✅ PCB Zone Master
- ✅ Color Code Master
- ✅ Area Master
- ✅ Any future master pages
