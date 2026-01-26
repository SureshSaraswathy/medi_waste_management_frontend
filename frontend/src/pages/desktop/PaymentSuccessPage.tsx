import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import './paymentSuccessPage.css';

interface InvoiceUpdate {
  invoiceId: string;
  invoiceNumber: string;
  status: string;
  totalPaidAmount: number;
  balanceAmount: number;
}

interface PaymentSuccessState {
  receiptNumber: string;
  receiptId: string;
  totalAmount: number;
  receiptDate: string;
  invoiceUpdates: InvoiceUpdate[];
}

const PaymentSuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as PaymentSuccessState;

  useEffect(() => {
    if (!state?.receiptId) {
      navigate('/finance/invoice-management');
      return;
    }
  }, [state, navigate]);

  const handleDownloadReceipt = () => {
    // TODO: Implement PDF download
    window.print();
  };

  const handleBackToInvoices = () => {
    navigate('/finance/invoice-management');
  };

  if (!state) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>No payment data found. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="payment-success-page">
      <div className="payment-success-header">
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '50%', 
            background: '#d1fae5', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 16px',
            fontSize: '32px'
          }}>
            ✓
          </div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 600, color: '#059669' }}>
            Payment Successful
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Your payment has been processed successfully
          </p>
        </div>
      </div>

      <div className="payment-success-content">
        {/* Receipt Summary */}
        <div className="success-card receipt-card">
          <h2 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>Payment Receipt</h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
              <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>Receipt Number</span>
              <span style={{ fontWeight: 600, fontSize: '15px', color: '#1e293b', letterSpacing: '0.3px' }}>{state.receiptNumber}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>Receipt Date</span>
              <span style={{ fontSize: '14px', color: '#334155', fontWeight: 500 }}>{state.receiptDate}</span>
            </div>
            <div className="amount-received-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0' }}>
                <span style={{ color: '#1e293b', fontSize: '16px', fontWeight: 600 }}>Amount Received</span>
                <span className="amount-value">
                  ₹{state.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Settlement Status */}
        <div className="success-card settlement-card">
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>Invoice Settlement Status</h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
              Partial payments are automatically allocated using FIFO (oldest invoices first). Remaining balances will carry forward for future payments.
            </p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Invoice #</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount Paid</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Remaining Balance</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Settlement Status</th>
              </tr>
            </thead>
            <tbody>
              {state.invoiceUpdates.map((inv) => (
                <tr key={inv.invoiceId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '14px 12px', fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{inv.invoiceNumber}</td>
                  <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: '15px', fontWeight: 600, color: '#059669' }}>
                    ₹{inv.totalPaidAmount.toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: '15px', fontWeight: 600, color: inv.balanceAmount > 0 ? '#dc2626' : '#059669' }}>
                    ₹{inv.balanceAmount.toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                    <span style={{
                      padding: '5px 14px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'inline-block',
                      background: inv.status === 'Paid' ? '#d1fae5' : inv.status === 'Partially Paid' ? '#fef3c7' : '#e0e7ff',
                      color: inv.status === 'Paid' ? '#065f46' : inv.status === 'Partially Paid' ? '#92400e' : '#3730a3'
                    }}>
                      {inv.status === 'Generated' ? 'DUE' : inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            onClick={handleDownloadReceipt}
            className="primary-action-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download Receipt
          </button>
          <button
            onClick={handleBackToInvoices}
            className="secondary-action-btn"
          >
            Back to Invoice List
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
