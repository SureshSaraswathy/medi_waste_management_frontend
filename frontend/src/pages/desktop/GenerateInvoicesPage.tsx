import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { notifySuccess, notifyError, notifyWarning, notifyInfo, notifyLoading, notifyUpdate } from '../../utils/notify';
import { getAdminNavItems } from '../../utils/adminNavItems';
import { canAccessDesktopModule } from '../../utils/moduleAccess';
import { 
  getInvoices, 
  createInvoice, 
  updateInvoice, 
  generateInvoices,
  generateInvoicesWeight,
  generateInvoicesMonth,
  startBulkInvoicePdfJob,
  postInvoice,
  createBatch,
  getBatchPreview,
  postBatch,
  getAllBatches,
  generateDraftInvoices,
  InvoiceResponse,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  GenerateInvoiceRequest,
  GenerateInvoiceWeightRequest,
  GenerateInvoiceMonthRequest,
  BatchResponse,
  BatchPreviewResponse,
  BatchItemResponse
} from '../../services/invoiceService';
import NotificationBell from '../../components/NotificationBell';
import { companyService } from '../../services/companyService';
import { hcfService } from '../../services/hcfService';
import PageHeader from '../../components/layout/PageHeader';
// InvoiceCreationMethodModal removed - cards trigger modals directly
import './invoiceManagementPage.css';
import { computeManualInvoiceTaxPreview } from '../../utils/invoiceGstCalculation';
import '../desktop/dashboardPage.css';
import '../desktop/masterPage.css';
import '../desktop/routeAssignmentPage.css';

// Extended interface to match both API response and component needs
interface Invoice extends Partial<InvoiceResponse> {
  id: string;
  companyName?: string;
  hcfCode?: string;
  invoiceNum: string;
  invoiceStatus: 'Draft' | 'Generated' | 'Partially Paid' | 'Paid' | 'Cancelled';
  billingDays?: string | number | null;
  bedCount?: string | number | null;
  bedRate?: string | number | null;
  weightInKg?: string | number | null;
  kgRate?: string | number | null;
  lumpsumAmount?: string | number | null;
  taxableValue?: string | number;
  igst?: string | number;
  cgst?: string | number;
  sgst?: string | number;
  roundOff?: string | number;
  invoiceValue?: string | number;
  totalPaidAmount?: string | number;
  balanceAmount?: string | number;
  createdBy?: string | null;
  createdOn?: string;
  modifiedBy?: string | null;
  modifiedOn?: string;
}

interface Company {
  id: string;
  companyCode: string;
  companyName: string;
  status: 'Active' | 'Inactive';
  gstRate?: string | null;
  state?: string | null;
  gstin?: string | null;
}

interface HCF {
  id: string;
  hcfCode: string;
  hcfName: string;
  companyId: string;
  companyName: string;
  status: 'Active' | 'Inactive';
  billingType?: string;
  billingOption?: string;
  bedRate?: string;
  kgRate?: string;
  lumpsum?: string;
  stateCode?: string;
  isGSTExempt?: boolean;
}

/** Normalize batch status from API (avoids blank badges if casing differs). */
function normalizeBatchStatus(status: unknown): string {
  if (status == null || status === '') return '';
  return String(status).trim().toUpperCase();
}

