import ReportDesignPage from '../../../components/reports/ReportDesignPage';

const ContractRenewalReportPage = () => {
  const companies = [
    { value: 'COMP001', label: 'Sample Company' },
    { value: 'COMP002', label: 'ABC Industries' },
    { value: 'COMP003', label: 'XYZ Corporation' },
    { value: 'All', label: 'All Companies' },
  ];

  const renewalPeriodOptions = [
    { value: 'Current Month', label: 'Current Month' },
    { value: 'Next Month', label: 'Next Month' },
    { value: 'Next 3 Months', label: 'Next 3 Months' },
    { value: 'Next 6 Months', label: 'Next 6 Months' },
    { value: 'Custom', label: 'Custom' },
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
      name: 'renewalPeriod',
      label: 'Renewal Period',
      type: 'select' as const,
      required: true,
      options: renewalPeriodOptions,
    },
    {
      name: 'daysBeforeExpiry',
      label: 'Days Before Expiry',
      type: 'number' as const,
      required: false,
      placeholder: 'e.g., 30, 60, 90',
      min: 0,
    },
  ];

  const handleGenerate = async (params: Record<string, any>) => {
    console.log('Generating Contract Renewal Report with parameters:', params);
    alert(`Contract Renewal Report generated with parameters:\n${JSON.stringify(params, null, 2)}`);
  };

  return (
    <ReportDesignPage
      reportTitle="Contract Renewal Report"
      reportDescription="Track contracts due for renewal with customizable period and expiry alerts"
      parameters={parameters}
      onGenerate={handleGenerate}
    />
  );
};

export default ContractRenewalReportPage;
