import ReportDesignPage from '../../../components/reports/ReportDesignPage';

const BarcodeReportPage = () => {
  const companies = [
    { value: 'COMP001', label: 'Sample Company' },
    { value: 'COMP002', label: 'ABC Industries' },
    { value: 'COMP003', label: 'XYZ Corporation' },
    { value: 'All', label: 'All Companies' },
  ];

  const statusOptions = [
    { value: 'All', label: 'All Status' },
    { value: 'Available', label: 'Available' },
    { value: 'Assigned', label: 'Assigned' },
    { value: 'Used', label: 'Used' },
    { value: 'Blocked', label: 'Blocked' },
  ];

  const entityTypeOptions = [
    { value: 'All', label: 'All Entities' },
    { value: 'Container', label: 'Container' },
    { value: 'Vehicle', label: 'Vehicle' },
    { value: 'Bin', label: 'Bin' },
    { value: 'Equipment', label: 'Equipment' },
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
      label: 'Generation Date Range',
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
      name: 'assignedEntity',
      label: 'Assigned Entity Type',
      type: 'select' as const,
      required: false,
      options: entityTypeOptions,
    },
  ];

  const handleGenerate = async (params: Record<string, any>) => {
    console.log('Generating Barcode Usage Report with parameters:', params);
    alert(`Barcode Usage Report generated with parameters:\n${JSON.stringify(params, null, 2)}`);
  };

  return (
    <ReportDesignPage
      reportTitle="Barcode Usage Report"
      reportDescription="Track barcode generation and usage with filters for company, date range, status, and assigned entity type"
      parameters={parameters}
      onGenerate={handleGenerate}
    />
  );
};

export default BarcodeReportPage;
