import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getAdminNavItems } from '../../utils/adminNavItems';
import { canAccessDesktopModule } from '../../utils/moduleAccess';
import { 
  getInvoices, 
  createInvoice, 
  updateInvoice, 
  deleteInvoice,
  generateInvoices,
  generateInvoicesWeight,
  generateInvoicesMonth,
  downloadInvoicePdf,
  startBulkInvoicePdfJob,
  InvoiceResponse,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  GenerateInvoiceRequest,
  GenerateInvoiceWeightRequest,
  GenerateInvoiceMonthRequest
} from '../../services/invoiceService';
import {
  processPayment,
  getReceipt,
  PaymentMode,
  CreatePaymentRequest,
  ProcessPaymentResponse,
} from '../../services/paymentService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { hcfService, HcfResponse } from '../../services/hcfService';
import PageHeader from '../../components/layout/PageHeader';
import './invoiceManagementPage.css';
import '../desktop/dashboardPage.css';

// Extended interface to match both API response and component needs
interface Invoice extends Partial<InvoiceResponse> {
  id: string; // Use invoiceId as id
  companyName?: string;
  hcfCode?: string;
  invoiceNum: string; // Map from invoiceNumber
  invoiceStatus: 'Draft' | 'Generated' | 'Partially Paid' | 'Paid' | 'Cancelled'; // Map from status
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
}

interface HCF {
  id: string;
  hcfCode: string;
  hcfName: string;
  companyName: string;
  status: 'Active' | 'Inactive';
}

interface AdvancedFilters {
  invoiceNum: string;
  companyName: string;
  hcfCode: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
}

