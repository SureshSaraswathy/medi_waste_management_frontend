import { useMemo } from 'react';

export interface Agreement {
  id: string;
  agreementID: string;
  agreementNum: string;
  contractID: string;
  contractNum?: string;
  agreementDate: string;
  status: 'Draft' | 'Generated' | 'Signed';
}

interface UseAgreementFiltersProps {
  agreements: Agreement[];
  searchQuery: string;
  statusFilter: string;
}

export const useAgreementFilters = ({ agreements, searchQuery, statusFilter }: UseAgreementFiltersProps) => {
  const filteredAgreements = useMemo(() => {
    return agreements.filter((agreement) => {
      // Search by agreement number only
      const matchesSearch =
        searchQuery === '' ||
        agreement.agreementNum.toLowerCase().includes(searchQuery.toLowerCase());

      // Filter by status
      const matchesStatus = statusFilter === 'All' || agreement.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [agreements, searchQuery, statusFilter]);

  return { filteredAgreements };
};
