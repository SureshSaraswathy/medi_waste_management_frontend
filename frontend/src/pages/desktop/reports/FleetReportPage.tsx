import ReportDesignPage from '../../../components/reports/ReportDesignPage';

const FleetReportPage = () => {
  const companies = [
    { value: 'COMP001', label: 'Sample Company' },
    { value: 'COMP002', label: 'ABC Industries' },
    { value: 'COMP003', label: 'XYZ Corporation' },
    { value: 'All', label: 'All Companies' },
  ];

  const statusOptions = [
    { value: 'All', label: 'All Status' },
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  const complianceStatusOptions = [
    { value: 'All', label: 'All' },
    { value: 'Compliant', label: 'Compliant' },
    { value: 'Expiring Soon', label: 'Expiring Soon' },
    { value: 'Expired', label: 'Expired' },
  ];

  const vehicleMakeOptions = [
    { value: 'All', label: 'All Makes' },
    { value: 'Tata', label: 'Tata' },
    { value: 'Ashok Leyland', label: 'Ashok Leyland' },
    { value: 'Mahindra', label: 'Mahindra' },
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
      name: 'vehicleType',
      label: 'Vehicle Type',
      type: 'text' as const,
      required: false,
      placeholder: 'Enter vehicle type',
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select' as const,
      required: false,
      options: statusOptions,
    },
    {
      name: 'complianceStatus',
      label: 'Compliance Status',
      type: 'select' as const,
      required: false,
      options: complianceStatusOptions,
    },
    {
      name: 'vehicleMake',
      label: 'Vehicle Make',
      type: 'select' as const,
      required: false,
      options: vehicleMakeOptions,
    },
  ];

  const handleGenerate = async (params: Record<string, any>) => {
    console.log('Generating Fleet Management Report with parameters:', params);
    alert(`Fleet Management Report generated with parameters:\n${JSON.stringify(params, null, 2)}`);
  };

  return (
    <ReportDesignPage
      reportTitle="Fleet Management Report"
      reportDescription="Vehicle and fleet utilization reports with filters for company, vehicle type, status, and compliance status"
      parameters={parameters}
      onGenerate={handleGenerate}
    />
  );
};

export default FleetReportPage;
