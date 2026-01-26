import { useMemo } from 'react';

export interface Contract {
  id: string;
  contractID: string;
  contractNum: string;
  companyName: string;
  companyID: string;
  hcfName: string;
  hcfID: string;
  startDate: string;
  endDate: string;
  billingType: string;
  status: 'Draft' | 'Active' | 'Expired';
}

interface UseContractFiltersProps {
  contracts: Contract[];
  searchQuery: string;
  statusFilter: string;
}

export const useContractFilters = ({ contracts, searchQuery, statusFilter }: UseContractFiltersProps) => {
  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      // Search by contract number or company name
      const matchesSearch =
        searchQuery === '' ||
        contract.contractNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.companyName.toLowerCase().includes(searchQuery.toLowerCase());

      // Filter by status
      const matchesStatus = statusFilter === 'All' || contract.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [contracts, searchQuery, statusFilter]);

  return { filteredContracts };
};
