import { FormEvent, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import './userCreatePage.css';

type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Temporary';

const UserCreatePage = () => {
  const { createUser, loading, user } = useAuth();
  const [form, setForm] = useState({
    // Basic Information
    userName: '',
    mobileNumber: '',
    empCode: '',
    userRoleID: '',
    employmentType: '' as EmploymentType | '',
    
    // Access Control
    webLogin: false,
    mobileApp: false,
    
    // Identity Documents
    dlNum: '',
    aadhaar: '',
    pan: '',
    
    // Employment Details
    uan: '',
    pfNum: '',
    esiNum: '',
    grossSalary: '',
    contractorName: '',
    companyName: '',
    
    // Address Information
    address: '',
    area: '',
    city: '',
    district: '',
    pincode: '',
    emergencyContact: '',
    
    // Status
    status: true,
  });
  
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    setMessage(null);
    setError(null);
    
    try {
      // Create user with basic info (adapt to your API)
      const created = await createUser({
        name: form.userName,
        email: form.mobileNumber + '@medi-waste.io', // Temporary email
        password: 'TempPass123!', // Should be generated or required
        role: 'staff', // Map from userRoleID
      });
      
      setMessage(`User ${created.name} created successfully!`);
      // Reset form
      setForm({
        userName: '',
        mobileNumber: '',
        empCode: '',
        userRoleID: '',
        employmentType: '' as EmploymentType | '',
        webLogin: false,
        mobileApp: false,
        dlNum: '',
        aadhaar: '',
        pan: '',
        uan: '',
        pfNum: '',
        esiNum: '',
        grossSalary: '',
        contractorName: '',
        companyName: '',
        address: '',
        area: '',
        city: '',
        district: '',
        pincode: '',
        emergencyContact: '',
        status: true,
      });
    } catch (err) {
      setError((err as Error).message || 'Unable to create user');
    }
  };

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="user-management-page">
      <div className="user-management-container">
        <div className="page-header">
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Create and manage user accounts with complete information</p>
        </div>

        <form className="user-form" onSubmit={onSubmit}>
          {/* Basic Information Section */}
          <div className="form-section">
            <h2 className="section-title">Basic Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="userName" className="form-label required">
                  User Name
                </label>
                <input
                  id="userName"
                  type="text"
                  className="form-input"
                  placeholder="Enter user name"
                  value={form.userName}
                  onChange={(e) => updateField('userName', e.target.value)}
                  required
                  maxLength={50}
                />
              </div>

              <div className="form-group">
                <label htmlFor="mobileNumber" className="form-label required">
                  Mobile Number
                </label>
                <input
                  id="mobileNumber"
                  type="tel"
                  className="form-input"
                  placeholder="10-digit mobile number"
                  value={form.mobileNumber}
                  onChange={(e) => updateField('mobileNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  required
                  maxLength={10}
                />
              </div>

              <div className="form-group">
                <label htmlFor="empCode" className="form-label required">
                  Employee Code
                </label>
                <input
                  id="empCode"
                  type="text"
                  className="form-input"
                  placeholder="Enter employee code"
                  value={form.empCode}
                  onChange={(e) => updateField('empCode', e.target.value)}
                  required
                  maxLength={10}
                />
              </div>

              <div className="form-group">
                <label htmlFor="userRoleID" className="form-label required">
                  User Role
                </label>
                <select
                  id="userRoleID"
                  className="form-input"
                  value={form.userRoleID}
                  onChange={(e) => updateField('userRoleID', e.target.value)}
                  required
                >
                  <option value="">Select Role</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="employmentType" className="form-label">
                  Employment Type
                </label>
                <select
                  id="employmentType"
                  className="form-input"
                  value={form.employmentType}
                  onChange={(e) => updateField('employmentType', e.target.value as EmploymentType)}
                >
                  <option value="">Select Type</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Temporary">Temporary</option>
                </select>
              </div>
            </div>
          </div>

          {/* Access Control Section */}
          <div className="form-section">
            <h2 className="section-title">Access Control</h2>
            <div className="form-grid">
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.webLogin}
                    onChange={(e) => updateField('webLogin', e.target.checked)}
                  />
                  <span>Web Login Access</span>
                </label>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.mobileApp}
                    onChange={(e) => updateField('mobileApp', e.target.checked)}
                  />
                  <span>Mobile App Access</span>
                </label>
              </div>
            </div>
          </div>

          {/* Identity Documents Section */}
          <div className="form-section">
            <h2 className="section-title">Identity Documents</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="dlNum" className="form-label">
                  Driving License Number
                </label>
                <input
                  id="dlNum"
                  type="text"
                  className="form-input"
                  placeholder="Enter DL number"
                  value={form.dlNum}
                  onChange={(e) => updateField('dlNum', e.target.value)}
                  maxLength={20}
                />
              </div>

              <div className="form-group">
                <label htmlFor="aadhaar" className="form-label">
                  Aadhaar Number
                </label>
                <input
                  id="aadhaar"
                  type="text"
                  className="form-input"
                  placeholder="12-digit Aadhaar"
                  value={form.aadhaar}
                  onChange={(e) => updateField('aadhaar', e.target.value.replace(/\D/g, '').slice(0, 12))}
                  maxLength={12}
                />
              </div>

              <div className="form-group">
                <label htmlFor="pan" className="form-label">
                  PAN Number
                </label>
                <input
                  id="pan"
                  type="text"
                  className="form-input"
                  placeholder="10-character PAN"
                  value={form.pan}
                  onChange={(e) => updateField('pan', e.target.value.toUpperCase().slice(0, 10))}
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          {/* Employment Details Section */}
          <div className="form-section">
            <h2 className="section-title">Employment Details</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="uan" className="form-label">
                  UAN (Universal Account Number)
                </label>
                <input
                  id="uan"
                  type="text"
                  className="form-input"
                  placeholder="12-digit UAN"
                  value={form.uan}
                  onChange={(e) => updateField('uan', e.target.value.replace(/\D/g, '').slice(0, 12))}
                  maxLength={12}
                />
              </div>

              <div className="form-group">
                <label htmlFor="pfNum" className="form-label">
                  PF Number
                </label>
                <input
                  id="pfNum"
                  type="text"
                  className="form-input"
                  placeholder="Enter PF number"
                  value={form.pfNum}
                  onChange={(e) => updateField('pfNum', e.target.value)}
                  maxLength={22}
                />
              </div>

              <div className="form-group">
                <label htmlFor="esiNum" className="form-label">
                  ESI Number
                </label>
                <input
                  id="esiNum"
                  type="text"
                  className="form-input"
                  placeholder="Enter ESI number"
                  value={form.esiNum}
                  onChange={(e) => updateField('esiNum', e.target.value)}
                  maxLength={22}
                />
              </div>

              <div className="form-group">
                <label htmlFor="grossSalary" className="form-label required">
                  Gross Salary
                </label>
                <input
                  id="grossSalary"
                  type="number"
                  className="form-input"
                  placeholder="Enter gross salary"
                  value={form.grossSalary}
                  onChange={(e) => updateField('grossSalary', e.target.value)}
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label htmlFor="contractorName" className="form-label">
                  Contractor Name
                </label>
                <input
                  id="contractorName"
                  type="text"
                  className="form-input"
                  placeholder="Enter contractor name"
                  value={form.contractorName}
                  onChange={(e) => updateField('contractorName', e.target.value)}
                  maxLength={50}
                />
              </div>

              <div className="form-group">
                <label htmlFor="companyName" className="form-label">
                  Company Name
                </label>
                <input
                  id="companyName"
                  type="text"
                  className="form-input"
                  placeholder="Enter company name"
                  value={form.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  maxLength={50}
                />
              </div>
            </div>
          </div>

          {/* Address Information Section */}
          <div className="form-section">
            <h2 className="section-title">Address Information</h2>
            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="address" className="form-label">
                  Address
                </label>
                <textarea
                  id="address"
                  className="form-input"
                  placeholder="Enter full address"
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="area" className="form-label">
                  Area
                </label>
                <input
                  id="area"
                  type="text"
                  className="form-input"
                  placeholder="Enter area"
                  value={form.area}
                  onChange={(e) => updateField('area', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="city" className="form-label">
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  className="form-input"
                  placeholder="Enter city"
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="district" className="form-label">
                  District
                </label>
                <input
                  id="district"
                  type="text"
                  className="form-input"
                  placeholder="Enter district"
                  value={form.district}
                  onChange={(e) => updateField('district', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="pincode" className="form-label">
                  Pincode
                </label>
                <input
                  id="pincode"
                  type="text"
                  className="form-input"
                  placeholder="6-digit pincode"
                  value={form.pincode}
                  onChange={(e) => updateField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                />
              </div>

              <div className="form-group">
                <label htmlFor="emergencyContact" className="form-label">
                  Emergency Contact
                </label>
                <input
                  id="emergencyContact"
                  type="tel"
                  className="form-input"
                  placeholder="Emergency contact number"
                  value={form.emergencyContact}
                  onChange={(e) => updateField('emergencyContact', e.target.value)}
                  maxLength={25}
                />
              </div>
            </div>
          </div>

          {/* Status Section */}
          <div className="form-section">
            <h2 className="section-title">Status</h2>
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.status}
                  onChange={(e) => updateField('status', e.target.checked)}
                />
                <span>Active Status</span>
              </label>
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}
          {message && <div className="form-success">{message}</div>}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating User...' : 'Create User'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => window.location.reload()}>
              Reset Form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserCreatePage;
