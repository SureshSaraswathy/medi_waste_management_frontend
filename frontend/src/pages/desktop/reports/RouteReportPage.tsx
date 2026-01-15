import ReportDesignPage from '../../../components/reports/ReportDesignPage';

const RouteReportPage = () => {
  const companies = [
    { value: 'COMP001', label: 'Sample Company' },
    { value: 'COMP002', label: 'ABC Industries' },
    { value: 'COMP003', label: 'XYZ Corporation' },
    { value: 'All', label: 'All Companies' },
  ];

  const routeOptions = [
    { value: 'All', label: 'All Routes' },
    { value: 'RT001', label: 'RT001 - Route 1' },
    { value: 'RT002', label: 'RT002 - Route 2' },
    { value: 'RT003', label: 'RT003 - Route 3' },
  ];

  const hcfs = [
    { value: 'All', label: 'All HCFs' },
    { value: 'HCF001', label: 'HCF001 - City Hospital' },
    { value: 'HCF002', label: 'HCF002 - General Hospital' },
  ];

  const statusOptions = [
    { value: 'All', label: 'All Status' },
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
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
      name: 'routeCode',
      label: 'Route Code',
      type: 'select' as const,
      required: false,
      options: routeOptions,
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select' as const,
      required: false,
      options: statusOptions,
    },
    {
      name: 'hcf',
      label: 'HCF',
      type: 'select' as const,
      required: false,
      options: hcfs,
    },
  ];

  const handleGenerate = async (params: Record<string, any>) => {
    console.log('Generating Route Report with parameters:', params);
    alert(`Route Report generated with parameters:\n${JSON.stringify(params, null, 2)}`);
  };

  return (
    <ReportDesignPage
      reportTitle="Route Report"
      reportDescription="Route performance and assignment reports with filters"
      parameters={parameters}
      onGenerate={handleGenerate}
    />
  );
};

export default RouteReportPage;
