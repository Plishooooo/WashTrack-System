import { useState, useEffect } from 'react';
import '../styles/Services.css';
import { showSuccessToast, showErrorToast } from '../utils/toastUtils';
import deletelogo from '../assets/DELETE.png';
import editlogo from '../assets/EDIT.png';
import { API_ENDPOINTS } from '../config';

function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editService, setEditService] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'Available',
    price: '',
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    status: 'Available',
    price: '',
  });

  // Validation functions
  const validateServiceName = (name) => {
    return name.trim().length >= 3;
  };

  const validateDescription = (description) => {
    return description.trim().length >= 10;
  };

  const validatePrice = (price) => {
    const priceRegex = /^\d+(\.\d{1,2})?$/;
    const parsedPrice = parseFloat(price);
    return priceRegex.test(price) && parsedPrice > 0;
  };

  // Fetch services from backend on component mount
  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.GET_SERVICES);
      const result = await response.json();
      if (result.success) {
        setServices(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = (id) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async (id) => {
    try {
      const response = await fetch(API_ENDPOINTS.DELETE_SERVICE(id), {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        setServices(services.filter((service) => service.fld_serviceID !== id));
        setDeleteConfirm(null);
        showSuccessToast('Service deleted successfully');
      } else {
        showErrorToast('Failed to delete service: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to delete service:', error);
      showErrorToast('Failed to delete service');
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const handleEditClick = (service) => {
    setEditService(service.fld_serviceID);
    setEditFormData({
      name: service.fld_serviceName,
      description: service.fld_description,
      status: service.fld_serviceStatus,
      price: service.fld_servicePrice,
    });
  };

  const handleSaveEdit = async () => {
    setError('');

    // Validation checks
    if (!editFormData.name.trim()) {
      setError('Service name is required');
      return;
    }

    if (!validateServiceName(editFormData.name)) {
      setError('Service name must be at least 3 characters');
      return;
    }

    if (!editFormData.description.trim()) {
      setError('Description is required');
      return;
    }

    if (!validateDescription(editFormData.description)) {
      setError('Description must be at least 10 characters');
      return;
    }

    if (!editFormData.price) {
      setError('Price is required');
      return;
    }

    if (!validatePrice(editFormData.price)) {
      setError('Please enter a valid price (e.g., ₱15.00)');
      return;
    }

    if (!editFormData.status) {
      setError('Status is required');
      return;
    }

    try {
      const response = await fetch(
        API_ENDPOINTS.UPDATE_SERVICE(editService),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(editFormData),
        }
      );
      const result = await response.json();
      if (result.success) {
        fetchServices();
        setEditService(null);
        setEditFormData({
          name: '',
          description: '',
          status: 'Available',
          price: '',
        });
        showSuccessToast('Service updated successfully');
      } else {
        setError('Failed to update service: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to update service:', error);
      setError('Failed to update service');
    }
  };

  const handleCancelEdit = () => {
    setEditService(null);
    setEditFormData({
      name: '',
      description: '',
      status: 'Available',
      price: '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation checks
    if (!formData.name.trim()) {
      setError('Service name is required');
      return;
    }

    if (!validateServiceName(formData.name)) {
      setError('Service name must be at least 3 characters');
      return;
    }

    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }

    if (!validateDescription(formData.description)) {
      setError('Description must be at least 10 characters');
      return;
    }

    if (!formData.price) {
      setError('Price is required');
      return;
    }

    if (!validatePrice(formData.price)) {
      setError('Please enter a valid price (e.g., ₱15.00)');
      return;
    }

    if (!formData.status) {
      setError('Status is required');
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.CREATE_SERVICE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (result.success) {
        fetchServices();
        setFormData({
          name: '',
          description: '',
          status: 'Available',
          price: '',
        });
        setShowForm(false);
        showSuccessToast('Service created successfully');
      } else {
        setError('Failed to create service: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to create service:', error);
      setError('Failed to create service');
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setFormData({ name: '', description: '', status: 'Available', price: '' });
  };

  return (
    <section className="services-section">
      <div className="section-header">
        <div className="header-content">
          <h3>Service Management</h3>
          <p>Manage your laundry services and pricing</p>
        </div>
        <button
          className="create-service-btn"
          onClick={() => setShowForm(true)}
        >
          + Create Service
        </button>
      </div>

      <div className="table-wrapper">
        <table className="services-table">
          <thead>
            <tr>
              <th>Service Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {services && services.length > 0 ? (
              services.map((service, index) => (
                <tr key={service.fld_serviceID || index}>
                  <td className="service-name">{service.fld_serviceName}</td>
                  <td>{service.fld_description}</td>
                  <td>
                    <span
                      className={`status-badge ${service.fld_serviceStatus
                        .toLowerCase()
                        .replace(' ', '-')}`}
                    >
                      {service.fld_serviceStatus}
                    </span>
                  </td>
                  <td className="price-cell">₱{service.fld_servicePrice}</td>
                  <td className="actions-cell">
                    <button
                      className="action-btn edit-btn"
                      onClick={() => handleEditClick(service)}
                      title="Edit"
                    >
                      <img src={editlogo} className="services-icon" />
                    </button>
                    <button
                      className="action-btn delete-btn"
                      title="Delete"
                      onClick={() => handleDeleteService(service.fld_serviceID)}
                    >
                      <img src={deletelogo} className="services-icon" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="5"
                  style={{ textAlign: 'center', padding: '20px' }}
                >
                  No services available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={handleCloseForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Service</h3>
              <button className="close-btn" onClick={handleCloseForm}>
                ✕
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="service-form">
              <div className="form-group">
                <label htmlFor="name">Service Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="e.g., Premium Wash"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Describe the service..."
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="status">Service Status</label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="Available">Available</option>
                    <option value="Not Available">Not Available</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="price">Price</label>
                  <input
                    type="text"
                    id="price"
                    name="price"
                    placeholder="e.g., ₱15.00"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCloseForm}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Create Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="confirmation-modal">
          <div className="confirmation-content">
            <h3>Delete Service</h3>
            <p>
              Are you sure you want to delete this service? This action cannot
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

      {editService !== null && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Service</h2>
              <button className="close-btn" onClick={handleCancelEdit}>
                ×
              </button>
            </div>
            {error && <div className="error-message">{error}</div>}
            <form
              className="edit-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveEdit();
              }}
            >
              <div className="form-group">
                <label>Service Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  placeholder="Enter service name"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Enter service description"
                  rows="3"
                ></textarea>
              </div>
              <div className="form-group">
                <label>Service Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, status: e.target.value })
                  }
                >
                  <option value="Available">Available</option>
                  <option value="Not Available">Not Available</option>
                </select>
              </div>
              <div className="form-group">
                <label>Price</label>
                <input
                  type="text"
                  value={editFormData.price}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, price: e.target.value })
                  }
                  placeholder="e.g., ₱15.00"
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Services;
