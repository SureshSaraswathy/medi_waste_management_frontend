import ReportDesignPage from '../../../components/reports/ReportDesignPage';

const RevenueReportPage = () => {
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

  const groupByOptions = [
    { value: 'Company', label: 'By Company' },
    { value: 'HCF', label: 'By HCF' },
    { value: 'Month', label: 'By Month' },
    { value: 'Quarter', label: 'By Quarter' },
    { value: 'Year', label: 'By Year' },
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
      label: 'Date Range',
      type: 'daterange' as const,
      required: true,
    },
    {
      name: 'groupBy',
      label: 'Group By',
      type: 'select' as const,
      required: true,
      options: groupByOptions,
    },
    {
      name: 'hcf',
      label: 'HCF (Optional)',
      type: 'select' as const,
      required: false,
      options: hcfs,
    },
  ];

  const handleGenerate = async (params: Record<string, any>) => {
    console.log('Generating Revenue Analysis Report with parameters:', params);
    alert(`Revenue Analysis Report generated with parameters:\n${JSON.stringify(params, null, 2)}`);
  };

  return (
    <ReportDesignPage
      reportTitle="Revenue Analysis Report"
      reportDescription="Analyze revenue by period and company with grouping options"
      parameters={parameters}
      onGenerate={handleGenerate}
    />
  );
};

export default RevenueReportPage;
