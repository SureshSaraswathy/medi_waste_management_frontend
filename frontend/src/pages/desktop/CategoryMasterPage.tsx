import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { categoryService, CategoryResponse } from '../../services/categoryService';
import { companyService, CompanyResponse } from '../../services/companyService';
import MasterPageLayout from '../../components/common/MasterPageLayout';
import Tabs from '../../components/common/Tabs';
import { Column } from '../../components/common/DataTable';
import '../desktop/dashboardPage.css';

interface Category {
  id: string;
  companyName: string;
  categoryCode: string;
  categoryName: string;
  status: 'Active' | 'Inactive';
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

interface Company {
  id: string;
  companyCode: string;
  companyName: string;
  status: 'Active' | 'Inactive';
}

const CategoryMasterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load companies from API
  const loadCompanies = async () => {
    try {
      const apiCompanies = await companyService.getAllCompanies(true);
      const mappedCompanies: Company[] = apiCompanies.map((apiCompany: CompanyResponse) => ({
        id: apiCompany.id,
        companyCode: apiCompany.companyCode,
        companyName: apiCompany.companyName,
        status: apiCompany.status,
      }));
      setCompanies(mappedCompanies);
    } catch (err) {
      console.error('Error loading companies:', err);
    }
  };

  // Load categories from API
  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      // NOTE: Backend API needs to be created. This will fail until backend is ready.
      const apiCategories = await categoryService.getAllCategories(undefined, true);
      const mappedCategories: Category[] = apiCategories.map((apiCategory: CategoryResponse) => {
        const company = companies.find(c => c.id === apiCategory.companyId);
        return {
          id: apiCategory.id,
          companyName: company?.companyName || 'Unknown Company',
          categoryCode: apiCategory.categoryCode,
          categoryName: apiCategory.categoryName,
          status: apiCategory.status,
          createdBy: apiCategory.createdBy || '',
          createdOn: apiCategory.createdOn,
          modifiedBy: apiCategory.modifiedBy || '',
          modifiedOn: apiCategory.modifiedOn,
        };
      });
      setCategories(mappedCategories);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load categories';
      setError(errorMessage);
      console.error('Error loading categories:', err);
      // For now, keep empty array if API fails (backend not ready)
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  // Load companies first, then categories
  useEffect(() => {
    const initializeData = async () => {
      await loadCompanies();
    };
    initializeData();
  }, []);

