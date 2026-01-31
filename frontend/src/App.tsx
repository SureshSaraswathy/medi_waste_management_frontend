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
import WasteCollectionPage from './pages/desktop/WasteCollectionPage';
import WasteTransactionPage from './pages/desktop/WasteTransactionPage';
import VehicleWasteCollectionPage from './pages/desktop/VehicleWasteCollectionPage';
import WasteProcessPage from './pages/desktop/WasteProcessPage';
import InvoiceManagementPage from './pages/desktop/InvoiceManagementPage';
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
        path="/mobile/assign-hospital"
        element={
          <ProtectedRoute>
            <MobileAssignHospitalPage />
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
      {/* Desktop routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      {/* Dashboard Configuration route - SuperAdmin only */}
      {/* This route is additive and does not affect existing navigation */}
      <Route
        path="/admin/dashboard-configuration"
        element={
          <ProtectedRoute>
            <DashboardConfigurationPage />
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
            <TransactionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction/barcode-generation"
        element={
          <ProtectedRoute>
            <BarcodeGenerationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction/route-assignment"
        element={
          <ProtectedRoute>
            <RouteAssignmentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction/waste-collection"
        element={
          <ProtectedRoute>
            <WasteCollectionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction/waste-transaction-data"
        element={
          <ProtectedRoute>
            <WasteTransactionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction/vehicle-wise-waste-collection"
        element={
          <ProtectedRoute>
            <VehicleWasteCollectionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaction/waste-processing"
        element={
          <ProtectedRoute>
            <WasteProcessPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance"
        element={
          <ProtectedRoute>
            <FinancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/commercial-agreements"
        element={
          <ProtectedRoute>
            <CommercialAgreementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/commercial-agreements/contract-master"
        element={
          <ProtectedRoute>
            <ContractMasterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/commercial-agreements/agreement"
        element={
          <ProtectedRoute>
            <AgreementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/commercial-agreements/agreement-clause"
        element={
          <ProtectedRoute>
            <AgreementClausePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/compliance-training"
        element={
          <ProtectedRoute>
            <ComplianceTrainingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/compliance-training/training-certificate-management"
        element={
          <ProtectedRoute>
            <TrainingCertificatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/master"
        element={
          <ProtectedRoute>
            <MasterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/company"
        element={
          <ProtectedRoute>
            <CompanyMasterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/state"
        element={
          <ProtectedRoute>
            <StateMasterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/area"
        element={
          <ProtectedRoute>
            <AreaMasterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/category"
        element={
          <ProtectedRoute>
            <CategoryMasterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/pcb-zone"
        element={
          <ProtectedRoute>
            <PCBZoneMasterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/route"
        element={
          <ProtectedRoute>
            <RouteMasterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/color-code"
        element={
          <ProtectedRoute>
            <ColorCodeMasterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/user-management"
        element={
          <ProtectedRoute>
            <UserManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/roles-permissions"
        element={
          <ProtectedRoute>
            <RolesPermissionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/hcf-master"
        element={
          <ProtectedRoute>
            <HCFMasterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/hcf-amendments"
        element={
          <ProtectedRoute>
            <HCFAmendmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/hcf-type"
        element={
          <ProtectedRoute>
            <HCFTypeMasterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/fleet-management"
        element={
          <ProtectedRoute>
            <FleetManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/route-hcf-mapping"
        element={
          <ProtectedRoute>
            <RouteHCFMappingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/master/frequency"
        element={
          <ProtectedRoute>
            <FrequencyMasterPage />
          </ProtectedRoute>
        }
      />
        <Route
          path="/finance/invoice-management"
          element={
            <ProtectedRoute>
              <InvoiceManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance/payment"
          element={
            <ProtectedRoute>
              <PaymentPage />
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
            <ReceiptManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/financial-balance-summary"
        element={
          <ProtectedRoute>
            <FinancialBalanceSummaryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report"
        element={
          <ProtectedRoute>
            <ReportPage />
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
