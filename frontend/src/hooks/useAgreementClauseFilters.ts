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

interface UseAgreementClauseFiltersProps {
  clauses: AgreementClause[];
  agreementFilter: string;
  statusFilter: string;
}

export const useAgreementClauseFilters = ({ 
  clauses, 
  agreementFilter, 
  statusFilter 
}: UseAgreementClauseFiltersProps) => {
  const filteredClauses = useMemo(() => {
    return clauses.filter((clause) => {
      // Filter by agreement
      const matchesAgreement = agreementFilter === 'All' || clause.agreementID === agreementFilter;
      
      // Filter by status
      const matchesStatus = statusFilter === 'All' || clause.status === statusFilter;

      return matchesAgreement && matchesStatus;
    }).sort((a, b) => {
      // Sort by agreement ID first, then by sequence number
      if (a.agreementID !== b.agreementID) {
        return a.agreementID.localeCompare(b.agreementID);
      }
      return a.sequenceNo - b.sequenceNo;
    });
  }, [clauses, agreementFilter, statusFilter]);

  return { filteredClauses };
};
