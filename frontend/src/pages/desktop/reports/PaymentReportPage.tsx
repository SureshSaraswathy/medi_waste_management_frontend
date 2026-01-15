import ReportDesignPage from '../../../components/reports/ReportDesignPage';

const PaymentReportPage = () => {
  const companies = [
    { value: 'COMP001', label: 'Sample Company' },
    { value: 'COMP002', label: 'ABC Industries' },
    { value: 'COMP003', label: 'XYZ Corporation' },
    { value: 'All', label: 'All Companies' },
  ];

  const paymentStatusOptions = [
    { value: 'All', label: 'All Status' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Partially Paid', label: 'Partially Paid' },
    { value: 'Paid', label: 'Paid' },
    { value: 'Overdue', label: 'Overdue' },
  ];

  const paymentModeOptions = [
    { value: 'All', label: 'All Modes' },
    { value: 'Cash', label: 'Cash' },
    { value: 'Cheque', label: 'Cheque' },
    { value: 'Online Transfer', label: 'Online Transfer' },
    { value: 'UPI', label: 'UPI' },
    { value: 'Bank Transfer', label: 'Bank Transfer' },
  ];

  const parameters = [
    {
      name: 'company',
      label: 'Company',
      type: 'select' as const,
      required: false,
      options: companies,
    },
    {
      name: 'dateRange',
      label: 'Payment Date Range',
      type: 'daterange' as const,
      required: true,
    },
    {
      name: 'paymentStatus',
      label: 'Payment Status',
      type: 'select' as const,
      required: false,
      options: paymentStatusOptions,
    },
    {
      name: 'paymentMode',
      label: 'Payment Mode',
      type: 'select' as const,
      required: false,
      options: paymentModeOptions,
    },
  ];

  const handleGenerate = async (params: Record<string, any>) => {
    console.log('Generating Payment Report with parameters:', params);
    alert(`Payment Report generated with parameters:\n${JSON.stringify(params, null, 2)}`);
  };

  return (
    <ReportDesignPage
      reportTitle="Payment Report"
      reportDescription="Track payments and receipts with filters for company, date range, payment status, and payment mode"
      parameters={parameters}
      onGenerate={handleGenerate}
    />
  );
};

export default PaymentReportPage;
