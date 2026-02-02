import { useState, useEffect, useCallback } from 'react';
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

const RouteAssignmentPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<RouteAssignment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      const apiRoutes = await routeService.getAllRoutes(companyId, true);
      const mappedRoutes: Route[] = apiRoutes.map((r: RouteResponse) => ({
        id: r.id,
        routeCode: r.routeCode,
        routeName: r.routeName,
        companyId: r.companyId,
        status: r.status,
      }));
      setRoutes(mappedRoutes);
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

  const filteredAssignments = assignments.filter(assignment =>
    assignment.routeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    assignment.routeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    assignment.vehicleNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
    assignment.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    assignment.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <span className="breadcrumb">/ Transaction / Route Assignment</span>
          </div>
        </header>

        {/* Success Message */}
        {successMessage && (
          <div style={{ 
            padding: '12px 16px', 
            background: '#d4edda', 
            color: '#155724', 
            marginBottom: '16px', 
            borderRadius: '6px',
            border: '1px solid #c3e6cb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#155724',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 8px',
                lineHeight: '1'
              }}
              aria-label="Close success message"
            >
              ×
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{ 
            padding: '12px 16px', 
            background: '#fee', 
            color: '#c33', 
            marginBottom: '16px', 
            borderRadius: '6px',
            border: '1px solid #fcc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#c33',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 8px',
                lineHeight: '1'
              }}
              aria-label="Close error message"
            >
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
          <div className="route-assignment-header">
            <h1 className="route-assignment-title">Route Assignment</h1>
          </div>

          {/* Filters */}
          <div className="route-assignment-filters">
            <div className="filter-group">
              <label htmlFor="assignment-date">Assignment Date</label>
              <input
                id="assignment-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="date-input"
              />
            </div>
            <div className="filter-group">
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
            <div className="filter-group filter-group--search">
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
            <button className="add-assignment-btn" onClick={handleAdd}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Assignment
            </button>
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
                        <div className="route-info">
                          <span className="route-code">{assignment.routeCode}</span>
                          <span className="route-name">{assignment.routeName}</span>
                        </div>
                      </td>
                      <td>{assignment.vehicleNum}</td>
                      <td>{assignment.driverName}</td>
                      <td>{assignment.pickerName || '-'}</td>
                      <td>{assignment.supervisorName || '-'}</td>
                      <td>
                        <span className={`status-badge ${getStatusBadgeClass(assignment.status)}`}>
                          {assignment.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          {canEdit(assignment) && (
                            <>
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
            Showing {filteredAssignments.length} of {assignments.length} Items
          </div>
        </div>
      </main>

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

  const isReadOnly = assignment && (assignment.status === 'In Progress' || assignment.status === 'Completed');

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{assignment ? (isReadOnly ? 'View Assignment' : 'Edit Assignment') : 'Add Assignment'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="assignment-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3 className="form-section-title">Assignment Information</h3>
            <div className="form-grid form-grid--two-columns">
              <div className="form-group">
                <label>Assignment Date *</label>
                <input
                  type="date"
                  value={assignment ? assignment.assignmentDate : selectedDate}
                  disabled={true}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Company *</label>
                <select
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
                  className="form-select"
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Route *</label>
                <select
                  value={formData.routeId || ''}
                  onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
                  required
                  disabled={!formData.companyId || isReadOnly}
                  className="form-select"
                >
                  <option value="">Select Route</option>
                  {filteredRoutes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.routeCode} - {route.routeName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Vehicle *</label>
                <select
                  value={formData.vehicleId || ''}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                  required
                  disabled={!formData.companyId || isReadOnly}
                  className="form-select"
                >
                  <option value="">Select Vehicle</option>
                  {filteredVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.vehicleNum}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Driver *</label>
                <select
                  value={formData.driverId || ''}
                  onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                  required
                  disabled={!formData.companyId || isReadOnly}
                  className="form-select"
                >
                  <option value="">Select Driver</option>
                  {filteredDrivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.userName} {driver.employeeCode ? `(${driver.employeeCode})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Picker</label>
                <select
                  value={formData.pickerId || ''}
                  onChange={(e) => setFormData({ ...formData, pickerId: e.target.value || null })}
                  disabled={!formData.companyId || isReadOnly}
                  className="form-select"
                >
                  <option value="">Select Picker (Optional)</option>
                  {filteredPickers.map((picker) => (
                    <option key={picker.id} value={picker.id}>
                      {picker.userName} {picker.employeeCode ? `(${picker.employeeCode})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Supervisor</label>
                <select
                  value={formData.supervisorId || ''}
                  onChange={(e) => setFormData({ ...formData, supervisorId: e.target.value || null })}
                  disabled={!formData.companyId || isReadOnly}
                  className="form-select"
                >
                  <option value="">Select Supervisor (Optional)</option>
                  {filteredSupervisors.map((supervisor) => (
                    <option key={supervisor.id} value={supervisor.id}>
                      {supervisor.userName} {supervisor.employeeCode ? `(${supervisor.employeeCode})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status || 'Draft'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  disabled={isReadOnly}
                  className="form-select"
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
            <div className="form-group form-group--full-width">
              <label>Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                disabled={isReadOnly}
                rows={3}
                className="form-textarea"
                placeholder="Additional notes or instructions..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              {isReadOnly ? 'Close' : 'Cancel'}
            </button>
            {!isReadOnly && (
              <button type="submit" className="btn btn--primary">
                {assignment ? 'Update' : 'Create'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default RouteAssignmentPage;
