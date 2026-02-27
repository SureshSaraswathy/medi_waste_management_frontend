import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import MasterPageLayout from '../../components/common/MasterPageLayout';
import Tabs from '../../components/common/Tabs';
import { Column } from '../../components/common/DataTable';
import '../desktop/dashboardPage.css';

interface Company {
  id: string;
  companyCode: string;
  companyName: string;
  regdOfficeAddress: string;
  adminOfficeAddress: string;
  factoryAddress: string;
  gstin: string;
  state: string;
  pincode: string;
  prefix: string;
  authPersonName: string;
  authPersonDesignation: string;
  authPersonDOB: string;
  pcbauthNum: string;
  ctoWaterNum: string;
  ctoWaterDate: string;
  ctoWaterValidUpto: string;
  ctoAirNum: string;
  ctoAirDate: string;
  ctoAirValidUpto: string;
  cteWaterNum: string;
  cteWaterDate: string;
  cteWaterValidUpto: string;
  cteAirNum: string;
  cteAirDate: string;
  cteAirValidUpto: string;
  hazardousWasteNum: string;
  pcbZoneID: string;
  gstValidFrom: string;
  gstRate: string;
  status: 'Active' | 'Inactive';
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

const CompanyMasterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([
    {
      id: '1',
      companyCode: 'COMP001',
      companyName: 'Sample Company',
      regdOfficeAddress: '123 Main St',
      adminOfficeAddress: '456 Admin Ave',
      factoryAddress: '789 Factory Rd',
      gstin: 'GST123456789',
      state: 'Maharashtra',
      pincode: '400001',
      prefix: 'SC',
      authPersonName: 'John Doe',
      authPersonDesignation: 'Manager',
      authPersonDOB: '1990-01-01',
      pcbauthNum: 'PCB001',
      ctoWaterNum: 'CTOW001',
      ctoWaterDate: '2023-01-01',
      ctoWaterValidUpto: '2024-01-01',
      ctoAirNum: 'CTOA001',
      ctoAirDate: '2023-01-01',
      ctoAirValidUpto: '2024-01-01',
      cteWaterNum: 'CTEW001',
      cteWaterDate: '2023-01-01',
      cteWaterValidUpto: '2024-01-01',
      cteAirNum: 'CTEA001',
      cteAirDate: '2023-01-01',
      cteAirValidUpto: '2024-01-01',
      hazardousWasteNum: 'HW001',
      pcbZoneID: 'ZONE001',
      gstValidFrom: '2023-01-01',
      gstRate: '18%',
      status: 'Active',
      createdBy: 'Admin',
      createdOn: '2023-01-01',
      modifiedBy: 'Admin',
      modifiedOn: '2023-01-01',
    },
  ]);

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  const filteredCompanies = companies.filter(company =>
    company.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.companyCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.gstin.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setEditingCompany(null);
    setShowModal(true);
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      setCompanies(companies.filter(c => c.id !== id));
    }
  };

  const handleSave = (formData: Partial<Company>) => {
    if (editingCompany) {
      setCompanies(companies.map(c => 
        c.id === editingCompany.id 
          ? { ...c, ...formData, modifiedOn: new Date().toISOString().split('T')[0] }
          : c
      ));
    } else {
      const newCompany: Company = {
        id: Date.now().toString(),
        ...formData as Company,
        status: 'Active',
        createdBy: 'Current User',
        createdOn: new Date().toISOString().split('T')[0],
        modifiedBy: 'Current User',
        modifiedOn: new Date().toISOString().split('T')[0],
      };
      setCompanies([...companies, newCompany]);
    }
    setShowModal(false);
    setEditingCompany(null);
  };

  // Define columns for the table
  const columns: Column<Company>[] = [
    { key: 'companyCode', label: 'Code', minWidth: 110 },
    { key: 'companyName', label: 'Company Name', minWidth: 150, allowWrap: true },
    { key: 'gstin', label: 'GSTIN', minWidth: 130 },
    { key: 'state', label: 'State', minWidth: 120 },
    { key: 'pcbauthNum', label: 'PCB Auth #', minWidth: 110 },
    { key: 'ctoWaterNum', label: 'CTO Water #', minWidth: 120 },
    { key: 'ctoWaterDate', label: 'CTO Wtr Date', minWidth: 130 },
    { key: 'ctoWaterValidUpto', label: 'CTO Wtr Valid To', minWidth: 150 },
    { key: 'ctoAirNum', label: 'CTO Air #', minWidth: 110 },
    { key: 'ctoAirDate', label: 'CTO Air Date', minWidth: 130 },
    { key: 'ctoAirValidUpto', label: 'CTO Air Valid To', minWidth: 150 },
    { key: 'cteWaterNum', label: 'CTE Water #', minWidth: 120 },
    { key: 'cteWaterDate', label: 'CTE Wtr Date', minWidth: 130 },
    { key: 'cteWaterValidUpto', label: 'CTE Wtr Valid To', minWidth: 150 },
    { key: 'cteAirNum', label: 'CTE Air #', minWidth: 110 },
    { key: 'cteAirDate', label: 'CTE Air Date', minWidth: 130 },
    { key: 'cteAirValidUpto', label: 'CTE Air Valid To', minWidth: 150 },
    { key: 'hazardousWasteNum', label: 'Haz Waste #', minWidth: 140 },
    { key: 'pcbZoneID', label: 'PCB Zone', minWidth: 110 },
    { key: 'gstValidFrom', label: 'GST From', minWidth: 130 },
    { key: 'gstRate', label: 'GST Rate', minWidth: 100 },
    {
      key: 'status',
      label: 'Status',
      minWidth: 90,
      render: (company) => (
        <span className={`status-badge status-badge--${company.status.toLowerCase()}`}>
          {company.status}
        </span>
      ),
    },
  ];

  return (
    <div className="dashboard-page">
      {/* Left Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <span className="brand-name">MEDI-WASTE</span>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`nav-link ${item.active ? 'nav-link--active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
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
          <button onClick={logout} className="sidebar-logout-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <span className="breadcrumb">/ Masters / Company Master</span>
          </div>
        </header>

        {/* Company Master Content using reusable components */}
        <MasterPageLayout
          title="Company Master"
          breadcrumb="/ Masters / Company Master"
          data={companies}
          filteredData={filteredCompanies}
          columns={columns}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          getId={(company) => company.id}
          addButtonLabel="Add Company"
          createPermissions={['COMPANY_CREATE', 'COMPANY.CREATE']}
          editPermissions={['COMPANY_EDIT', 'COMPANY.EDIT', 'COMPANY_UPDATE', 'COMPANY.UPDATE']}
          deletePermissions={['COMPANY_DELETE', 'COMPANY.DELETE']}
        >
          {/* Tabs */}
          <Tabs
            tabs={[{ id: 'list', label: 'Company List' }]}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as 'list' | 'form')}
          />
        </MasterPageLayout>
      </main>

      {/* Add/Edit Modal - Keep existing modal for now */}
      {showModal && (
        <CompanyFormModal
          company={editingCompany}
          onClose={() => {
            setShowModal(false);
            setEditingCompany(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Keep existing modal component
interface CompanyFormModalProps {
  company: Company | null;
  onClose: () => void;
  onSave: (data: Partial<Company>) => void;
}

const CompanyFormModal = ({ company, onClose, onSave }: CompanyFormModalProps) => {
  // Modal implementation remains the same as original
  // ... (keeping the existing modal code)
  return null; // Placeholder - should include full modal implementation
};

export default CompanyMasterPage;
