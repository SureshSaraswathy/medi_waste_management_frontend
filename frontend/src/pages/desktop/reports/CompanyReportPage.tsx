import ReportDesignPage from '../../../components/reports/ReportDesignPage';

const CompanyReportPage = () => {
  const statusOptions = [
    { value: 'All', label: 'All Status' },
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  const stateOptions = [
    { value: 'All', label: 'All States' },
    { value: 'MH', label: 'Maharashtra' },
    { value: 'DL', label: 'Delhi' },
    { value: 'KA', label: 'Karnataka' },
  ];

  const pcbZoneOptions = [
    { value: 'All', label: 'All Zones' },
    { value: 'Zone A', label: 'Zone A' },
    { value: 'Zone B', label: 'Zone B' },
  ];

  const gstStatusOptions = [
    { value: 'All', label: 'All' },
    { value: 'Registered', label: 'GST Registered' },
    { value: 'Unregistered', label: 'Not Registered' },
    { value: 'Exempt', label: 'GST Exempt' },
  ];

  const parameters = [
    {
      name: 'status',
      label: 'Status',
      type: 'select' as const,
      required: false,
      options: statusOptions,
    },
    {
      name: 'state',
      label: 'State',
      type: 'select' as const,
      required: false,
      options: stateOptions,
    },
    {
      name: 'pcbZone',
      label: 'PCB Zone',
      type: 'select' as const,
      required: false,
      options: pcbZoneOptions,
    },
    {
      name: 'gstStatus',
      label: 'GST Status',
      type: 'select' as const,
      required: false,
      options: gstStatusOptions,
    },
  ];

  const handleGenerate = async (params: Record<string, any>) => {
    console.log('Generating Company Master Report with parameters:', params);
    alert(`Company Master Report generated with parameters:\n${JSON.stringify(params, null, 2)}`);
  };

  return (
    <ReportDesignPage
      reportTitle="Company Master Report"
      reportDescription="Company information and details report with filters for status, state, PCB zone, and GST status"
      parameters={parameters}
      onGenerate={handleGenerate}
    />
  );
};

export default CompanyReportPage;