const InvoiceManagementPage = () => {
  const { logout, permissions, user } = useAuth();
  const MAX_BULK_PDF = 100;
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    invoiceNum: '',
    companyName: '',
    hcfCode: '',
    invoiceDate: '',
    dueDate: '',
    status: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showGenerateWeightModal, setShowGenerateWeightModal] = useState(false);
  const [showGenerateMonthBedModal, setShowGenerateMonthBedModal] = useState(false);
  const [showGenerateMonthWeightModal, setShowGenerateMonthWeightModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{ skipped: Array<{ hcfId: string; hcfCode: string; reason: string }> } | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<Invoice[]>([]);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Master data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [hcfs, setHcfs] = useState<HCF[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load companies
      const companiesData = await companyService.getAllCompanies(true);
      const mappedCompanies = companiesData.map(c => ({
        id: c.id,
        companyCode: c.companyCode,
        companyName: c.companyName,
        status: c.status,
      }));
      setCompanies(mappedCompanies);

      // Load HCFs
      const hcfsData = await hcfService.getAllHcfs(undefined, true);
      const mappedHcfs = hcfsData.map(h => ({
        id: h.id,
        hcfCode: h.hcfCode,
        hcfName: h.hcfName,
        companyName: companiesData.find(c => c.id === h.companyId)?.companyName || '',
        status: h.status || 'Active',
      }));
      setHcfs(mappedHcfs);

      // Load invoices with the loaded data
      await loadInvoicesWithData(mappedCompanies, mappedHcfs);
    } catch (err: any) {
      console.error('Error loading data:', err);
      const errorMessage = err.message || 'Failed to load data';
      if (errorMessage.includes('Internal server error') || errorMessage.includes('500')) {
        setError('Internal server error. Please check the backend logs.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadInvoicesWithData = async (companiesData: Company[], hcfsData: HCF[]) => {
    try {
      const invoicesData = await getInvoices();
      console.log('Loaded invoices:', invoicesData.length);
      console.log('Companies available:', companiesData.length);
      console.log('HCFs available:', hcfsData.length);
      
      // Map API response to component interface
      const mappedInvoices: Invoice[] = invoicesData.map(inv => {
        const company = companiesData.find(c => c.id === inv.companyId);
        const hcf = hcfsData.find(h => h.id === inv.hcfId);
        
        // Debug logging for first invoice
        if (invoicesData.indexOf(inv) === 0) {
          console.log('First invoice mapping:', {
            invoiceId: inv.invoiceId,
            companyId: inv.companyId,
            hcfId: inv.hcfId,
            foundCompany: !!company,
            foundHcf: !!hcf,
            companyName: company?.companyName,
            hcfCode: hcf?.hcfCode,
          });
        }
        
        return {
          ...inv,
          id: inv.invoiceId,
          invoiceNum: inv.invoiceNumber,
          invoiceStatus: inv.status,
          companyName: company?.companyName || inv.companyName || '',
          hcfCode: hcf?.hcfCode || inv.hcfCode || '',
          invoiceDate: inv.invoiceDate || '',
          dueDate: inv.dueDate || '',
          billingDays: inv.billingDays !== null && inv.billingDays !== undefined ? inv.billingDays.toString() : '',
          bedCount: inv.bedCount !== null && inv.bedCount !== undefined ? inv.bedCount.toString() : '',
          bedRate: inv.bedRate !== null && inv.bedRate !== undefined ? inv.bedRate.toString() : '',
          weightInKg: inv.weightInKg !== null && inv.weightInKg !== undefined ? inv.weightInKg.toString() : '',
          kgRate: inv.kgRate !== null && inv.kgRate !== undefined ? inv.kgRate.toString() : '',
          lumpsumAmount: inv.lumpsumAmount !== null && inv.lumpsumAmount !== undefined ? inv.lumpsumAmount.toString() : '',
          taxableValue: inv.taxableValue?.toString() || '',
          igst: inv.igst?.toString() || '',
          cgst: inv.cgst?.toString() || '',
          sgst: inv.sgst?.toString() || '',
          roundOff: inv.roundOff?.toString() || '',
          invoiceValue: inv.invoiceValue?.toString() || '',
          totalPaidAmount: inv.totalPaidAmount?.toString() || '',
          balanceAmount: inv.balanceAmount?.toString() || '',
        };
      });
      
      console.log('Mapped invoices:', mappedInvoices.length);
      setInvoices(mappedInvoices);
      // Clear error if invoices loaded successfully
      if (mappedInvoices.length > 0) {
        setError(null);
      }
    } catch (err: any) {
      console.error('Error loading invoices:', err);
      const errorMessage = err.message || 'Failed to load invoices';
      
      // Handle authentication/authorization errors
      if (errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden') || errorMessage.includes('permission')) {
        setError('Access denied: You do not have permission to view invoices. Please contact your administrator or log in again.');
        // Don't throw - just show error
        return;
      }
      
      if (errorMessage.includes('Internal server error') || errorMessage.includes('500')) {
        setError('Internal server error. Please check the backend logs.');
      } else {
        setError(errorMessage);
      }
      throw err; // Re-throw to be caught by loadData
    }
  };

  const loadInvoices = async () => {
    // Use current state values for companies and hcfs
    await loadInvoicesWithData(companies, hcfs);
  };

  const filteredInvoices = invoices.filter(invoice => {
    // Search query filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      invoice.invoiceNum.toLowerCase().includes(searchLower) ||
      invoice.companyName.toLowerCase().includes(searchLower) ||
      invoice.hcfCode.toLowerCase().includes(searchLower) ||
      hcfs.find(h => h.hcfCode === invoice.hcfCode)?.hcfName.toLowerCase().includes(searchLower);
    
    // Status filter
    const matchesStatus = statusFilter === 'All' || invoice.invoiceStatus === statusFilter;

    // Advanced filters
    const matchesInvoiceNum = !advancedFilters.invoiceNum || invoice.invoiceNum.toLowerCase().includes(advancedFilters.invoiceNum.toLowerCase());
    const matchesCompanyName = !advancedFilters.companyName || invoice.companyName.toLowerCase().includes(advancedFilters.companyName.toLowerCase());
    const matchesHcfCode = !advancedFilters.hcfCode || invoice.hcfCode.toLowerCase().includes(advancedFilters.hcfCode.toLowerCase());
    const matchesInvoiceDate = !advancedFilters.invoiceDate || invoice.invoiceDate === advancedFilters.invoiceDate;
    const matchesDueDate = !advancedFilters.dueDate || invoice.dueDate === advancedFilters.dueDate;
    const matchesAdvancedStatus = !advancedFilters.status || advancedFilters.status === 'All' || invoice.invoiceStatus === advancedFilters.status;
    
    return matchesSearch && matchesStatus && matchesInvoiceNum && matchesCompanyName && matchesHcfCode && matchesInvoiceDate && matchesDueDate && matchesAdvancedStatus;
  });

  const handleCreate = () => {
    setEditingInvoice(null);
    setShowCreateModal(true);
  };

  const handleView = (invoice: Invoice) => {
    setViewingInvoice(invoice);
    setShowViewModal(true);
  };

  const handleEdit = (invoice: Invoice) => {
    if (invoice.invoiceStatus === 'Draft') {
      setEditingInvoice(invoice);
      setShowCreateModal(true);
    } else {
      alert('Only Draft invoices can be edited.');
    }
  };

  const handleGenerateSingle = (invoice: Invoice) => {
    if (invoice.invoiceStatus !== 'Draft') {
      alert('Only Draft invoices can be generated.');
      return;
    }

    // Note: Individual invoice generation endpoint not yet implemented in backend
    // For now, use the "Generate Invoice" button in the edit modal
    alert('Please use the "Generate Invoice" button in the edit modal to generate this invoice.');
  };

  const handleCancel = (invoice: Invoice) => {
    if (window.confirm('Are you sure you want to cancel this invoice?')) {
      setInvoices(invoices.map(inv => 
        inv.id === invoice.id 
          ? { ...inv, invoiceStatus: 'Cancelled', modifiedOn: new Date().toISOString().split('T')[0] }
          : inv
      ));
    }
  };

  const handleRecordPayment = (invoice: Invoice) => {
    // Simplified single invoice payment flow
    if (invoice.invoiceStatus !== 'Generated' && invoice.invoiceStatus !== 'Partially Paid') {
      alert('Only Generated or Partially Paid invoices can be paid.');
      return;
    }
    setSelectedInvoiceForPayment(invoice);
    setShowRecordPaymentModal(true);
  };

  const handleMakePayment = (invoice?: Invoice) => {
    if (invoice) {
      // For single invoice, use simplified record payment
      handleRecordPayment(invoice);
      return;
    } else {
      // Multiple invoice payment - get selected invoices
      const payableInvoices = filteredInvoices.filter(
        inv => (inv.invoiceStatus === 'Generated' || inv.invoiceStatus === 'Partially Paid') && 
               parseFloat(inv.balanceAmount || '0') > 0
      );
      if (payableInvoices.length === 0) {
        alert('No payable invoices found. Only Generated or Partially Paid invoices with balance can be paid.');
        return;
      }
      setSelectedInvoices(payableInvoices);
      setShowPaymentModal(true);
    }
  };

  const handleRecordPaymentSubmit = async (paymentData: RecordPaymentRequest) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result: RecordPaymentResponse = await recordPayment(paymentData);
      
      setSuccessMessage(
        `Payment recorded successfully! Receipt Number: ${result.data.receipt.receiptNumber}`
      );

      // Load receipt details
      const receiptDetails = await getReceipt(result.data.receipt.receiptId);
      setReceiptData(receiptDetails.data);
      setShowReceiptModal(true);

      // Reload invoices to reflect updated statuses
      await loadInvoices();
      setShowRecordPaymentModal(false);
      setSelectedInvoiceForPayment(null);
    } catch (err: any) {
      console.error('Error recording payment:', err);
      const errorMessage = err.message || 'Failed to record payment';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };


  // Helper to get display status (map "Generated" to "DUE" for UI)
  const getDisplayStatus = (status: string): string => {
    return status === 'Generated' ? 'DUE' : status;
  };

  // Checkbox selection handlers
  const isInvoiceSelectable = (invoice: Invoice): boolean => {
    return invoice.invoiceStatus === 'Generated' || invoice.invoiceStatus === 'Partially Paid';
  };

  const isInvoiceSelected = (invoiceId: string): boolean => {
    return selectedInvoiceIds.has(invoiceId);
  };

  const handleToggleInvoiceSelection = (invoice: Invoice) => {
    if (!isInvoiceSelectable(invoice)) return;
    
    const newSelection = new Set(selectedInvoiceIds);
    if (newSelection.has(invoice.id)) {
      newSelection.delete(invoice.id);
    } else {
      newSelection.add(invoice.id);
    }
    setSelectedInvoiceIds(newSelection);
  };

  const handleSelectAll = () => {
    const selectableInvoices = filteredInvoices.filter(isInvoiceSelectable);
    const allSelected = selectableInvoices.every(inv => selectedInvoiceIds.has(inv.id));
    
    if (allSelected) {
      // Deselect all
      setSelectedInvoiceIds(new Set());
    } else {
      // Select all selectable
      const newSelection = new Set(selectedInvoiceIds);
      selectableInvoices.forEach(inv => newSelection.add(inv.id));
      setSelectedInvoiceIds(newSelection);
    }
  };

  const handleProceedToPayment = () => {
    const selected = filteredInvoices.filter(inv => selectedInvoiceIds.has(inv.id));
    if (selected.length === 0) {
      alert('Please select at least one invoice to proceed with payment');
      return;
    }
    // Navigate to payment page with selected invoices
    const invoiceIds = Array.from(selectedInvoiceIds);
    navigate(`/finance/payment?invoices=${invoiceIds.join(',')}`);
  };

  // Calculate summary for selected invoices
  const selectedInvoicesSummary = () => {
    const selected = filteredInvoices.filter(inv => selectedInvoiceIds.has(inv.id));
    const totalBalance = selected.reduce((sum, inv) => sum + parseFloat(inv.balanceAmount || '0'), 0);
    return {
      count: selected.length,
      totalBalance,
    };
  };

  const handleProcessPayment = async (paymentData: CreatePaymentRequest) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result: ProcessPaymentResponse = await processPayment(paymentData);
      
      setSuccessMessage(
        `Payment processed successfully! Receipt Number: ${result.data.receipt.receiptNumber}`
      );

      // Load receipt details
      const receiptDetails = await getReceipt(result.data.receipt.receiptId);
      setReceiptData(receiptDetails.data);
      setShowReceiptModal(true);

      // Reload invoices to reflect updated statuses
      await loadInvoices();
      setShowPaymentModal(false);
    } catch (err: any) {
      console.error('Error processing payment:', err);
      const errorMessage = err.message || 'Failed to process payment';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const triggerBrowserDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
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

  const handlePrint = async (invoice: Invoice) => {
    try {
      setLoading(true);
      setError(null);

      const { blob, filename } = await downloadInvoicePdf(invoice.id);

      // Open in new tab for view/print.
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);

      // If you prefer direct download instead of opening, use:
      // triggerBrowserDownload(blob, filename);
      void filename;
    } catch (err: any) {
      setError(err?.message || 'Failed to generate/download PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    alert('Export functionality will be implemented');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await deleteInvoice(id);
      setSuccessMessage('Invoice deleted successfully');
      // Reload invoices after delete
      await loadInvoices();
    } catch (err: any) {
      console.error('Error deleting invoice:', err);
      const errorMessage = err.message || 'Failed to delete invoice';
      if (errorMessage.includes('Internal server error') || errorMessage.includes('500')) {
        setError('Internal server error. Please check the backend logs.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: Partial<Invoice>, isGenerate: boolean = false) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Find company and HCF IDs
      const company = companies.find(c => c.companyName === data.companyName);
      const hcf = hcfs.find(h => h.hcfCode === data.hcfCode);

      if (!company || !hcf) {
        throw new Error('Company or HCF not found');
      }

      if (editingInvoice) {
        // Update existing invoice
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
        setSuccessMessage('Invoice updated successfully');
      } else {
        // Create new invoice
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
        };

        await createInvoice(createData);
        setSuccessMessage('Invoice created successfully');
      }

      // Reload invoices after save
      await loadInvoices();
      setShowCreateModal(false);
      setEditingInvoice(null);
    } catch (err: any) {
      console.error('Error saving invoice:', err);
      const errorMessage = err.message || 'Failed to save invoice';
      if (errorMessage.includes('Internal server error') || errorMessage.includes('500')) {
        setError('Internal server error. Please check the backend logs.');
      } else {
        setError(errorMessage);
      }
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
      
      console.log('Invoice generation result:', result);
      
      // Clear previous messages first
      setError(null);
      setSuccessMessage(null);

      try {
        const generatedIds = (result.generated || [])
          .map((inv: any) => inv.invoiceId)
          .filter(Boolean);

        if (generatedIds.length > 0) {
          const { jobs, email } = await enqueueBulkPdfJobs(generatedIds);
          setSuccessMessage(`PDF ZIP processing started (${jobs} job${jobs === 1 ? '' : 's'}). Download link will be emailed to ${email}.`);
        }
      } catch (jobErr) {
        console.error('Failed to enqueue bulk PDF job:', jobErr);
        if (jobErr instanceof Error && jobErr.message === 'EMAIL_MISSING') {
          setError('Invoices generated, but email is missing. Please re-login and try again.');
        } else {
          setError('Invoices generated, but failed to start bulk PDF processing. Please try again.');
        }
      }
      
      // Show detailed error messages for failed invoices FIRST (so they're visible)
      if (result.failed && result.failed.length > 0) {
        console.log('Failed invoices details:', JSON.stringify(result.failed, null, 2));
        const failedMessages = result.failed.map(f => {
          const hcfLabel = f.hcfCode || f.hcfId || 'Unknown HCF';
          const reason = f.reason || 'Unknown error';
          return `${hcfLabel}: ${reason}`;
        }).join('; ');
        
        const errorMsg = result.summary.success > 0 
          ? `Some invoices failed: ${failedMessages}`
          : `Invoice generation failed: ${failedMessages}`;
        
        console.log('Setting error message:', errorMsg);
        setError(errorMsg);
      }
      
      // Show success message if any invoices were generated
      if (result.summary.success > 0) {
        const successMsg = `Generated ${result.summary.success} invoice(s) successfully.`;
        if (result.summary.failed > 0) {
          setSuccessMessage(`${successMsg} ${result.summary.failed} failed.`);
        } else {
          setSuccessMessage(successMsg);
        }
      }
      
      // If all failed and none succeeded, ensure error is shown and success is cleared
      if (result.summary.success === 0 && result.summary.failed > 0) {
        setSuccessMessage(null); // Clear success message
        // Error message should already be set above
      }
      
      // Reload invoices after generation
      await loadInvoices();
      setShowGenerateModal(false);
    } catch (err: any) {
      console.error('Error generating invoices:', err);
      const errorMessage = err.message || 'Failed to generate invoices';
      // Check if it's a server error
      if (errorMessage.includes('Internal server error') || errorMessage.includes('500')) {
        setError('Internal server error. Please check the backend logs.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWeightGenerate = async (generateData: GenerateInvoiceWeightRequest) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await generateInvoicesWeight(generateData);

      try {
        const generatedIds = (result.generated || [])
          .map((inv: any) => inv.invoiceId)
          .filter(Boolean);
        if (generatedIds.length > 0) {
          const { jobs, email } = await enqueueBulkPdfJobs(generatedIds);
          setSuccessMessage(`PDF ZIP processing started (${jobs} job${jobs === 1 ? '' : 's'}). Download link will be emailed to ${email}.`);
        }
      } catch (jobErr) {
        console.error('Failed to enqueue bulk PDF job:', jobErr);
        if (jobErr instanceof Error && jobErr.message === 'EMAIL_MISSING') {
          setError('Invoices generated, but email is missing. Please re-login and try again.');
        } else {
          setError('Invoices generated, but failed to start bulk PDF processing. Please try again.');
        }
      }
      if (result.summary.success > 0) {
        setSuccessMessage(
          `Generated ${result.summary.success} invoice(s) successfully (Weight-based). ${result.summary.failed} failed.`
        );
      }
      if (result.failed.length > 0) {
        const failedMessages = result.failed.map(f => `${f.hcfCode}: ${f.reason}`).join(', ');
        setError(`Some invoices failed: ${failedMessages}`);
      }
      // Reload invoices after generation
      await loadInvoices();
      setShowGenerateWeightModal(false);
    } catch (err: any) {
      console.error('Error generating weight-based invoices:', err);
      const errorMessage = err.message || 'Failed to generate invoices';
      if (errorMessage.includes('Internal server error') || errorMessage.includes('500')) {
        setError('Internal server error. Please check the backend logs.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMonthGenerate = async (generateData: GenerateInvoiceMonthRequest) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await generateInvoicesMonth(generateData);

      try {
        const generatedIds = (result.generated || [])
          .map((inv: any) => inv.invoiceId)
          .filter(Boolean);
        if (generatedIds.length > 0) {
          const { jobs, email } = await enqueueBulkPdfJobs(generatedIds);
          setSuccessMessage(`PDF ZIP processing started (${jobs} job${jobs === 1 ? '' : 's'}). Download link will be emailed to ${email}.`);
        }
      } catch (jobErr) {
        console.error('Failed to enqueue bulk PDF job:', jobErr);
        if (jobErr instanceof Error && jobErr.message === 'EMAIL_MISSING') {
          setError('Invoices generated, but email is missing. Please re-login and try again.');
        } else {
          setError('Invoices generated, but failed to start bulk PDF processing. Please try again.');
        }
      }
      setSuccessMessage(
        `Generated ${result.summary.success} invoice(s) successfully. ${result.summary.failed} failed. ${result.summary.skipped || 0} skipped.`
      );
      
      // Show duplicate popup if there are skipped invoices
      if (result.skipped && result.skipped.length > 0) {
        setDuplicateInfo({ skipped: result.skipped });
        setShowDuplicateModal(true);
      }
      
      if (result.failed.length > 0) {
        const failedMessages = result.failed.map(f => `${f.hcfCode}: ${f.reason}`).join(', ');
        setError(`Some invoices failed: ${failedMessages}`);
      }
      
      await loadInvoices();
      setShowGenerateMonthBedModal(false);
      setShowGenerateMonthWeightModal(false);
    } catch (err: any) {
      console.error('Error generating month-based invoices:', err);
      const errorMessage = err.message || 'Failed to generate invoices';
      if (errorMessage.includes('Internal server error') || errorMessage.includes('500')) {
        setError('Internal server error during invoice generation. Please check the backend logs.');
      } else {
        setError(errorMessage);
      }
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

  // Use the same sidebar menu style as FinancePage (SVG icons + consistent labels)
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

  // Match common behavior: hide module menus if user doesn't have any permissions for that module (SuperAdmin '*' sees all).
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

      <main className="dashboard-main">
        <PageHeader 
          title="Invoice Management"
          subtitle="Create, manage and track invoices"
        />

        <div className="route-assignment-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">Invoice Management</h1>
              <p className="ra-page-subtitle">Manage invoices, payments, and billing records</p>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="ra-search-actions">
            <div className="ra-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="ra-search-input"
                placeholder="Search by invoice number, company, HCF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="ra-actions">
              <button className="ra-filter-btn" onClick={() => setShowAdvancedFilters(true)} type="button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                Advanced Filter
              </button>
              <button className="export-btn" onClick={handleExport} disabled={loading} style={{ marginRight: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Export
              </button>
              <button 
                className="add-invoice-btn" 
                onClick={() => setShowGenerateMonthBedModal(true)}
                disabled={loading}
                style={{ marginRight: '8px', backgroundColor: '#3b82f6' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                </svg>
                Auto Generate – Bed / Lumpsum
              </button>
              <button 
                className="add-invoice-btn" 
                onClick={() => setShowGenerateMonthWeightModal(true)}
                disabled={loading}
                style={{ marginRight: '8px', backgroundColor: '#10b981' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                </svg>
                Auto Generate – Weight Based
              </button>
              <button className="ra-add-btn" onClick={handleCreate} disabled={loading} type="button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Create Invoice
              </button>
            </div>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="ra-alert ra-alert--error">
              <span>{error}</span>
              <button className="ra-alert-close" onClick={() => setError(null)}>×</button>
            </div>
          )}
          {successMessage && (
            <div className="ra-alert ra-alert--success">
              <span>{successMessage}</span>
              <button className="ra-alert-close" onClick={() => setSuccessMessage(null)}>×</button>
            </div>
          )}

          {loading && !invoices.length && (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading invoices...</div>
          )}

          {/* Table Container */}
          <div className="route-assignment-table-container">
            {loading && !invoices.length ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Loading invoices...
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 16px', opacity: 0.5 }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p style={{ fontSize: '14px', margin: 0 }}>No invoices found for the selected filters</p>
              </div>
            ) : (
              <table className="route-assignment-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th>Invoice Number</th>
                    <th>Company Name</th>
                    <th>HCF Code</th>
                    <th>Invoice Date</th>
                    <th>Due Date</th>
                    <th>Invoice Value</th>
                    <th>Paid Amount</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {
                  filteredInvoices.map((invoice) => {
                    const hcf = hcfs.find(h => h.hcfCode === invoice.hcfCode);
                    const isSelectable = isInvoiceSelectable(invoice);
                    const isSelected = isInvoiceSelected(invoice.id);
                    return (
                      <tr key={invoice.id} style={{ opacity: invoice.invoiceStatus === 'Paid' ? 0.6 : 1 }}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleInvoiceSelection(invoice)}
                            disabled={!isSelectable}
                            title={!isSelectable ? 'Only DUE or Partially Paid invoices can be selected' : 'Select invoice'}
                          />
                        </td>
                        <td>{invoice.invoiceNum || '-'}</td>
                        <td>{invoice.companyName || '-'}</td>
                        <td>{hcf ? `${invoice.hcfCode} - ${hcf.hcfName}` : invoice.hcfCode}</td>
                        <td>{invoice.invoiceDate || '-'}</td>
                        <td>{invoice.dueDate || '-'}</td>
                        <td>₹{invoice.invoiceValue || '0'}</td>
                        <td style={{ color: '#94a3b8', fontSize: '13px' }}>₹{parseFloat(invoice.totalPaidAmount || '0').toFixed(2)}</td>
                        <td style={{ fontWeight: 700, color: '#059669', fontSize: '14px' }}>₹{parseFloat(invoice.balanceAmount || '0').toFixed(2)}</td>
                        <td>
                          <span className={`invoice-status-badge invoice-status-badge--${invoice.invoiceStatus.toLowerCase().replace(' ', '-')}`}>
                            {getDisplayStatus(invoice.invoiceStatus)}
                          </span>
                        </td>
                        <td>
                          <div className="invoice-action-buttons">
                            <button
                              className="action-btn action-btn--view"
                              onClick={() => handleView(invoice)}
                              title="View"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            {invoice.invoiceStatus === 'Draft' && (
                              <>
                                <button
                                  className="action-btn action-btn--edit"
                                  onClick={() => handleEdit(invoice)}
                                  title="Edit"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                  </svg>
                                </button>
                                <button
                                  className="action-btn action-btn--generate"
                                  onClick={() => handleGenerateSingle(invoice)}
                                  title="Generate"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                </button>
                              </>
                            )}
                            <button
                              className="action-btn action-btn--print"
                              onClick={() => handlePrint(invoice)}
                              title="Download PDF"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                              </svg>
                            </button>
                            {invoice.invoiceStatus !== 'Cancelled' && invoice.invoiceStatus !== 'Paid' && (
                              <button
                                className="action-btn action-btn--cancel"
                                onClick={() => handleCancel(invoice)}
                                title="Cancel"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="15" y1="9" x2="9" y2="15"></line>
                                  <line x1="9" y1="9" x2="15" y2="15"></line>
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                  }
                </tbody>
              </table>
            )}
          </div>
          
          {/* Payment Summary Bar - Financial Action Bar */}
          {selectedInvoiceIds.size > 0 && (
            <div 
              className="invoice-payment-summary-bar"
              style={{
                position: 'fixed',
                bottom: 0,
                left: '280px',
                right: 0,
                background: '#FFFFFF',
                borderTop: '1px solid #E5E7EB',
                padding: '16px 24px',
                boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 1000,
                minHeight: '64px'
              }}
            >
              {/* Left Section - Summary Information */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    fontSize: '14px', 
                    color: '#6B7280', 
                    fontWeight: 400,
                    lineHeight: '1.5'
                  }}>
                    Selected Invoices:
                  </span>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: 500, 
                    color: '#1F2937',
                    lineHeight: '1.5'
                  }}>
                    {selectedInvoicesSummary().count}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    fontSize: '14px', 
                    color: '#6B7280', 
                    fontWeight: 400,
                    lineHeight: '1.5'
                  }}>
                    Total Payable:
                  </span>
                  <span style={{ 
                    fontSize: '20px', 
                    fontWeight: 700, 
                    color: '#059669',
                    lineHeight: '1.5',
                    letterSpacing: '-0.02em'
                  }}>
                    ₹{selectedInvoicesSummary().totalBalance.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Right Section - Primary CTA Button */}
              <div style={{ flexShrink: 0 }}>
                <button
                  onClick={handleProceedToPayment}
                  disabled={selectedInvoiceIds.size === 0}
                  title={selectedInvoiceIds.size === 0 ? 'Select at least one invoice' : 'Proceed to payment'}
                  style={{
                    padding: '12px 32px',
                    background: '#10b981',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: selectedInvoiceIds.size > 0 ? 'pointer' : 'not-allowed',
                    fontSize: '15px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    minHeight: '48px',
                    boxShadow: selectedInvoiceIds.size > 0 ? '0 2px 4px rgba(16, 185, 129, 0.2)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedInvoiceIds.size > 0) {
                      e.currentTarget.style.background = '#059669';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedInvoiceIds.size > 0) {
                      e.currentTarget.style.background = '#10b981';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
                    }
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                  Proceed to Payment
                </button>
              </div>
            </div>
          )}
          
          <div className="route-assignment-pagination-info" style={{ marginBottom: selectedInvoiceIds.size > 0 ? '80px' : '0' }}>
            Showing {filteredInvoices.length} of {invoices.length} items
          </div>
        </div>
      </main>

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

      {/* Invoice View Modal */}
      {showViewModal && viewingInvoice && (
        <InvoiceViewModal
          invoice={viewingInvoice}
          hcfs={hcfs}
          onClose={() => {
            setShowViewModal(false);
            setViewingInvoice(null);
          }}
          onPrint={handlePrint}
        />
      )}

      {/* Advanced Filters Modal */}
      {showAdvancedFilters && (
        <AdvancedFiltersModal
          statusFilter={statusFilter}
          advancedFilters={advancedFilters}
          companies={companies}
          hcfs={hcfs}
          onClose={() => setShowAdvancedFilters(false)}
          onClear={() => {
            setStatusFilter('All');
            setAdvancedFilters({
              invoiceNum: '',
              companyName: '',
              hcfCode: '',
              invoiceDate: '',
              dueDate: '',
              status: '',
            });
            setShowAdvancedFilters(false);
          }}
          onApply={(payload) => {
            setStatusFilter(payload.statusFilter);
            setAdvancedFilters(payload.advancedFilters);
            setShowAdvancedFilters(false);
          }}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          invoices={selectedInvoices}
          companies={companies.filter(c => c.status === 'Active')}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedInvoices([]);
          }}
          onProcessPayment={handleProcessPayment}
          loading={loading}
        />
      )}

      {/* Receipt Modal */}
      {showRecordPaymentModal && selectedInvoiceForPayment && (
        <RecordPaymentModal
          invoice={selectedInvoiceForPayment}
          onClose={() => {
            setShowRecordPaymentModal(false);
            setSelectedInvoiceForPayment(null);
          }}
          onSubmit={handleRecordPaymentSubmit}
          loading={loading}
        />
      )}
      {showReceiptModal && receiptData && (
        <ReceiptModal
          receiptData={receiptData}
          onClose={() => {
            setShowReceiptModal(false);
            setReceiptData(null);
          }}
        />
      )}

      {/* Generate Invoice Modal */}
      {showGenerateModal && (
        <GenerateInvoiceModal
          companies={companies.filter(c => c.status === 'Active')}
          hcfs={hcfs.filter(h => h.status === 'Active')}
          onClose={() => setShowGenerateModal(false)}
          onGenerate={handleAutoGenerate}
          loading={loading}
        />
      )}

      {showGenerateWeightModal && (
        <GenerateInvoiceWeightModal
          companies={companies.filter(c => c.status === 'Active')}
          hcfs={hcfs.filter(h => h.status === 'Active')}
          onClose={() => setShowGenerateWeightModal(false)}
          onGenerate={handleWeightGenerate}
          loading={loading}
        />
      )}

      {showGenerateMonthBedModal && (
        <GenerateInvoiceMonthModal
          companies={companies.filter(c => c.status === 'Active')}
          onClose={() => setShowGenerateMonthBedModal(false)}
          onGenerate={handleMonthGenerate}
          loading={loading}
          generationMode="Bed/Lumpsum"
        />
      )}

      {showGenerateMonthWeightModal && (
        <GenerateInvoiceMonthModal
          companies={companies.filter(c => c.status === 'Active')}
          onClose={() => setShowGenerateMonthWeightModal(false)}
          onGenerate={handleMonthGenerate}
          loading={loading}
          generationMode="Weight Based"
        />
      )}

      {showDuplicateModal && duplicateInfo && (
        <DuplicateInvoiceModal
          skipped={duplicateInfo.skipped}
          onClose={() => {
            setShowDuplicateModal(false);
            setDuplicateInfo(null);
          }}
        />
      )}
    </div>
  );
};

// Generate Invoice Modal Component
interface GenerateInvoiceModalProps {
  companies: Company[];
  hcfs: HCF[];
  onClose: () => void;
  onGenerate: (data: GenerateInvoiceRequest) => void;
  loading: boolean;
}

const GenerateInvoiceModal = ({ companies, hcfs, onClose, onGenerate, loading }: GenerateInvoiceModalProps) => {
  const [formData, setFormData] = useState<GenerateInvoiceRequest>({
    companyId: '',
    billingPeriodStart: '',
    billingPeriodEnd: '',
    billingType: 'Monthly',
    dueDays: 30,
  });
  const [selectedHcfIds, setSelectedHcfIds] = useState<string[]>([]);

  const filteredHcfs = formData.companyId
    ? hcfs.filter(h => {
        const company = companies.find(c => c.id === formData.companyId);
        return company && h.companyName === company.companyName;
      })
    : hcfs;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      ...formData,
      hcfIds: selectedHcfIds.length > 0 ? selectedHcfIds : undefined,
    });
  };

  return (
    <div className="wp-modal-overlay" onClick={onClose}>
      <div className="wp-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="wp-modal-header">
          <div className="wp-modal-header-left">
            <div className="wp-modal-icon wp-modal-icon--add">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <h2 className="wp-modal-title">Auto Generate – Bed / Lumpsum</h2>
          </div>
          <button className="wp-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="wp-modal-body">
            <div className="wp-form-group">
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
                  onChange={(e) => {
                    setFormData({ ...formData, companyId: e.target.value });
                    setSelectedHcfIds([]);
                  }}
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
            </div>

            <div className="wp-form-group">
              <label htmlFor="billingPeriodStart">Billing Period Start <span className="wp-required">*</span></label>
              <div className="wp-input-wrapper">
                <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <input
                  id="billingPeriodStart"
                  type="date"
                  required
                  value={formData.billingPeriodStart}
                  onChange={(e) => setFormData({ ...formData, billingPeriodStart: e.target.value })}
                  className="wp-form-input"
                />
              </div>
            </div>

            <div className="wp-form-group">
              <label htmlFor="billingPeriodEnd">Billing Period End <span className="wp-required">*</span></label>
              <div className="wp-input-wrapper">
                <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <input
                  id="billingPeriodEnd"
                  type="date"
                  required
                  value={formData.billingPeriodEnd}
                  onChange={(e) => setFormData({ ...formData, billingPeriodEnd: e.target.value })}
                  className="wp-form-input"
                />
              </div>
            </div>

            <div className="wp-form-group">
              <label htmlFor="billingOption">Billing Option Filter</label>
              <div className="wp-input-wrapper">
                <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                <select
                  id="billingOption"
                  value={formData.billingOption || ''}
                  onChange={(e) => setFormData({ ...formData, billingOption: e.target.value as any })}
                  className="wp-form-select"
                >
                  <option value="">All Options</option>
                  <option value="Bed-wise">Bed-wise</option>
                  <option value="Weight-wise">Weight-wise</option>
                  <option value="Lumpsum">Lumpsum</option>
                </select>
                <svg className="wp-select-arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              <small style={{ display: 'block', marginTop: '3px', color: '#64748b', fontSize: '11px' }}>
                Filter HCFs by billing option (optional)
              </small>
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
                  required
                  value={formData.billingType}
                  onChange={(e) => setFormData({ ...formData, billingType: e.target.value as any })}
                  className="wp-form-select"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </select>
                <svg className="wp-select-arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
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
          <div className="wp-modal-footer">
            <button type="button" className="wp-btn wp-btn--cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="wp-btn wp-btn--save" disabled={loading}>
              {loading ? 'Generating...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Generate Invoice Weight Modal Component
interface GenerateInvoiceWeightModalProps {
  companies: Company[];
  hcfs: HCF[];
  onClose: () => void;
  onGenerate: (data: GenerateInvoiceWeightRequest) => void;
  loading: boolean;
}

const GenerateInvoiceWeightModal = ({ companies, hcfs, onClose, onGenerate, loading }: GenerateInvoiceWeightModalProps) => {
  const [formData, setFormData] = useState<GenerateInvoiceWeightRequest>({
    companyId: '',
    pickupDateFrom: '',
    pickupDateTo: '',
    billingType: 'Monthly',
    dueDays: 30,
  });
  const [selectedHcfIds, setSelectedHcfIds] = useState<string[]>([]);

  const filteredHcfs = formData.companyId
    ? hcfs.filter(h => {
        const company = companies.find(c => c.id === formData.companyId);
        return company && h.companyName === company.companyName;
      })
    : hcfs;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      ...formData,
      hcfIds: selectedHcfIds.length > 0 ? selectedHcfIds : undefined,
    });
  };

  return (
    <div className="wp-modal-overlay" onClick={onClose}>
      <div className="wp-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="wp-modal-header">
          <div className="wp-modal-header-left">
            <div className="wp-modal-icon wp-modal-icon--add">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <h2 className="wp-modal-title">Auto Generate – Weight</h2>
          </div>
          <button className="wp-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="wp-modal-body">
            <div className="wp-form-group">
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
                  onChange={(e) => {
                    setFormData({ ...formData, companyId: e.target.value });
                    setSelectedHcfIds([]);
                  }}
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
            </div>

            <div className="wp-form-group">
              <label htmlFor="pickupDateFrom">Pickup Date From <span className="wp-required">*</span></label>
              <div className="wp-input-wrapper">
                <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <input
                  id="pickupDateFrom"
                  type="date"
                  required
                  value={formData.pickupDateFrom}
                  onChange={(e) => setFormData({ ...formData, pickupDateFrom: e.target.value })}
                  className="wp-form-input"
                />
              </div>
              <small style={{ display: 'block', marginTop: '3px', color: '#64748b', fontSize: '11px' }}>
                Start date for waste transaction pickup
              </small>
            </div>

            <div className="wp-form-group">
              <label htmlFor="pickupDateTo">Pickup Date To <span className="wp-required">*</span></label>
              <div className="wp-input-wrapper">
                <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <input
                  id="pickupDateTo"
                  type="date"
                  required
                  value={formData.pickupDateTo}
                  onChange={(e) => setFormData({ ...formData, pickupDateTo: e.target.value })}
                  className="wp-form-input"
                />
              </div>
              <small style={{ display: 'block', marginTop: '3px', color: '#64748b', fontSize: '11px' }}>
                End date for waste transaction pickup
              </small>
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
                  required
                  value={formData.billingType}
                  onChange={(e) => setFormData({ ...formData, billingType: e.target.value as any })}
                  className="wp-form-select"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </select>
                <svg className="wp-select-arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
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
          <div className="wp-modal-footer">
            <button type="button" className="wp-btn wp-btn--cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="wp-btn wp-btn--save" disabled={loading}>
              {loading ? 'Generating...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
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

  // Filter HCFs based on selected company
  const filteredHCFs = formData.companyName
    ? hcfs.filter(hcf => hcf.companyName === formData.companyName)
    : hcfs;

  // Calculate invoice value when tax fields change
  const updateInvoiceValue = () => {
    const calculatedValue = calculateInvoiceValue(formData);
    setFormData({ ...formData, invoiceValue: calculatedValue });
  };

  const handleFieldChange = (field: string, value: string) => {
    const updatedData = { ...formData, [field]: value };
    
    // Auto-calculate invoice value when tax fields change
    if (['taxableValue', 'igst', 'cgst', 'sgst', 'roundOff'].includes(field)) {
      const calculatedValue = calculateInvoiceValue(updatedData);
      updatedData.invoiceValue = calculatedValue;
    }
    
    // Calculate balance amount whenever invoice value or paid amount changes
    const invoiceVal = parseFloat(updatedData.invoiceValue || '0');
    const paid = parseFloat(updatedData.totalPaidAmount || '0');
    const balance = (invoiceVal - paid).toFixed(2);
    updatedData.balanceAmount = balance;
    
    setFormData(updatedData);
  };

  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, false);
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.hcfCode) {
      alert('Please fill in all required fields');
      return;
    }
    if (window.confirm('Are you sure you want to generate this invoice? This action cannot be undone.')) {
      onSave(formData, true);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the form? All unsaved changes will be lost.')) {
      setFormData({
        companyName: '',
        hcfCode: '',
        invoiceNum: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        billingType: '',
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
      });
    }
  };

  return (
    <div className="wp-modal-overlay" onClick={onClose}>
      <div className="wp-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
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
            <h2 className="wp-modal-title">{invoice ? 'Edit Invoice' : 'Create Invoice'}</h2>
          </div>
          <button className="wp-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSaveDraft}>
          <div className="wp-modal-body">
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
                    onChange={(e) => {
                      handleFieldChange('companyName', e.target.value);
                      handleFieldChange('hcfCode', '');
                    }}
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
                <div className="wp-input-wrapper">
                  <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <select
                    id="hcfCode"
                    value={formData.hcfCode || ''}
                    onChange={(e) => handleFieldChange('hcfCode', e.target.value)}
                    required
                    disabled={!formData.companyName}
                    className="wp-form-select"
                  >
                    <option value="">Select HCF</option>
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
              </div>
            </div>

            <div className="wp-form-group">
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
                  onChange={(e) => handleFieldChange('invoiceNum', e.target.value)}
                  required
                  placeholder="e.g., INV-2024-001"
                  className="wp-form-input"
                />
              </div>
            </div>

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
                  />
                </div>
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
                    className="wp-form-input"
                  />
                </div>
              </div>
            </div>

            {/* Billing Information Section */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                BILLING INFORMATION
              </h3>
              <div className="wp-form-row">
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
                      onChange={(e) => handleFieldChange('billingType', e.target.value)}
                      required
                      className="wp-form-select"
                    >
                      <option value="">Select Billing Type</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                    <svg className="wp-select-arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>
                <div className="wp-form-group">
                  <label htmlFor="billingDays">Billing Days</label>
                  <div className="wp-input-wrapper">
                    <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <input
                      id="billingDays"
                      type="text"
                      value={formData.billingDays || ''}
                      onChange={(e) => handleFieldChange('billingDays', e.target.value)}
                      placeholder="Enter billing days"
                      className="wp-form-input"
                    />
                  </div>
                </div>
              </div>
              <div className="wp-form-row">
                <div className="wp-form-group">
                  <label htmlFor="bedCount">Bed Count</label>
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
                  <label htmlFor="bedRate">Bed Rate</label>
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
              <div className="wp-form-row">
                <div className="wp-form-group">
                  <label htmlFor="weightInKg">Weight in Kg</label>
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
                  <label htmlFor="kgRate">Kg Rate</label>
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
              <div className="wp-form-group">
                <label htmlFor="lumpsumAmount">Lumpsum Amount</label>
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

            {/* Tax & Amount Information Section */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                TAX & AMOUNT INFORMATION
              </h3>
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
                      onChange={(e) => handleFieldChange('taxableValue', e.target.value)}
                      required
                      placeholder="Enter taxable value"
                      className="wp-form-input"
                    />
                  </div>
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
                      onChange={(e) => handleFieldChange('igst', e.target.value)}
                      placeholder="Enter IGST"
                      className="wp-form-input"
                    />
                  </div>
                </div>
              </div>
              <div className="wp-form-row">
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
                      onChange={(e) => handleFieldChange('cgst', e.target.value)}
                      placeholder="Enter CGST"
                      className="wp-form-input"
                    />
                  </div>
                </div>
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
                      onChange={(e) => handleFieldChange('sgst', e.target.value)}
                      placeholder="Enter SGST"
                      className="wp-form-input"
                    />
                  </div>
                </div>
              </div>
              <div className="wp-form-row">
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
                      onChange={(e) => handleFieldChange('roundOff', e.target.value)}
                      placeholder="Enter round off"
                      className="wp-form-input"
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
              <div className="wp-form-row">
                <div className="wp-form-group">
                  <label htmlFor="totalPaidAmount">Total Paid Amount</label>
                  <div className="wp-input-wrapper">
                    <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    <input
                      id="totalPaidAmount"
                      type="text"
                      value={formData.totalPaidAmount || '0'}
                      onChange={(e) => handleFieldChange('totalPaidAmount', e.target.value)}
                      placeholder="Enter paid amount"
                      className="wp-form-input"
                    />
                  </div>
                </div>
                <div className="wp-form-group">
                  <label htmlFor="balanceAmount">Balance Amount</label>
                  <div className="wp-input-wrapper">
                    <svg className="wp-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    <input
                      id="balanceAmount"
                      type="text"
                      value={formData.balanceAmount || ''}
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

          <div className="wp-modal-footer">
            <button type="button" className="wp-btn wp-btn--cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="wp-btn wp-btn--save">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Invoice View Modal Component
interface InvoiceViewModalProps {
  invoice: Invoice;
  hcfs: HCF[];
  onClose: () => void;
  onPrint: (invoice: Invoice) => void;
}

const InvoiceViewModal = ({ invoice, hcfs, onClose, onPrint }: InvoiceViewModalProps) => {
  const hcf = hcfs.find(h => h.hcfCode === invoice.hcfCode);

  const handleAddReceipt = () => {
    alert('Add Receipt functionality will be implemented');
  };

  const handleViewReceipts = () => {
    alert('View Receipts functionality will be implemented');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--view" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Invoice Details - {invoice.invoiceNum}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="invoice-view-content">
          <div className="invoice-view-section">
            <h3 className="invoice-view-section-title">Basic Information</h3>
            <div className="invoice-view-grid">
              <div className="invoice-view-field">
                <label>Company Name:</label>
                <span>{invoice.companyName || '-'}</span>
              </div>
              <div className="invoice-view-field">
                <label>HCF Code:</label>
                <span>{hcf ? `${invoice.hcfCode} - ${hcf.hcfName}` : invoice.hcfCode}</span>
              </div>
              <div className="invoice-view-field">
                <label>Invoice Number:</label>
                <span>{invoice.invoiceNum || '-'}</span>
              </div>
              <div className="invoice-view-field">
                <label>Invoice Date:</label>
                <span>{invoice.invoiceDate || '-'}</span>
              </div>
              <div className="invoice-view-field">
                <label>Due Date:</label>
                <span>{invoice.dueDate || '-'}</span>
              </div>
              <div className="invoice-view-field">
                <label>Status:</label>
                <span className={`invoice-status-badge invoice-status-badge--${invoice.invoiceStatus.toLowerCase().replace(' ', '-')}`}>
                  {invoice.invoiceStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="invoice-view-section">
            <h3 className="invoice-view-section-title">Billing Information</h3>
            <div className="invoice-view-grid">
              <div className="invoice-view-field">
                <label>Billing Type:</label>
                <span>{invoice.billingType || '-'}</span>
              </div>
              <div className="invoice-view-field">
                <label>Billing Days:</label>
                <span>{invoice.billingDays || '-'}</span>
              </div>
              <div className="invoice-view-field">
                <label>Bed Count:</label>
                <span>{invoice.bedCount || '-'}</span>
              </div>
              <div className="invoice-view-field">
                <label>Bed Rate:</label>
                <span>₹{invoice.bedRate || '-'}</span>
              </div>
              <div className="invoice-view-field">
                <label>Weight in Kg:</label>
                <span>{invoice.weightInKg || '-'} kg</span>
              </div>
              <div className="invoice-view-field">
                <label>Kg Rate:</label>
                <span>₹{invoice.kgRate || '-'}</span>
              </div>
              <div className="invoice-view-field">
                <label>Lumpsum Amount:</label>
                <span>₹{invoice.lumpsumAmount || '-'}</span>
              </div>
            </div>
          </div>

          <div className="invoice-view-section">
            <h3 className="invoice-view-section-title">Tax & Amount Details</h3>
            <div className="invoice-view-grid">
              <div className="invoice-view-field">
                <label>Taxable Value:</label>
                <span>₹{invoice.taxableValue || '0'}</span>
              </div>
              <div className="invoice-view-field">
                <label>IGST:</label>
                <span>₹{invoice.igst || '0'}</span>
              </div>
              <div className="invoice-view-field">
                <label>CGST:</label>
                <span>₹{invoice.cgst || '0'}</span>
              </div>
              <div className="invoice-view-field">
                <label>SGST:</label>
                <span>₹{invoice.sgst || '0'}</span>
              </div>
              <div className="invoice-view-field">
                <label>Round Off:</label>
                <span>₹{invoice.roundOff || '0'}</span>
              </div>
              <div className="invoice-view-field invoice-view-field--highlight">
                <label>Invoice Value:</label>
                <span>₹{invoice.invoiceValue || '0'}</span>
              </div>
              <div className="invoice-view-field">
                <label>Total Paid Amount:</label>
                <span>₹{invoice.totalPaidAmount || '0'}</span>
              </div>
              <div className="invoice-view-field invoice-view-field--highlight">
                <label>Balance Amount:</label>
                <span>₹{invoice.balanceAmount || '0'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Back
          </button>
          {(invoice.invoiceStatus === 'Generated' || invoice.invoiceStatus === 'Partially Paid' || invoice.invoiceStatus === 'Paid') && (
            <>
              <button type="button" className="btn btn--info" onClick={handleViewReceipts}>
                View Receipts
              </button>
              <button type="button" className="btn btn--success" onClick={handleAddReceipt}>
                Add Receipt
              </button>
            </>
          )}
          <button type="button" className="btn btn--primary" onClick={() => onPrint(invoice)}>
            Print / Download PDF
          </button>
        </div>
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
  // Calculate previous month
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
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
      <div className="wp-modal-content" onClick={(e) => e.stopPropagation()}>
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
        <form onSubmit={handleSubmit}>
          <div className="wp-modal-body">
            <div className="wp-form-group">
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

            <div className="wp-form-row">
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
            </div>

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
          <div className="wp-modal-footer">
            <button type="button" className="wp-btn wp-btn--cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="wp-btn wp-btn--save" disabled={loading}>
              {loading ? 'Generating...' : `Generate Invoices (${generationMode})`}
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

// Payment Modal Component
interface PaymentModalProps {
  invoices: Invoice[];
  companies: Company[];
  onClose: () => void;
  onProcessPayment: (paymentData: CreatePaymentRequest) => void;
  loading: boolean;
}

const PaymentModal = ({ invoices, companies, onClose, onProcessPayment, loading }: PaymentModalProps) => {
  // Find company ID from first invoice
  const getCompanyId = () => {
    if (invoices.length === 0) return '';
    const firstInvoice = invoices[0];
    const company = companies.find(c => c.companyName === firstInvoice.companyName);
    return company?.id || '';
  };

  const [formData, setFormData] = useState<CreatePaymentRequest>({
    companyId: getCompanyId(),
    paymentDate: new Date().toISOString().split('T')[0],
    paymentAmount: 0,
    paymentMode: PaymentMode.CASH,
    referenceNumber: null,
    bankName: null,
    chequeNumber: null,
    chequeDate: null,
    notes: null,
    invoiceAllocations: [], // Empty for FIFO
  });

  const [allocationMode, setAllocationMode] = useState<'FIFO' | 'Manual'>('FIFO');
  const [manualAllocations, setManualAllocations] = useState<Record<string, number>>({});

  // Calculate total payable amount
  const totalPayable = invoices.reduce((sum, inv) => {
    return sum + parseFloat(inv.balanceAmount || '0');
  }, 0);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      paymentAmount: allocationMode === 'FIFO' ? totalPayable : Object.values(manualAllocations).reduce((sum, amt) => sum + amt, 0),
    }));
  }, [allocationMode, manualAllocations, totalPayable]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.paymentAmount <= 0) {
      alert('Payment amount must be greater than zero');
      return;
    }

    const paymentData: CreatePaymentRequest = {
      ...formData,
      invoiceAllocations: allocationMode === 'FIFO' 
        ? [] // Empty array triggers FIFO
        : invoices.map(inv => ({
            invoiceId: inv.id,
            allocatedAmount: manualAllocations[inv.id] || 0,
          })).filter(alloc => alloc.allocatedAmount > 0),
    };

    onProcessPayment(paymentData);
  };

  const handleManualAllocationChange = (invoiceId: string, amount: number) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    const balance = parseFloat(invoice?.balanceAmount || '0');
    const allocated = Math.min(Math.max(0, amount), balance);
    setManualAllocations(prev => ({
      ...prev,
      [invoiceId]: allocated,
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2 className="modal-title">Make Payment</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Selected Invoices Summary */}
          <div style={{ marginBottom: '20px', padding: '15px', background: '#f1f5f9', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600 }}>Selected Invoices ({invoices.length})</h3>
            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
              <table style={{ width: '100%', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Invoice #</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Invoice Value</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Paid</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td style={{ padding: '8px' }}>{inv.invoiceNum}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>₹{parseFloat(inv.invoiceValue || '0').toFixed(2)}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>₹{parseFloat(inv.totalPaidAmount || '0').toFixed(2)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>₹{parseFloat(inv.balanceAmount || '0').toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #cbd5e1', fontWeight: 600 }}>
                    <td style={{ padding: '8px' }}>Total Payable:</td>
                    <td colSpan={3} style={{ padding: '8px', textAlign: 'right' }}>₹{totalPayable.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Payment Details */}
          <div className="form-section">
            <h3 className="form-section-title">Payment Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Company *</label>
                <select
                  required
                  value={formData.companyId}
                  onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                >
                  <option value="">Select Company</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Payment Date *</label>
                <input
                  type="date"
                  required
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Payment Mode *</label>
                <select
                  required
                  value={formData.paymentMode}
                  onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as PaymentMode })}
                >
                  <option value={PaymentMode.CASH}>Cash</option>
                  <option value={PaymentMode.CHEQUE}>Cheque</option>
                  <option value={PaymentMode.BANK_TRANSFER}>Bank Transfer</option>
                  <option value={PaymentMode.UPI}>UPI</option>
                  <option value={PaymentMode.NEFT}>NEFT</option>
                  <option value={PaymentMode.RTGS}>RTGS</option>
                  <option value={PaymentMode.OTHER}>Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Payment Amount *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={formData.paymentAmount}
                  onChange={(e) => setFormData({ ...formData, paymentAmount: parseFloat(e.target.value) || 0 })}
                  disabled={allocationMode === 'FIFO'}
                />
                {allocationMode === 'FIFO' && (
                  <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                    Auto-calculated from selected invoices (FIFO allocation)
                  </small>
                )}
              </div>

              {(formData.paymentMode === PaymentMode.CHEQUE || formData.paymentMode === PaymentMode.BANK_TRANSFER || 
                formData.paymentMode === PaymentMode.NEFT || formData.paymentMode === PaymentMode.RTGS) && (
                <>
                  <div className="form-group">
                    <label>Reference Number</label>
                    <input
                      type="text"
                      value={formData.referenceNumber || ''}
                      onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value || null })}
                      placeholder="Transaction/Reference number"
                    />
                  </div>

                  {formData.paymentMode === PaymentMode.CHEQUE && (
                    <>
                      <div className="form-group">
                        <label>Bank Name</label>
                        <input
                          type="text"
                          value={formData.bankName || ''}
                          onChange={(e) => setFormData({ ...formData, bankName: e.target.value || null })}
                          placeholder="Bank name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Cheque Number</label>
                        <input
                          type="text"
                          value={formData.chequeNumber || ''}
                          onChange={(e) => setFormData({ ...formData, chequeNumber: e.target.value || null })}
                          placeholder="Cheque number"
                        />
                      </div>
                      <div className="form-group">
                        <label>Cheque Date</label>
                        <input
                          type="date"
                          value={formData.chequeDate || ''}
                          onChange={(e) => setFormData({ ...formData, chequeDate: e.target.value || null })}
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                  placeholder="Payment notes (optional)"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Allocation Mode */}
          <div className="form-section">
            <h3 className="form-section-title">Allocation Mode</h3>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="allocationMode"
                  value="FIFO"
                  checked={allocationMode === 'FIFO'}
                  onChange={(e) => setAllocationMode(e.target.value as 'FIFO' | 'Manual')}
                />
                <span>FIFO (First In, First Out) - Automatically allocate to oldest invoices first</span>
              </label>
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="allocationMode"
                  value="Manual"
                  checked={allocationMode === 'Manual'}
                  onChange={(e) => setAllocationMode(e.target.value as 'FIFO' | 'Manual')}
                />
                <span>Manual - Specify allocation amounts for each invoice</span>
              </label>
            </div>

            {allocationMode === 'Manual' && (
              <div style={{ marginTop: '15px', padding: '15px', background: '#f8fafc', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 600 }}>Manual Allocation</h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {invoices.map(inv => {
                    const balance = parseFloat(inv.balanceAmount || '0');
                    const allocated = manualAllocations[inv.id] || 0;
                    return (
                      <div key={inv.id} style={{ marginBottom: '10px', padding: '10px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>{inv.invoiceNum}</span>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>Balance: ₹{balance.toFixed(2)}</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max={balance}
                          step="0.01"
                          value={allocated}
                          onChange={(e) => handleManualAllocationChange(inv.id, parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: '10px', padding: '10px', background: '#dbeafe', borderRadius: '6px', fontSize: '12px' }}>
                  <strong>Total Allocated:</strong> ₹{Object.values(manualAllocations).reduce((sum, amt) => sum + amt, 0).toFixed(2)}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Processing...' : 'Process Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Receipt Modal Component
// Record Payment Modal - Simplified for single invoice
interface RecordPaymentModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSubmit: (data: RecordPaymentRequest) => Promise<void>;
  loading: boolean;
}

const RecordPaymentModal = ({ invoice, onClose, onSubmit, loading }: RecordPaymentModalProps) => {
  const [formData, setFormData] = useState<RecordPaymentRequest>({
    invoiceId: invoice.id,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentAmount: parseFloat(invoice.balanceAmount || '0'),
    paymentMode: PaymentMode.CASH,
    referenceNumber: null,
    bankName: null,
    chequeNumber: null,
    chequeDate: null,
    notes: null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate payment amount
    const balance = parseFloat(invoice.balanceAmount || '0');
    if (formData.paymentAmount > balance) {
      alert(`Payment amount cannot exceed invoice balance of ₹${balance.toFixed(2)}`);
      return;
    }

    if (formData.paymentAmount <= 0) {
      alert('Payment amount must be greater than zero');
      return;
    }

    await onSubmit(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Record Payment</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Invoice Summary */}
          <div style={{ marginBottom: '20px', padding: '15px', background: '#f1f5f9', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600 }}>Invoice Details</h3>
            <div style={{ fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Invoice #:</span>
                <span style={{ fontWeight: 600 }}>{invoice.invoiceNum}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Invoice Value:</span>
                <span>₹{parseFloat(invoice.invoiceValue || '0').toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Paid Amount:</span>
                <span>₹{parseFloat(invoice.totalPaidAmount || '0').toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '5px', marginTop: '5px' }}>
                <span style={{ fontWeight: 600 }}>Balance Amount:</span>
                <span style={{ fontWeight: 600, color: '#dc2626' }}>₹{parseFloat(invoice.balanceAmount || '0').toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="form-section">
            <h3 className="form-section-title">Payment Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Payment Date *</label>
                <input
                  type="date"
                  required
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Payment Mode *</label>
                <select
                  required
                  value={formData.paymentMode}
                  onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as PaymentMode })}
                >
                  <option value={PaymentMode.CASH}>Cash</option>
                  <option value={PaymentMode.CHEQUE}>Cheque</option>
                  <option value={PaymentMode.NEFT}>NEFT</option>
                  <option value={PaymentMode.RTGS}>RTGS</option>
                  <option value={PaymentMode.BANK_TRANSFER}>Bank Transfer</option>
                  <option value={PaymentMode.UPI}>UPI</option>
                  <option value={PaymentMode.OTHER}>Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Payment Amount *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  max={parseFloat(invoice.balanceAmount || '0')}
                  value={formData.paymentAmount}
                  onChange={(e) => setFormData({ ...formData, paymentAmount: parseFloat(e.target.value) || 0 })}
                />
                <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                  Maximum: ₹{parseFloat(invoice.balanceAmount || '0').toFixed(2)}
                </small>
              </div>

              {(formData.paymentMode === PaymentMode.CHEQUE || formData.paymentMode === PaymentMode.BANK_TRANSFER || 
                formData.paymentMode === PaymentMode.NEFT || formData.paymentMode === PaymentMode.RTGS) && (
                <>
                  <div className="form-group">
                    <label>Reference Number</label>
                    <input
                      type="text"
                      value={formData.referenceNumber || ''}
                      onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value || null })}
                      placeholder="Transaction/Reference number"
                    />
                  </div>

                  {formData.paymentMode === PaymentMode.CHEQUE && (
                    <>
                      <div className="form-group">
                        <label>Bank Name</label>
                        <input
                          type="text"
                          value={formData.bankName || ''}
                          onChange={(e) => setFormData({ ...formData, bankName: e.target.value || null })}
                          placeholder="Bank name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Cheque Number</label>
                        <input
                          type="text"
                          value={formData.chequeNumber || ''}
                          onChange={(e) => setFormData({ ...formData, chequeNumber: e.target.value || null })}
                          placeholder="Cheque number"
                        />
                      </div>
                      <div className="form-group">
                        <label>Cheque Date</label>
                        <input
                          type="date"
                          value={formData.chequeDate || ''}
                          onChange={(e) => setFormData({ ...formData, chequeDate: e.target.value || null })}
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                  placeholder="Payment notes (optional)"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Payment History Modal
interface PaymentHistoryModalProps {
  paymentHistory: PaymentHistoryResponse['data'];
  onClose: () => void;
}

const PaymentHistoryModal = ({ paymentHistory, onClose }: PaymentHistoryModalProps) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2 className="modal-title">Payment History</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Invoice Summary */}
          <div style={{ marginBottom: '20px', padding: '15px', background: '#f1f5f9', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 600 }}>Invoice Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '14px' }}>
              <div>
                <span style={{ color: '#64748b' }}>Invoice #:</span>
                <span style={{ marginLeft: '8px', fontWeight: 600 }}>{paymentHistory.invoiceNumber}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Invoice Value:</span>
                <span style={{ marginLeft: '8px', fontWeight: 600 }}>₹{paymentHistory.invoiceValue.toFixed(2)}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Total Paid:</span>
                <span style={{ marginLeft: '8px', fontWeight: 600, color: '#059669' }}>₹{paymentHistory.totalPaidAmount.toFixed(2)}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Balance:</span>
                <span style={{ marginLeft: '8px', fontWeight: 600, color: paymentHistory.balanceAmount > 0 ? '#dc2626' : '#059669' }}>
                  ₹{paymentHistory.balanceAmount.toFixed(2)}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Status:</span>
                <span style={{ marginLeft: '8px' }}>
                  <span className={`invoice-status-badge invoice-status-badge--${paymentHistory.status.toLowerCase().replace(' ', '-')}`}>
                    {paymentHistory.status}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Payment History Table */}
          <div>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 600 }}>Payment History ({paymentHistory.paymentHistory.length})</h3>
            {paymentHistory.paymentHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                No payments recorded yet
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Payment Date</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Mode</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Reference</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Receipt #</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.paymentHistory.map((payment) => (
                    <tr key={payment.paymentId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px' }}>{payment.paymentDate}</td>
                      <td style={{ padding: '12px' }}>{payment.paymentMode}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>
                        ₹{payment.allocatedAmount.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', color: '#64748b' }}>
                        {payment.referenceNumber || '-'}
                      </td>
                      <td style={{ padding: '12px', color: '#3b82f6' }}>
                        {payment.receiptNumber || '-'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          background: payment.status === 'Completed' ? '#d1fae5' : '#fef3c7',
                          color: payment.status === 'Completed' ? '#065f46' : '#92400e'
                        }}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

interface ReceiptModalProps {
  receiptData: any;
  onClose: () => void;
}

const ReceiptModal = ({ receiptData, onClose }: ReceiptModalProps) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Payment Receipt</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px', padding: '20px', background: '#f1f5f9', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>Payment Receipt</h3>
            <p style={{ margin: '0', fontSize: '18px', fontWeight: 600, color: '#059669' }}>
              Receipt #: {receiptData.receiptNumber}
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ fontWeight: 600 }}>Receipt Date:</span>
              <span>{receiptData.receiptDate}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ fontWeight: 600 }}>Total Amount:</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#059669' }}>₹{receiptData.totalAmount.toFixed(2)}</span>
            </div>
            {receiptData.payment && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontWeight: 600 }}>Payment Mode:</span>
                  <span>{receiptData.payment.paymentMode}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontWeight: 600 }}>Payment Date:</span>
                  <span>{receiptData.payment.paymentDate}</span>
                </div>
              </>
            )}
          </div>

          {receiptData.invoices && receiptData.invoices.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600 }}>Invoices Paid:</h4>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Invoice #</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptData.invoices.map((inv: any, index: number) => (
                    <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px' }}>{inv.invoiceNumber}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>₹{inv.allocatedAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: '30px', padding: '15px', background: '#dbeafe', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ margin: '0', fontSize: '14px', color: '#1e40af' }}>
              Payment processed successfully! Receipt number: <strong>{receiptData.receiptNumber}</strong>
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn--primary" onClick={onClose}>Close</button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => window.print()}
            style={{ marginLeft: '10px' }}
          >
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

// Advanced Filters Modal Component
interface AdvancedFiltersModalProps {
  statusFilter: string;
  advancedFilters: AdvancedFilters;
  companies: Company[];
  hcfs: HCF[];
  onClose: () => void;
  onClear: () => void;
  onApply: (payload: { statusFilter: string; advancedFilters: AdvancedFilters }) => void;
}

const AdvancedFiltersModal = ({
  statusFilter,
  advancedFilters,
  companies,
  hcfs,
  onClose,
  onClear,
  onApply,
}: AdvancedFiltersModalProps) => {
  const [draftStatus, setDraftStatus] = useState(statusFilter);
  const [draft, setDraft] = useState<AdvancedFilters>(advancedFilters);

  return (
    <div className="modal-overlay ra-filter-modal-overlay" onClick={onClose}>
      <div className="modal-content ra-filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ra-filter-modal-header">
          <div className="ra-filter-modal-titlewrap">
            <div className="ra-filter-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 3H2l8 9v7l4 2v-9l8-9z"></path>
              </svg>
            </div>
            <div>
              <div className="ra-filter-title">Advanced Filters</div>
              <div className="ra-filter-subtitle">Filter invoices by multiple criteria</div>
            </div>
          </div>
          <button className="ra-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="ra-filter-modal-body">
          <div className="ra-filter-grid">
            <div className="ra-filter-field">
              <label>Invoice Number</label>
              <input
                type="text"
                value={draft.invoiceNum}
                onChange={(e) => setDraft({ ...draft, invoiceNum: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter invoice number"
              />
            </div>

            <div className="ra-filter-field">
              <label>Company Name</label>
              <select
                value={draft.companyName}
                onChange={(e) => setDraft({ ...draft, companyName: e.target.value })}
                className="ra-filter-select"
              >
                <option value="">All Companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.companyName}>
                    {company.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div className="ra-filter-field">
              <label>HCF Code</label>
              <select
                value={draft.hcfCode}
                onChange={(e) => setDraft({ ...draft, hcfCode: e.target.value })}
                className="ra-filter-select"
              >
                <option value="">All HCFs</option>
                {hcfs.map((hcf) => (
                  <option key={hcf.id} value={hcf.hcfCode}>
                    {hcf.hcfCode} - {hcf.hcfName}
                  </option>
                ))}
              </select>
            </div>

            <div className="ra-filter-field">
              <label>Invoice Date</label>
              <input
                type="date"
                value={draft.invoiceDate}
                onChange={(e) => setDraft({ ...draft, invoiceDate: e.target.value })}
                className="ra-filter-input"
              />
            </div>

            <div className="ra-filter-field">
              <label>Due Date</label>
              <input
                type="date"
                value={draft.dueDate}
                onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
                className="ra-filter-input"
              />
            </div>

            <div className="ra-filter-field">
              <label>Status</label>
              <select
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value)}
                className="ra-filter-select"
              >
                <option value="All">All Status</option>
                <option value="Draft">Draft</option>
                <option value="Generated">DUE</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="ra-filter-modal-footer">
          <button
            type="button"
            className="ra-link-btn"
            onClick={() => {
              setDraftStatus('All');
              setDraft({ invoiceNum: '', companyName: '', hcfCode: '', invoiceDate: '', dueDate: '', status: '' });
              onClear();
            }}
          >
            Clear Filters
          </button>
          <button
            type="button"
            className="ra-btn ra-btn--primary ra-btn--sm"
            onClick={() =>
              onApply({
                statusFilter: draftStatus,
                advancedFilters: draft,
              })
            }
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceManagementPage;
