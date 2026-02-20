import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/layout/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import { DashboardProvider } from './context/DashboardContext';
import LoginPage from './pages/desktop/LoginPage';
import OTPVerificationPage from './pages/desktop/OTPVerificationPage';
import DashboardPage from './pages/desktop/DashboardPage';
import DashboardConfigurationPage from './pages/desktop/DashboardConfigurationPage';
import PermissionConfigurationPage from './pages/desktop/admin/PermissionConfigurationPage';
import NotAuthorizedPage from './pages/desktop/NotAuthorizedPage';
import TransactionPage from './pages/desktop/TransactionPage';
import FinancePage from './pages/desktop/FinancePage';
import CommercialAgreementsPage from './pages/desktop/CommercialAgreementsPage';
import ComplianceTrainingPage from './pages/desktop/ComplianceTrainingPage';
import MasterPage from './pages/desktop/MasterPage';
import CompanyMasterPage from './pages/desktop/CompanyMasterPage';
import StateMasterPage from './pages/desktop/StateMasterPage';
import AreaMasterPage from './pages/desktop/AreaMasterPage';
import CategoryMasterPage from './pages/desktop/CategoryMasterPage';
import PCBZoneMasterPage from './pages/desktop/PCBZoneMasterPage';
import RouteMasterPage from './pages/desktop/RouteMasterPage';
import ColorCodeMasterPage from './pages/desktop/ColorCodeMasterPage';
import UserManagementPage from './pages/desktop/UserManagementPage';
import RolesPermissionsPage from './pages/desktop/RolesPermissionsPage';
import HCFMasterPage from './pages/desktop/HCFMasterPage';
import HCFAmendmentsPage from './pages/desktop/HCFAmendmentsPage';
import HCFTypeMasterPage from './pages/desktop/HCFTypeMasterPage';
import FleetManagementPage from './pages/desktop/FleetManagementPage';
import RouteHCFMappingPage from './pages/desktop/RouteHCFMappingPage';
import FrequencyMasterPage from './pages/desktop/FrequencyMasterPage';
import RouteAssignmentPage from './pages/desktop/RouteAssignmentPage';
import IncidentRegisterPage from './pages/desktop/IncidentRegisterPage';
import IncinerationRegisterPage from './pages/desktop/IncinerationRegisterPage';
import AutoclaveRegisterPage from './pages/desktop/AutoclaveRegisterPage';
import ShredderRegisterPage from './pages/desktop/ShredderRegisterPage';
import DisposalRegisterPage from './pages/desktop/DisposalRegisterPage';
import EmissionRegisterPage from './pages/desktop/EmissionRegisterPage';
import ETPRegisterPage from './pages/desktop/ETPRegisterPage';
import DowntimeRegisterPage from './pages/desktop/DowntimeRegisterPage';
import WasteCollectionPage from './pages/desktop/WasteCollectionPage';
import WasteTransactionPage from './pages/desktop/WasteTransactionPage';
import VehicleWasteCollectionPage from './pages/desktop/VehicleWasteCollectionPage';
import WasteProcessPage from './pages/desktop/WasteProcessPage';
import InvoiceManagementPage from './pages/desktop/InvoiceManagementPage';
import GenerateInvoicesPage from './pages/desktop/GenerateInvoicesPage';
import DraftInvoiceBatchEditPage from './pages/desktop/DraftInvoiceBatchEditPage';
import PaymentPage from './pages/desktop/PaymentPage';
import PaymentSuccessPage from './pages/desktop/PaymentSuccessPage';
import ReceiptManagementPage from './pages/desktop/ReceiptManagementPage';
import FinancialBalanceSummaryPage from './pages/desktop/FinancialBalanceSummaryPage';
import BarcodeGenerationPage from './pages/desktop/BarcodeGenerationPage';
import TrainingCertificatePage from './pages/desktop/TrainingCertificatePage';
import ContractMasterPage from './pages/desktop/ContractMasterPage';
import AgreementPage from './pages/desktop/AgreementPage';
import AgreementClausePage from './pages/desktop/AgreementClausePage';
import UserCreatePage from './pages/desktop/UserCreatePage';
import ReportPage from './pages/desktop/ReportPage';
import BillingFinanceReportPage from './pages/desktop/BillingFinanceReportPage';
import OperationsLogisticsReportPage from './pages/desktop/OperationsLogisticsReportPage';
import HCFComplianceReportPage from './pages/desktop/HCFComplianceReportPage';
import InvoiceReportPage from './pages/desktop/reports/InvoiceReportPage';
import ContractReportPage from './pages/desktop/reports/ContractReportPage';
import HCFReportPage from './pages/desktop/reports/HCFReportPage';
import TrainingCertificateReportPage from './pages/desktop/reports/TrainingCertificateReportPage';
import PaymentReportPage from './pages/desktop/reports/PaymentReportPage';
import AgreementReportPage from './pages/desktop/reports/AgreementReportPage';
import BarcodeReportPage from './pages/desktop/reports/BarcodeReportPage';
import BarcodeUsageReportPage from './pages/desktop/reports/BarcodeUsageReportPage';
import UserReportPage from './pages/desktop/reports/UserReportPage';
import FleetReportPage from './pages/desktop/reports/FleetReportPage';
import RevenueReportPage from './pages/desktop/reports/RevenueReportPage';
import OutstandingReportPage from './pages/desktop/reports/OutstandingReportPage';
import ContractRenewalReportPage from './pages/desktop/reports/ContractRenewalReportPage';
import RouteReportPage from './pages/desktop/reports/RouteReportPage';
import CollectionReportPage from './pages/desktop/reports/CollectionReportPage';
import CompanyReportPage from './pages/desktop/reports/CompanyReportPage';
import ComplianceReportPage from './pages/desktop/reports/ComplianceReportPage';
import FleetMasterReportPage from './pages/desktop/reports/FleetMasterReportPage';
import LoginPageMobileFirst from './pages/mobile/LoginPageMobileFirst';
import UserCreatePageMobile from './pages/mobile/UserCreatePage';
import ProfilePage from './pages/desktop/ProfilePage';
import MobileHomePage from './pages/mobile/MobileHomePage';
import MobileScanPage from './pages/mobile/MobileScanPage';
import MobileWasteEntryPage from './pages/mobile/MobileWasteEntryPage';
import MobileAssignHospitalPage from './pages/mobile/MobileAssignHospitalPage';
import MobileHCFMasterPage from './pages/mobile/MobileHCFMasterPage';
import MobileSettingsPage from './pages/mobile/MobileSettingsPage';
import MobileProfilePage from './pages/mobile/MobileProfilePage';
import MobileWasteCollectionsPage from './pages/mobile/MobileWasteCollectionsPage';
import MobileAssignedHcfListPage from './pages/mobile/MobileAssignedHcfListPage';
import MobileAnalyticsPage from './pages/mobile/MobileAnalyticsPage';
import RequireAnyPermission from './components/layout/RequireAnyPermission';
import HCFForgotPasswordPage from './pages/desktop/HCFForgotPasswordPage';
import HCFResetPasswordPage from './pages/desktop/HCFResetPasswordPage';
import HCFChangePasswordPage from './pages/desktop/HCFChangePasswordPage';
import HCFDashboardPage from './pages/desktop/HCFDashboardPage';

