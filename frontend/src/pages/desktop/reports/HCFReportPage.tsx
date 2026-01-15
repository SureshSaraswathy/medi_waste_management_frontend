import ReportDesignPage from '../../../components/reports/ReportDesignPage';

const HCFReportPage = () => {
  const companies = [
    { value: 'COMP001', label: 'Sample Company' },
    { value: 'COMP002', label: 'ABC Industries' },
    { value: 'COMP003', label: 'XYZ Corporation' },
    { value: 'All', label: 'All Companies' },
  ];

  const hcfTypeOptions = [
    { value: 'All', label: 'All Types' },
    { value: 'Hospital', label: 'Hospital' },
    { value: 'Clinic', label: 'Clinic' },
    { value: 'Laboratory', label: 'Laboratory' },
  ];

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

  const parameters = [
    {
      name: 'company',
      label: 'Company',
      type: 'select' as const,
      required: false,
      options: companies,
    },
    {
      name: 'hcfType',
      label: 'HCF Type',
      type: 'select' as const,
      required: false,
      options: hcfTypeOptions,
    },
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
      name: 'district',
      label: 'District',
      type: 'text' as const,
      required: false,
      placeholder: 'Enter district name',
    },
    {
      name: 'category',
      label: 'Category',
      type: 'text' as const,
      required: false,
      placeholder: 'Enter category',
    },
  ];

  const handleGenerate = async (params: Record<string, any>) => {
    console.log('Generating HCF Report with parameters:', params);
    alert(`HCF Report generated with parameters:\n${JSON.stringify(params, null, 2)}`);
  };

  return (
    <ReportDesignPage
      reportTitle="HCF Master Report"
      reportDescription="Generate healthcare facility information reports with filters for company, HCF type, status, state, district, and category"
      parameters={parameters}
      onGenerate={handleGenerate}
    />
  );
};

export default HCFReportPage;
