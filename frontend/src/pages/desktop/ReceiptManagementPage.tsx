import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  getPaymentsWithoutReceipt,
  createManualReceipt,
  PaymentResponse,
  CreateManualReceiptRequest,
} from '../../services/paymentService';
import { companyService, CompanyResponse } from '../../services/companyService';
import './receiptManagementPage.css';
import '../desktop/dashboardPage.css';

interface Company {
  id: string;
  companyCode: string;
  companyName: string;
  status: 'Active' | 'Inactive';
}

const ReceiptManagementPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentResponse | null>(null);
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleBack = () => {
    navigate('/finance');
  };

  // Form state for manual receipt creation
  const [formData, setFormData] = useState<CreateManualReceiptRequest>({
    paymentId: '',
    receiptDate: '',
    notes: null,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Only load payments after companies are loaded
    if (companies.length > 0) {
      if (companyFilter) {
        loadPayments(companyFilter);
      } else {
        loadPayments();
      }
    }
  }, [companyFilter, companies.length]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors

      // Load companies first
      const companiesData = await companyService.getAllCompanies(true);
      const mappedCompanies = companiesData.map((c: CompanyResponse) => ({
        id: c.id,
        companyCode: c.companyCode,
        companyName: c.companyName,
        status: c.status,
      }));
      setCompanies(mappedCompanies);
      console.log('Loaded companies:', mappedCompanies.length);

      // Load payments without receipts after companies are loaded
      await loadPayments();
      
      // Clear error on successful load
      setError(null);
    } catch (err: any) {
      console.error('Error loading data:', err);
      const errorMessage = err.message || err.response?.data?.message || 'Failed to load data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async (companyId?: string) => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      const response = await getPaymentsWithoutReceipt(companyId);
      // apiRequest extracts the data property, so response is PaymentResponse[]
      const paymentsList = Array.isArray(response) ? response : [];
      setPayments(paymentsList);
      
      // Clear error on successful load
      setError(null);
      
      // Debug: Log company IDs from payments
      if (paymentsList.length > 0) {
        console.log('Payments loaded:', paymentsList.length);
        console.log('Payment company IDs:', paymentsList.map(p => p.companyId));
        console.log('Available companies:', companies.map(c => ({ id: c.id, name: c.companyName })));
      }
    } catch (err: any) {
      console.error('Error loading payments:', err);
      const errorMessage = err.message || err.response?.data?.message || 'Failed to load payments';
      setError(errorMessage);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReceipt = (payment: PaymentResponse) => {
    setSelectedPayment(payment);
    setFormData({
      paymentId: payment.paymentId,
      receiptDate: payment.paymentDate, // Default to payment date
      notes: null,
    });
    setShowCreateModal(true);
  };

  const handleSubmitReceipt = async () => {
    if (!formData.paymentId) {
      setError('Please select a payment');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const result = await createManualReceipt(formData);

      setSuccessMessage(`Receipt ${result.data.receipt.receiptNumber} created successfully!`);
      setShowCreateModal(false);
      setSelectedPayment(null);
      setFormData({
        paymentId: '',
        receiptDate: '',
        notes: null,
      });

      // Reload payments
      await loadPayments(companyFilter || undefined);
    } catch (err: any) {
      console.error('Error creating receipt:', err);
      setError(err.message || 'Failed to create receipt');
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.paymentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.receiptNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      companies.find((c) => c.id === payment.companyId)?.companyName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCompany = !companyFilter || payment.companyId === companyFilter;

    return matchesSearch && matchesCompany;
  });

  return (
    <div className="master-page-container">
      <div className="master-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
          <button
            onClick={handleBack}
            style={{
              padding: '8px 12px',
              background: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Back
          </button>
          <h1 style={{ margin: 0 }}>Receipt Management</h1>
        </div>
        <p>Create receipts for existing payments</p>
      </div>

      {error && (
        <div className="error-banner" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {successMessage && (
        <div className="success-banner" style={{ marginBottom: '20px', background: '#d1fae5', color: '#065f46', padding: '12px 16px', borderRadius: '6px' }}>
          {successMessage}
        </div>
      )}

      {/* Filters */}
      <div className="filters-section" style={{ marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <input
            type="text"
            placeholder="Search by payment ID, receipt number, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
        </div>
        <div style={{ minWidth: '200px' }}>
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="">All Companies</option>
            {companies
              .filter((c) => c.status === 'Active')
              .map((company) => (
                <option key={company.id} value={company.id}>
                  {company.companyName}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="table-container">
        {loading && payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading payments...</div>
        ) : filteredPayments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            {payments.length === 0
              ? 'No payments found without receipts'
              : 'No payments match your search criteria'}
          </div>
        ) : (
          <table className="master-table">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Company</th>
                <th>Payment Date</th>
                <th>Payment Amount</th>
                <th>Payment Mode</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => {
                const company = companies.find((c) => c.id === payment.companyId);
                return (
                  <tr key={payment.paymentId}>
                    <td>{payment.paymentId.substring(0, 8)}...</td>
                    <td>{company?.companyName || payment.companyId || '-'}</td>
                    <td>{payment.paymentDate}</td>
                    <td style={{ fontWeight: 600 }}>₹{Number(payment.paymentAmount).toFixed(2)}</td>
                    <td>{payment.paymentMode}</td>
                    <td>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 500,
                          background: payment.status === 'Completed' ? '#d1fae5' : '#fef3c7',
                          color: payment.status === 'Completed' ? '#065f46' : '#92400e',
                        }}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleCreateReceipt(payment)}
                        style={{
                          padding: '6px 12px',
                          background: '#3b82f6',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 500,
                        }}
                      >
                        Create Receipt
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Receipt Modal */}
      {showCreateModal && selectedPayment && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Create Receipt</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '6px' }}>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Payment ID:</span>
                    <span style={{ fontWeight: 600 }}>{selectedPayment.paymentId.substring(0, 8)}...</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Payment Amount:</span>
                    <span style={{ fontWeight: 600 }}>₹{Number(selectedPayment.paymentAmount).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Payment Date:</span>
                    <span>{selectedPayment.paymentDate}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Payment Mode:</span>
                    <span>{selectedPayment.paymentMode}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>
                  Receipt Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={formData.receiptDate || ''}
                  onChange={(e) => setFormData({ ...formData, receiptDate: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
                <p style={{ marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                  Defaults to payment date if not specified
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px' }}>
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: '10px 20px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReceipt}
                disabled={loading || !formData.receiptDate}
                style={{
                  padding: '10px 20px',
                  background: loading || !formData.receiptDate ? '#cbd5e1' : '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading || !formData.receiptDate ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                {loading ? 'Creating...' : 'Create Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptManagementPage;
