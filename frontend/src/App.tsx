import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/desktop/LoginPage';
import OTPVerificationPage from './pages/desktop/OTPVerificationPage';
import DashboardPage from './pages/desktop/DashboardPage';
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
import UserCreatePage from './pages/desktop/UserCreatePage';
import BillingFinanceReportPage from './pages/desktop/BillingFinanceReportPage';
import OperationsLogisticsReportPage from './pages/desktop/OperationsLogisticsReportPage';
import HCFComplianceReportPage from './pages/desktop/HCFComplianceReportPage';
import LoginPageMobile from './pages/mobile/LoginPage';
import UserCreatePageMobile from './pages/mobile/UserCreatePage';

const App = () => (
  <AuthProvider>
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify-otp" element={<OTPVerificationPage />} />
      <Route path="/mobile/login" element={<LoginPageMobile />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
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
        path="/compliance-training"
        element={
          <ProtectedRoute>
            <ComplianceTrainingPage />
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
        path="/report/billing-finance"
        element={
          <ProtectedRoute>
            <BillingFinanceReportPage />
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
  </AuthProvider>
);

export default App;