// Wrapper component to provide Dashboard context
const AppWithDashboard = () => {
  const { user } = useAuthContext();
  return (
    <DashboardProvider user={user}>
      <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify-otp" element={<OTPVerificationPage />} />
      <Route path="/mobile/login" element={<LoginPageMobileFirst />} />
      {/* Mobile Routes */}
      <Route
        path="/mobile/home"
        element={
          <ProtectedRoute>
            <MobileHomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mobile/scan"
        element={
          <ProtectedRoute>
            <MobileScanPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mobile/waste-entry"
        element={
          <ProtectedRoute>
            <MobileWasteEntryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mobile/waste-collections"
        element={
          <ProtectedRoute>
            <MobileWasteCollectionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mobile/assign-hospital"
        element={
          <ProtectedRoute>
            <MobileAssignHospitalPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mobile/assigned-hcfs"
        element={
          <ProtectedRoute>
            <MobileAssignedHcfListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mobile/analytics"
        element={
          <ProtectedRoute>
            <MobileAnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mobile/hcf-master"
        element={
          <ProtectedRoute>
            <MobileHCFMasterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mobile/profile"
        element={
          <ProtectedRoute>
            <MobileProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mobile/settings"
        element={
          <ProtectedRoute>
            <MobileSettingsPage />
          </ProtectedRoute>
        }
      />
      {/* Desktop routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/not-authorized"
        element={
          <ProtectedRoute>
            <NotAuthorizedPage />
          </ProtectedRoute>
        }
      />
      {/* Dashboard Configuration route - SuperAdmin only */}
      {/* This route is additive and does not affect existing navigation */}
      <Route
        path="/admin/dashboard-configuration"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['DASHBOARD_CONFIG_UPDATE', 'DASHBOARD_CONFIG.UPDATE']}>
              <DashboardConfigurationPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      {/* Permission Configuration route - SuperAdmin only (UI gated) */}
      <Route
        path="/admin/permission-configuration"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['ROLE_PERMISSIONS_MANAGE', 'ROLE_PERMISSIONS.MANAGE']}>
              <PermissionConfigurationPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['MENU_TRANSACTION_VIEW', 'MENU_TRANSACTION.VIEW']}>
              <TransactionPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction/barcode-generation"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['BARCODE_LABEL_VIEW', 'BARCODE_LABEL_CREATE', 'BARCODE_LABEL_DELETE']}>
              <BarcodeGenerationPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction/route-assignment"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['ROUTE_ASSIGNMENT_VIEW', 'ROUTE_ASSIGNMENT_CREATE', 'ROUTE_ASSIGNMENT_EDIT']}>
              <RouteAssignmentPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction/incident-register"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['INCIDENT_REGISTER_VIEW', 'INCIDENT_REGISTER_CREATE', 'INCIDENT_REGISTER_EDIT']}>
              <IncidentRegisterPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction/incineration-register"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['INCINERATION_REGISTER_VIEW', 'INCINERATION_REGISTER_CREATE', 'INCINERATION_REGISTER_EDIT']}>
              <IncinerationRegisterPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction/autoclave-register"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['AUTOCLAVE_REGISTER_VIEW', 'AUTOCLAVE_REGISTER_CREATE', 'AUTOCLAVE_REGISTER_EDIT']}>
              <AutoclaveRegisterPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction/shredder-register"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['SHREDDER_REGISTER_VIEW', 'SHREDDER_REGISTER_CREATE', 'SHREDDER_REGISTER_EDIT']}>
              <ShredderRegisterPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction/disposal-register"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['DISPOSAL_REGISTER_VIEW', 'DISPOSAL_REGISTER_CREATE', 'DISPOSAL_REGISTER_EDIT']}>
              <DisposalRegisterPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction/emission-register"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['EMISSION_REGISTER_VIEW', 'EMISSION_REGISTER_CREATE', 'EMISSION_REGISTER_EDIT']}>
              <EmissionRegisterPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction/etp-register"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['ETP_REGISTER_VIEW', 'ETP_REGISTER_CREATE', 'ETP_REGISTER_EDIT']}>
              <ETPRegisterPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction/downtime-register"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['DOWNTIME_REGISTER_VIEW', 'DOWNTIME_REGISTER_CREATE', 'DOWNTIME_REGISTER_EDIT']}>
              <DowntimeRegisterPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction/waste-collection"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['WASTE_COLLECTION_VIEW', 'WASTE_COLLECTION_CREATE', 'WASTE_COLLECTION_EDIT']}>
              <WasteCollectionPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction/waste-transaction-data"
        element={
          <ProtectedRoute>
            <RequireAnyPermission
              anyOf={[
                'WASTE_TRANSACTION_VIEW',
                'WASTE_TRANSACTION_CREATE',
                'WASTE_TRANSACTION_EDIT',
                'WASTE_TRANSACTION_VERIFY',
              ]}
            >
              <WasteTransactionPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction/vehicle-wise-waste-collection"
        element={
          <ProtectedRoute>
            <RequireAnyPermission
              anyOf={[
                'VEHICLE_WASTE_COLLECTION_VIEW',
                'VEHICLE_WASTE_COLLECTION_CREATE',
                'VEHICLE_WASTE_COLLECTION_EDIT',
                'VEHICLE_WASTE_COLLECTION_VERIFY',
              ]}
            >
              <VehicleWasteCollectionPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction/waste-processing"
        element={
          <ProtectedRoute>
            <RequireAnyPermission
              anyOf={[
                'WASTE_PROCESS_VIEW',
                'WASTE_PROCESS_CREATE',
                'WASTE_PROCESS_EDIT',
                'WASTE_PROCESS_VERIFY',
                'WASTE_PROCESS_CLOSE',
              ]}
            >
              <WasteProcessPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['MENU_FINANCE_VIEW', 'MENU_FINANCE.VIEW', 'FINANCE_VIEW', 'FINANCE.VIEW']}>
              <FinancePage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/commercial-agreements"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['MENU_COMMERCIAL_VIEW', 'MENU_COMMERCIAL.VIEW']}>
              <CommercialAgreementsPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/commercial-agreements/contract-master"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['CONTRACT_VIEW', 'CONTRACT_CREATE', 'CONTRACT_EDIT', 'CONTRACT_DELETE']}>
              <ContractMasterPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/commercial-agreements/agreement"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['AGREEMENT_VIEW', 'AGREEMENT_CREATE', 'AGREEMENT_EDIT', 'AGREEMENT_DELETE']}>
              <AgreementPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/commercial-agreements/agreement-clause"
        element={
          <ProtectedRoute>
            <RequireAnyPermission
              anyOf={[
                'AGREEMENT_CLAUSE_VIEW',
                'AGREEMENT_CLAUSE_CREATE',
                'AGREEMENT_CLAUSE_EDIT',
                'AGREEMENT_CLAUSE_DELETE',
              ]}
            >
              <AgreementClausePage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/compliance-training"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['MENU_COMPLIANCE_VIEW', 'MENU_COMPLIANCE.VIEW']}>
              <ComplianceTrainingPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/compliance-training/training-certificate-management"
        element={
          <ProtectedRoute>
            <RequireAnyPermission
              anyOf={[
                'TRAINING_CERTIFICATE_VIEW',
                'TRAINING_CERTIFICATE_CREATE',
                'TRAINING_CERTIFICATE_EDIT',
                'TRAINING_CERTIFICATE_DELETE',
              ]}
            >
              <TrainingCertificatePage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/master"
        element={
          <ProtectedRoute>
            {/* Permission gating:
             * - Prefer explicit MENU_MASTER_VIEW
             * - Backward compatibility: allow MASTER/MASTERS view permissions as well
             */}
            <RequireAnyPermission
              anyOf={[
                'MENU_MASTER_VIEW',
                'MENU_MASTER.VIEW',
                'MASTERS_VIEW',
                'MASTERS.VIEW',
                'MASTER_VIEW',
                'MASTER.VIEW',
              ]}
            >
              <MasterPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/company"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['COMPANY_VIEW', 'COMPANY_CREATE', 'COMPANY_EDIT', 'COMPANY_DELETE']}>
              <CompanyMasterPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/state"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['STATE_VIEW', 'STATE_CREATE', 'STATE_EDIT', 'STATE_DELETE']}>
              <StateMasterPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/area"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['AREA_VIEW', 'AREA_CREATE', 'AREA_EDIT', 'AREA_DELETE']}>
              <AreaMasterPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/category"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['CATEGORY_VIEW', 'CATEGORY_CREATE', 'CATEGORY_EDIT', 'CATEGORY_DELETE']}>
              <CategoryMasterPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/pcb-zone"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['PCB_ZONE_VIEW', 'PCB_ZONE_CREATE', 'PCB_ZONE_EDIT', 'PCB_ZONE_DELETE']}>
              <PCBZoneMasterPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/route"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['ROUTE_VIEW', 'ROUTE_CREATE', 'ROUTE_EDIT', 'ROUTE_DELETE']}>
              <RouteMasterPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/color-code"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['COLOR_VIEW', 'COLOR_CREATE', 'COLOR_EDIT', 'COLOR_DELETE']}>
              <ColorCodeMasterPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/user-management"
        element={
          <ProtectedRoute>
            <RequireAnyPermission
              anyOf={['USER_VIEW', 'USER_CREATE', 'USER_EDIT', 'USER_DELETE', 'USER_ACTIVATE', 'USER_DEACTIVATE']}
            >
              <UserManagementPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/roles-permissions"
        element={
          <ProtectedRoute>
            <RequireAnyPermission
              anyOf={['ROLE_VIEW', 'ROLE_CREATE', 'ROLE_EDIT', 'ROLE_DELETE', 'ROLE_PERMISSIONS_MANAGE']}
            >
              <RolesPermissionsPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/hcf-master"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['HCF_VIEW', 'HCF_CREATE', 'HCF_EDIT', 'HCF_DELETE']}>
              <HCFMasterPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/hcf-amendments"
        element={
          <ProtectedRoute>
            <RequireAnyPermission
              anyOf={['HCF_AMENDMENT_VIEW', 'HCF_AMENDMENT_CREATE', 'HCF_AMENDMENT_EDIT', 'HCF_AMENDMENT_DELETE']}
            >
              <HCFAmendmentsPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/hcf-type"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['HCF_TYPE_VIEW', 'HCF_TYPE_CREATE', 'HCF_TYPE_EDIT', 'HCF_TYPE_DELETE']}>
              <HCFTypeMasterPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/fleet-management"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['FLEET_VIEW', 'FLEET_CREATE', 'FLEET_EDIT', 'FLEET_DELETE']}>
              <FleetManagementPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/route-hcf-mapping"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['ROUTE_HCF_VIEW', 'ROUTE_HCF_CREATE', 'ROUTE_HCF_EDIT', 'ROUTE_HCF_DELETE']}>
              <RouteHCFMappingPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/frequency"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['FREQUENCY_VIEW', 'FREQUENCY_CREATE', 'FREQUENCY_EDIT', 'FREQUENCY_DELETE']}>
              <FrequencyMasterPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
        <Route
          path="/finance/invoice-management"
          element={
            <ProtectedRoute>
              <RequireAnyPermission anyOf={['INVOICE_VIEW', 'INVOICE_CREATE', 'INVOICE_UPDATE', 'INVOICE_DELETE']}>
                <InvoiceManagementPage />
              </RequireAnyPermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance/generate-invoices"
          element={
            <ProtectedRoute>
              <RequireAnyPermission anyOf={['INVOICE_CREATE']}>
                <GenerateInvoicesPage />
              </RequireAnyPermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance/draft-invoices/:batchId"
          element={
            <ProtectedRoute>
              <RequireAnyPermission anyOf={['INVOICE_CREATE', 'INVOICE_UPDATE']}>
                <DraftInvoiceBatchEditPage />
              </RequireAnyPermission>
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance/payment"
          element={
            <ProtectedRoute>
              <RequireAnyPermission anyOf={['INVOICE_VIEW', 'INVOICE_CREATE']}>
                <PaymentPage />
              </RequireAnyPermission>
            </ProtectedRoute>
          }
        />
      <Route
        path="/finance/payment-success"
        element={
          <ProtectedRoute>
            <PaymentSuccessPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/receipt-management"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['INVOICE_VIEW', 'INVOICE_CREATE']}>
              <ReceiptManagementPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/financial-balance-summary"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['INVOICE_VIEW', 'INVOICE_CREATE']}>
              <FinancialBalanceSummaryPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/report"
        element={
          <ProtectedRoute>
            <RequireAnyPermission anyOf={['MENU_REPORTS_VIEW', 'MENU_REPORTS.VIEW', 'REPORTS_VIEW', 'REPORTS.VIEW']}>
              <ReportPage />
            </RequireAnyPermission>
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/invoice"
        element={
          <ProtectedRoute>
            <InvoiceReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/contract"
        element={
          <ProtectedRoute>
            <ContractReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/hcf"
        element={
          <ProtectedRoute>
            <HCFReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/training-certificate"
        element={
          <ProtectedRoute>
            <TrainingCertificateReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/payment"
        element={
          <ProtectedRoute>
            <PaymentReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/agreement"
        element={
          <ProtectedRoute>
            <AgreementReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/barcode"
        element={
          <ProtectedRoute>
            <BarcodeUsageReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/barcode-usage"
        element={
          <ProtectedRoute>
            <BarcodeUsageReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/user"
        element={
          <ProtectedRoute>
            <UserReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/fleet"
        element={
          <ProtectedRoute>
            <FleetReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/revenue"
        element={
          <ProtectedRoute>
            <RevenueReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/outstanding"
        element={
          <ProtectedRoute>
            <OutstandingReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/contract-renewal"
        element={
          <ProtectedRoute>
            <ContractRenewalReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/route"
        element={
          <ProtectedRoute>
            <RouteReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/collection"
        element={
          <ProtectedRoute>
            <CollectionReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/company"
        element={
          <ProtectedRoute>
            <CompanyReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/compliance"
        element={
          <ProtectedRoute>
            <ComplianceReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/fleet-master"
        element={
          <ProtectedRoute>
            <FleetMasterReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/billing-finance"
        element={
          <ProtectedRoute>
            <BillingFinanceReportPage />
          </ProtectedRoute>
        }
      />
      {/* Backwards compatibility - redirect old report paths to new ones */}
      <Route
        path="/report/billing-finance/invoice-generation"
        element={
          <ProtectedRoute>
            <InvoiceReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/billing-finance/unbilled-services"
        element={
          <ProtectedRoute>
            <InvoiceReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/billing-finance/outstanding-payments"
        element={
          <ProtectedRoute>
            <OutstandingReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/billing-finance/pending-payments"
        element={
          <ProtectedRoute>
            <PaymentReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/billing-finance/cost-revenue-analysis"
        element={
          <ProtectedRoute>
            <RevenueReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/operations-logistics"
        element={
          <ProtectedRoute>
            <OperationsLogisticsReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/hcf-compliance"
        element={
          <ProtectedRoute>
            <HCFComplianceReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users/new"
        element={
          <AppShell>
            <ProtectedRoute roles={['admin']}>
              <UserCreatePage />
            </ProtectedRoute>
          </AppShell>
        }
      />
      <Route
        path="/mobile/users/new"
        element={
          <AppShell>
            <ProtectedRoute roles={['admin', 'manager']}>
              <UserCreatePageMobile />
            </ProtectedRoute>
          </AppShell>
        }
      />
      {/* HCF Routes */}
      <Route path="/hcf/forgot-password" element={<HCFForgotPasswordPage />} />
      <Route path="/hcf/reset-password" element={<HCFResetPasswordPage />} />
      <Route
        path="/hcf/change-password"
        element={
          <ProtectedRoute>
            <HCFChangePasswordPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hcf/dashboard"
        element={
          <ProtectedRoute>
            <HCFDashboardPage />
          </ProtectedRoute>
        }
      />
      {/* TODO: Add more HCF routes: /hcf/profile, /hcf/invoices, /hcf/payments, /hcf/waste-entries */}
      </Routes>
    </DashboardProvider>
  );
};

const App = () => (
  <AuthProvider>
    <AppWithDashboard />
  </AuthProvider>
);

export default App;
