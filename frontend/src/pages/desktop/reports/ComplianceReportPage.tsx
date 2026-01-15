import ReportDesignPage from '../../../components/reports/ReportDesignPage';

const ComplianceReportPage = () => {
  const companies = [
    { value: 'COMP001', label: 'Sample Company' },
    { value: 'COMP002', label: 'ABC Industries' },
    { value: 'COMP003', label: 'XYZ Corporation' },
    { value: 'All', label: 'All Companies' },
  ];

  const hcfs = [
    { value: 'All', label: 'All HCFs' },
    { value: 'HCF001', label: 'HCF001 - City Hospital' },
    { value: 'HCF002', label: 'HCF002 - General Hospital' },
  ];

  const complianceTypeOptions = [
    { value: 'All', label: 'All Types' },
    { value: 'PCB', label: 'PCB Compliance' },
    { value: 'GST', label: 'GST Compliance' },
    { value: 'License', label: 'License Compliance' },
    { value: 'Registration', label: 'Registration Compliance' },
  ];

  const statusOptions = [
    { value: 'All', label: 'All Status' },
    { value: 'Compliant', label: 'Compliant' },
    { value: 'Non-Compliant', label: 'Non-Compliant' },
    { value: 'Expiring Soon', label: 'Expiring Soon' },
    { value: 'Expired', label: 'Expired' },
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
      name: 'complianceType',
      label: 'Compliance Type',
      type: 'select' as const,
      required: false,
      options: complianceTypeOptions,
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select' as const,
      required: false,
      options: statusOptions,
    },
    {
      name: 'dateRange',
      label: 'Date Range',
      type: 'daterange' as const,
      required: false,
    },
  ];

  const handleGenerate = async (params: Record<string, any>) => {
    console.log('Generating Compliance Status Report with parameters:', params);
    alert(`Compliance Status Report generated with parameters:\n${JSON.stringify(params, null, 2)}`);
  };

  return (
    <ReportDesignPage
      reportTitle="Compliance Status Report"
      reportDescription="Compliance tracking and status reports with filters for company, HCF, compliance type, status, and date range"
      parameters={parameters}
      onGenerate={handleGenerate}
    />
  );
};

export default ComplianceReportPage;
