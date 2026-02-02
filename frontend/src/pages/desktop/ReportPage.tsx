import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import ReportCard, { ReportCardProps } from '../../components/reports/ReportCard';
import './masterPage.css';
import './reportPage.css';
import '../../components/reports/reportCard.css';

interface ReportCategory {
  id: string;
  label: string;
  icon: ReactNode;
  children?: ReportCategory[];
}

interface Report {
  id: string;
  category: string;
  title: string;
  description: string;
  icon: JSX.Element;
  path: string;
  parameters: string[];
  indicators?: ('popular' | 'scheduled' | 'restricted' | 'beta')[];
  reportType?: 'Transactional' | 'Master' | 'Analytics';
  ownership?: 'My Reports' | 'Shared' | 'System';
  isFavorite?: boolean;
}

const ReportPage = () => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    reportType: '',
    ownership: '',
    favorites: false,
  });
  const [favoriteReports, setFavoriteReports] = useState<Set<string>>(new Set());
  const categoryPopoverRef = useRef<HTMLDivElement>(null);
  const filtersDrawerRef = useRef<HTMLDivElement>(null);

  // Icons (SVG-only; avoid emoji so UI looks consistent everywhere)
  const iconChart = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="20" x2="12" y2="10"></line>
      <line x1="18" y1="20" x2="18" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="16"></line>
    </svg>
  );
  const iconMoney = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
  );
  const iconFile = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
    </svg>
  );
  const iconEdit = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
    </svg>
  );
  const iconRefresh = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10"></polyline>
      <polyline points="1 20 1 14 7 14"></polyline>
      <path d="M3.51 9a9 9 0 0 1 14.13-3.36L23 10"></path>
      <path d="M20.49 15a9 9 0 0 1-14.13 3.36L1 14"></path>
    </svg>
  );
  const iconTruck = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="3" width="15" height="13"></rect>
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
      <circle cx="5.5" cy="18.5" r="2.5"></circle>
      <circle cx="18.5" cy="18.5" r="2.5"></circle>
    </svg>
  );
  const iconMap = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21 1 6"></polygon>
      <line x1="8" y1="3" x2="8" y2="18"></line>
      <line x1="16" y1="6" x2="16" y2="21"></line>
    </svg>
  );
  const iconBox = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.29 7 12 12 20.71 7"></polyline>
      <line x1="12" y1="22" x2="12" y2="12"></line>
    </svg>
  );
  const iconBuilding = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 22V6a2 2 0 0 1 2-2h6v18"></path>
      <path d="M13 22V10a2 2 0 0 1 2-2h6v14"></path>
      <line x1="7" y1="8" x2="7" y2="8"></line>
      <line x1="7" y1="12" x2="7" y2="12"></line>
      <line x1="17" y1="12" x2="17" y2="12"></line>
      <line x1="17" y1="16" x2="17" y2="16"></line>
    </svg>
  );
  const iconUser = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
  const iconSettings = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  );
  const iconCheck = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 11l3 3L22 4"></path>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
    </svg>
  );

  // Compact Category Tree (Max 2 levels)
  const reportCategories: ReportCategory[] = [
    {
      id: 'All',
      label: 'All Reports',
      icon: iconChart,
    },
    {
      id: 'BillingFinance',
      label: 'Billing & Finance',
      icon: iconMoney,
      children: [
        { id: 'BillingFinance-Invoices', label: 'Invoices', icon: iconFile },
        { id: 'BillingFinance-Payments', label: 'Payments', icon: iconMoney },
        { id: 'BillingFinance-Revenue', label: 'Revenue', icon: iconChart },
        { id: 'BillingFinance-Outstanding', label: 'Outstanding', icon: iconChart },
      ],
    },
    {
      id: 'ContractAgreement',
      label: 'Contract & Agreement',
      icon: iconEdit,
      children: [
        { id: 'ContractAgreement-Contracts', label: 'Contracts', icon: iconFile },
        { id: 'ContractAgreement-Agreements', label: 'Agreements', icon: iconFile },
        { id: 'ContractAgreement-Renewals', label: 'Renewals', icon: iconRefresh },
      ],
    },
    {
      id: 'OperationsLogistics',
      label: 'Operations & Logistics',
      icon: iconTruck,
      children: [
        { id: 'OperationsLogistics-Fleet', label: 'Fleet', icon: iconTruck },
        { id: 'OperationsLogistics-Routes', label: 'Routes', icon: iconMap },
        { id: 'OperationsLogistics-Collection', label: 'Collection', icon: iconBox },
        { id: 'OperationsLogistics-Barcode', label: 'Barcode', icon: iconChart },
      ],
    },
    {
      id: 'MasterData',
      label: 'Master Data',
      icon: iconSettings,
      children: [
        { id: 'MasterData-Company', label: 'Company', icon: iconBuilding },
        { id: 'MasterData-HCF', label: 'HCF', icon: iconSettings },
        { id: 'MasterData-User', label: 'User', icon: iconUser },
        { id: 'MasterData-Fleet', label: 'Fleet', icon: iconTruck },
      ],
    },
    {
      id: 'ComplianceTraining',
      label: 'Compliance & Training',
      icon: iconCheck,
      children: [
        { id: 'ComplianceTraining-Certificates', label: 'Certificates', icon: iconCheck },
        { id: 'ComplianceTraining-Compliance', label: 'Compliance', icon: iconCheck },
      ],
    },
  ];

  const allReports: Report[] = [
    {
      id: 'invoice-report',
      category: 'BillingFinance',
      title: 'Invoice Report',
      description: 'Generate invoice reports with filters',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ),
      path: '/report/invoice',
      parameters: ['Company', 'HCF', 'Date Range', 'Status', 'Billing Type'],
      indicators: ['popular'],
      reportType: 'Transactional',
      ownership: 'System',
      isFavorite: true,
    },
    {
      id: 'payment-report',
      category: 'BillingFinance',
      title: 'Payment Report',
      description: 'Track payments and receipts',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      ),
      path: '/report/payment',
      parameters: ['Company', 'Date Range', 'Payment Status', 'Payment Mode'],
      indicators: ['popular'],
      reportType: 'Transactional',
      ownership: 'System',
      isFavorite: true,
    },
    {
      id: 'revenue-report',
      category: 'BillingFinance',
      title: 'Revenue Analysis Report',
      description: 'Analyze revenue by period and company',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="20" x2="12" y2="10"></line>
          <line x1="18" y1="20" x2="18" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="16"></line>
        </svg>
      ),
      path: '/report/revenue',
      parameters: ['Company', 'Date Range', 'Group By', 'HCF'],
      indicators: ['popular'],
      reportType: 'Analytics',
      ownership: 'System',
      isFavorite: true,
    },
    {
      id: 'outstanding-report',
      category: 'BillingFinance',
      title: 'Outstanding Amount Report',
      description: 'View outstanding payments and aging analysis',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      ),
      path: '/report/outstanding',
      parameters: ['Company', 'HCF', 'Date Range', 'Aging Period'],
      reportType: 'Analytics',
      ownership: 'Shared',
    },
    {
      id: 'contract-report',
      category: 'ContractAgreement',
      title: 'Contract Report',
      description: 'Generate contract reports with status and dates',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ),
      path: '/report/contract',
      parameters: ['Company', 'HCF', 'Status', 'Date Range', 'Billing Type'],
      indicators: ['restricted'],
      reportType: 'Transactional',
      ownership: 'Shared',
    },
    {
      id: 'agreement-report',
      category: 'ContractAgreement',
      title: 'Agreement Report',
      description: 'View agreement documents and status',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <path d="M9 15l2 2 4-4"></path>
        </svg>
      ),
      path: '/report/agreement',
      parameters: ['Company', 'Contract', 'Status', 'Date Range'],
      reportType: 'Transactional',
      ownership: 'My Reports',
    },
    {
      id: 'contract-renewal-report',
      category: 'ContractAgreement',
      title: 'Contract Renewal Report',
      description: 'Track contracts due for renewal',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      ),
      path: '/report/contract-renewal',
      parameters: ['Company', 'Renewal Period', 'Days Before Expiry'],
      reportType: 'Analytics',
      ownership: 'Shared',
    },
    {
      id: 'fleet-report',
      category: 'OperationsLogistics',
      title: 'Fleet Management Report',
      description: 'Vehicle and fleet utilization reports',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"></path>
          <polygon points="12 15 17 21 7 21 12 15"></polygon>
        </svg>
      ),
      path: '/report/fleet',
      parameters: ['Company', 'Vehicle Type', 'Status', 'Compliance Status'],
      reportType: 'Master',
      ownership: 'System',
    },
    {
      id: 'route-report',
      category: 'OperationsLogistics',
      title: 'Route Report',
      description: 'Route performance and assignment reports',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      ),
      path: '/report/route',
      parameters: ['Company', 'Route Code', 'Status', 'HCF'],
      indicators: ['beta'],
      reportType: 'Master',
      ownership: 'System',
    },
    {
      id: 'barcode-report',
      category: 'OperationsLogistics',
      title: 'Barcode Usage Report',
      description: 'Track barcode generation and usage',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect>
          <line x1="7" y1="8" x2="7" y2="16"></line>
          <line x1="11" y1="8" x2="11" y2="16"></line>
          <line x1="15" y1="8" x2="15" y2="16"></line>
        </svg>
      ),
      path: '/report/barcode',
      parameters: ['Company', 'Status', 'Date Range', 'Assigned Entity'],
      reportType: 'Transactional',
      ownership: 'My Reports',
    },
    {
      id: 'collection-report',
      category: 'OperationsLogistics',
      title: 'Waste Collection Report',
      description: 'Daily/weekly/monthly collection reports',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
      ),
      path: '/report/collection',
      parameters: ['Company', 'HCF', 'Date Range', 'Route', 'Weight Range'],
      indicators: ['popular'],
      reportType: 'Transactional',
      ownership: 'System',
      isFavorite: true,
    },
    {
      id: 'company-report',
      category: 'MasterData',
      title: 'Company Master Report',
      description: 'Company information and details report',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
      path: '/report/company',
      parameters: ['Status', 'State', 'PCB Zone', 'GST Status'],
      reportType: 'Master',
      ownership: 'System',
    },
    {
      id: 'hcf-report',
      category: 'MasterData',
      title: 'HCF Master Report',
      description: 'Healthcare facility information report',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
      path: '/report/hcf',
      parameters: ['Company', 'HCF Type', 'Status', 'State', 'District', 'Category'],
      reportType: 'Master',
      ownership: 'System',
    },
    {
      id: 'user-report',
      category: 'MasterData',
      title: 'User Report',
      description: 'User and role assignment reports',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      ),
      path: '/report/user',
      parameters: ['Company', 'Role', 'Status', 'Employment Type', 'Department'],
      indicators: ['restricted'],
      reportType: 'Master',
      ownership: 'Shared',
    },
    {
      id: 'fleet-master-report',
      category: 'MasterData',
      title: 'Fleet Master Report',
      description: 'Vehicle master data report',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"></path>
          <polygon points="12 15 17 21 7 21 12 15"></polygon>
        </svg>
      ),
      path: '/report/fleet-master',
      parameters: ['Company', 'Vehicle Make', 'Status', 'Compliance Status', 'Owner Type'],
      reportType: 'Master',
      ownership: 'System',
    },
    {
      id: 'training-certificate-report',
      category: 'ComplianceTraining',
      title: 'Training Certificate Report',
      description: 'Staff training and certification reports',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <path d="M9 15l2 2 4-4"></path>
        </svg>
      ),
      path: '/report/training-certificate',
      parameters: ['Company', 'HCF', 'Training Date Range', 'Status', 'Staff Designation'],
      reportType: 'Transactional',
      ownership: 'Shared',
    },
    {
      id: 'compliance-report',
      category: 'ComplianceTraining',
      title: 'Compliance Status Report',
      description: 'Compliance tracking and status reports',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      ),
      path: '/report/compliance',
      parameters: ['Company', 'HCF', 'Compliance Type', 'Status', 'Date Range'],
      reportType: 'Analytics',
      ownership: 'System',
    },
  ];

  // Filter reports
  const filteredReports = allReports.filter(report => {
    const matchesSearch = 
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.parameters.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'All' || 
      report.category === selectedCategory ||
      selectedCategory.startsWith(report.category + '-');
    
    const matchesFilters = 
      (!filters.reportType || report.reportType === filters.reportType) &&
      (!filters.ownership || report.ownership === filters.ownership) &&
      (!filters.favorites || favoriteReports.has(report.id) || report.isFavorite);
    
    return matchesSearch && matchesCategory && matchesFilters;
  });

  // Close popovers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryPopoverRef.current && !categoryPopoverRef.current.contains(event.target as Node)) {
        setIsCategoryPopoverOpen(false);
      }
      if (filtersDrawerRef.current && !filtersDrawerRef.current.contains(event.target as Node)) {
        if (!(event.target as HTMLElement).closest('.filters-toggle-btn')) {
          setIsFiltersOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSelectedCategoryLabel = () => {
    if (selectedCategory === 'All') return 'All Reports';
    const findCategory = (categories: ReportCategory[], id: string): ReportCategory | null => {
      for (const cat of categories) {
        if (cat.id === id) return cat;
        if (cat.children) {
          const found = findCategory(cat.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    const category = findCategory(reportCategories, selectedCategory);
    return category?.label || 'All Reports';
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setIsCategoryPopoverOpen(false);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.reportType) count++;
    if (filters.ownership) count++;
    if (filters.favorites) count++;
    return count;
  };

  const toggleFavorite = (reportId: string) => {
    setFavoriteReports(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reportId)) {
        newSet.delete(reportId);
      } else {
        newSet.add(reportId);
      }
      return newSet;
    });
  };

  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ), 
      active: location.pathname === '/dashboard' 
    },
    { 
      path: '/transaction', 
      label: 'Transaction', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
      ), 
      active: location.pathname === '/transaction' || location.pathname.startsWith('/transaction')
    },
    { 
      path: '/finance', 
      label: 'Finance', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      ), 
      active: location.pathname === '/finance' || location.pathname.startsWith('/finance')
    },
    { 
      path: '/commercial-agreements', 
      label: 'Commercial / Agreements', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ), 
      active: location.pathname === '/commercial-agreements' || location.pathname.startsWith('/commercial-agreements')
    },
    { 
      path: '/compliance-training', 
      label: 'Compliance & Training', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <path d="M9 15l2 2 4-4"></path>
        </svg>
      ), 
      active: location.pathname === '/compliance-training' || location.pathname.startsWith('/compliance-training')
    },
    { 
      path: '/master', 
      label: 'Masters', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
        </svg>
      ), 
      active: location.pathname.startsWith('/master') 
    },
    { 
      path: '/report', 
      label: 'Reports', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ), 
      active: location.pathname.startsWith('/report') 
    },
  ];

  return (
    <AppLayout navItems={navItems}>
      <div className="reports-page">
        {/* Page Header - Not sticky, matches Masters page */}
        <div className="reports-header">
          <div className="reports-header-content">
            {/* Breadcrumb - Matches Masters page format */}
            <div className="header-left">
              <span className="breadcrumb">/ Dashboard / Reports</span>
            </div>
          </div>
        </div>

        {/* Compact Filters Drawer */}
        {isFiltersOpen && (
          <div className="filters-drawer-compact" ref={filtersDrawerRef}>
            <div className="filters-drawer-header-compact">
              <h3>Filters</h3>
              <button
                className="filters-drawer-close"
                onClick={() => setIsFiltersOpen(false)}
                aria-label="Close filters"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="filters-drawer-content-compact">
              {/* Report Type Filter */}
              <div className="filter-section-compact">
                <label className="filter-section-label">Report Type</label>
                <div className="filter-segmented-buttons">
                  <button
                    className={`segmented-btn ${!filters.reportType ? 'active' : ''}`}
                    onClick={() => setFilters({ ...filters, reportType: '' })}
                  >
                    All
                  </button>
                  <button
                    className={`segmented-btn ${filters.reportType === 'Transactional' ? 'active' : ''}`}
                    onClick={() => setFilters({ ...filters, reportType: 'Transactional' })}
                  >
                    Transactional
                  </button>
                  <button
                    className={`segmented-btn ${filters.reportType === 'Master' ? 'active' : ''}`}
                    onClick={() => setFilters({ ...filters, reportType: 'Master' })}
                  >
                    Master
                  </button>
                  <button
                    className={`segmented-btn ${filters.reportType === 'Analytics' ? 'active' : ''}`}
                    onClick={() => setFilters({ ...filters, reportType: 'Analytics' })}
                  >
                    Analytics
                  </button>
                </div>
              </div>

              {/* Ownership Filter */}
              <div className="filter-section-compact">
                <label className="filter-section-label">Ownership</label>
                <div className="filter-segmented-buttons">
                  <button
                    className={`segmented-btn ${!filters.ownership ? 'active' : ''}`}
                    onClick={() => setFilters({ ...filters, ownership: '' })}
                  >
                    All
                  </button>
                  <button
                    className={`segmented-btn ${filters.ownership === 'My Reports' ? 'active' : ''}`}
                    onClick={() => setFilters({ ...filters, ownership: 'My Reports' })}
                  >
                    My Reports
                  </button>
                  <button
                    className={`segmented-btn ${filters.ownership === 'Shared' ? 'active' : ''}`}
                    onClick={() => setFilters({ ...filters, ownership: 'Shared' })}
                  >
                    Shared
                  </button>
                  <button
                    className={`segmented-btn ${filters.ownership === 'System' ? 'active' : ''}`}
                    onClick={() => setFilters({ ...filters, ownership: 'System' })}
                  >
                    System
                  </button>
                </div>
              </div>

              {/* Favorites Toggle */}
              <div className="filter-section-compact">
                <label className="filter-section-label">Favorites</label>
                <div className="filter-toggle-wrapper">
                  <button
                    className={`filter-toggle-btn ${filters.favorites ? 'active' : ''}`}
                    onClick={() => setFilters({ ...filters, favorites: !filters.favorites })}
                    aria-pressed={filters.favorites}
                  >
                    <span className="filter-toggle-slider"></span>
                  </button>
                  <span className="filter-toggle-label">
                    {filters.favorites ? 'Show favorites only' : 'Show all reports'}
                  </span>
                </div>
              </div>

              {/* Clear Filters */}
              {getActiveFilterCount() > 0 && (
                <div className="filters-drawer-actions-compact">
                  <button
                    className="filter-clear-btn-compact"
                    onClick={() => setFilters({ reportType: '', ownership: '', favorites: false })}
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Wrapper - padding for content below header */}
        <div className="reports-content-wrapper">
          {/* Title Section - Inside Reports Container */}
          <div className="reports-title-section">
            <h1 className="reports-title">Reports</h1>
          </div>

          {/* Search Section - Matches Masters page */}
          <div className="reports-search-section">
          <div className="reports-search-box">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              className="reports-search-input"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search reports"
            />
          </div>

          {/* Compact Category Popover */}
          <div className="category-popover-wrapper" ref={categoryPopoverRef}>
            <button
              className="category-popover-toggle"
              onClick={() => setIsCategoryPopoverOpen(!isCategoryPopoverOpen)}
              aria-expanded={isCategoryPopoverOpen}
            >
              <span className="category-icon">{reportCategories.find(c => c.id === selectedCategory)?.icon || iconChart}</span>
              <span className="category-label">{getSelectedCategoryLabel()}</span>
              <svg className="category-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            {isCategoryPopoverOpen && (
              <div className="category-popover">
                {reportCategories.map((category) => (
                  <div key={category.id} className="category-group">
                    <button
                      className={`category-item ${selectedCategory === category.id ? 'active' : ''}`}
                      onClick={() => !category.children && handleCategorySelect(category.id)}
                    >
                      <span className="category-item-icon">{category.icon}</span>
                      <span className="category-item-label">{category.label}</span>
                      {category.children && (
                        <svg className="category-expand-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      )}
                    </button>
                    {category.children && (
                      <div className="category-children">
                        {category.children.map((child) => (
                          <button
                            key={child.id}
                            className={`category-item category-child ${selectedCategory === child.id ? 'active' : ''}`}
                            onClick={() => handleCategorySelect(child.id)}
                          >
                            <span className="category-item-icon">{child.icon}</span>
                            <span className="category-item-label">{child.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Filters Toggle Button */}
          <button
            className="filters-toggle-btn"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            aria-expanded={isFiltersOpen}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
            </svg>
            <span>Filters</span>
            {getActiveFilterCount() > 0 && (
              <span className="filter-count-badge">{getActiveFilterCount()}</span>
            )}
          </button>

          {/* Results Count */}
          <span className="results-count-inline">
            {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Reports Grid Container */}
        <div className="reports-grid-container">
          <div className="reports-grid">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              id={report.id}
              title={report.title}
              description={report.description}
              icon={report.icon}
              path={report.path}
              parameters={report.parameters}
              indicators={report.indicators}
            />
          ))}

          {/* Empty State */}
          {filteredReports.length === 0 && (
            <div className="reports-empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <h3>No reports found</h3>
              <p>Try adjusting your search or filter criteria</p>
            </div>
          )}
          </div>
        </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ReportPage;
