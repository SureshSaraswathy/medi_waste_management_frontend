import ReportDesignPage from '../../../components/reports/ReportDesignPage';

const FleetMasterReportPage = () => {
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

  const ownerTypeOptions = [
    { value: 'All', label: 'All Types' },
    { value: 'Company Owned', label: 'Company Owned' },
    { value: 'Contractor', label: 'Contractor' },
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
      name: 'vehicleMake',
      label: 'Vehicle Make',
      type: 'select' as const,
      required: false,
      options: vehicleMakeOptions,
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
      name: 'ownerType',
      label: 'Owner Type',
      type: 'select' as const,
      required: false,
      options: ownerTypeOptions,
    },
  ];

  const handleGenerate = async (params: Record<string, any>) => {
    console.log('Generating Fleet Master Report with parameters:', params);
    alert(`Fleet Master Report generated with parameters:\n${JSON.stringify(params, null, 2)}`);
  };

  return (
    <ReportDesignPage
      reportTitle="Fleet Master Report"
      reportDescription="Vehicle master data report with filters for company, vehicle make, status, compliance status, and owner type"
      parameters={parameters}
      onGenerate={handleGenerate}
    />
  );
};

export default FleetMasterReportPage;
