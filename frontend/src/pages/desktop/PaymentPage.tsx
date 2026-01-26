import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  processPayment,
  getReceipt,
  PaymentMode,
  CreatePaymentRequest,
  ProcessPaymentResponse,
} from '../../services/paymentService';
import { getInvoices, InvoiceResponse } from '../../services/invoiceService';
import { companyService, CompanyResponse } from '../../services/companyService';
import './paymentPage.css';

interface Invoice extends Partial<InvoiceResponse> {
  id: string;
  companyName?: string;
  hcfCode?: string;
  invoiceNum: string;
  invoiceStatus: 'Draft' | 'Generated' | 'Partially Paid' | 'Paid' | 'Cancelled';
  balanceAmount?: string | number;
  totalPaidAmount?: string | number;
  invoiceValue?: string | number;
}

const PaymentPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceIdsParam = searchParams.get('invoices') || '';
  const invoiceIds = invoiceIdsParam.split(',').filter(id => id);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreatePaymentRequest>({
    companyId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentAmount: 0,
    paymentMode: PaymentMode.CASH,
    referenceNumber: null,
    bankName: null,
    chequeNumber: null,
    chequeDate: null,
    notes: null,
    invoiceAllocations: [],
  });

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const paymentAmountRef = useRef<number>(0);
  const paymentAmountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [invoiceIdsParam]);

  const loadData = async () => {
    if (invoiceIds.length === 0) {
      setError('No invoices selected');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Load companies
      const companiesData = await companyService.getAllCompanies();
      setCompanies(companiesData.filter(c => c.status === 'Active'));

      // Load invoices
      const allInvoices = await getInvoices();
      const selectedInvoices = allInvoices.filter(inv => invoiceIds.includes(inv.invoiceId));
      
      if (selectedInvoices.length === 0) {
        setError('Selected invoices not found');
        return;
      }

      // Map to Invoice interface
      const mappedInvoices: Invoice[] = selectedInvoices.map(inv => ({
        id: inv.invoiceId,
        invoiceId: inv.invoiceId,
        companyId: inv.companyId,
        companyName: inv.companyName,
        hcfId: inv.hcfId,
        hcfCode: inv.hcfCode,
        invoiceNum: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        invoiceValue: inv.invoiceValue,
        totalPaidAmount: inv.totalPaidAmount,
        balanceAmount: inv.balanceAmount,
        invoiceStatus: inv.status as any,
      }));

      setInvoices(mappedInvoices);

      // Set company ID from first invoice
      if (mappedInvoices.length > 0 && mappedInvoices[0].companyId) {
        setFormData(prev => ({ ...prev, companyId: mappedInvoices[0].companyId! }));
      }

      // Calculate total payable (FIFO mode)
      const totalPayable = mappedInvoices.reduce((sum, inv) => sum + parseFloat(inv.balanceAmount || '0'), 0);
      paymentAmountRef.current = totalPayable;
      setFormData(prev => ({ ...prev, paymentAmount: totalPayable }));
    } catch (err: any) {
      console.error('Error loading data:', err);
      let errorMessage = 'Failed to load invoice data';
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      // Check for internal server error
      if (errorMessage.includes('Internal server error') || errorMessage.includes('500')) {
        errorMessage = 'Internal server error. Please check the backend logs or try again later.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const totalPayable = invoices.reduce((sum, inv) => sum + parseFloat(inv.balanceAmount || '0'), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Read payment amount directly from input field to get the most current value
    let currentAmount = 0;
    if (paymentAmountInputRef.current) {
      const inputValue = paymentAmountInputRef.current.value;
      currentAmount = inputValue ? parseFloat(inputValue) : 0;
    }
    
    // Fallback to ref, then formData
    if (!currentAmount || currentAmount <= 0) {
      currentAmount = paymentAmountRef.current > 0 ? paymentAmountRef.current : formData.paymentAmount;
    }
    
    currentAmount = Number(currentAmount);
    
    console.log('=== Form Submit Debug ===');
    console.log('Input Field Value:', paymentAmountInputRef.current?.value);
    console.log('Payment Amount Ref:', paymentAmountRef.current);
    console.log('Form Data Payment Amount:', formData.paymentAmount);
    console.log('Current Amount:', currentAmount);
    
    // Validate payment amount
    if (currentAmount > totalPayable) {
      setError(`Payment amount (₹${currentAmount.toFixed(2)}) cannot exceed total payable (₹${totalPayable.toFixed(2)})`);
      return;
    }

    if (currentAmount <= 0 || isNaN(currentAmount)) {
      setError('Payment amount must be greater than zero');
      // Auto-fill with total payable if empty
      currentAmount = totalPayable;
      paymentAmountRef.current = totalPayable;
      setFormData(prev => ({ ...prev, paymentAmount: totalPayable }));
      if (paymentAmountInputRef.current) {
        paymentAmountInputRef.current.value = totalPayable.toString();
      }
      return;
    }

    // Ensure paymentAmount is set correctly in all places before showing modal
    paymentAmountRef.current = currentAmount;
    setFormData(prev => ({ 
      ...prev, 
      paymentAmount: currentAmount 
    }));
    if (paymentAmountInputRef.current) {
      paymentAmountInputRef.current.value = currentAmount.toString();
    }

    // Show confirmation modal
    setShowConfirmationModal(true);
  };

  const handleConfirmPayment = async () => {
    setShowConfirmationModal(false);
    setIsSubmitting(true);
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Read payment amount directly from input field to avoid stale state
      let paymentAmount = 0;
      if (paymentAmountInputRef.current) {
        const inputValue = paymentAmountInputRef.current.value;
        paymentAmount = inputValue ? parseFloat(inputValue) : 0;
        console.log('Reading from input field:', inputValue, '->', paymentAmount);
      }
      
      // Fallback to ref, then formData
      if (!paymentAmount || paymentAmount <= 0) {
        paymentAmount = paymentAmountRef.current > 0 ? paymentAmountRef.current : formData.paymentAmount;
        console.log('Using fallback - Ref:', paymentAmountRef.current, 'FormData:', formData.paymentAmount);
      }
      
      paymentAmount = Number(paymentAmount);
      
      console.log('=== Payment Processing Debug ===');
      console.log('Input Field Value:', paymentAmountInputRef.current?.value);
      console.log('Payment Amount Ref:', paymentAmountRef.current);
      console.log('Form Data Payment Amount:', formData.paymentAmount);
      console.log('Final Payment Amount:', paymentAmount);
      console.log('Total Payable:', totalPayable);
      
      // Validate payment amount before sending
      if (!paymentAmount || paymentAmount <= 0 || isNaN(paymentAmount)) {
        setError(`Invalid payment amount: ${paymentAmount}. Please enter a valid amount greater than zero.`);
        setIsSubmitting(false);
        setLoading(false);
        return;
      }

      if (paymentAmount > totalPayable) {
        setError(`Payment amount (₹${paymentAmount.toFixed(2)}) cannot exceed total payable (₹${totalPayable.toFixed(2)})`);
        setIsSubmitting(false);
        setLoading(false);
        return;
      }

      // FIFO allocation - send invoice IDs with 0 allocatedAmount to indicate FIFO
      // The backend will use these invoice IDs for FIFO allocation
      const invoiceAllocations = invoices.map(inv => ({
        invoiceId: inv.id,
        allocatedAmount: 0, // 0 indicates FIFO allocation
      }));

      // Create a fresh object to ensure all values are current
      const paymentRequest: CreatePaymentRequest = {
        companyId: formData.companyId || '',
        paymentDate: formData.paymentDate || new Date().toISOString().split('T')[0],
        paymentAmount: paymentAmount, // Use the validated amount - ensure it's a number
        paymentMode: formData.paymentMode || PaymentMode.CASH,
        referenceNumber: formData.referenceNumber || null,
        bankName: formData.bankName || null,
        chequeNumber: formData.chequeNumber || null,
        chequeDate: formData.chequeDate || null,
        notes: formData.notes || null,
        invoiceAllocations: invoiceAllocations, // Send invoice IDs for FIFO allocation
      };

      // Triple-check paymentAmount is a valid number before sending
      const finalPaymentAmount = Number(paymentRequest.paymentAmount);
      if (!finalPaymentAmount || finalPaymentAmount <= 0 || isNaN(finalPaymentAmount)) {
        console.error('=== PAYMENT AMOUNT VALIDATION FAILED ===');
        console.error('Payment Request:', paymentRequest);
        console.error('Payment Amount:', paymentRequest.paymentAmount);
        console.error('Final Payment Amount:', finalPaymentAmount);
        setError(`Invalid payment amount: ${paymentRequest.paymentAmount}. Cannot proceed. Please check the amount and try again.`);
        setIsSubmitting(false);
        setLoading(false);
        return;
      }

      // Update paymentAmount one more time to be absolutely sure
      paymentRequest.paymentAmount = finalPaymentAmount;

      console.log('=== Final Payment Request ===');
      console.log('Payment Request Object:', paymentRequest);
      console.log('Payment Amount Type:', typeof paymentRequest.paymentAmount);
      console.log('Payment Amount Value:', paymentRequest.paymentAmount);
      console.log('Payment Amount is Number?', !isNaN(paymentRequest.paymentAmount));
      console.log('JSON Stringified:', JSON.stringify(paymentRequest, null, 2));
      console.log('JSON paymentAmount value:', JSON.stringify(paymentRequest).match(/"paymentAmount":\s*([^,}]+)/));

      const result = await processPayment(paymentRequest);
      
      // Navigate to success screen with payment details
      // Note: apiRequest already extracts the 'data' property, so result is the inner data object
      navigate('/finance/payment-success', {
        state: {
          receiptNumber: result.receipt.receiptNumber,
          receiptId: result.receipt.receiptId,
          totalAmount: result.receipt.totalAmount,
          receiptDate: result.receipt.receiptDate,
          invoiceUpdates: result.invoiceUpdates,
        }
      });
    } catch (err: any) {
      console.error('Error processing payment:', err);
      let errorMessage = 'Failed to process payment';
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      // Check for internal server error
      if (errorMessage.includes('Internal server error') || errorMessage.includes('500')) {
        errorMessage = 'Internal server error. Please check the backend logs or try again later.';
      }
      setError(errorMessage);
      setIsSubmitting(false);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/finance/invoice-management');
  };

  if (invoiceIds.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>No invoices selected</h2>
        <p>Please select invoices from the Invoice Management page.</p>
        <button onClick={handleBack} style={{ marginTop: '20px', padding: '10px 20px' }}>
          Back to Invoice Management
        </button>
      </div>
    );
  }

  return (
    <div className="payment-page" style={{ 
      minHeight: '100vh', 
      background: '#F8FAFC', 
      padding: '24px',
      display: 'flex',
      justifyContent: 'center'
    }}>
      <div style={{ 
        maxWidth: '950px', 
        width: '100%',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px',
          marginBottom: '32px'
        }}>
          <button 
            onClick={handleBack} 
            style={{ 
              padding: '8px 16px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F1F5F9';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.borderColor = '#E2E8F0';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Back
          </button>
          <h1 style={{ 
            margin: 0, 
            fontSize: '24px', 
            fontWeight: 600, 
            color: '#1F2937' 
          }}>
            Process Payment
          </h1>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="alert alert-error" style={{ 
            marginBottom: '24px', 
            padding: '12px 16px', 
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            color: '#DC2626'
          }}>
            {error}
            <button 
              onClick={() => setError(null)} 
              style={{ 
                float: 'right', 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                fontSize: '18px',
                color: '#DC2626',
                padding: '0',
                marginLeft: '12px'
              }}
            >
              ×
            </button>
          </div>
        )}

        {successMessage && (
          <div className="alert alert-success" style={{ 
            marginBottom: '24px', 
            padding: '12px 16px',
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '8px',
            color: '#059669'
          }}>
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Selected Invoices Section - Payment Context */}
          <div style={{ 
            marginBottom: '32px', 
            padding: '20px', 
            background: '#F1F5F9', 
            borderRadius: '8px',
            borderLeft: '4px solid #10b981'
          }}>
            <h3 style={{ 
              margin: '0 0 16px 0', 
              fontSize: '16px', 
              fontWeight: 600,
              color: '#1F2937'
            }}>
              Selected Invoices ({invoices.length})
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '12px',
              marginBottom: '16px'
            }}>
              {invoices.map(inv => (
                <div key={inv.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  padding: '12px',
                  background: '#FFFFFF',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0'
                }}>
                  <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 500 }}>
                    Invoice #
                  </div>
                  <div style={{ fontSize: '14px', color: '#1F2937', fontWeight: 600, textAlign: 'right' }}>
                    {inv.invoiceNum}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 500 }}>
                    Balance
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#059669', 
                    fontWeight: 700, 
                    textAlign: 'right' 
                  }}>
                    ₹{parseFloat(inv.balanceAmount || '0').toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{
              padding: '16px',
              background: '#FFFFFF',
              borderRadius: '6px',
              border: '2px solid #10b981',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ 
                fontSize: '16px', 
                fontWeight: 600, 
                color: '#1F2937' 
              }}>
                Total Payable:
              </span>
              <span style={{ 
                fontSize: '24px', 
                fontWeight: 700, 
                color: '#059669',
                letterSpacing: '-0.02em'
              }}>
                ₹{totalPayable.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Details Section */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ 
              marginBottom: '20px', 
              fontSize: '18px', 
              fontWeight: 600,
              color: '#1F2937'
            }}>
              Payment Details
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '20px'
            }}>
              {/* Row 1: Company | Payment Date */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: 500,
                  color: '#374151'
                }}>
                  Company *
                </label>
                <input
                  type="text"
                  value={companies.find(c => c.id === formData.companyId)?.companyName || ''}
                  readOnly
                  disabled
                  style={{ 
                    width: '100%',
                    padding: '10px 12px',
                    background: '#F3F4F6', 
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    cursor: 'not-allowed',
                    fontSize: '14px',
                    color: '#6B7280'
                  }}
                />
                <small style={{ 
                  display: 'block', 
                  marginTop: '6px', 
                  color: '#6B7280', 
                  fontSize: '12px',
                  fontStyle: 'italic'
                }}>
                  Company is derived from selected invoices
                </small>
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: 500,
                  color: '#374151'
                }}>
                  Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.paymentDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#1F2937'
                  }}
                />
              </div>

              {/* Row 2: Payment Mode | Payment Amount */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: 500,
                  color: '#374151'
                }}>
                  Payment Mode *
                </label>
                <select
                  required
                  value={formData.paymentMode}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentMode: e.target.value as PaymentMode }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#1F2937',
                    background: '#FFFFFF',
                    cursor: 'pointer'
                  }}
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

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: 500,
                  color: '#374151'
                }}>
                  Payment Amount *
                </label>
                <input
                  ref={paymentAmountInputRef}
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  max={totalPayable}
                  value={formData.paymentAmount > 0 ? formData.paymentAmount : ''}
                  onChange={(e) => {
                    const inputValue = e.target.value.trim();
                    if (inputValue === '') {
                      setFormData(prev => ({ ...prev, paymentAmount: 0 }));
                      setError(null);
                      return;
                    }
                    const amount = parseFloat(inputValue);
                    if (isNaN(amount)) {
                      setFormData(prev => ({ ...prev, paymentAmount: 0 }));
                      return;
                    }
                    if (amount < 0) {
                      setFormData(prev => ({ ...prev, paymentAmount: 0 }));
                      return;
                    }
                    if (amount > totalPayable) {
                      setError(`Payment amount cannot exceed total payable of ₹${totalPayable.toFixed(2)}`);
                    } else {
                      setError(null);
                    }
                    paymentAmountRef.current = amount;
                    setFormData(prev => ({ ...prev, paymentAmount: amount }));
                    console.log('Payment amount updated to:', amount); // Debug log
                  }}
                  onBlur={(e) => {
                    const inputValue = e.target.value.trim();
                    if (inputValue === '') {
                      paymentAmountRef.current = totalPayable;
                      setFormData(prev => ({ ...prev, paymentAmount: totalPayable }));
                      return;
                    }
                    const amount = parseFloat(inputValue);
                    if (isNaN(amount) || amount <= 0) {
                      paymentAmountRef.current = totalPayable;
                      setFormData(prev => ({ ...prev, paymentAmount: totalPayable }));
                    } else {
                      paymentAmountRef.current = amount;
                      setFormData(prev => ({ ...prev, paymentAmount: amount }));
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #10b981',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#1F2937',
                    background: '#FFFFFF'
                  }}
                />
                <small style={{ 
                  display: 'block', 
                  marginTop: '6px', 
                  color: '#6B7280', 
                  fontSize: '12px'
                }}>
                  Maximum: ₹{totalPayable.toFixed(2)} (supports partial payments)
                </small>
              </div>

              {(formData.paymentMode === PaymentMode.CHEQUE || formData.paymentMode === PaymentMode.BANK_TRANSFER || 
                formData.paymentMode === PaymentMode.NEFT || formData.paymentMode === PaymentMode.RTGS) && (
                <>
                  <div>
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
                      <div>
                        <label>Bank Name</label>
                        <input
                          type="text"
                          value={formData.bankName || ''}
                          onChange={(e) => setFormData({ ...formData, bankName: e.target.value || null })}
                          placeholder="Bank name"
                        />
                      </div>
                      <div>
                        <label>Cheque Number</label>
                        <input
                          type="text"
                          value={formData.chequeNumber || ''}
                          onChange={(e) => setFormData({ ...formData, chequeNumber: e.target.value || null })}
                          placeholder="Cheque number"
                        />
                      </div>
                      <div>
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

              {/* Additional fields for specific payment modes */}
              {(formData.paymentMode === PaymentMode.CHEQUE || formData.paymentMode === PaymentMode.BANK_TRANSFER || 
                formData.paymentMode === PaymentMode.NEFT || formData.paymentMode === PaymentMode.RTGS) && (
                <>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontSize: '14px', 
                      fontWeight: 500,
                      color: '#374151'
                    }}>
                      Reference Number
                    </label>
                    <input
                      type="text"
                      value={formData.referenceNumber || ''}
                      onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value || null })}
                      placeholder="Transaction/Reference number"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '14px',
                        color: '#1F2937'
                      }}
                    />
                  </div>

                  {formData.paymentMode === PaymentMode.CHEQUE && (
                    <>
                      <div>
                        <label style={{ 
                          display: 'block', 
                          marginBottom: '8px', 
                          fontSize: '14px', 
                          fontWeight: 500,
                          color: '#374151'
                        }}>
                          Bank Name
                        </label>
                        <input
                          type="text"
                          value={formData.bankName || ''}
                          onChange={(e) => setFormData({ ...formData, bankName: e.target.value || null })}
                          placeholder="Bank name"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            fontSize: '14px',
                            color: '#1F2937'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ 
                          display: 'block', 
                          marginBottom: '8px', 
                          fontSize: '14px', 
                          fontWeight: 500,
                          color: '#374151'
                        }}>
                          Cheque Number
                        </label>
                        <input
                          type="text"
                          value={formData.chequeNumber || ''}
                          onChange={(e) => setFormData({ ...formData, chequeNumber: e.target.value || null })}
                          placeholder="Cheque number"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            fontSize: '14px',
                            color: '#1F2937'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ 
                          display: 'block', 
                          marginBottom: '8px', 
                          fontSize: '14px', 
                          fontWeight: 500,
                          color: '#374151'
                        }}>
                          Cheque Date
                        </label>
                        <input
                          type="date"
                          value={formData.chequeDate || ''}
                          onChange={(e) => setFormData({ ...formData, chequeDate: e.target.value || null })}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            fontSize: '14px',
                            color: '#1F2937'
                          }}
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: 500,
                  color: '#374151'
                }}>
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                  placeholder="Payment notes (optional)"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#1F2937',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Allocation Mode - Locked to FIFO */}
          <div style={{ 
            marginBottom: '32px', 
            padding: '16px', 
            background: '#F1F5F9', 
            borderRadius: '8px',
            border: '1px solid #E2E8F0'
          }}>
            <h3 style={{ 
              margin: '0 0 12px 0', 
              fontSize: '14px', 
              fontWeight: 600,
              color: '#1F2937'
            }}>
              Allocation Mode
            </h3>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              color: '#6B7280', 
              fontSize: '14px' 
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4M12 8h.01"></path>
              </svg>
              <span>FIFO (First In, First Out) - Payment will be automatically allocated to oldest invoices first</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            justifyContent: 'flex-end',
            paddingTop: '24px',
            borderTop: '1px solid #E2E8F0'
          }}>
            <button 
              type="button" 
              onClick={handleBack} 
              disabled={loading || isSubmitting} 
              style={{ 
                padding: '12px 24px',
                background: '#FFFFFF',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                cursor: loading || isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                color: '#475569',
                transition: 'all 0.2s ease'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || isSubmitting} 
              style={{ 
                padding: '12px 32px', 
                background: isSubmitting ? '#94a3b8' : '#10b981', 
                color: '#FFFFFF', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '15px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
                boxShadow: isSubmitting ? 'none' : '0 2px 4px rgba(16, 185, 129, 0.2)'
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting && !loading) {
                  e.currentTarget.style.background = '#059669';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting && !loading) {
                  e.currentTarget.style.background = '#10b981';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
                }
              }}
            >
              {isSubmitting ? 'Processing...' : loading ? 'Loading...' : 'Process Payment'}
            </button>
          </div>
        </form>

        {/* Confirmation Modal */}
        {showConfirmationModal && (
            <div 
              className="modal-overlay" 
              onClick={() => !isSubmitting && setShowConfirmationModal(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}
            >
              <div 
                className="modal-content" 
                onClick={(e) => e.stopPropagation()} 
                style={{ 
                  background: '#fff', 
                  padding: '24px', 
                  borderRadius: '8px', 
                  maxWidth: '500px', 
                  width: '90%' 
                }}
              >
                <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 600 }}>Confirm Payment</h2>
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 12px 0', color: '#dc2626', fontWeight: 600 }}>
                    ⚠️ This action cannot be undone.
                  </p>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                    You are about to process a payment of <strong>₹{formData.paymentAmount.toFixed(2)}</strong>.
                  </p>
                  <p style={{ margin: '0', fontSize: '14px', color: '#64748b' }}>
                    Payment will be allocated using FIFO (First In, First Out) method to the selected invoices.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmationModal(false)} 
                    disabled={isSubmitting}
                    style={{ 
                      padding: '10px 20px', 
                      background: '#f1f5f9', 
                      border: '1px solid #cbd5e1', 
                      borderRadius: '6px', 
                      cursor: 'pointer' 
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleConfirmPayment} 
                    disabled={isSubmitting}
                    style={{ 
                      padding: '10px 24px', 
                      background: '#dc2626', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      fontWeight: 600
                    }}
                  >
                    {isSubmitting ? 'Processing...' : 'Confirm & Process Payment'}
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default PaymentPage;