  // Load categories when companies are loaded
  useEffect(() => {
    if (companies.length > 0) {
      loadCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies.length]);

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  const filteredCategories = categories.filter(category =>
    category.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.categoryCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setEditingCategory(null);
    setShowModal(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        setLoading(true);
        await categoryService.deleteCategory(id);
        await loadCategories();
        alert('Category deleted successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete category';
        alert(`Error: ${errorMessage}`);
        console.error('Error deleting category:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (formData: Partial<Category>) => {
    try {
      setLoading(true);
      setError(null);
      
      // Find company ID from company name
      const selectedCompany = companies.find(c => c.companyName === formData.companyName);
      if (!selectedCompany) {
        alert('Please select a valid company');
        return;
      }

      if (editingCategory) {
        // Update existing - only status can be updated (categoryCode, categoryName, companyId are immutable)
        await categoryService.updateCategory(editingCategory.id, {
          status: formData.status,
        });
        alert('Category updated successfully');
      } else {
        // Add new
        if (!formData.categoryCode || !formData.categoryName || !formData.companyName) {
          alert('Please fill in all required fields');
          return;
        }
        await categoryService.createCategory({
          categoryCode: formData.categoryCode,
          categoryName: formData.categoryName,
          companyId: selectedCompany.id,
        });
        alert('Category created successfully');
      }
      
      setShowModal(false);
      setEditingCategory(null);
      await loadCategories();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save category';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
      console.error('Error saving category:', err);
    } finally {
      setLoading(false);
    }
  };

  // Define columns for the table
  const columns: Column<Category>[] = [
    { key: 'companyName', label: 'Company Name', minWidth: 180, allowWrap: true },
    { key: 'categoryCode', label: 'Category Code', minWidth: 140 },
    { key: 'categoryName', label: 'Category Name', minWidth: 200, allowWrap: true },
    {
      key: 'status',
      label: 'Status',
      minWidth: 100,
      render: (category) => (
        <span className={`status-badge status-badge--${category.status.toLowerCase()}`}>
          {category.status}
        </span>
      ),
    },
  ];

  return (
    <div className="dashboard-page">
      {/* Left Sidebar */}
      <aside className={`dashboard-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          {!isSidebarCollapsed && <span className="brand-name">MEDI-WASTE</span>}
        </div>

        <button
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isSidebarCollapsed ? (
              <polyline points="9 18 15 12 9 6"></polyline>
            ) : (
              <polyline points="15 18 9 12 15 6"></polyline>
            )}
          </svg>
        </button>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`nav-link ${item.active ? 'nav-link--active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!isSidebarCollapsed && <span className="nav-label">{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-notification-btn" aria-label="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span className="notification-badge">3</span>
          </button>
          <Link
            to="/profile"
            className={`sidebar-profile-btn ${location.pathname === '/profile' ? 'sidebar-profile-btn--active' : ''}`}
            title="My Profile"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            {!isSidebarCollapsed && <span>Profile</span>}
          </Link>
          <button onClick={logout} className="sidebar-logout-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            {!isSidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <span className="breadcrumb">/ Masters / Category Master</span>
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div style={{ 
            padding: '12px 16px', 
            background: '#fee', 
            color: '#c33', 
            marginBottom: '16px', 
            borderRadius: '6px',
            border: '1px solid #fcc'
          }}>
            {error}
          </div>
        )}

        {/* Loading Indicator */}
        {loading && !categories.length && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading categories...
          </div>
        )}

        {/* Category Master Content using reusable template */}
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
          getId={(category) => category.id}
          addButtonLabel="Add Category"
          createPermissions={['CATEGORY_CREATE', 'CATEGORY.CREATE']}
          editPermissions={['CATEGORY_EDIT', 'CATEGORY.EDIT', 'CATEGORY_UPDATE', 'CATEGORY.UPDATE']}
          deletePermissions={['CATEGORY_DELETE', 'CATEGORY.DELETE']}
        >
          {/* Tabs */}
          <Tabs
            tabs={[{ id: 'list', label: 'Category List' }]}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as 'list' | 'form')}
          />
        </MasterPageLayout>
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <CategoryFormModal
          category={editingCategory}
          companies={companies.filter(c => c.status === 'Active')}
          onClose={() => {
            setShowModal(false);
            setEditingCategory(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Category Form Modal Component
interface CategoryFormModalProps {
  category: Category | null;
  companies: Company[];
  onClose: () => void;
  onSave: (data: Partial<Category>) => void;
}

const CategoryFormModal = ({ category, companies, onClose, onSave }: CategoryFormModalProps) => {
  const [formData, setFormData] = useState<Partial<Category>>(
    category || {
      companyName: '',
      categoryCode: '',
      categoryName: '',
      status: 'Active',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{category ? 'Edit Category' : 'Add Category'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="category-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-grid">
              <div className="form-group">
                <label>Company Name *</label>
                <select
                  value={formData.companyName || ''}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                  disabled={!!category} // Disable when editing (immutable field)
                  style={category ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.companyName}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Category Code *</label>
                <input
                  type="text"
                  value={formData.categoryCode || ''}
                  onChange={(e) => setFormData({ ...formData, categoryCode: e.target.value })}
                  required
                  placeholder="Enter Category Code"
                  disabled={!!category} // Disable when editing (immutable field)
                  style={category ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                />
              </div>
              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  value={formData.categoryName || ''}
                  onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                  required
                  placeholder="Enter Category Name"
                  disabled={!!category} // Disable when editing (immutable field)
                  style={category ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status || 'Active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              {category ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryMasterPage;
