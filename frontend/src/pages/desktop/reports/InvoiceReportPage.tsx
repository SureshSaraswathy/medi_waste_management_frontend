import ReportDesignPage from '../../../components/reports/ReportDesignPage';

const InvoiceReportPage = () => {
  // Sample companies and HCFs for dropdowns
  const companies = [
    { value: 'COMP001', label: 'Sample Company' },
    { value: 'COMP002', label: 'ABC Industries' },
    { value: 'COMP003', label: 'XYZ Corporation' },
    { value: 'All', label: 'All Companies' },
  ];

  const hcfs = [
    { value: 'HCF001', label: 'HCF001 - City Hospital' },
    { value: 'HCF002', label: 'HCF002 - General Hospital' },
    { value: 'HCF003', label: 'HCF003 - Medical Center' },
    { value: 'All', label: 'All HCFs' },
  ];

  const statusOptions = [
    { value: 'All', label: 'All Status' },
    { value: 'Draft', label: 'Draft' },
    { value: 'Generated', label: 'Generated' },
    { value: 'Partially Paid', label: 'Partially Paid' },
    { value: 'Paid', label: 'Paid' },
    { value: 'Cancelled', label: 'Cancelled' },
  ];

  const billingTypeOptions = [
    { value: 'All', label: 'All Types' },
    { value: 'Monthly', label: 'Monthly' },
    { value: 'Quarterly', label: 'Quarterly' },
    { value: 'Yearly', label: 'Yearly' },
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
      name: 'hcf',
      label: 'HCF',
      type: 'select' as const,
      required: false,
      options: hcfs,
    },
    {
      name: 'dateRange',
      label: 'Invoice Date Range',
      type: 'daterange' as const,
      required: true,
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select' as const,
      required: false,
      options: statusOptions,
    },
    {
      name: 'billingType',
      label: 'Billing Type',
      type: 'select' as const,
      required: false,
      options: billingTypeOptions,
    },
  ];

  const handleGenerate = async (params: Record<string, any>) => {
    console.log('Generating Invoice Report with parameters:', params);
    
    // Here you would call your backend API
    // const response = await fetch('/api/reports/invoice', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(params),
    // });

    // For now, simulate report generation
    alert(`Invoice Report generated with parameters:\n${JSON.stringify(params, null, 2)}`);
    
    // In a real implementation, you would:
    // 1. Call backend API to generate report
    // 2. Display results in a table
    // 3. Allow export to PDF/Excel
  };

  return (
    <ReportDesignPage
      reportTitle="Invoice Report"
      reportDescription="Generate comprehensive invoice reports with filters for company, HCF, date range, status, and billing type"
      parameters={parameters}
      onGenerate={handleGenerate}
    />
  );
};

export default InvoiceReportPage;
