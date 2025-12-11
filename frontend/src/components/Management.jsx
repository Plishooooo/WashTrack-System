import { useState, useEffect } from 'react';
import '../styles/Management.css';
import { showSuccessToast, showErrorToast } from '../utils/toastUtils';
import deletelogo from '../assets/DELETE.png';
import viewlogo from '../assets/VIEW.png';
import { API_ENDPOINTS } from '../config';

function Management() {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewAccount, setViewAccount] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adminID, setAdminID] = useState(null);
  const [services, setServices] = useState([]);
  const [newAdminForm, setNewAdminForm] = useState({
    name: '',
    email: '',
    role: '',
  });
  const [accounts, setAccounts] = useState([]);

  // Get adminID from localStorage and fetch staff and services
  useEffect(() => {
    const storedAdminID = localStorage.getItem('adminID');
    if (storedAdminID) {
      setAdminID(storedAdminID);
    }
    fetchStaff();
    fetchServices();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.GET_STAFF);
      const result = await response.json();
      if (result.success) {
        setAccounts(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.GET_SERVICES);
      const result = await response.json();
      if (result.success) {
        setServices(result.data);
        // Set first service as default if available
        if (result.data.length > 0) {
          setNewAdminForm((prev) => ({
            ...prev,
            role: result.data[0].fld_serviceName,
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
    }
  };

  const filteredAccounts = accounts.filter(
    (account) =>
      account.fld_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.fld_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteAccount = (accountId) => {
    setDeleteConfirm(accountId);
  };

  const confirmDelete = async (accountId) => {
    try {
      const response = await fetch(API_ENDPOINTS.DELETE_STAFF(accountId), {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        setAccounts(
          accounts.filter((account) => account.fld_staffID !== accountId)
        );
        showSuccessToast('Staff deleted successfully');
      } else {
        showErrorToast('Failed to delete staff: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to delete staff:', error);
      showErrorToast('Failed to delete staff');
    }
    setDeleteConfirm(null);
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const handleViewAccount = (account) => {
    setViewAccount(account);
  };

  const handleCloseView = () => {
    setViewAccount(null);
  };

  const handleChangeRole = (accountId, newRole) => {
    // Prevent assigning Admin role
    if (newRole === 'Admin') {
      showErrorToast('Cannot assign "Admin" role to staff members.');
      fetchStaff(); // Refresh to reset the dropdown
      return;
    }

    // Update locally first for immediate UI feedback
    setAccounts(
      accounts.map((account) =>
        account.fld_staffID === accountId
          ? { ...account, fld_role: newRole }
          : account
      )
    );

    // Update in database
    const account = accounts.find((a) => a.fld_staffID === accountId);
    if (account) {
      fetch(API_ENDPOINTS.UPDATE_STAFF(accountId), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: account.fld_name,
          email: account.fld_email,
          role: newRole,
        }),
      })
        .then((response) => response.json())
        .then((result) => {
          if (result.success) {
            showSuccessToast('Role updated successfully');
          } else {
            showErrorToast('Failed to update role: ' + result.error);
            fetchStaff(); // Refresh on error
          }
        })
        .catch((error) => {
          console.error('Failed to update role:', error);
          showErrorToast('Failed to update role');
          fetchStaff(); // Refresh on error
        });
    }
  };

  const handleAddAdminClick = () => {
    setShowAddForm(true);
  };

  const handleCloseAddForm = () => {
    setShowAddForm(false);
    setNewAdminForm({
      name: '',
      email: '',
      role: services.length > 0 ? services[0].fld_serviceName : '',
    });
  };

  const handleAddFormChange = (e) => {
    const { name, value } = e.target;
    setNewAdminForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmitAddAdmin = async (e) => {
    e.preventDefault();
    if (newAdminForm.name && newAdminForm.email && newAdminForm.role) {
      if (!adminID) {
        showErrorToast('Admin ID not found. Please login as admin.');
        return;
      }

      if (newAdminForm.role === 'Admin') {
        showErrorToast('Cannot assign "Admin" role to staff members.');
        return;
      }

      try {
        const staffData = {
          adminID: parseInt(adminID),
          name: newAdminForm.name,
          email: newAdminForm.email,
          role: newAdminForm.role,
        };

        const response = await fetch(API_ENDPOINTS.CREATE_STAFF, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(staffData),
        });

        const result = await response.json();

        if (result.success) {
          showSuccessToast('Staff added successfully!');
          fetchStaff(); // Refresh the staff list
          handleCloseAddForm();
        } else {
          showErrorToast('Failed to add staff: ' + result.error);
        }
      } catch (error) {
        console.error('Failed to add staff:', error);
        showErrorToast('Failed to add staff');
      }
    } else {
      showErrorToast('Please fill in all required fields');
    }
  };

  return (
    <section className="management-section">
      <div className="section-header">
        <div className="header-content">
          <h3>Admin Management</h3>
          <p>Manage system administrators and staff</p>
        </div>
        <button className="add-admin-btn" onClick={handleAddAdminClick}>
          ➕ Add Staff
        </button>
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="table-wrapper">
        <table className="management-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.map((account) => (
              <tr key={account.fld_staffID}>
                <td className="name-cell">{account.fld_name}</td>
                <td>{account.fld_email}</td>
                <td>
                  <select
                    className="role-select"
                    value={account.fld_role}
                    onChange={(e) =>
                      handleChangeRole(account.fld_staffID, e.target.value)
                    }
                  >
                    <option value="">Select a Role</option>
                    <option value="Wash">Wash</option>
                    <option value="Fold">Fold</option>
                    <option value="Iron">Iron</option>
                  </select>
                </td>
                <td className="actions-cell">
                  <button
                    className="action-btn view-btn"
                    onClick={() => handleViewAccount(account)}
                    title="View"
                  >
                    <img src={viewlogo} className="management-icons" />
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={() => handleDeleteAccount(account.fld_staffID)}
                    title="Delete"
                  >
                    <img src={deletelogo} className="management-icons" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteConfirm && (
        <div className="confirmation-modal">
          <div className="confirmation-content">
            <h3>Delete Account</h3>
            <p>
              Are you sure you want to delete this account? This action cannot
              be undone.
            </p>
            <div className="confirmation-actions">
              <button className="btn-cancel" onClick={cancelDelete}>
                Cancel
              </button>
              <button
                className="btn-confirm"
                onClick={() => confirmDelete(deleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {viewAccount && (
        <div className="modal-overlay" onClick={handleCloseView}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Account Details</h3>
              <button className="close-btn" onClick={handleCloseView}>
                ✕
              </button>
            </div>

            <div className="account-details">
              <div className="detail-group">
                <label>Full Name</label>
                <p>{viewAccount.fld_name}</p>
              </div>

              <div className="detail-group">
                <label>Email</label>
                <p>{viewAccount.fld_email}</p>
              </div>

              <div className="detail-group">
                <label>Role</label>
                <p>
                  <span className="role-badge">{viewAccount.fld_role}</span>
                </p>
              </div>

              <div className="detail-group">
                <label>Admin ID</label>
                <p>{viewAccount.fld_adminID}</p>
              </div>

              <div className="detail-actions">
                <button className="btn-close" onClick={handleCloseView}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="modal-overlay" onClick={handleCloseAddForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Admin</h3>
              <button className="close-btn" onClick={handleCloseAddForm}>
                ✕
              </button>
            </div>

            <form className="add-admin-form" onSubmit={handleSubmitAddAdmin}>
              <div className="form-group">
                <label htmlFor="add-name">Full Name</label>
                <input
                  type="text"
                  id="add-name"
                  name="name"
                  value={newAdminForm.name}
                  onChange={handleAddFormChange}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="add-email">Email Address</label>
                <input
                  type="email"
                  id="add-email"
                  name="email"
                  value={newAdminForm.email}
                  onChange={handleAddFormChange}
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="add-role">Role</label>
                <select
                  id="add-role"
                  name="role"
                  value={newAdminForm.role}
                  onChange={handleAddFormChange}
                  required
                >
                  <option value="">Select a Role</option>
                  <option value="Wash">Wash</option>
                  <option value="Fold">Fold</option>
                  <option value="Iron">Iron</option>
                </select>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCloseAddForm}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Add Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Management;
