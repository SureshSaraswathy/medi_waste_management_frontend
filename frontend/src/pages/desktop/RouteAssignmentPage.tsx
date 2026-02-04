import { useMemo, useState, useEffect, useCallback } from 'react';
import { userService, UserResponse } from '../../services/userService';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { routeAssignmentService, RouteAssignmentResponse } from '../../services/routeAssignmentService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { routeService, RouteResponse } from '../../services/routeService';
import { fleetService, FleetResponse } from '../../services/fleetService';
import './routeAssignmentPage.css';
import '../desktop/dashboardPage.css';

interface RouteAssignment {
  id: string;
  assignmentDate: string;
  routeId: string;
  routeCode: string;
  routeName: string;
  vehicleId: string;
  vehicleNum: string;
  driverId: string;
  driverName: string;
  pickerId?: string | null;
  pickerName?: string;
  supervisorId?: string | null;
  supervisorName?: string;
  companyId: string;
  companyName: string;
  status: 'Draft' | 'Assigned' | 'In Progress' | 'Completed';
  notes?: string | null;
  createdBy?: string | null;
  createdOn: string;
  modifiedBy?: string | null;
  modifiedOn: string;
}

interface Company {
  id: string;
  companyCode: string;
  companyName: string;
  status: 'Active' | 'Inactive';
}

interface Route {
  id: string;
  routeCode: string;
  routeName: string;
  companyId: string;
  status: 'Active' | 'Inactive';
}

interface Vehicle {
  id: string;
  vehicleNum: string;
  companyId: string;
  status: 'Active' | 'Inactive';
}

interface User {
  id: string;
  userName: string;
  employeeCode?: string | null;
  companyId: string;
  status: string;
}

interface AdvancedFilters {
  route: string;
  vehicle: string;
  driver: string;
  picker: string;
  supervisor: string;
}

const RouteAssignmentPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<RouteAssignment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    route: '',
    vehicle: '',
    driver: '',
    picker: '',
    supervisor: '',
  });

  // Master data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [pickers, setPickers] = useState<User[]>([]);
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<RouteAssignment[]>([]);

  // Load companies
  const loadCompanies = useCallback(async () => {
    try {
      const apiCompanies = await companyService.getAllCompanies(true);
      const mappedCompanies: Company[] = apiCompanies.map((c: CompanyResponse) => ({
        id: c.id,
        companyCode: c.companyCode,
        companyName: c.companyName,
        status: c.status,
      }));
      setCompanies(mappedCompanies);
    } catch (err) {
      console.error('Error loading companies:', err);
    }
  }, []);

  // Load routes
  const loadRoutes = useCallback(async (companyId?: string) => {
    try {
      // UI-only note: route service currently supports only `activeOnly` (no companyId param).
      // We load active routes and filter client-side when a companyId is provided.
      const apiRoutes = await routeService.getAllRoutes(true);
      const mappedRoutes: Route[] = apiRoutes.map((r: RouteResponse) => ({
        id: r.id,
        routeCode: r.routeCode,
        routeName: r.routeName,
        companyId: r.companyId,
        status: r.status,
      }));
      setRoutes(companyId ? mappedRoutes.filter((r) => r.companyId === companyId) : mappedRoutes);
    } catch (err) {
      console.error('Error loading routes:', err);
    }
  }, []);

  // Load vehicles
  const loadVehicles = useCallback(async (companyId?: string) => {
    try {
      const apiVehicles = await fleetService.getAllFleets(companyId, true);
      const mappedVehicles: Vehicle[] = apiVehicles.map((v: FleetResponse) => ({
        id: v.id,
        vehicleNum: v.vehicleNum,
        companyId: v.companyId,
        status: v.status,
      }));
      setVehicles(mappedVehicles);
    } catch (err) {
      console.error('Error loading vehicles:', err);
    }
  }, []);

  // Load users (drivers, pickers, supervisors) - will be loaded when company is selected
  const loadUsers = useCallback(async (companyId?: string) => {
    if (!companyId) {
      setDrivers([]);
      setPickers([]);
      setSupervisors([]);
      return;
    }
    try {
      // Load users for the selected company
      const apiUsers = await userService.getUsersByCompany(companyId);
      // Map to User interface
      const mappedUsers: User[] = apiUsers.map((u: UserResponse) => ({
        id: u.userId,
        userName: u.userName,
        employeeCode: u.employeeCode,
        companyId: u.companyId,
        status: u.status,
      }));
      // For now, we'll use all active users - you can filter by role later
      // Filter active users only
      const activeUsers = mappedUsers.filter((u) => u.status === 'Active');
      setDrivers(activeUsers);
      setPickers(activeUsers);
      setSupervisors(activeUsers);
    } catch (err) {
      console.error('Error loading users:', err);
      setDrivers([]);
      setPickers([]);
      setSupervisors([]);
    }
  }, []);

  // Load assignments
  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiAssignments = await routeAssignmentService.getAllRouteAssignments(
        undefined,
        selectedDate,
        statusFilter !== 'all' ? statusFilter : undefined
      );

      // Map backend response to frontend format with names
      const mappedAssignments: RouteAssignment[] = await Promise.all(
        apiAssignments.map(async (apiAssignment: RouteAssignmentResponse) => {
          const route = routes.find(r => r.id === apiAssignment.routeId);
          const vehicle = vehicles.find(v => v.id === apiAssignment.vehicleId);
          const driver = drivers.find(d => d.id === apiAssignment.driverId);
          const picker = apiAssignment.pickerId ? pickers.find(p => p.id === apiAssignment.pickerId) : null;
          const supervisor = apiAssignment.supervisorId ? supervisors.find(s => s.id === apiAssignment.supervisorId) : null;
          const company = companies.find(c => c.id === apiAssignment.companyId);

          return {
            id: apiAssignment.id,
            assignmentDate: apiAssignment.assignmentDate,
            routeId: apiAssignment.routeId,
            routeCode: route?.routeCode || '',
            routeName: route?.routeName || '',
            vehicleId: apiAssignment.vehicleId,
            vehicleNum: vehicle?.vehicleNum || '',
            driverId: apiAssignment.driverId,
            driverName: driver?.userName || '',
            pickerId: apiAssignment.pickerId,
            pickerName: picker?.userName,
            supervisorId: apiAssignment.supervisorId,
            supervisorName: supervisor?.userName,
            companyId: apiAssignment.companyId,
            companyName: company?.companyName || 'Unknown',
            status: apiAssignment.status,
            notes: apiAssignment.notes,
            createdBy: apiAssignment.createdBy,
            createdOn: apiAssignment.createdOn,
            modifiedBy: apiAssignment.modifiedBy,
            modifiedOn: apiAssignment.modifiedOn,
          };
        })
      );
      setAssignments(mappedAssignments);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load assignments';
      setError(errorMessage);
      console.error('Error loading assignments:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, statusFilter, routes, vehicles, drivers, pickers, supervisors, companies]);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      await loadCompanies();
    };
    initializeData();
  }, [loadCompanies]);

  // Load routes and vehicles when companies are loaded
  useEffect(() => {
    if (companies.length > 0) {
      loadRoutes();
      loadVehicles();
    }
  }, [companies, loadRoutes, loadVehicles]);

  // Load assignments when dependencies are ready
  useEffect(() => {
    if (routes.length > 0 && vehicles.length > 0) {
      loadAssignments();
    }
  }, [selectedDate, statusFilter, routes, vehicles, drivers, pickers, supervisors, companies, loadAssignments]);

  const filteredAssignments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const routeQuery = advancedFilters.route.trim().toLowerCase();
    const vehicleQuery = advancedFilters.vehicle.trim().toLowerCase();
    const driverQuery = advancedFilters.driver.trim().toLowerCase();
    const pickerQuery = advancedFilters.picker.trim().toLowerCase();
    const supervisorQuery = advancedFilters.supervisor.trim().toLowerCase();

    return assignments.filter((assignment) => {
      // Top search box: broad match across key fields
      const matchesSearch =
        !query ||
        assignment.routeCode.toLowerCase().includes(query) ||
        assignment.routeName.toLowerCase().includes(query) ||
        assignment.vehicleNum.toLowerCase().includes(query) ||
        assignment.driverName.toLowerCase().includes(query) ||
        assignment.pickerName?.toLowerCase().includes(query) ||
        assignment.supervisorName?.toLowerCase().includes(query) ||
        assignment.companyName.toLowerCase().includes(query);

      // Advanced filters: UI-only refinements, do not change backend API calls/contracts
      const matchesRoute =
        !routeQuery ||
        assignment.routeCode.toLowerCase().includes(routeQuery) ||
        assignment.routeName.toLowerCase().includes(routeQuery);
      const matchesVehicle = !vehicleQuery || assignment.vehicleNum.toLowerCase().includes(vehicleQuery);
      const matchesDriver = !driverQuery || assignment.driverName.toLowerCase().includes(driverQuery);
      const matchesPicker = !pickerQuery || (assignment.pickerName || '-').toLowerCase().includes(pickerQuery);
      const matchesSupervisor =
        !supervisorQuery || (assignment.supervisorName || '-').toLowerCase().includes(supervisorQuery);

      return matchesSearch && matchesRoute && matchesVehicle && matchesDriver && matchesPicker && matchesSupervisor;
    });
  }, [assignments, searchQuery, advancedFilters]);

  const handleAdd = () => {
    setEditingAssignment(null);
    setShowModal(true);
  };

  const handleEdit = (assignment: RouteAssignment) => {
    // Only allow editing Draft and Assigned assignments
    if (assignment.status === 'In Progress' || assignment.status === 'Completed') {
      setError('Cannot edit assignments that are In Progress or Completed');
      return;
    }
    setEditingAssignment(assignment);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this route assignment?')) {
      try {
        setLoading(true);
        setError(null);
        await routeAssignmentService.deleteRouteAssignment(id);
        setSuccessMessage('Assignment deleted successfully');
        await loadAssignments();
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete assignment';
        setError(errorMessage);
        console.error('Error deleting assignment:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (data: Partial<RouteAssignment>) => {
    try {
      setLoading(true);
      setError(null);

      if (editingAssignment) {
        // Update existing assignment
        await routeAssignmentService.updateRouteAssignment(editingAssignment.id, {
          status: data.status,
          pickerId: data.pickerId,
          supervisorId: data.supervisorId,
          notes: data.notes,
        });
        setSuccessMessage('Assignment updated successfully');
      } else {
        // Create new assignment
        const selectedCompany = companies.find(c => c.id === data.companyId);
        if (!selectedCompany) {
          setError('Please select a valid company');
          return;
        }

        await routeAssignmentService.createRouteAssignment({
          assignmentDate: selectedDate,
          routeId: data.routeId!,
          vehicleId: data.vehicleId!,
          driverId: data.driverId!,
          pickerId: data.pickerId,
          supervisorId: data.supervisorId,
          companyId: selectedCompany.id,
          status: data.status || 'Draft',
          notes: data.notes,
        });
        setSuccessMessage('Assignment created successfully');
      }

      setShowModal(false);
      setEditingAssignment(null);
      await loadAssignments();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save assignment';
      setError(errorMessage);
      console.error('Error saving assignment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (assignment: RouteAssignment, newStatus: 'Draft' | 'Assigned' | 'In Progress' | 'Completed') => {
    try {
      setLoading(true);
      setError(null);
      await routeAssignmentService.updateRouteAssignment(assignment.id, {
        status: newStatus,
      });
      setSuccessMessage(`Assignment status changed to ${newStatus}`);
      await loadAssignments();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status';
      setError(errorMessage);
      console.error('Error updating status:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'status-badge--draft';
      case 'Assigned':
        return 'status-badge--assigned';
      case 'In Progress':
        return 'status-badge--in-progress';
      case 'Completed':
        return 'status-badge--completed';
      default:
        return '';
    }
  };

  const canEdit = (assignment: RouteAssignment) => {
    return assignment.status === 'Draft' || assignment.status === 'Assigned';
  };

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  return (
    <div className="dashboard-page">
      {/* Left Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <span className="brand-name">MEDI-WASTE</span>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`nav-link ${item.active ? 'nav-link--active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-notification-btn" aria-label="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span className="notification-badge">3</span>
          </button>
          <Link
            to="/profile"
            className={`sidebar-profile-btn ${location.pathname === '/profile' ? 'sidebar-profile-btn--active' : ''}`}
            title="My Profile"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>Profile</span>
          </Link>
          <button onClick={logout} className="sidebar-logout-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <span className="breadcrumb">Home &nbsp;&gt;&nbsp; Route Assignment</span>
          </div>
        </header>

        {/* Success Message */}
        {successMessage && (
          <div className="ra-alert ra-alert--success" role="status" aria-live="polite">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="ra-alert-close" aria-label="Close success message">
              ×
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="ra-alert ra-alert--error" role="alert">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ra-alert-close" aria-label="Close error message">
              ×
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && !assignments.length && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading assignments...
          </div>
        )}

        <div className="route-assignment-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <h1 className="ra-page-title">Route Assignment</h1>
            <p className="ra-page-subtitle">Manage and assign routes to vehicles and drivers</p>
          </div>

          {/* Toolbar (template-style) */}
          <div className="ra-toolbar">
            <div className="ra-toolbar-left">
              <div className="ra-control">
                <label htmlFor="assignment-date">Assignment Date</label>
                <input
                  id="assignment-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="date-input"
                />
              </div>
              <div className="ra-control">
                <label htmlFor="status-filter">Status</label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="status-select"
                >
                  <option value="all">All Status</option>
                  <option value="Draft">Draft</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="ra-control ra-control--search">
                <label htmlFor="search">Search</label>
                <div className="search-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                  <input
                    id="search"
                    type="text"
                    placeholder="Search by route, vehicle, driver..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>
            </div>

            <div className="ra-toolbar-right">
              <button className="ra-btn ra-btn--secondary" onClick={() => setShowAdvancedFilters(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 3H2l8 9v7l4 2v-9l8-9z"></path>
                </svg>
                Filters
              </button>
              <button className="ra-btn ra-btn--primary" onClick={handleAdd}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Assignment
              </button>
            </div>
          </div>

          {/* Assignments Table */}
          <div className="route-assignment-table-container">
            <table className="route-assignment-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Route</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Picker</th>
                  <th>Supervisor</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-message">
                      {loading ? 'Loading...' : 'No assignments found for the selected date'}
                    </td>
                  </tr>
                ) : (
                  filteredAssignments.map((assignment) => (
                    <tr key={assignment.id} className={!canEdit(assignment) ? 'read-only-row' : ''}>
                      <td>{new Date(assignment.assignmentDate).toLocaleDateString()}</td>
                      <td>
                        {/* UI-only: single-line route display to match template and keep row height compact */}
                        <div className="route-info route-info--single" title={`${assignment.routeCode} - ${assignment.routeName}`}>
                          <span className="route-code">{assignment.routeCode}</span>
                          <span className="route-sep"> - </span>
                          <span className="route-name">{assignment.routeName}</span>
                        </div>
                      </td>
                      <td>{assignment.vehicleNum}</td>
                      <td>{assignment.driverName}</td>
                      <td>
                        {assignment.pickerName ? (
                          assignment.pickerName
                        ) : (
                          <span className="text-muted">Not assigned</span>
                        )}
                      </td>
                      <td>
                        {assignment.supervisorName ? (
                          assignment.supervisorName
                        ) : (
                          <span className="text-muted">Not assigned</span>
                        )}
                      </td>
                      <td>
                        <div className="ra-cell-center">
                          <span className={`status-badge ${getStatusBadgeClass(assignment.status)}`}>
                            {assignment.status}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons ra-actions">
                          {canEdit(assignment) && (
                            <>
                              <button
                                className="action-btn action-btn--view"
                                onClick={() => handleEdit(assignment)}
                                title="View"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                  <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                              </button>
                              <button
                                className="action-btn action-btn--edit"
                                onClick={() => handleEdit(assignment)}
                                title="Edit"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              <button
                                className="action-btn action-btn--delete"
                                onClick={() => handleDelete(assignment.id)}
                                title="Delete"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              </button>
                            </>
                          )}
                          {assignment.status === 'Assigned' && (
                            <button
                              className="action-btn action-btn--start"
                              onClick={() => handleStatusChange(assignment, 'In Progress')}
                              title="Start Route"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                              </svg>
                            </button>
                          )}
                          {assignment.status === 'In Progress' && (
                            <button
                              className="action-btn action-btn--complete"
                              onClick={() => handleStatusChange(assignment, 'Completed')}
                              title="Complete Route"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            </button>
                          )}
                          {!canEdit(assignment) && (
                            <button
                              className="action-btn action-btn--view"
                              onClick={() => handleEdit(assignment)}
                              title="View (Read-only)"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="route-assignment-pagination-info">
            Showing {filteredAssignments.length} of {assignments.length} items
          </div>
        </div>
      </main>

      {/* Advanced Filters Modal (template-style). UI-only filters; backend APIs are unchanged. */}
      {showAdvancedFilters && (
        <AdvancedFiltersModal
          selectedDate={selectedDate}
          statusFilter={statusFilter}
          advancedFilters={advancedFilters}
          onClose={() => setShowAdvancedFilters(false)}
          onClear={() => {
            setAdvancedFilters({ route: '', vehicle: '', driver: '', picker: '', supervisor: '' });
            setStatusFilter('all');
            setSearchQuery('');
          }}
          onApply={(payload) => {
            setSelectedDate(payload.selectedDate);
            setStatusFilter(payload.statusFilter);
            setAdvancedFilters(payload.advancedFilters);
            setShowAdvancedFilters(false);
          }}
        />
      )}

      {/* Assignment Add/Edit Modal */}
      {showModal && (
        <AssignmentFormModal
          assignment={editingAssignment}
          companies={companies.filter(c => c.status === 'Active')}
          routes={routes.filter(r => r.status === 'Active')}
          vehicles={vehicles.filter(v => v.status === 'Active')}
          drivers={drivers}
          pickers={pickers}
          supervisors={supervisors}
          selectedDate={selectedDate}
          onLoadUsers={loadUsers}
          onClose={() => {
            setShowModal(false);
            setEditingAssignment(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Assignment Form Modal Component
interface AssignmentFormModalProps {
  assignment: RouteAssignment | null;
  companies: Company[];
  routes: Route[];
  vehicles: Vehicle[];
  drivers: User[];
  pickers: User[];
  supervisors: User[];
  selectedDate: string;
  onLoadUsers: (companyId?: string) => Promise<void>;
  onClose: () => void;
  onSave: (data: Partial<RouteAssignment>) => void;
}

const AssignmentFormModal = ({
  assignment,
  companies,
  routes,
  vehicles,
  drivers,
  pickers,
  supervisors,
  selectedDate,
  onLoadUsers,
  onClose,
  onSave,
}: AssignmentFormModalProps) => {
  const [formData, setFormData] = useState<Partial<RouteAssignment>>(
    assignment || {
      companyId: '',
      routeId: '',
      vehicleId: '',
      driverId: '',
      pickerId: null,
      supervisorId: null,
      status: 'Draft',
      notes: null,
    }
  );

  const isReadOnly = !!assignment && (assignment.status === 'In Progress' || assignment.status === 'Completed');

  // Load users when company is selected
  useEffect(() => {
    if (formData.companyId && !assignment) {
      onLoadUsers(formData.companyId);
    }
  }, [formData.companyId, assignment, onLoadUsers]);

  // Filter routes and vehicles based on selected company
  const filteredRoutes = formData.companyId
    ? routes.filter(route => route.companyId === formData.companyId)
    : routes;

  const filteredVehicles = formData.companyId
    ? vehicles.filter(vehicle => vehicle.companyId === formData.companyId)
    : vehicles;

  const filteredDrivers = formData.companyId
    ? drivers.filter(driver => driver.companyId === formData.companyId)
    : drivers;

  const filteredPickers = formData.companyId
    ? pickers.filter(picker => picker.companyId === formData.companyId)
    : pickers;

  const filteredSupervisors = formData.companyId
    ? supervisors.filter(supervisor => supervisor.companyId === formData.companyId)
    : supervisors;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay ra-assignment-modal-overlay" onClick={onClose}>
      <div className="modal-content ra-assignment-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header - match template */}
        <div className="ra-assignment-modal-header">
          <div className="ra-assignment-modal-titlewrap">
            <div className="ra-assignment-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
                <line x1="3" y1="9" x2="21" y2="9"></line>
              </svg>
            </div>
            <div>
              <h2 className="ra-assignment-modal-title">
                {assignment ? (isReadOnly ? 'View Assignment' : 'Edit Assignment') : 'Add Assignment'}
              </h2>
              <p className="ra-assignment-modal-subtitle">
                {assignment ? 'Update assignment details' : 'Create a new assignment.'}
              </p>
            </div>
          </div>
          <button className="ra-assignment-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Form - match template layout */}
        <form className="ra-assignment-form" onSubmit={handleSubmit}>
          <div className="ra-assignment-form-grid">
            {/* Left Column */}
            <div className="ra-assignment-form-col">
              <div className="ra-assignment-form-group">
                <label htmlFor="company">
                  Company Name <span className="ra-required">*</span>
                </label>
                <select
                  id="company"
                  value={formData.companyId || ''}
                  onChange={async (e) => {
                    const companyId = e.target.value;
                    setFormData({ ...formData, companyId, routeId: '', vehicleId: '', driverId: '', pickerId: null, supervisorId: null });
                    if (companyId) {
                      await onLoadUsers(companyId);
                    }
                  }}
                  required
                  disabled={!!assignment || isReadOnly}
                  className="ra-assignment-select"
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="assignment-date">
                  Date <span className="ra-required">*</span>
                </label>
                <input
                  id="assignment-date"
                  type="date"
                  value={assignment ? assignment.assignmentDate : selectedDate}
                  disabled={true}
                  className="ra-assignment-input"
                  placeholder="dd-mm-yyyy"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="vehicle">
                  Vehicle <span className="ra-required">*</span>
                </label>
                <select
                  id="vehicle"
                  value={formData.vehicleId || ''}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                  required
                  disabled={!formData.companyId || isReadOnly}
                  className="ra-assignment-select"
                >
                  <option value="">Select Vehicle</option>
                  {filteredVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.vehicleNum}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="picker">Picker</label>
                <select
                  id="picker"
                  value={formData.pickerId || ''}
                  onChange={(e) => setFormData({ ...formData, pickerId: e.target.value || null })}
                  disabled={!formData.companyId || isReadOnly}
                  className="ra-assignment-select"
                >
                  <option value="">Select Picker (Optional)</option>
                  {filteredPickers.map((picker) => (
                    <option key={picker.id} value={picker.id}>
                      {picker.userName} {picker.employeeCode ? `(${picker.employeeCode})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Column */}
            <div className="ra-assignment-form-col">
              <div className="ra-assignment-form-group">
                <label htmlFor="route">
                  Route <span className="ra-required">*</span>
                </label>
                <select
                  id="route"
                  value={formData.routeId || ''}
                  onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
                  required
                  disabled={!formData.companyId || isReadOnly}
                  className="ra-assignment-select"
                >
                  <option value="">Select Route</option>
                  {filteredRoutes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.routeCode} - {route.routeName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="driver">
                  Driver <span className="ra-required">*</span>
                </label>
                <select
                  id="driver"
                  value={formData.driverId || ''}
                  onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                  required
                  disabled={!formData.companyId || isReadOnly}
                  className="ra-assignment-select"
                >
                  <option value="">Select Driver</option>
                  {filteredDrivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.userName} {driver.employeeCode ? `(${driver.employeeCode})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="supervisor">Supervisor</label>
                <select
                  id="supervisor"
                  value={formData.supervisorId || ''}
                  onChange={(e) => setFormData({ ...formData, supervisorId: e.target.value || null })}
                  disabled={!formData.companyId || isReadOnly}
                  className="ra-assignment-select"
                >
                  <option value="">Select Supervisor (Optional)</option>
                  {filteredSupervisors.map((supervisor) => (
                    <option key={supervisor.id} value={supervisor.id}>
                      {supervisor.userName} {supervisor.employeeCode ? `(${supervisor.employeeCode})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={formData.status || 'Draft'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  disabled={isReadOnly}
                  className="ra-assignment-select"
                >
                  <option value="Draft">Draft</option>
                  <option value="Assigned">Assigned</option>
                  {assignment && (
                    <>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Modal Footer - match template */}
          <div className="ra-assignment-modal-footer">
            <button type="button" className="ra-assignment-btn ra-assignment-btn--cancel" onClick={onClose}>
              Cancel
            </button>
            {!isReadOnly && (
              <button type="submit" className="ra-assignment-btn ra-assignment-btn--primary">
                {assignment ? 'Update Assignment' : 'Create Assignment'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default RouteAssignmentPage;

interface AdvancedFiltersModalProps {
  selectedDate: string;
  statusFilter: string;
  advancedFilters: AdvancedFilters;
  onClose: () => void;
  onClear: () => void;
  onApply: (payload: { selectedDate: string; statusFilter: string; advancedFilters: AdvancedFilters }) => void;
}

const AdvancedFiltersModal = ({
  selectedDate,
  statusFilter,
  advancedFilters,
  onClose,
  onClear,
  onApply,
}: AdvancedFiltersModalProps) => {
  const [draftDate, setDraftDate] = useState(selectedDate);
  const [draftStatus, setDraftStatus] = useState(statusFilter);
  const [draft, setDraft] = useState<AdvancedFilters>(advancedFilters);

  return (
    <div className="modal-overlay ra-filter-modal-overlay" onClick={onClose}>
      <div className="modal-content ra-filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ra-filter-modal-header">
          <div className="ra-filter-modal-titlewrap">
            <div className="ra-filter-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 3H2l8 9v7l4 2v-9l8-9z"></path>
              </svg>
            </div>
            <div>
              <div className="ra-filter-title">Advanced Filters</div>
              <div className="ra-filter-subtitle">Filter assignments by multiple criteria</div>
            </div>
          </div>
          <button className="ra-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="ra-filter-modal-body">
          <div className="ra-filter-grid">
            <div className="ra-filter-field ra-filter-field--range">
              <label>Assignment Date</label>
              <div className="ra-filter-range">
                <input
                  type="date"
                  value={draftDate}
                  onChange={(e) => setDraftDate(e.target.value)}
                  className="ra-filter-input"
                />
              </div>
            </div>

            <div className="ra-filter-field">
              <label>Route</label>
              <input
                type="text"
                value={draft.route}
                onChange={(e) => setDraft({ ...draft, route: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter route"
              />
            </div>

            <div className="ra-filter-field">
              <label>Vehicle</label>
              <input
                type="text"
                value={draft.vehicle}
                onChange={(e) => setDraft({ ...draft, vehicle: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter vehicle"
              />
            </div>

            <div className="ra-filter-field">
              <label>Driver</label>
              <input
                type="text"
                value={draft.driver}
                onChange={(e) => setDraft({ ...draft, driver: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter driver name"
              />
            </div>

            <div className="ra-filter-field">
              <label>Picker</label>
              <input
                type="text"
                value={draft.picker}
                onChange={(e) => setDraft({ ...draft, picker: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter picker name"
              />
            </div>

            <div className="ra-filter-field">
              <label>Supervisor</label>
              <input
                type="text"
                value={draft.supervisor}
                onChange={(e) => setDraft({ ...draft, supervisor: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter supervisor name"
              />
            </div>

            <div className="ra-filter-field">
              <label>Status</label>
              <select
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value)}
                className="ra-filter-select"
              >
                <option value="all">All Status</option>
                <option value="Draft">Draft</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="ra-filter-modal-footer">
          <button
            type="button"
            className="ra-link-btn"
            onClick={() => {
              setDraftDate(new Date().toISOString().split('T')[0]);
              setDraftStatus('all');
              setDraft({ route: '', vehicle: '', driver: '', picker: '', supervisor: '' });
              onClear();
            }}
          >
            Clear Filters
          </button>
          <button
            type="button"
            className="ra-btn ra-btn--primary ra-btn--sm"
            onClick={() =>
              onApply({
                selectedDate: draftDate,
                statusFilter: draftStatus,
                advancedFilters: draft,
              })
            }
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};
