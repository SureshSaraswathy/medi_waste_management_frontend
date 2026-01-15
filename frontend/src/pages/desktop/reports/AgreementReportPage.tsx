import ReportDesignPage from '../../../components/reports/ReportDesignPage';

const AgreementReportPage = () => {
  const companies = [
    { value: 'COMP001', label: 'Sample Company' },
    { value: 'COMP002', label: 'ABC Industries' },
    { value: 'COMP003', label: 'XYZ Corporation' },
    { value: 'All', label: 'All Companies' },
  ];

  const contractOptions = [
    { value: 'All', label: 'All Contracts' },
    { value: 'CNT001', label: 'CNT001 - CONTRACT-2024-001' },
    { value: 'CNT002', label: 'CNT002 - CONTRACT-2024-002' },
  ];

  const statusOptions = [
    { value: 'All', label: 'All Status' },
    { value: 'Draft', label: 'Draft' },
    { value: 'Generated', label: 'Generated' },
    { value: 'Signed', label: 'Signed' },
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
      name: 'contract',
      label: 'Contract',
      type: 'select' as const,
      required: false,
      options: contractOptions,
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
      label: 'Agreement Date Range',
      type: 'daterange' as const,
      required: false,
    },
  ];

  const handleGenerate = async (params: Record<string, any>) => {
    console.log('Generating Agreement Report with parameters:', params);
    alert(`Agreement Report generated with parameters:\n${JSON.stringify(params, null, 2)}`);
  };

  return (
    <ReportDesignPage
      reportTitle="Agreement Report"
      reportDescription="View agreement documents and status with filters for company, contract, status, and date range"
      parameters={parameters}
      onGenerate={handleGenerate}
    />
  );
};

export default AgreementReportPage;
