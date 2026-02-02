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

const InvoiceManagementPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
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
    const matchesSearch = 
      invoice.invoiceNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.hcfCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hcfs.find(h => h.hcfCode === invoice.hcfCode)?.hcfName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || invoice.invoiceStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
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

  const handlePrint = (invoice: Invoice) => {
    window.print();
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
      if (result.summary.success > 0) {
        setSuccessMessage(
          `Generated ${result.summary.success} invoice(s) successfully. ${result.summary.failed} failed.`
        );
      }
      if (result.failed.length > 0) {
        const failedMessages = result.failed.map(f => `${f.hcfCode}: ${f.reason}`).join(', ');
        setError(`Some invoices failed: ${failedMessages}`);
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
        <header className="dashboard-header">
          <div className="header-left">
            <span className="breadcrumb">/ Finance / Invoice Management</span>
          </div>
        </header>

        <div className="invoice-management-page">
          <div className="invoice-management-header">
            <h1 className="invoice-management-title">Invoice Management</h1>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="alert alert-error" style={{ margin: '16px', padding: '12px', background: '#fee', color: '#c33', borderRadius: '4px' }}>
              {error}
              <button onClick={() => setError(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>
          )}
          {successMessage && (
            <div className="alert alert-success" style={{ margin: '16px', padding: '12px', background: '#efe', color: '#3c3', borderRadius: '4px' }}>
              {successMessage}
              <button onClick={() => setSuccessMessage(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>
          )}

          <div className="invoice-management-actions">
            <div className="invoice-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="invoice-search-input"
                placeholder="Search Invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="status-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Generated">DUE</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Paid</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <button className="export-btn" onClick={handleExport} disabled={loading}>
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
            <button className="add-invoice-btn" onClick={handleCreate} disabled={loading}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Create Invoice
            </button>
          </div>

          {loading && !invoices.length && (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading invoices...</div>
          )}

          <div className="invoice-table-container">
            <table className="invoice-table">
              <thead>
                <tr>
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
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="empty-message">
                      No invoice records found
                    </td>
                  </tr>
                ) : (
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
                )}
              </tbody>
            </table>
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
          
          <div className="invoice-pagination-info" style={{ marginBottom: selectedInvoiceIds.size > 0 ? '80px' : '0' }}>
            Showing {filteredInvoices.length} of {invoices.length} Items
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Auto Generate Invoices</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Company *</label>
            <select
              required
              value={formData.companyId}
              onChange={(e) => {
                setFormData({ ...formData, companyId: e.target.value });
                setSelectedHcfIds([]);
              }}
            >
              <option value="">Select Company</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>HCFs (Optional - Leave empty for all)</label>
            <select
              multiple
              value={selectedHcfIds}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                setSelectedHcfIds(values);
              }}
              style={{ minHeight: '100px' }}
            >
              {filteredHcfs.map(h => (
                <option key={h.id} value={h.id}>{h.hcfCode} - {h.hcfName}</option>
              ))}
            </select>
            <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
              Hold Ctrl (Windows) or Cmd (Mac) to select multiple HCFs
            </small>
          </div>

          <div className="form-group">
            <label>Billing Period Start *</label>
            <input
              type="date"
              required
              value={formData.billingPeriodStart}
              onChange={(e) => setFormData({ ...formData, billingPeriodStart: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Billing Period End *</label>
            <input
              type="date"
              required
              value={formData.billingPeriodEnd}
              onChange={(e) => setFormData({ ...formData, billingPeriodEnd: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Billing Option Filter</label>
            <select
              value={formData.billingOption || ''}
              onChange={(e) => setFormData({ ...formData, billingOption: e.target.value as any })}
            >
              <option value="">All Options</option>
              <option value="Bed-wise">Bed-wise</option>
              <option value="Weight-wise">Weight-wise</option>
              <option value="Lumpsum">Lumpsum</option>
            </select>
            <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
              Filter HCFs by billing option (optional)
            </small>
          </div>

          <div className="form-group">
            <label>Billing Type *</label>
            <select
              required
              value={formData.billingType}
              onChange={(e) => setFormData({ ...formData, billingType: e.target.value as any })}
            >
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>

          <div className="form-group">
            <label>Due Days (from invoice date)</label>
            <input
              type="number"
              min="1"
              value={formData.dueDays || 30}
              onChange={(e) => setFormData({ ...formData, dueDays: parseInt(e.target.value) || 30 })}
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Generating...' : 'Generate Invoices'}
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Generate Invoice (Weight-Based)</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Company *</label>
            <select
              required
              value={formData.companyId}
              onChange={(e) => {
                setFormData({ ...formData, companyId: e.target.value });
                setSelectedHcfIds([]);
              }}
            >
              <option value="">Select Company</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>HCFs (Optional - Leave empty for all)</label>
            <select
              multiple
              value={selectedHcfIds}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                setSelectedHcfIds(values);
              }}
              style={{ minHeight: '100px' }}
            >
              {filteredHcfs.map(h => (
                <option key={h.id} value={h.id}>{h.hcfCode} - {h.hcfName}</option>
              ))}
            </select>
            <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
              Hold Ctrl (Windows) or Cmd (Mac) to select multiple HCFs
            </small>
          </div>

          <div className="form-group">
            <label>Pickup Date From *</label>
            <input
              type="date"
              required
              value={formData.pickupDateFrom}
              onChange={(e) => setFormData({ ...formData, pickupDateFrom: e.target.value })}
            />
            <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
              Start date for waste transaction pickup
            </small>
          </div>

          <div className="form-group">
            <label>Pickup Date To *</label>
            <input
              type="date"
              required
              value={formData.pickupDateTo}
              onChange={(e) => setFormData({ ...formData, pickupDateTo: e.target.value })}
            />
            <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
              End date for waste transaction pickup
            </small>
          </div>

          <div className="form-group">
            <label>Billing Type *</label>
            <select
              required
              value={formData.billingType}
              onChange={(e) => setFormData({ ...formData, billingType: e.target.value as any })}
            >
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>

          <div className="form-group">
            <label>Due Days (from invoice date)</label>
            <input
              type="number"
              min="1"
              value={formData.dueDays || 30}
              onChange={(e) => setFormData({ ...formData, dueDays: parseInt(e.target.value) || 30 })}
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Generating...' : 'Generate Invoices (Weight-Based)'}
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{invoice ? 'Edit Invoice' : 'Create Invoice'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="invoice-form" onSubmit={handleSaveDraft}>
          {/* Basic Information */}
          <div className="form-section">
            <h3 className="form-section-title">Basic Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Company Name *</label>
                <select
                  value={formData.companyName || ''}
                  onChange={(e) => {
                    handleFieldChange('companyName', e.target.value);
                    handleFieldChange('hcfCode', '');
                  }}
                  required
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
                <label>HCF Code *</label>
                <select
                  value={formData.hcfCode || ''}
                  onChange={(e) => handleFieldChange('hcfCode', e.target.value)}
                  required
                  disabled={!formData.companyName}
                >
                  <option value="">Select HCF</option>
                  {filteredHCFs.map((hcf) => (
                    <option key={hcf.id} value={hcf.hcfCode}>
                      {hcf.hcfCode} - {hcf.hcfName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Invoice Number *</label>
                <input
                  type="text"
                  value={formData.invoiceNum || ''}
                  onChange={(e) => handleFieldChange('invoiceNum', e.target.value)}
                  required
                  placeholder="e.g., INV-2024-001"
                />
              </div>
              <div className="form-group">
                <label>Invoice Date *</label>
                <input
                  type="date"
                  value={formData.invoiceDate || ''}
                  onChange={(e) => handleFieldChange('invoiceDate', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Due Date *</label>
                <input
                  type="date"
                  value={formData.dueDate || ''}
                  onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Billing Information */}
          <div className="form-section">
            <h3 className="form-section-title">Billing Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Billing Type *</label>
                <select
                  value={formData.billingType || ''}
                  onChange={(e) => handleFieldChange('billingType', e.target.value)}
                  required
                >
                  <option value="">Select Billing Type</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
              <div className="form-group">
                <label>Billing Days</label>
                <input
                  type="text"
                  value={formData.billingDays || ''}
                  onChange={(e) => handleFieldChange('billingDays', e.target.value)}
                  placeholder="Enter billing days"
                />
              </div>
              <div className="form-group">
                <label>Bed Count</label>
                <input
                  type="text"
                  value={formData.bedCount || ''}
                  onChange={(e) => handleFieldChange('bedCount', e.target.value)}
                  placeholder="Enter bed count"
                />
              </div>
              <div className="form-group">
                <label>Bed Rate</label>
                <input
                  type="text"
                  value={formData.bedRate || ''}
                  onChange={(e) => handleFieldChange('bedRate', e.target.value)}
                  placeholder="Enter bed rate"
                />
              </div>
              <div className="form-group">
                <label>Weight in Kg</label>
                <input
                  type="text"
                  value={formData.weightInKg || ''}
                  onChange={(e) => handleFieldChange('weightInKg', e.target.value)}
                  placeholder="Enter weight in kg"
                />
              </div>
              <div className="form-group">
                <label>Kg Rate</label>
                <input
                  type="text"
                  value={formData.kgRate || ''}
                  onChange={(e) => handleFieldChange('kgRate', e.target.value)}
                  placeholder="Enter kg rate"
                />
              </div>
              <div className="form-group">
                <label>Lumpsum Amount</label>
                <input
                  type="text"
                  value={formData.lumpsumAmount || ''}
                  onChange={(e) => handleFieldChange('lumpsumAmount', e.target.value)}
                  placeholder="Enter lumpsum amount"
                />
              </div>
            </div>
          </div>

          {/* Tax & Amount Information */}
          <div className="form-section">
            <h3 className="form-section-title">Tax & Amount Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Taxable Value *</label>
                <input
                  type="text"
                  value={formData.taxableValue || ''}
                  onChange={(e) => handleFieldChange('taxableValue', e.target.value)}
                  required
                  placeholder="Enter taxable value"
                />
              </div>
              <div className="form-group">
                <label>IGST</label>
                <input
                  type="text"
                  value={formData.igst || ''}
                  onChange={(e) => handleFieldChange('igst', e.target.value)}
                  placeholder="Enter IGST"
                />
              </div>
              <div className="form-group">
                <label>CGST</label>
                <input
                  type="text"
                  value={formData.cgst || ''}
                  onChange={(e) => handleFieldChange('cgst', e.target.value)}
                  placeholder="Enter CGST"
                />
              </div>
              <div className="form-group">
                <label>SGST</label>
                <input
                  type="text"
                  value={formData.sgst || ''}
                  onChange={(e) => handleFieldChange('sgst', e.target.value)}
                  placeholder="Enter SGST"
                />
              </div>
              <div className="form-group">
                <label>Round Off</label>
                <input
                  type="text"
                  value={formData.roundOff || '0'}
                  onChange={(e) => handleFieldChange('roundOff', e.target.value)}
                  placeholder="Enter round off"
                />
              </div>
              <div className="form-group">
                <label>Invoice Value</label>
                <input
                  type="text"
                  value={formData.invoiceValue || ''}
                  readOnly
                  style={{ backgroundColor: '#f1f5f9', fontWeight: '600' }}
                  placeholder="Auto-calculated"
                />
              </div>
              <div className="form-group">
                <label>Total Paid Amount</label>
                <input
                  type="text"
                  value={formData.totalPaidAmount || '0'}
                  onChange={(e) => handleFieldChange('totalPaidAmount', e.target.value)}
                  placeholder="Enter paid amount"
                />
              </div>
              <div className="form-group">
                <label>Balance Amount</label>
                <input
                  type="text"
                  value={formData.balanceAmount || ''}
                  readOnly
                  style={{ backgroundColor: '#f1f5f9', fontWeight: '600' }}
                  placeholder="Auto-calculated"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={handleReset}>
              Reset
            </button>
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Save Draft
            </button>
            <button type="button" className="btn btn--success" onClick={handleGenerate}>
              Generate Invoice
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Auto Generate Invoices ({generationMode})</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
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
            <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
              Note: Only HCFs with AutoGeneration enabled will be included
            </small>
          </div>

          <div className="form-group">
            <label>Month *</label>
            <select
              required
              value={formData.month}
              onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
            >
              {monthNames.map((name, index) => (
                <option key={index + 1} value={index + 1} disabled={index + 1 !== previousMonth}>
                  {name} {index + 1 === previousMonth ? '(Previous Month)' : ''}
                </option>
              ))}
            </select>
            <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
              Only previous month ({monthNames[previousMonth - 1]} {previousYear}) can be selected
            </small>
          </div>

          <div className="form-group">
            <label>Year *</label>
            <input
              type="number"
              required
              min="2000"
              max="2100"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              disabled
            />
            <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
              Year is automatically set to previous month's year
            </small>
          </div>

          <div className="form-group">
            <label>Invoice Date *</label>
            <input
              type="date"
              required
              value={formData.invoiceDate}
              onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
            />
            <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
              Enter the invoice date
            </small>
          </div>

          <div className="form-group">
            <label>Due Days (from invoice date)</label>
            <input
              type="number"
              min="1"
              value={formData.dueDays || 30}
              onChange={(e) => setFormData({ ...formData, dueDays: parseInt(e.target.value) || 30 })}
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
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

export default InvoiceManagementPage;
