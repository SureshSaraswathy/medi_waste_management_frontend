import ReportDesignPage from '../../../components/reports/ReportDesignPage';

const UserReportPage = () => {
  const companies = [
    { value: 'COMP001', label: 'Sample Company' },
    { value: 'COMP002', label: 'ABC Industries' },
    { value: 'COMP003', label: 'XYZ Corporation' },
    { value: 'All', label: 'All Companies' },
  ];

  const roleOptions = [
    { value: 'All', label: 'All Roles' },
    { value: 'Admin', label: 'Admin' },
    { value: 'Manager', label: 'Manager' },
    { value: 'Supervisor', label: 'Supervisor' },
    { value: 'Driver', label: 'Driver' },
    { value: 'Field Executive', label: 'Field Executive' },
    { value: 'Accountant', label: 'Accountant' },
  ];

  const statusOptions = [
    { value: 'All', label: 'All Status' },
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  const employmentTypeOptions = [
    { value: 'All', label: 'All Types' },
    { value: 'Permanent', label: 'Permanent' },
    { value: 'Contract', label: 'Contract' },
    { value: 'Part-time', label: 'Part-time' },
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
      name: 'role',
      label: 'Role',
      type: 'select' as const,
      required: false,
      options: roleOptions,
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select' as const,
      required: false,
      options: statusOptions,
    },
    {
      name: 'employmentType',
      label: 'Employment Type',
      type: 'select' as const,
      required: false,
      options: employmentTypeOptions,
    },
    {
      name: 'department',
      label: 'Department',
      type: 'text' as const,
      required: false,
      placeholder: 'Enter department name',
    },
  ];

  const handleGenerate = async (params: Record<string, any>) => {
    console.log('Generating User Report with parameters:', params);
    alert(`User Report generated with parameters:\n${JSON.stringify(params, null, 2)}`);
  };

  return (
    <ReportDesignPage
      reportTitle="User Report"
      reportDescription="Generate user and role assignment reports with filters for company, role, status, employment type, and department"
      parameters={parameters}
      onGenerate={handleGenerate}
    />
  );
};

export default UserReportPage;
