import ReportDesignPage from '../../../components/reports/ReportDesignPage';

const OutstandingReportPage = () => {
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

  const agingPeriodOptions = [
    { value: '0-30', label: '0-30 Days' },
    { value: '31-60', label: '31-60 Days' },
    { value: '61-90', label: '61-90 Days' },
    { value: '90+', label: '90+ Days' },
    { value: 'All', label: 'All Periods' },
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
      label: 'Date Range',
      type: 'daterange' as const,
      required: false,
    },
    {
      name: 'agingPeriod',
      label: 'Aging Period',
      type: 'select' as const,
      required: false,
      options: agingPeriodOptions,
    },
  ];

  const handleGenerate = async (params: Record<string, any>) => {
    console.log('Generating Outstanding Amount Report with parameters:', params);
    alert(`Outstanding Amount Report generated with parameters:\n${JSON.stringify(params, null, 2)}`);
  };

  return (
    <ReportDesignPage
      reportTitle="Outstanding Amount Report"
      reportDescription="View outstanding payments and aging analysis with filters"
      parameters={parameters}
      onGenerate={handleGenerate}
    />
  );
};

export default OutstandingReportPage;
