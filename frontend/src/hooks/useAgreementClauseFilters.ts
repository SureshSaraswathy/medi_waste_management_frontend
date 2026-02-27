import { useMemo } from 'react';

export interface AgreementClause {
  id: string;
  agreementClauseID: string;
  agreementID: string;
  pointNum: string;
  pointTitle: string;
  pointText: string;
  sequenceNo: number;
  status: 'Active' | 'Inactive';
}

interface AdvancedFilters {
  agreementID: string;
  pointNum: string;
  pointTitle: string;
  status: string;
}

interface UseAgreementClauseFiltersProps {
  clauses: AgreementClause[];
  searchQuery: string;
  statusFilter: string;
  advancedFilters: AdvancedFilters;
}

export const useAgreementClauseFilters = ({ 
  clauses, 
  searchQuery,
  statusFilter,
  advancedFilters
}: UseAgreementClauseFiltersProps) => {
  const filteredClauses = useMemo(() => {
    return clauses.filter((clause) => {
      // Search query filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        clause.agreementID.toLowerCase().includes(searchLower) ||
        clause.pointNum.toLowerCase().includes(searchLower) ||
        clause.pointTitle.toLowerCase().includes(searchLower) ||
        clause.pointText.toLowerCase().includes(searchLower);
      
      // Filter by status
      const matchesStatus = statusFilter === 'All' || clause.status === statusFilter;

      // Advanced filters
      const matchesAgreementID = !advancedFilters.agreementID || clause.agreementID === advancedFilters.agreementID;
      const matchesPointNum = !advancedFilters.pointNum || clause.pointNum.toLowerCase().includes(advancedFilters.pointNum.toLowerCase());
      const matchesPointTitle = !advancedFilters.pointTitle || clause.pointTitle.toLowerCase().includes(advancedFilters.pointTitle.toLowerCase());
      const matchesAdvancedStatus = !advancedFilters.status || advancedFilters.status === 'All' || clause.status === advancedFilters.status;

      return matchesSearch && matchesStatus && matchesAgreementID && matchesPointNum && matchesPointTitle && matchesAdvancedStatus;
    }).sort((a, b) => {
      // Sort by agreement ID first, then by sequence number
      if (a.agreementID !== b.agreementID) {
        return a.agreementID.localeCompare(b.agreementID);
      }
      return a.sequenceNo - b.sequenceNo;
    });
  }, [clauses, searchQuery, statusFilter, advancedFilters]);

  return { filteredClauses };
};