const GenerateInvoicesPage = () => {
  const { logout, permissions, user } = useAuth();
  const MAX_BULK_PDF = 100;
  const location = useLocation();
  const navigate = useNavigate();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showGenerateWeightModal, setShowGenerateWeightModal] = useState(false);
  const [showGenerateMonthBedModal, setShowGenerateMonthBedModal] = useState(false);
  const [showGenerateMonthWeightModal, setShowGenerateMonthWeightModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{ skipped: Array<{ hcfId: string; hcfCode: string; reason: string }> } | null>(null);
  const [showBatchPreviewModal, setShowBatchPreviewModal] = useState(false);
  const [currentBatch, setCurrentBatch] = useState<BatchPreviewResponse | null>(null);
  const [batches, setBatches] = useState<BatchResponse[]>([]);
  const [showZeroGeneratedModal, setShowZeroGeneratedModal] = useState(false);
  const [zeroGeneratedMessage, setZeroGeneratedMessage] = useState('');
  
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    type: 'All',
    status: 'All',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Master data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [hcfs, setHcfs] = useState<HCF[]>([]);

  // Load data on component mount
  useEffect(() => {
    loadData();
    loadBatches();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const companiesData = await companyService.getAllCompanies(true);
      const mappedCompanies = companiesData.map(c => ({
        id: c.id,
        companyCode: c.companyCode,
        companyName: c.companyName,
        status: c.status,
        gstRate: c.gstRate,
        state: c.state,
        gstin: c.gstin,
      }));
      setCompanies(mappedCompanies);

      const hcfsData = await hcfService.getAllHcfs(undefined, true);
      const mappedHcfs = hcfsData.map(h => ({
        id: h.id,
        hcfCode: h.hcfCode,
        hcfName: h.hcfName,
        companyId: h.companyId,
        companyName: companiesData.find(c => c.id === h.companyId)?.companyName || '',
        status: h.status || 'Active',
        billingType: h.billingType,
        billingOption: h.billingOption,
        bedRate: h.bedRate,
        kgRate: h.kgRate,
        lumpsum: h.lumpsum,
        stateCode: h.stateCode,
        isGSTExempt: h.isGSTExempt,
      }));
      setHcfs(mappedHcfs);
    } catch (err: any) {
      console.error('Error loading data:', err);
      const errorMessage = err.message || 'Failed to load data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    try {
      const batchesData = await getAllBatches();
      setBatches(batchesData);
    } catch (err: any) {
      console.error('Error loading batches:', err);
    }
  };

  const enqueueBulkPdfJobs = async (invoiceIds: string[]) => {
    const targetEmail = user?.email || '';
    if (!targetEmail) {
      throw new Error('EMAIL_MISSING');
    }

    const chunks: string[][] = [];
    for (let i = 0; i < invoiceIds.length; i += MAX_BULK_PDF) {
      chunks.push(invoiceIds.slice(i, i + MAX_BULK_PDF));
    }

    for (const chunk of chunks) {
      await startBulkInvoicePdfJob(chunk, targetEmail);
    }

    return { jobs: chunks.length, email: targetEmail };
  };

  const handleCreate = () => {
    setEditingInvoice(null);
    setShowCreateModal(true);
  };

  const handleSave = async (data: Partial<Invoice>, isGenerate: boolean = false) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    const loadingToast = notifyLoading('Saving invoice...');

    try {
      const company = companies.find(c => c.companyName === data.companyName);
      const hcf = hcfs.find(h => h.hcfCode === data.hcfCode);

      if (!company || !hcf) {
        throw new Error('Company or HCF not found');
      }

      if (editingInvoice) {
        const updateData: UpdateInvoiceRequest = {
          invoiceDate: data.invoiceDate,
          dueDate: data.dueDate,
          billingType: data.billingType as any,
          billingDays: data.billingDays ? parseInt(data.billingDays as string) : undefined,
          billingOption: data.billingOption as any,
          bedCount: data.bedCount ? parseInt(data.bedCount as string) : undefined,
          bedRate: data.bedRate ? parseFloat(data.bedRate as string) : undefined,
          weightInKg: data.weightInKg ? parseFloat(data.weightInKg as string) : undefined,
          kgRate: data.kgRate ? parseFloat(data.kgRate as string) : undefined,
          lumpsumAmount: data.lumpsumAmount ? parseFloat(data.lumpsumAmount as string) : undefined,
          taxableValue: data.taxableValue ? parseFloat(data.taxableValue as string) : undefined,
          igst: data.igst ? parseFloat(data.igst as string) : undefined,
          cgst: data.cgst ? parseFloat(data.cgst as string) : undefined,
          sgst: data.sgst ? parseFloat(data.sgst as string) : undefined,
          roundOff: data.roundOff ? parseFloat(data.roundOff as string) : undefined,
          invoiceValue: data.invoiceValue ? parseFloat(data.invoiceValue as string) : undefined,
          notes: data.notes as string,
        };

        await updateInvoice(editingInvoice.id, updateData);
        notifyUpdate(loadingToast, 'Invoice updated successfully', 'success');
      } else {
        if (data.billingOption === 'Bed-wise') {
          const bd = data.billingDays != null && data.billingDays !== '' ? parseInt(String(data.billingDays), 10) : NaN;
          if (!Number.isFinite(bd) || bd < 1) {
            notifyUpdate(loadingToast, 'Billing days is required (minimum 1) for bed-wise invoices.', 'error');
            setLoading(false);
            return;
          }
        }
        if (!data.billingType) {
          notifyUpdate(loadingToast, 'Billing type is required from HCF master.', 'error');
          setLoading(false);
          return;
        }
        // Create new manual invoice as DRAFT
        const createData: CreateInvoiceRequest = {
          companyId: company.id,
          hcfId: hcf.id,
          invoiceDate: data.invoiceDate || new Date().toISOString().split('T')[0],
          dueDate: data.dueDate || new Date().toISOString().split('T')[0],
          billingType: (data.billingType as any) || 'Monthly',
          billingDays: data.billingDays ? parseInt(data.billingDays as string) : undefined,
          billingOption: (data.billingOption as any) || 'Bed-wise',
          generationType: 'Manual',
          bedCount: data.bedCount ? parseInt(data.bedCount as string) : undefined,
          bedRate: data.bedRate ? parseFloat(data.bedRate as string) : undefined,
          weightInKg: data.weightInKg ? parseFloat(data.weightInKg as string) : undefined,
          kgRate: data.kgRate ? parseFloat(data.kgRate as string) : undefined,
          lumpsumAmount: data.lumpsumAmount ? parseFloat(data.lumpsumAmount as string) : undefined,
          taxableValue: data.taxableValue ? parseFloat(data.taxableValue as string) : undefined,
          igst: data.igst ? parseFloat(data.igst as string) : undefined,
          cgst: data.cgst ? parseFloat(data.cgst as string) : undefined,
          sgst: data.sgst ? parseFloat(data.sgst as string) : undefined,
          roundOff: data.roundOff ? parseFloat(data.roundOff as string) : undefined,
          invoiceValue: data.invoiceValue ? parseFloat(data.invoiceValue as string) : undefined,
          notes: data.notes as string,
          status: 'DRAFT', // Create as DRAFT
        };

        await createInvoice(createData);
        
        // Reload batches to show new batch in table
        await loadBatches();
        
        notifyUpdate(loadingToast, 'Draft invoice created successfully. Click "Edit Invoices" button in the table below to review and post.', 'success');
      }

      setShowCreateModal(false);
      setEditingInvoice(null);
      
      // DON'T navigate - stay on page
    } catch (err: any) {
      notifyUpdate(loadingToast, err.message || 'Failed to save invoice', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoGenerate = async (generateData: GenerateInvoiceRequest) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await generateInvoices(generateData);
      
      try {
        const generatedIds = (result.generated || [])
          .map((inv: any) => inv.invoiceId)
          .filter(Boolean);

        if (generatedIds.length > 0) {
          const { jobs, email } = await enqueueBulkPdfJobs(generatedIds);
          notifySuccess(`Generated ${result.summary.success} invoice(s) successfully. PDF ZIP processing started (${jobs} job${jobs === 1 ? '' : 's'}). Download link will be emailed to ${email}.`);
        }
      } catch (jobErr) {
        if (jobErr instanceof Error && jobErr.message === 'EMAIL_MISSING') {
          notifyWarning('Invoices generated, but email is missing. Please re-login and try again.');
        } else {
          notifyError('Invoices generated, but failed to start bulk PDF processing. Please try again.');
        }
      }
      
      if (result.failed && result.failed.length > 0) {
        const failedMessages = result.failed.map(f => {
          const hcfLabel = f.hcfCode || f.hcfId || 'Unknown HCF';
          const reason = f.reason || 'Unknown error';
          return `${hcfLabel}: ${reason}`;
        }).join('; ');
        
        const errorMsg = result.summary.success > 0 
          ? `Some invoices failed: ${failedMessages}`
          : `Invoice generation failed: ${failedMessages}`;
        
        notifyWarning(errorMsg);
      }
      
      if (result.summary.success > 0) {
        setTimeout(() => {
          navigate('/finance/invoice-management');
        }, 2000);
      }
      
      setShowGenerateModal(false);
    } catch (err: any) {
      console.error('Error generating invoices:', err);
      setError(err.message || 'Failed to generate invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleWeightGenerate = async (generateData: GenerateInvoiceWeightRequest) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Generate draft invoices directly
      const result = await generateDraftInvoices({
        type: 'weight',
        companyId: generateData.companyId,
        periodFrom: generateData.pickupDateFrom,
        periodTo: generateData.pickupDateTo,
      });

      setShowGenerateWeightModal(false);

      if (result.invoiceCount === 0) {
        const msg = 'Zero invoices generated for Weight Based criteria. Please verify date range, HCF setup, and transactions.';
        setZeroGeneratedMessage(msg);
        setShowZeroGeneratedModal(true);
        notifyWarning(msg);
        return;
      }
      
      // Reload batches to show new batch in table
      await loadBatches();
      
      // Show success message
      setSuccessMessage(
        `Generated ${result.invoiceCount} draft invoice(s) successfully. ` +
        `Click "Edit Invoices" button in the table below to review and post them.`
      );
    } catch (err: any) {
      console.error('Error generating weight-based draft invoices:', err);
      setError(err.message || 'Failed to generate draft invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleMonthGenerate = async (generateData: GenerateInvoiceMonthRequest) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Format billing month (e.g., "2024-01")
      const monthStr = String(generateData.month).padStart(2, '0');
      const billingMonth = `${generateData.year}-${monthStr}`;

      // Generate draft invoices directly (only for Bed/Lumpsum)
      const result = await generateDraftInvoices({
        type: 'bed',
        companyId: generateData.companyId,
        billingMonth: billingMonth,
      });

      setShowGenerateMonthBedModal(false);

      if (result.invoiceCount === 0) {
        const msg = 'Zero invoices generated for Bed/Lumpsum criteria. Please verify billing month and HCF setup.';
        setZeroGeneratedMessage(msg);
        setShowZeroGeneratedModal(true);
        notifyWarning(msg);
        return;
      }
      
      // Reload batches to show new batch in table
      await loadBatches();
      
      // Show success message
      setSuccessMessage(
        `Generated ${result.invoiceCount} draft invoice(s) successfully. ` +
        `Click "Edit Invoices" button in the table below to review and post them.`
      );
    } catch (err: any) {
      console.error('Error generating draft invoices:', err);
      setError(err.message || 'Failed to generate draft invoices');
    } finally {
      setLoading(false);
    }
  };

  const handlePostBatch = async (batchId: string, invoiceDate: string) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await postBatch(batchId, invoiceDate);
      setSuccessMessage(`Batch posted successfully. ${result.success} invoice(s) created, ${result.failed} failed.`);
      setShowBatchPreviewModal(false);
      setCurrentBatch(null);
      await loadBatches();
      setTimeout(() => {
        navigate('/finance/invoice-management');
      }, 2000);
    } catch (err: any) {
      console.error('Error posting batch:', err);
      setError(err.message || 'Failed to post batch');
    } finally {
      setLoading(false);
    }
  };

  const calculateInvoiceValue = (formData: Partial<Invoice>) => {
    const taxable = parseFloat(formData.taxableValue || '0');
    const igst = parseFloat(formData.igst || '0');
    const cgst = parseFloat(formData.cgst || '0');
    const sgst = parseFloat(formData.sgst || '0');
    const roundOff = parseFloat(formData.roundOff || '0');
    const total = taxable + igst + cgst + sgst + roundOff;
    return total.toFixed(2);
  };

  const navItemsAll = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
      active: location.pathname === '/dashboard',
    },
    {
      path: '/transaction',
      label: 'Transaction',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
      ),
      active: location.pathname === '/transaction' || location.pathname.startsWith('/transaction'),
    },
    {
      path: '/finance',
      label: 'Finance',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      ),
      active: location.pathname === '/finance' || location.pathname.startsWith('/finance'),
    },
    {
      path: '/commercial-agreements',
      label: 'Commercial / Agreements',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ),
      active: location.pathname === '/commercial-agreements' || location.pathname.startsWith('/commercial-agreements'),
    },
    {
      path: '/compliance-training',
      label: 'Compliance & Training',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <path d="M9 15l2 2 4-4"></path>
        </svg>
      ),
      active: location.pathname === '/compliance-training' || location.pathname.startsWith('/compliance-training'),
    },
    {
      path: '/master',
      label: 'Master',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
        </svg>
      ),
      active: location.pathname === '/master' || location.pathname.startsWith('/master'),
    },
    {
      path: '/report',
      label: 'Reports',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ),
      active: location.pathname.startsWith('/report'),
    },
    ...getAdminNavItems(permissions, location.pathname),
  ];

  const navItems = navItemsAll.filter((item) => {
    if (item.path === '/dashboard') return canAccessDesktopModule(permissions, 'dashboard');
    if (item.path === '/transaction') return canAccessDesktopModule(permissions, 'transaction');
    if (item.path === '/finance') return canAccessDesktopModule(permissions, 'finance');
    if (item.path === '/commercial-agreements') return canAccessDesktopModule(permissions, 'commercial');
    if (item.path === '/compliance-training') return canAccessDesktopModule(permissions, 'compliance');
    if (item.path === '/master') return canAccessDesktopModule(permissions, 'master');
    if (item.path === '/report') return canAccessDesktopModule(permissions, 'report');
    return true;
  });

  return (
    <div className="dashboard-page">
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
          <NotificationBell variant="sidebar" />
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

      <main className="dashboard-main">
        <PageHeader 
          title="Billing Operations"
          subtitle="Generate invoices and manage billing operations"
        />

        {/* Success Message */}
        {successMessage && (
          <div className="ra-alert ra-alert--success" role="status" aria-live="polite">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="ra-alert-close" aria-label="Close success message">
              ×
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="ra-alert ra-alert--error" role="alert">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ra-alert-close" aria-label="Close error message">
              ×
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && batches.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading billing operations...
          </div>
        )}

        <div className="route-assignment-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="12" y1="18" x2="12" y2="12"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
                <path d="M8 6h8"></path>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">Billing Operations</h1>
              <p className="ra-page-subtitle">Generate invoices and manage billing operations</p>
            </div>
          </div>

          {/* Compact Toolbar - Route Assignment Style */}
          <div className="ra-search-actions" style={{ 
            minHeight: '36px',
            marginBottom: '16px',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '12px',
            alignItems: 'center'
          }}>
            {/* Search Box - Left Side */}
            <div className="ra-search-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                placeholder="Search batches..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="ra-search-input"
                style={{ height: '34px', fontSize: '13px' }}
              />
            </div>

            {/* Action Buttons - Right Side */}
            <div className="ra-actions" style={{ marginLeft: 'auto', gap: '8px' }}>
              <button
                onClick={handleCreate}
                style={{
                  width: '163px',
                  height: '34px',
                  padding: '6px 14px',
                  background: '#1e293b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Manual
              </button>
              
              <button
                onClick={() => setShowGenerateWeightModal(true)}
                style={{
                  width: '163px',
                  height: '34px',
                  padding: '6px 14px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M12 2.69C8.5 2.69 5.69 5.5 5.69 9c0 4.5 6.31 10.31 6.31 10.31S18.31 13.5 18.31 9c0-3.5-2.81-6.31-6.31-6.31zM12 11.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                Weight
              </button>
              
              <button
                onClick={() => setShowGenerateMonthBedModal(true)}
                style={{
                  width: '163px',
                  height: '34px',
                  padding: '6px 14px',
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                </svg>
                Bed
              </button>

              <button
                onClick={() => setShowAdvancedFilters(true)}
                className="ra-filter-btn"
                style={{ width: '163px', height: '34px', padding: '6px 14px', fontSize: '13px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                Filter
              </button>
            </div>
          </div>

          {/* Billing Runs Table */}
          {!loading && (
            <div style={{ marginTop: '16px' }}>
                
                {/* Filter batches based on search and advanced filters */}
                {(() => {
                  const filteredBatches = batches.filter(batch => {
                    const batchSt = normalizeBatchStatus(batch.status);
                    // Hide empty staged auto-generated rows created when generation returns zero.
                    if (batch.totalRecords === 0 && batchSt === 'STAGED' && (batch.type === 'weight' || batch.type === 'bed')) {
                      return false;
                    }
                    const typeLabel = batch.type === 'weight' ? 'Weight Based' : batch.type === 'bed' ? 'Bed / Lumpsum' : 'Manual';
                    const searchLower = searchQuery.toLowerCase();
                    
                    // Search filter
                    if (searchQuery && !typeLabel.toLowerCase().includes(searchLower)) {
                      return false;
                    }
                    
                    // Advanced filters
                    if (advancedFilters.type !== 'All' && batch.type !== advancedFilters.type.toLowerCase()) {
                      return false;
                    }
                    
                    if (advancedFilters.status !== 'All' && batchSt !== advancedFilters.status) {
                      return false;
                    }
                    
                    return true;
                  });
                  
                  // Pagination
                  const totalPages = Math.ceil(filteredBatches.length / itemsPerPage);
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                  const paginatedBatches = filteredBatches.slice(startIndex, endIndex);
                  
                  return (
                    <>
                      <div className="route-assignment-table-container">
                      <table className="route-assignment-table">
                        <thead>
                          <tr>
                            <th>DATE</th>
                            <th>TYPE</th>
                            <th style={{ textAlign: 'right' }}>RECORDS</th>
                            <th style={{ textAlign: 'right' }}>Open drafts</th>
                            <th style={{ textAlign: 'center' }}>STATUS</th>
                            <th style={{ textAlign: 'center' }}>ACTION</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedBatches.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="empty-message">
                                {batches.length === 0 ? 'No billing runs found' : 'No billing runs match the filters'}
                              </td>
                            </tr>
                          ) : (
                            paginatedBatches.map((batch) => {
                          const batchSt = normalizeBatchStatus(batch.status);
                          const dateStr = new Date(batch.createdAt).toISOString().split('T')[0];
                          const typeLabel = batch.type === 'weight' ? 'Weight Based' : batch.type === 'bed' ? 'Bed / Lumpsum' : 'Manual';
                          
                          let statusLabel = '';
                          let statusColor = '';
                          let actionLabel = '';
                          let actionHandler: () => void = () => {};

                          if (batchSt === 'STAGED') {
                            // Batch run is staged (not the same wording as invoice DRAFT)
                            statusLabel = 'Staged';
                            statusColor = '#dbeafe';
                            actionLabel = 'Edit Invoices';
                            actionHandler = () => {
                              // Navigate to draft invoice edit page
                              navigate(`/finance/draft-invoices/${batch.id}`);
                            };
                          } else if (batchSt === 'PROCESSING') {
                            statusLabel = 'Processing';
                            statusColor = '#fef3c7';
                            actionLabel = 'Processing';
                            actionHandler = () => {};
                          } else if (batchSt === 'POSTED') {
                            statusLabel = 'Posted';
                            statusColor = '#dcfce7';
                            actionLabel = 'View Invoices';
                            actionHandler = () => {
                              navigate('/finance/invoice-management');
                            };
                          } else if (batchSt === 'FAILED') {
                            statusLabel = 'Failed';
                            statusColor = '#fee2e2';
                            actionLabel = 'Retry';
                            actionHandler = async () => {
                              try {
                                const preview = await getBatchPreview(batch.id);
                                setCurrentBatch(preview);
                                setShowBatchPreviewModal(true);
                              } catch (err: any) {
                                setError(err.message || 'Failed to load batch preview');
                              }
                            };
                          } else {
                            statusLabel = batchSt || 'Unknown';
                            statusColor = '#e2e8f0';
                          }

                              return (
                                <tr key={batch.id}>
                                  <td>{dateStr}</td>
                                  <td>{typeLabel}</td>
                                  <td style={{ textAlign: 'right' }}>{batch.totalRecords}</td>
                                  <td style={{ textAlign: 'right' }}>
                                    {batchSt === 'STAGED' ? batch.totalRecords : '-'}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <div className="ra-cell-center">
                                      <span className={`status-badge ${statusColor === '#fee2e2' ? 'status-badge--draft' : statusColor === '#fef3c7' ? 'status-badge--in-progress' : statusColor === '#dcfce7' ? 'status-badge--completed' : 'status-badge--draft'}`} style={statusLabel === 'Staged' ? { background: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 500 } : statusColor === '#fee2e2' ? { background: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 500 } : statusColor === '#dcfce7' ? { background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 500 } : { background: statusColor, color: '#1e40af', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 500 }}>
                                        {statusLabel}
                                      </span>
                                    </div>
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <button
                                      onClick={actionHandler}
                                      disabled={batchSt === 'PROCESSING'}
                                      className="ra-btn ra-btn--sm"
                                      style={{
                                        background: batchSt === 'PROCESSING' ? '#f1f5f9' : batchSt === 'STAGED' ? '#1e293b' : 'transparent',
                                        color: batchSt === 'PROCESSING' ? '#94a3b8' : batchSt === 'STAGED' ? 'white' : '#475569',
                                        border: batchSt === 'STAGED' ? 'none' : '1px solid #cbd5e1',
                                        cursor: batchSt === 'PROCESSING' ? 'not-allowed' : 'pointer',
                                      }}
                                    >
                                      {actionLabel === 'Edit Invoices' && (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                      )}
                                      {actionLabel}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Pagination Controls */}
                      {filteredBatches.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '12px 16px', background: '#f8fafc', borderRadius: '8px' }}>
                          <div style={{ fontSize: '14px', color: '#64748b' }}>
                            Showing {filteredBatches.length} of {batches.length} billing runs
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="ra-btn ra-btn--sm"
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              style={{
                                background: currentPage === 1 ? '#f1f5f9' : 'white',
                                color: currentPage === 1 ? '#94a3b8' : '#475569',
                                border: '1px solid #cbd5e1',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                opacity: currentPage === 1 ? 0.6 : 1,
                              }}
                            >
                              Previous
                            </button>
                            <button
                              className="ra-btn ra-btn--sm"
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                              style={{
                                background: currentPage === totalPages ? '#f1f5f9' : 'white',
                                color: currentPage === totalPages ? '#94a3b8' : '#475569',
                                border: '1px solid #cbd5e1',
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                opacity: currentPage === totalPages ? 0.6 : 1,
                              }}
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
            </div>
          )}
        </div>
      </main>

      {/* Advanced Filters Modal */}
      {showAdvancedFilters && (
        <AdvancedFiltersModal
          advancedFilters={advancedFilters}
          onClose={() => setShowAdvancedFilters(false)}
          onClear={() => {
            setAdvancedFilters({ type: 'All', status: 'All' });
            setSearchQuery('');
            setCurrentPage(1);
          }}
          onApply={(filters) => {
            setAdvancedFilters(filters);
            setShowAdvancedFilters(false);
            setCurrentPage(1);
          }}
        />
      )}

      {/* Invoice Create/Edit Modal */}
      {showCreateModal && (
        <InvoiceFormModal
          invoice={editingInvoice}
          companies={companies.filter(c => c.status === 'Active')}
          hcfs={hcfs.filter(h => h.status === 'Active')}
          onClose={() => {
            setShowCreateModal(false);
            setEditingInvoice(null);
          }}
          onSave={handleSave}
          calculateInvoiceValue={calculateInvoiceValue}
        />
      )}

      {/* Generate Invoice Month Modal - Bed/Lumpsum */}
      {showGenerateMonthBedModal && (
        <GenerateInvoiceMonthModal
          companies={companies.filter(c => c.status === 'Active')}
          onClose={() => setShowGenerateMonthBedModal(false)}
          onGenerate={handleMonthGenerate}
          loading={loading}
          generationMode="Bed/Lumpsum"
        />
      )}

      {/* Generate Invoice Weight Modal */}
      {showGenerateWeightModal && (
        <GenerateInvoiceWeightModal
          companies={companies.filter(c => c.status === 'Active')}
          hcfs={[]}
          onClose={() => setShowGenerateWeightModal(false)}
          onGenerate={handleWeightGenerate}
          loading={loading}
        />
      )}

      {/* Generate Invoice Month Modal - Bed/Lumpsum Only */}
      {showGenerateMonthBedModal && (
        <GenerateInvoiceMonthModal
          companies={companies.filter(c => c.status === 'Active')}
          onClose={() => setShowGenerateMonthBedModal(false)}
          onGenerate={handleMonthGenerate}
          loading={loading}
          generationMode="Bed/Lumpsum"
        />
      )}

      {showDuplicateModal && duplicateInfo && (
        <DuplicateInvoiceModal
          skipped={duplicateInfo.skipped}
          onClose={() => setShowDuplicateModal(false)}
        />
      )}

      {/* Batch Preview Modal */}
      {showBatchPreviewModal && currentBatch && (
        <BatchPreviewModal
          batch={currentBatch}
          onClose={() => {
            setShowBatchPreviewModal(false);
            setCurrentBatch(null);
          }}
          onPost={handlePostBatch}
          loading={loading}
        />
      )}

      {showZeroGeneratedModal && (
        <div className="modal-overlay" onClick={() => setShowZeroGeneratedModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2 className="modal-title">No Invoices Generated</h2>
              <button className="modal-close-btn" onClick={() => setShowZeroGeneratedModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div style={{ padding: '18px 20px', color: '#334155' }}>
              {zeroGeneratedMessage || 'Zero invoices were generated for the selected criteria.'}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn--primary" onClick={() => setShowZeroGeneratedModal(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Invoice Form Modal Component
interface InvoiceFormModalProps {
  invoice: Invoice | null;
  companies: Company[];
  hcfs: HCF[];
  onClose: () => void;
  onSave: (data: Partial<Invoice>, isGenerate?: boolean) => void;
  calculateInvoiceValue: (data: Partial<Invoice>) => string;
}

const InvoiceFormModal = ({ invoice, companies, hcfs, onClose, onSave, calculateInvoiceValue }: InvoiceFormModalProps) => {
  const [formData, setFormData] = useState<Partial<Invoice>>(
    invoice || {
      companyName: '',
      hcfCode: '',
      invoiceNum: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      billingType: '',
      billingOption: '',
      billingDays: '',
      bedCount: '',
      bedRate: '',
      weightInKg: '',
      kgRate: '',
      lumpsumAmount: '',
      taxableValue: '',
      igst: '',
      cgst: '',
      sgst: '',
      roundOff: '0',
      invoiceValue: '',
      invoiceStatus: 'Draft',
    }
  );

  // State for HCF loading and enabled status
  const [hcfLoading, setHcfLoading] = useState(false);
  const [hcfEnabled, setHcfEnabled] = useState(!!invoice?.companyName);

  // Get selected company ID
  const selectedCompany = companies.find(c => c.companyName === formData.companyName);
  const selectedCompanyId = selectedCompany?.id;

  // Filter HCFs based on selected company ID
  const filteredHCFs = selectedCompanyId
    ? hcfs.filter(hcf => hcf.companyId === selectedCompanyId)
    : [];

  const mapBillingTypeFromHcf = (raw?: string): string => {
    if (!raw) return '';
    const value = raw.trim().toLowerCase();
    if (value === 'monthly') return 'Monthly';
    if (value === 'quarterly') return 'Quarterly';
    if (value === 'yearly') return 'Yearly';
    return '';
  };

  // Handle company change - enable/disable HCF dropdown
  const handleCompanyChange = (companyName: string) => {
    setFormData(prev => ({
      ...prev,
      companyName,
      hcfCode: '',
      billingType: '',
      billingOption: '',
      bedRate: '',
      kgRate: '',
      lumpsumAmount: '',
    }));
    
    if (companyName) {
      // Company selected - enable HCF dropdown
      setHcfLoading(true);
      setHcfEnabled(true);
      
      // Simulate loading (in real scenario, this would be async fetch)
      setTimeout(() => {
        setHcfLoading(false);
      }, 300);
    } else {
      // Company cleared - disable HCF dropdown
      setHcfEnabled(false);
      setHcfLoading(false);
    }
  };

  // Handle HCF change - load HCF data and populate form
  const handleHCFChange = (hcfCode: string) => {
    if (hcfCode) {
      const selectedHCF = filteredHCFs.find(h => h.hcfCode === hcfCode);
      if (selectedHCF) {
        // Map billing option from HCF master (Per Bed -> Bed-wise, Per Kg -> Weight-wise, Lumpsum -> Lumpsum)
        let billingOption = '';
        if (selectedHCF.billingOption === 'Per Bed') {
          billingOption = 'Bed-wise';
        } else if (selectedHCF.billingOption === 'Per Kg') {
          billingOption = 'Weight-wise';
        } else if (selectedHCF.billingOption === 'Lumpsum') {
          billingOption = 'Lumpsum';
        } else if (selectedHCF.billingOption) {
          // Fallback: use as-is if it matches our format
          billingOption = selectedHCF.billingOption;
        }

        // Single state update so hcfCode and billing fields stay in sync
        setFormData(prev => {
          const next: any = { ...prev, hcfCode, billingOption, billingType: mapBillingTypeFromHcf(selectedHCF.billingType) };

          if (billingOption === 'Bed-wise') {
            next.bedRate = selectedHCF.bedRate || '';
            next.kgRate = '';
            next.weightInKg = '';
            next.lumpsumAmount = '';
            try {
              const invD = new Date(prev.invoiceDate || new Date().toISOString().split('T')[0]);
              const y = invD.getFullYear();
              const m = invD.getMonth() + 1;
              const dim = new Date(y, m, 0).getDate();
              next.billingDays = dim.toString();
            } catch {
              next.billingDays = '30';
            }
          } else if (billingOption === 'Weight-wise') {
            next.kgRate = selectedHCF.kgRate || '';
            next.bedCount = '';
            next.bedRate = '';
            next.billingDays = '';
            next.lumpsumAmount = '';
          } else if (billingOption === 'Lumpsum') {
            next.lumpsumAmount = selectedHCF.lumpsum || '';
            next.bedCount = '';
            next.bedRate = '';
            next.billingDays = '';
            next.weightInKg = '';
            next.kgRate = '';
          } else {
            // Unknown/empty billing option from master: clear option-specific fields
            next.bedCount = '';
            next.bedRate = '';
            next.billingDays = '';
            next.weightInKg = '';
            next.kgRate = '';
            next.lumpsumAmount = '';
          }

          return next;
        });
      }
    } else {
      // Clear HCF-related fields when HCF is cleared
      setFormData(prev => ({
        ...prev,
        hcfCode: '',
        billingType: '',
        billingOption: '',
        bedCount: '',
        bedRate: '',
        billingDays: '',
        weightInKg: '',
        kgRate: '',
        lumpsumAmount: '',
      }));
    }
  };

  // Recalculate taxable value and GST from Company + HCF masters (preview matches backend manual invoice rules)
  useEffect(() => {
    const co = companies.find(c => c.companyName === formData.companyName);
    const hcfRow = filteredHCFs.find(h => h.hcfCode === formData.hcfCode);
    if (!co || !hcfRow || !formData.billingOption) {
      return;
    }

    const preview = computeManualInvoiceTaxPreview({
      billingOption: formData.billingOption,
      bedCount: parseFloat(String(formData.bedCount || '')) || 0,
      bedRate: parseFloat(String(formData.bedRate || '')) || 0,
      billingDays: parseInt(String(formData.billingDays || ''), 10) || undefined,
      weightInKg: parseFloat(String(formData.weightInKg || '')) || 0,
      kgRate: parseFloat(String(formData.kgRate || '')) || 0,
      lumpsumAmount: parseFloat(String(formData.lumpsumAmount || '')) || 0,
      companyGstRate: co.gstRate,
      companyGstin: co.gstin,
      companyState: co.state,
      hcfStateCode: hcfRow.stateCode,
      isGstExempt: hcfRow.isGSTExempt,
    });

    const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '');
    setFormData(prev => {
      const next = {
        ...prev,
        taxableValue: fmt(preview.taxableValue),
        igst: fmt(preview.igst),
        cgst: fmt(preview.cgst),
        sgst: fmt(preview.sgst),
        roundOff: fmt(preview.roundOff),
        invoiceValue: fmt(preview.invoiceValue),
      };
      if (
        prev.taxableValue === next.taxableValue &&
        prev.igst === next.igst &&
        prev.cgst === next.cgst &&
        prev.sgst === next.sgst &&
        prev.roundOff === next.roundOff &&
        prev.invoiceValue === next.invoiceValue
      ) {
        return prev;
      }
      return next;
    });
  }, [
    companies,
    filteredHCFs,
    formData.companyName,
    formData.hcfCode,
    formData.billingOption,
    formData.bedCount,
    formData.bedRate,
    formData.billingDays,
    formData.weightInKg,
    formData.kgRate,
    formData.lumpsumAmount,
  ]);

  // Validate invoice date - check if previous month is closed
  const validateInvoiceDate = (dateString: string): string | null => {
    if (!dateString) return null;
    
    try {
      const selectedDate = new Date(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      
      const currentDay = today.getDate();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      const selectedMonth = selectedDate.getMonth();
      const selectedYear = selectedDate.getFullYear();
      
      // Check if selected date is in previous month
      const isPreviousMonth = (selectedYear < currentYear) || 
        (selectedYear === currentYear && selectedMonth < currentMonth);
      
      // If today is >= 25th, don't allow previous month dates
      if (currentDay >= 25 && isPreviousMonth) {
        return 'Previous month invoice period is closed.';
      }
      
      return null;
    } catch (error) {
      return 'Invalid date format.';
    }
  };

  // Validate due date - must be greater than invoice date
  const validateDueDate = (dueDateString: string, invoiceDateString: string): string | null => {
    if (!dueDateString || !invoiceDateString) return null;
    
    try {
      const dueDate = new Date(dueDateString);
      const invoiceDate = new Date(invoiceDateString);
      dueDate.setHours(0, 0, 0, 0);
      invoiceDate.setHours(0, 0, 0, 0);
      
      if (dueDate <= invoiceDate) {
        return 'Due date must be later than the invoice date.';
      }
      
      return null;
    } catch (error) {
      return 'Invalid date format.';
    }
  };

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string | null }>({});

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => {
      const updatedData: any = { ...prev, [field]: value };

      // Validate invoice date
      if (field === 'invoiceDate') {
        const error = validateInvoiceDate(value);
        setValidationErrors(prev => ({ ...prev, invoiceDate: error }));
      }

      // Validate due date
      if (field === 'dueDate') {
        const error = validateDueDate(value, updatedData.invoiceDate || formData.invoiceDate || '');
        setValidationErrors(prev => ({ ...prev, dueDate: error }));
      }

      // Clear validation error when field changes
      if (validationErrors[field]) {
        setValidationErrors(prev => ({ ...prev, [field]: null }));
      }

      if (['taxableValue', 'igst', 'cgst', 'sgst', 'roundOff'].includes(field)) {
        const calculatedValue = calculateInvoiceValue(updatedData);
        updatedData.invoiceValue = calculatedValue;
      }

      // Note: taxableValue should be fetched from Company Master
      // Since it's not in the Company entity currently, it remains read-only
      // This may need to be addressed at the database/backend level

      return updatedData;
    });
  };

  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate before saving
    const invoiceDateError = validateInvoiceDate(formData.invoiceDate || '');
    const dueDateError = validateDueDate(formData.dueDate || '', formData.invoiceDate || '');
    
    if (invoiceDateError || dueDateError) {
      setValidationErrors({
        invoiceDate: invoiceDateError,
        dueDate: dueDateError,
      });
      if (invoiceDateError) {
        notifyError(invoiceDateError);
      }
      if (dueDateError) {
        notifyError(dueDateError);
      }
      return;
    }
    
    onSave(formData, false);
  };

  return (
    <div className="wp-modal-overlay" onClick={onClose}>
      <div className="wp-modal-content generate-invoice-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="wp-modal-header">
          <div className="wp-modal-header-left">
            <div className={`wp-modal-icon ${invoice ? 'wp-modal-icon--edit' : 'wp-modal-icon--add'}`}>
              {invoice ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              )}
            </div>
            <div>
              <h2 className="wp-modal-title">{invoice ? 'Edit Invoice' : 'Create Invoice'}</h2>
              {!invoice && (
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', fontWeight: 400 }}>
                  Fill in the details to generate a new invoice
                </p>
              )}
            </div>
          </div>
          <button className="wp-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSaveDraft}>
          <div className="wp-modal-body generate-invoice-form" style={{ '--wp-form-columns': '3', overflowY: 'auto', flex: '1' } as React.CSSProperties}>
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              .generate-invoice-form .wp-form-row {
                display: grid;
                grid-template-columns: repeat(3, 1fr) !important;
                gap: 16px !important;
                margin-bottom: 16px !important;
                align-items: start;
              }
              .generate-invoice-form .wp-form-group {
                margin-bottom: 0;
                display: flex;
                flex-direction: column;
              }
              .generate-invoice-form .wp-form-group label {
                margin-bottom: 8px;
                display: block;
              }
              .generate-invoice-form .wp-input-wrapper,
              .generate-invoice-form .wp-form-input,
              .generate-invoice-form .wp-form-select {
                height: 36px;
                box-sizing: border-box;
              }
              .generate-invoice-form .wp-form-input,
              .generate-invoice-form .wp-form-select {
                font-size: 14px;
                width: 100%;
                box-sizing: border-box;
              }
              /* Preserve base padding from invoiceManagementPage.css so icons/arrow never overlap text */
              .generate-invoice-form .wp-form-input {
                padding-left: 40px;
              }
              .generate-invoice-form .wp-form-select {
                padding-left: 40px;
                padding-right: 36px;
              }
              /* Billing option radio alignment */
              .generate-invoice-form .billing-option-group {
                display: flex;
                gap: 24px;
                flex-wrap: wrap;
                align-items: center;
              }
              .generate-invoice-form .billing-option-group label {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 0;
                font-weight: 500;
                user-select: none;
              }
              .generate-invoice-form .billing-option-group input[type="radio"] {
                margin: 0;
              }
              .generate-invoice-form .wp-input-wrapper {
                position: relative;
                width: 100%;
              }
              .generate-invoice-modal .wp-modal-body {
                padding: 16px 18px !important;
              }
              .generate-invoice-form h3 {
                margin-bottom: 12px !important;
              }
              .generate-invoice-modal .wp-modal-header {
                padding: 12px 18px !important;
              }
              .generate-invoice-modal .wp-modal-footer {
                padding: 12px 18px !important;
              }
            `}</style>
            
            {/* BASIC INFORMATION Section */}
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                BASIC INFORMATION
              </h3>
              {/* Row 1: Company Name | HCF Code | Invoice Number */}
              <div className="wp-form-row">
                <div className="wp-form-group">
                  <label htmlFor="companyName">Company Name <span className="wp-required">*</span></label>
                  <div className="wp-input-wrapper">
                    <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                      <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                    <select
                      id="companyName"
                      value={formData.companyName || ''}
                      onChange={(e) => handleCompanyChange(e.target.value)}
                      required
                      className="wp-form-select"
                    >
                      <option value="">Select Company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.companyName}>
                          {company.companyName}
                        </option>
                      ))}
                    </select>
                    <svg className="wp-select-arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>
                <div className="wp-form-group">
                  <label htmlFor="hcfCode">HCF Code <span className="wp-required">*</span></label>
                  <div className="wp-input-wrapper" style={{ position: 'relative' }}>
                    <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    {hcfLoading && (
                      <div style={{
                        position: 'absolute',
                        right: '40px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        zIndex: 1,
                        pointerEvents: 'none'
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', color: '#64748b' }}>
                          <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
                          <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"></path>
                        </svg>
                      </div>
                    )}
                    <select
                      id="hcfCode"
                      value={formData.hcfCode || ''}
                      onChange={(e) => handleHCFChange(e.target.value)}
                      required
                      disabled={!hcfEnabled || hcfLoading}
                      className="wp-form-select"
                      style={{
                        opacity: hcfLoading ? 0.6 : 1,
                        cursor: !hcfEnabled || hcfLoading ? 'not-allowed' : 'pointer',
                        paddingRight: hcfLoading ? '50px' : '40px'
                      }}
                    >
                      <option value="">
                        {hcfLoading 
                          ? 'Loading HCFs...' 
                          : !hcfEnabled 
                            ? 'Select Company first' 
                            : filteredHCFs.length === 0 && formData.companyName
                              ? 'No HCF available for selected company'
                              : 'Select HCF'}
                      </option>
                      {filteredHCFs.map((hcf) => (
                        <option key={hcf.id} value={hcf.hcfCode}>
                          {hcf.hcfCode} - {hcf.hcfName}
                        </option>
                      ))}
                    </select>
                    <svg className="wp-select-arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                  {!hcfLoading && formData.companyName && filteredHCFs.length === 0 && (
                    <small style={{ display: 'block', marginTop: '4px', color: '#ef4444', fontSize: '11px' }}>
                      No HCF available for selected company
                    </small>
                  )}
                </div>
                <div
                  className="wp-form-group"
                  style={!invoice ? { visibility: 'hidden', pointerEvents: 'none' as const } : undefined}
                  aria-hidden={!invoice ? true : undefined}
                >
                  {invoice ? (
                    <>
                      <label htmlFor="invoiceNum">Invoice Number <span className="wp-required">*</span></label>
                      <div className="wp-input-wrapper">
                        <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        <input
                          id="invoiceNum"
                          type="text"
                          value={formData.invoiceNum || ''}
                          readOnly
                          className="wp-form-input"
                          style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
                        />
                      </div>
                    </>
                  ) : (
                    <span style={{ display: 'block', height: 1 }} />
                  )}
                </div>
              </div>
              {/* Row 2: Invoice Date | Due Date | Billing Type */}
              <div className="wp-form-row">
                <div className="wp-form-group">
                  <label htmlFor="invoiceDate">Invoice Date <span className="wp-required">*</span></label>
                  <div className="wp-input-wrapper">
                    <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <input
                      id="invoiceDate"
                      type="date"
                      value={formData.invoiceDate || ''}
                      onChange={(e) => handleFieldChange('invoiceDate', e.target.value)}
                      required
                      className="wp-form-input"
                      style={validationErrors.invoiceDate ? { borderColor: '#ef4444' } : {}}
                    />
                  </div>
                  {validationErrors.invoiceDate && (
                    <small style={{ display: 'block', marginTop: '4px', color: '#ef4444', fontSize: '11px' }}>
                      {validationErrors.invoiceDate}
                    </small>
                  )}
                </div>
                <div className="wp-form-group">
                  <label htmlFor="dueDate">Due Date <span className="wp-required">*</span></label>
                  <div className="wp-input-wrapper">
                    <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate || ''}
                      onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                      required
                      min={formData.invoiceDate || ''}
                      className="wp-form-input"
                      style={validationErrors.dueDate ? { borderColor: '#ef4444' } : {}}
                    />
                  </div>
                  {validationErrors.dueDate && (
                    <small style={{ display: 'block', marginTop: '4px', color: '#ef4444', fontSize: '11px' }}>
                      {validationErrors.dueDate}
                    </small>
                  )}
                </div>
                <div className="wp-form-group">
                  <label htmlFor="billingType">Billing Type <span className="wp-required">*</span></label>
                  <div className="wp-input-wrapper">
                    <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <select
                      id="billingType"
                      value={formData.billingType || ''}
                      required
                      disabled
                      className="wp-form-select"
                      style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                    >
                      <option value="">{formData.hcfCode ? 'No billing type in HCF master' : 'Select HCF first'}</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                    <svg className="wp-select-arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                  <small style={{ display: 'block', marginTop: '4px', color: '#64748b', fontSize: '11px' }}>
                    From HCF master (read-only)
                  </small>
                </div>
              </div>
            </div>

            {/* BILLING INFORMATION Section */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                BILLING INFORMATION
              </h3>

              {/* Row 1: Billing Option (span 3) */}
              <div className="wp-form-row">
                <div className="wp-form-group" style={{ gridColumn: 'span 3' }}>
                  <label style={{ marginBottom: '8px', display: 'block' }}>
                    Billing Option <span className="wp-required">*</span>
                  </label>
                  <div
                    className="billing-option-group"
                    style={{
                      ...(!formData.hcfCode ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                      ...(formData.hcfCode ? { pointerEvents: 'none' as const, opacity: 0.85 } : {}),
                    }}
                    title={!formData.hcfCode ? 'Select HCF first' : 'Billing option comes from HCF master (read-only)'}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'default', fontSize: '14px', userSelect: 'none' }}>
                      <input
                        type="radio"
                        name="billingOption"
                        value="Bed-wise"
                        checked={formData.billingOption === 'Bed-wise'}
                        disabled
                        style={{ marginRight: '8px', width: '16px', height: '16px', accentColor: '#3b82f6' }}
                      />
                      <span>Bed-wise</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'default', fontSize: '14px', userSelect: 'none' }}>
                      <input
                        type="radio"
                        name="billingOption"
                        value="Weight-wise"
                        checked={formData.billingOption === 'Weight-wise'}
                        disabled
                        style={{ marginRight: '8px', width: '16px', height: '16px', accentColor: '#3b82f6' }}
                      />
                      <span>Weight-wise</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'default', fontSize: '14px', userSelect: 'none' }}>
                      <input
                        type="radio"
                        name="billingOption"
                        value="Lumpsum"
                        checked={formData.billingOption === 'Lumpsum'}
                        disabled
                        style={{ marginRight: '8px', width: '16px', height: '16px', accentColor: '#3b82f6' }}
                      />
                      <span>Lumpsum</span>
                    </label>
                  </div>
                  {!formData.hcfCode && (
                    <small style={{ display: 'block', marginTop: '4px', color: '#64748b', fontSize: '11px' }}>
                      Select HCF to load billing option from master
                    </small>
                  )}
                  {formData.hcfCode && (
                    <small style={{ display: 'block', marginTop: '4px', color: '#64748b', fontSize: '11px' }}>
                      From HCF master (read-only)
                    </small>
                  )}
                </div>
              </div>

              {/* Bed-wise: Billing Days | Bed Count | Bed Rate */}
              {formData.billingOption === 'Bed-wise' && (
                <div className="wp-form-row">
                  <div className="wp-form-group">
                    <label htmlFor="billingDays">Billing Days</label>
                    <div className="wp-input-wrapper">
                      <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <input
                        id="billingDays"
                        type="number"
                        min={1}
                        step={1}
                        value={formData.billingDays || ''}
                        onChange={(e) => handleFieldChange('billingDays', e.target.value)}
                        placeholder="e.g. 31 or 45"
                        className="wp-form-input"
                      />
                    </div>
                    <small style={{ display: 'block', marginTop: '4px', color: '#64748b', fontSize: '11px' }}>
                      Editable; used for bed-wise base amount (no maximum)
                    </small>
                  </div>
                  <div className="wp-form-group">
                    <label htmlFor="bedCount">Bed Count <span className="wp-required">*</span></label>
                    <div className="wp-input-wrapper">
                      <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                      </svg>
                      <input
                        id="bedCount"
                        type="text"
                        value={formData.bedCount || ''}
                        onChange={(e) => handleFieldChange('bedCount', e.target.value)}
                        placeholder="Enter bed count"
                        className="wp-form-input"
                      />
                    </div>
                  </div>
                  <div className="wp-form-group">
                    <label htmlFor="bedRate">Bed Rate <span className="wp-required">*</span></label>
                    <div className="wp-input-wrapper">
                      <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                      <input
                        id="bedRate"
                        type="text"
                        value={formData.bedRate || ''}
                        onChange={(e) => handleFieldChange('bedRate', e.target.value)}
                        placeholder="Enter bed rate"
                        className="wp-form-input"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Weight-wise: Weight Kg | Kg Rate (Billing Days hidden) */}
              {formData.billingOption === 'Weight-wise' && (
                <div className="wp-form-row">
                  <div className="wp-form-group">
                    <label htmlFor="weightInKg">Weight in Kg <span className="wp-required">*</span></label>
                    <div className="wp-input-wrapper">
                      <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.6 1.5-3.5 3.5-5.5z"></path>
                      </svg>
                      <input
                        id="weightInKg"
                        type="text"
                        value={formData.weightInKg || ''}
                        onChange={(e) => handleFieldChange('weightInKg', e.target.value)}
                        placeholder="Enter weight in kg"
                        className="wp-form-input"
                      />
                    </div>
                  </div>
                  <div className="wp-form-group">
                    <label htmlFor="kgRate">Kg Rate <span className="wp-required">*</span></label>
                    <div className="wp-input-wrapper">
                      <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                      <input
                        id="kgRate"
                        type="text"
                        value={formData.kgRate || ''}
                        onChange={(e) => handleFieldChange('kgRate', e.target.value)}
                        placeholder="Enter kg rate"
                        className="wp-form-input"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Lumpsum: Lumpsum Amount (span 3, Billing Days hidden) */}
              {formData.billingOption === 'Lumpsum' && (
                <div className="wp-form-row">
                  <div className="wp-form-group" style={{ gridColumn: 'span 3' }}>
                    <label htmlFor="lumpsumAmount">Lumpsum Amount <span className="wp-required">*</span></label>
                    <div className="wp-input-wrapper">
                      <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                      <input
                        id="lumpsumAmount"
                        type="text"
                        value={formData.lumpsumAmount || ''}
                        onChange={(e) => handleFieldChange('lumpsumAmount', e.target.value)}
                        placeholder="Enter lumpsum amount"
                        className="wp-form-input"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* TAX & AMOUNT INFORMATION Section */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                TAX & AMOUNT INFORMATION
              </h3>
              {/* Row 1: Taxable Value, IGST, CGST */}
              <div className="wp-form-row">
                <div className="wp-form-group">
                  <label htmlFor="taxableValue">Taxable Value <span className="wp-required">*</span></label>
                  <div className="wp-input-wrapper">
                    <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    <input
                      id="taxableValue"
                      type="text"
                      value={formData.taxableValue || ''}
                      readOnly
                      required
                      placeholder="Auto-fetched from Company Master"
                      className="wp-form-input"
                      style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                    />
                  </div>
                  <small style={{ display: 'block', marginTop: '4px', color: '#64748b', fontSize: '11px' }}>
                    From billing lines × Company GST % (CGST/SGST vs IGST by place of supply)
                  </small>
                </div>
                <div className="wp-form-group">
                  <label htmlFor="igst">IGST</label>
                  <div className="wp-input-wrapper">
                    <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    <input
                      id="igst"
                      type="text"
                      value={formData.igst || ''}
                      readOnly
                      className="wp-form-input"
                      style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>
                <div className="wp-form-group">
                  <label htmlFor="cgst">CGST</label>
                  <div className="wp-input-wrapper">
                    <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    <input
                      id="cgst"
                      type="text"
                      value={formData.cgst || ''}
                      readOnly
                      className="wp-form-input"
                      style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>
              </div>
              {/* Row 2: SGST, Round Off, Invoice Value */}
              <div className="wp-form-row">
                <div className="wp-form-group">
                  <label htmlFor="sgst">SGST</label>
                  <div className="wp-input-wrapper">
                    <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    <input
                      id="sgst"
                      type="text"
                      value={formData.sgst || ''}
                      readOnly
                      className="wp-form-input"
                      style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>
                <div className="wp-form-group">
                  <label htmlFor="roundOff">Round Off</label>
                  <div className="wp-input-wrapper">
                    <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <input
                      id="roundOff"
                      type="text"
                      value={formData.roundOff || '0'}
                      readOnly
                      className="wp-form-input"
                      style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>
                <div className="wp-form-group">
                  <label htmlFor="invoiceValue">Invoice Value</label>
                  <div className="wp-input-wrapper">
                    <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    <input
                      id="invoiceValue"
                      type="text"
                      value={formData.invoiceValue || ''}
                      readOnly
                      placeholder="Auto-calculated"
                      className="wp-form-input"
                      style={{ backgroundColor: '#f1f5f9', fontWeight: '600' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="wp-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              <span style={{ color: '#ef4444' }}>*</span> Required fields
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" className="wp-btn wp-btn--cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="wp-btn wp-btn--save">
                Save Invoice
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Generate Invoice Weight Modal Component
interface GenerateInvoiceWeightModalProps {
  companies: Company[];
  hcfs?: HCF[]; // Optional, not used in new template
  onClose: () => void;
  onGenerate: (data: GenerateInvoiceWeightRequest) => void;
  loading: boolean;
}

const GenerateInvoiceWeightModal = ({ companies, hcfs, onClose, onGenerate, loading }: GenerateInvoiceWeightModalProps) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  let previousMonth = currentMonth - 1;
  let previousYear = currentYear;
  if (previousMonth === 0) {
    previousMonth = 12;
    previousYear = currentYear - 1;
  }

  const [formData, setFormData] = useState({
    companyId: '',
    month: previousMonth,
    year: previousYear,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDays: 30,
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Calculate previous month's date range based on selected month
  const calculatePreviousMonthDates = (selectedMonth: number, selectedYear: number) => {
    let prevMonth = selectedMonth - 1;
    let prevYear = selectedYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = selectedYear - 1;
    }
    
    // First day of previous month
    const fromDate = new Date(prevYear, prevMonth - 1, 1);
    // Last day of previous month
    const toDate = new Date(prevYear, prevMonth, 0);
    
    return {
      pickupDateFrom: fromDate.toISOString().split('T')[0],
      pickupDateTo: toDate.toISOString().split('T')[0]
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyId) {
      return;
    }
    
    // Calculate previous month's date range
    const { pickupDateFrom, pickupDateTo } = calculatePreviousMonthDates(formData.month, formData.year);
    
    // Create the weight request with calculated dates
    const weightRequest: GenerateInvoiceWeightRequest = {
      companyId: formData.companyId,
      pickupDateFrom: pickupDateFrom,
      pickupDateTo: pickupDateTo,
      billingType: 'Monthly',
      invoiceDate: formData.invoiceDate,
      dueDays: formData.dueDays,
    };
    
    onGenerate(weightRequest);
  };

  return (
    <div className="wp-modal-overlay" onClick={onClose}>
      <div
        className="wp-modal-content auto-invoice-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '860px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <style>{`
          .auto-invoice-modal .auto-invoice-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px 14px;
          }
          .auto-invoice-modal .wp-modal-body {
            overflow-x: hidden;
          }
          .auto-invoice-modal .wp-form-group {
            margin-bottom: 0 !important;
          }
          .auto-invoice-modal .wp-form-input,
          .auto-invoice-modal .wp-form-select {
            height: 34px;
            padding-top: 6px;
            padding-bottom: 6px;
          }
          .auto-invoice-modal .wp-modal-footer {
            position: sticky;
            bottom: 0;
            background: #fff;
            border-top: 1px solid #e2e8f0;
            z-index: 2;
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
          }
          .auto-invoice-modal .wp-modal-footer .wp-btn {
            white-space: normal;
            min-width: 120px;
          }
          @media (max-width: 768px) {
            .auto-invoice-modal .auto-invoice-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
        <div className="wp-modal-header">
          <div className="wp-modal-header-left">
            <div className="wp-modal-icon wp-modal-icon--add">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <h2 className="wp-modal-title">Auto Generate Invoices (Weight Based)</h2>
          </div>
          <button className="wp-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
          <div className="wp-modal-body" style={{ overflowY: 'auto', flex: 1, padding: '14px 16px' }}>
            <div className="wp-form-group" style={{ marginBottom: '10px' }}>
              <label htmlFor="companyId">Company <span className="wp-required">*</span></label>
              <div className="wp-input-wrapper">
                <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <select
                  id="companyId"
                  required
                  value={formData.companyId}
                  onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                  className="wp-form-select"
                >
                  <option value="">Select Company</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
                <svg className="wp-select-arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              <small style={{ display: 'block', marginTop: '3px', color: '#64748b', fontSize: '11px' }}>
                Note: Only HCFs with Weight-wise billing option will be included
              </small>
            </div>

            <div className="auto-invoice-grid">
              <div className="wp-form-group">
                <label htmlFor="month">Month <span className="wp-required">*</span></label>
                <div className="wp-input-wrapper">
                  <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <select
                    id="month"
                    required
                    value={formData.month}
                    onChange={(e) => {
                      const newMonth = parseInt(e.target.value);
                      let newYear = formData.year;
                      // Adjust year if month wraps around
                      if (newMonth === 1 && formData.month === 12) {
                        newYear = formData.year + 1;
                      } else if (newMonth === 12 && formData.month === 1) {
                        newYear = formData.year - 1;
                      }
                      setFormData({ ...formData, month: newMonth, year: newYear });
                    }}
                    className="wp-form-select"
                  >
                    {monthNames.map((name, index) => (
                      <option key={index + 1} value={index + 1}>
                        {name} {index + 1 === previousMonth ? '(Previous Month)' : ''}
                      </option>
                    ))}
                  </select>
                  <svg className="wp-select-arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
                <small style={{ display: 'block', marginTop: '3px', color: '#64748b', fontSize: '11px' }}>
                  Weight calculation will use previous month ({monthNames[formData.month === 1 ? 11 : formData.month - 2]} {formData.month === 1 ? formData.year - 1 : formData.year})
                </small>
              </div>
              <div className="wp-form-group">
                <label htmlFor="year">Year <span className="wp-required">*</span></label>
                <div className="wp-input-wrapper">
                  <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <input
                    id="year"
                    type="number"
                    required
                    min="2000"
                    max="2100"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="wp-form-input"
                  />
                </div>
                <small style={{ display: 'block', marginTop: '3px', color: '#64748b', fontSize: '11px' }}>
                  Year for the selected month
                </small>
              </div>
              <div className="wp-form-group">
                <label htmlFor="invoiceDate">Invoice Date <span className="wp-required">*</span></label>
                <div className="wp-input-wrapper">
                  <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <input
                    id="invoiceDate"
                    type="date"
                    required
                    value={formData.invoiceDate}
                    onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                    className="wp-form-input"
                  />
                </div>
                <small style={{ display: 'block', marginTop: '3px', color: '#64748b', fontSize: '11px' }}>
                  Enter the invoice date
                </small>
              </div>
              <div className="wp-form-group">
                <label htmlFor="dueDays">Due Days (from invoice date)</label>
                <div className="wp-input-wrapper">
                  <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <input
                    id="dueDays"
                    type="number"
                    min="1"
                    value={formData.dueDays || 30}
                    onChange={(e) => setFormData({ ...formData, dueDays: parseInt(e.target.value) || 30 })}
                    className="wp-form-input"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="wp-modal-footer" style={{ padding: '12px 16px' }}>
            <button type="button" className="wp-btn wp-btn--cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="wp-btn wp-btn--save" disabled={loading} title="Generate invoices (Weight Based)">
              {loading ? 'Generating...' : 'Generate Invoices'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Generate Invoice Month Modal Component
interface GenerateInvoiceMonthModalProps {
  companies: Company[];
  onClose: () => void;
  onGenerate: (data: GenerateInvoiceMonthRequest) => void;
  loading: boolean;
  generationMode: 'Bed/Lumpsum' | 'Weight Based';
}

const GenerateInvoiceMonthModal = ({ companies, onClose, onGenerate, loading, generationMode }: GenerateInvoiceMonthModalProps) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  let previousMonth = currentMonth - 1;
  let previousYear = currentYear;
  if (previousMonth === 0) {
    previousMonth = 12;
    previousYear = currentYear - 1;
  }

  const [formData, setFormData] = useState<GenerateInvoiceMonthRequest>({
    companyId: '',
    month: previousMonth,
    year: previousYear,
    invoiceDate: new Date().toISOString().split('T')[0],
    generationMode: generationMode,
    dueDays: 30,
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(formData);
  };

  return (
    <div className="wp-modal-overlay" onClick={onClose}>
      <div
        className="wp-modal-content auto-invoice-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '860px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <style>{`
          .auto-invoice-modal .auto-invoice-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px 14px;
          }
          .auto-invoice-modal .wp-modal-body {
            overflow-x: hidden;
          }
          .auto-invoice-modal .wp-form-group {
            margin-bottom: 0 !important;
          }
          .auto-invoice-modal .wp-form-input,
          .auto-invoice-modal .wp-form-select {
            height: 34px;
            padding-top: 6px;
            padding-bottom: 6px;
          }
          .auto-invoice-modal .wp-modal-footer {
            position: sticky;
            bottom: 0;
            background: #fff;
            border-top: 1px solid #e2e8f0;
            z-index: 2;
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
          }
          .auto-invoice-modal .wp-modal-footer .wp-btn {
            white-space: normal;
            min-width: 120px;
          }
          @media (max-width: 768px) {
            .auto-invoice-modal .auto-invoice-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
        <div className="wp-modal-header">
          <div className="wp-modal-header-left">
            <div className="wp-modal-icon wp-modal-icon--add">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <h2 className="wp-modal-title">Auto Generate Invoices ({generationMode})</h2>
          </div>
          <button className="wp-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
          <div className="wp-modal-body" style={{ overflowY: 'auto', flex: 1, padding: '14px 16px' }}>
            <div className="wp-form-group" style={{ marginBottom: '10px' }}>
              <label htmlFor="companyId">Company <span className="wp-required">*</span></label>
              <div className="wp-input-wrapper">
                <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <select
                  id="companyId"
                  required
                  value={formData.companyId}
                  onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                  className="wp-form-select"
                >
                  <option value="">Select Company</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
                <svg className="wp-select-arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              <small style={{ display: 'block', marginTop: '3px', color: '#64748b', fontSize: '11px' }}>
                Note: Only HCFs with AutoGeneration enabled will be included
              </small>
            </div>

            <div className="auto-invoice-grid">
              <div className="wp-form-group">
                <label htmlFor="month">Month <span className="wp-required">*</span></label>
                <div className="wp-input-wrapper">
                  <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <select
                    id="month"
                    required
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                    className="wp-form-select"
                  >
                    {monthNames.map((name, index) => (
                      <option key={index + 1} value={index + 1} disabled={index + 1 !== previousMonth}>
                        {name} {index + 1 === previousMonth ? '(Previous Month)' : ''}
                      </option>
                    ))}
                  </select>
                  <svg className="wp-select-arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
                <small style={{ display: 'block', marginTop: '3px', color: '#64748b', fontSize: '11px' }}>
                  Only previous month ({monthNames[previousMonth - 1]} {previousYear}) can be selected
                </small>
              </div>
              <div className="wp-form-group">
                <label htmlFor="year">Year <span className="wp-required">*</span></label>
                <div className="wp-input-wrapper">
                  <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <input
                    id="year"
                    type="number"
                    required
                    min="2000"
                    max="2100"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    disabled
                    className="wp-form-input"
                  />
                </div>
                <small style={{ display: 'block', marginTop: '3px', color: '#64748b', fontSize: '11px' }}>
                  Year is automatically set to previous month's year
                </small>
              </div>
              <div className="wp-form-group">
                <label htmlFor="invoiceDate">Invoice Date <span className="wp-required">*</span></label>
                <div className="wp-input-wrapper">
                  <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <input
                    id="invoiceDate"
                    type="date"
                    required
                    value={formData.invoiceDate}
                    onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                    className="wp-form-input"
                  />
                </div>
                <small style={{ display: 'block', marginTop: '3px', color: '#64748b', fontSize: '11px' }}>
                  Enter the invoice date
                </small>
              </div>
              <div className="wp-form-group">
                <label htmlFor="dueDays">Due Days (from invoice date)</label>
                <div className="wp-input-wrapper">
                  <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <input
                    id="dueDays"
                    type="number"
                    min="1"
                    value={formData.dueDays || 30}
                    onChange={(e) => setFormData({ ...formData, dueDays: parseInt(e.target.value) || 30 })}
                    className="wp-form-input"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="wp-modal-footer" style={{ padding: '12px 16px' }}>
            <button type="button" className="wp-btn wp-btn--cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="wp-btn wp-btn--save" disabled={loading} title={`Generate invoices (${generationMode})`}>
              {loading ? 'Generating...' : 'Generate Invoices'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Duplicate Invoice Modal Component
interface DuplicateInvoiceModalProps {
  skipped: Array<{ hcfId: string; hcfCode: string; reason: string }>;
  onClose: () => void;
}

const DuplicateInvoiceModal = ({ skipped, onClose }: DuplicateInvoiceModalProps) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Duplicate Invoices Found</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: '20px' }}>
          <p style={{ marginBottom: '16px', color: '#666' }}>
            The following HCFs already have invoices for the selected period. These were skipped during generation:
          </p>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>HCF Code</th>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {skipped.map((item, index) => (
                  <tr key={index}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{item.hcfCode}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{item.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn--primary" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// Batch Preview Modal Component
interface BatchPreviewModalProps {
  batch: BatchPreviewResponse;
  onClose: () => void;
  onPost: (batchId: string, invoiceDate: string) => void;
  loading: boolean;
}

const BatchPreviewModal = ({ batch, onClose, onPost, loading }: BatchPreviewModalProps) => {
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<BatchItemResponse[]>(batch.items);

  const handlePost = () => {
    if (window.confirm(`Are you sure you want to post this batch? This will create ${items.filter(i => i.isSelected && !i.errorFlag).length} invoice(s).`)) {
      onPost(batch.id, invoiceDate);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setItems(items.map(item => 
      item.id === itemId ? { ...item, isSelected: !item.isSelected } : item
    ));
  };

  const selectedCount = items.filter(i => i.isSelected && !i.errorFlag).length;
  const errorCount = items.filter(i => i.errorFlag).length;

  return (
    <div className="wp-modal-overlay" onClick={onClose}>
      <div className="wp-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="wp-modal-header">
          <div className="wp-modal-header-left">
            <div className="wp-modal-icon wp-modal-icon--add">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <h2 className="wp-modal-title">Batch Preview - {batch.type === 'weight' ? 'Weight Based' : batch.type === 'bed' ? 'Bed / Lumpsum' : 'Manual'}</h2>
          </div>
          <button className="wp-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="wp-modal-body" style={{ flexGrow: 1, overflowY: 'auto', padding: '20px' }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                Total Records: <strong>{batch.totalRecords}</strong> | 
                Selected: <strong style={{ color: '#10b981' }}>{selectedCount}</strong> | 
                Errors: <strong style={{ color: '#ef4444' }}>{errorCount}</strong>
              </p>
            </div>
            <div className="wp-form-group" style={{ margin: 0, width: '200px' }}>
              <label htmlFor="invoiceDate" style={{ fontSize: '12px', marginBottom: '4px' }}>Invoice Date</label>
              <input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="wp-form-input"
                style={{ padding: '6px 10px', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>
                    <input
                      type="checkbox"
                      checked={selectedCount === items.filter(i => !i.errorFlag).length && selectedCount > 0}
                      onChange={(e) => {
                        const newSelected = e.target.checked;
                        setItems(items.map(item => 
                          item.errorFlag ? item : { ...item, isSelected: newSelected }
                        ));
                      }}
                    />
                  </th>
                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Customer</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: '#64748b' }}>Qty</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: '#64748b' }}>Rate</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: '#64748b' }}>Tax %</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: '#64748b' }}>Amount</th>
                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px' }}>
                      <input
                        type="checkbox"
                        checked={item.isSelected}
                        onChange={() => toggleItemSelection(item.id)}
                        disabled={item.errorFlag}
                      />
                    </td>
                    <td style={{ padding: '10px', color: '#1e293b' }}>{item.customerId}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#1e293b' }}>{item.quantity.toFixed(2)}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#1e293b' }}>₹{item.rate.toFixed(2)}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#1e293b' }}>{item.taxPercent}%</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#1e293b', fontWeight: 600 }}>₹{item.amount.toFixed(2)}</td>
                    <td style={{ padding: '10px' }}>
                      {item.errorFlag ? (
                        <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '11px', background: '#fee2e2', color: '#991b1b' }}>
                          {item.errorMessage || 'Error'}
                        </span>
                      ) : (
                        <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '11px', background: '#dcfce7', color: '#166534' }}>
                          Ready
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="wp-modal-footer">
          <button className="wp-btn wp-btn--cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button 
            className="wp-btn wp-btn--save" 
            onClick={handlePost} 
            disabled={loading || selectedCount === 0}
            style={{ backgroundColor: '#10b981' }}
          >
            {loading ? 'Posting...' : `Post Batch (${selectedCount} invoices)`}
          </button>
        </div>
      </div>
    </div>
  );
};

// Advanced Filters Modal Component
interface AdvancedFiltersModalProps {
  advancedFilters: {
    type: string;
    status: string;
  };
  onClose: () => void;
  onClear: () => void;
  onApply: (filters: {
    type: string;
    status: string;
  }) => void;
}

const AdvancedFiltersModal = ({
  advancedFilters,
  onClose,
  onClear,
  onApply,
}: AdvancedFiltersModalProps) => {
  const [filters, setFilters] = useState(advancedFilters);

  return (
    <div className="modal-overlay ra-filter-modal-overlay" onClick={onClose}>
      <div className="modal-content ra-filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ra-filter-modal-header">
          <div className="ra-filter-modal-titlewrap">
            <div className="ra-filter-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
            </div>
            <div>
              <div className="ra-filter-title">Advanced Filters</div>
              <div className="ra-filter-subtitle">Filter billing runs by multiple criteria</div>
            </div>
          </div>
          <button className="ra-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="ra-filter-modal-body">
          <div className="ra-filter-grid">
            <div className="ra-filter-field">
              <label>Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="ra-filter-select"
              >
                <option value="All">All</option>
                <option value="manual">Manual</option>
                <option value="weight">Weight Based</option>
                <option value="bed">Bed / Lumpsum</option>
              </select>
            </div>

            <div className="ra-filter-field">
              <label>Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="ra-filter-select"
              >
                <option value="All">All</option>
                <option value="STAGED">Staged (open drafts)</option>
                <option value="PROCESSING">Processing</option>
                <option value="POSTED">Posted</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="ra-filter-modal-footer">
          <button type="button" className="ra-link-btn" onClick={onClear}>
            Clear All
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              className="ra-assignment-btn ra-assignment-btn--cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ra-assignment-btn ra-assignment-btn--primary"
              onClick={() => onApply(filters)}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateInvoicesPage;
