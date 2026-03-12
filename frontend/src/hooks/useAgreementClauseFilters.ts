import { useMemo } from 'react';

export interface AgreementClause {
  id: string;
  agreementClauseID: string;
  agreementTemplateId: string;
  agreementTemplateName?: string;
  pointNum: string;
  pointTitle: string;
  pointText: string;
  sequenceNo: number;
  status: 'Active' | 'Inactive';
}

interface AdvancedFilters {
  agreementTemplateId: string;
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
        (clause.agreementTemplateName && clause.agreementTemplateName.toLowerCase().includes(searchLower)) ||
        clause.pointNum.toLowerCase().includes(searchLower) ||
        clause.pointTitle.toLowerCase().includes(searchLower) ||
        clause.pointText.toLowerCase().includes(searchLower);
      
      // Filter by status
      const matchesStatus = statusFilter === 'All' || clause.status === statusFilter;

      // Advanced filters
      const matchesAgreementTemplate = !advancedFilters.agreementTemplateId || clause.agreementTemplateId === advancedFilters.agreementTemplateId;
      const matchesPointNum = !advancedFilters.pointNum || clause.pointNum.toLowerCase().includes(advancedFilters.pointNum.toLowerCase());
      const matchesPointTitle = !advancedFilters.pointTitle || clause.pointTitle.toLowerCase().includes(advancedFilters.pointTitle.toLowerCase());
      const matchesAdvancedStatus = !advancedFilters.status || advancedFilters.status === 'All' || clause.status === advancedFilters.status;

      return matchesSearch && matchesStatus && matchesAgreementTemplate && matchesPointNum && matchesPointTitle && matchesAdvancedStatus;
    }).sort((a, b) => {
      // Sort by template name first, then by sequence number
      const templateA = a.agreementTemplateName || a.agreementTemplateId;
      const templateB = b.agreementTemplateName || b.agreementTemplateId;
      if (templateA !== templateB) {
        return templateA.localeCompare(templateB);
      }
      return a.sequenceNo - b.sequenceNo;
    });
  }, [clauses, searchQuery, statusFilter, advancedFilters]);

  return { filteredClauses };
};
