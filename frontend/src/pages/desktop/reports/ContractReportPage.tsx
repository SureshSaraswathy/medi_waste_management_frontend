import ReportDesignPage from '../../../components/reports/ReportDesignPage';

const ContractReportPage = () => {
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
    { value: 'Active', label: 'Active' },
    { value: 'Closed', label: 'Closed' },
  ];

  const billingTypeOptions = [
    { value: 'All', label: 'All Types' },
    { value: 'Bed', label: 'Bed' },
    { value: 'Kg', label: 'Kg' },
    { value: 'Lumpsum', label: 'Lumpsum' },
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
      label: 'Contract Date Range',
      type: 'daterange' as const,
      required: false,
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
    console.log('Generating Contract Report with parameters:', params);
    alert(`Contract Report generated with parameters:\n${JSON.stringify(params, null, 2)}`);
  };

  return (
    <ReportDesignPage
      reportTitle="Contract Report"
      reportDescription="Generate contract reports with filters for company, HCF, date range, status, and billing type"
      parameters={parameters}
      onGenerate={handleGenerate}
    />
  );
};

export default ContractReportPage;
