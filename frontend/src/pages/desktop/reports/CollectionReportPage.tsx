import ReportDesignPage from '../../../components/reports/ReportDesignPage';

const CollectionReportPage = () => {
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

  const routeOptions = [
    { value: 'All', label: 'All Routes' },
    { value: 'RT001', label: 'RT001 - Route 1' },
    { value: 'RT002', label: 'RT002 - Route 2' },
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
      label: 'Collection Date Range',
      type: 'daterange' as const,
      required: true,
    },
    {
      name: 'route',
      label: 'Route',
      type: 'select' as const,
      required: false,
      options: routeOptions,
    },
    {
      name: 'weightMin',
      label: 'Min Weight (Kg)',
      type: 'number' as const,
      required: false,
      placeholder: 'Minimum weight',
      min: 0,
    },
    {
      name: 'weightMax',
      label: 'Max Weight (Kg)',
      type: 'number' as const,
      required: false,
      placeholder: 'Maximum weight',
      min: 0,
    },
  ];

  const handleGenerate = async (params: Record<string, any>) => {
    console.log('Generating Waste Collection Report with parameters:', params);
    alert(`Waste Collection Report generated with parameters:\n${JSON.stringify(params, null, 2)}`);
  };

  return (
    <ReportDesignPage
      reportTitle="Waste Collection Report"
      reportDescription="Daily/weekly/monthly collection reports with filters for company, HCF, date range, route, and weight range"
      parameters={parameters}
      onGenerate={handleGenerate}
    />
  );
};

export default CollectionReportPage;
