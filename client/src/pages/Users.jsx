import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Loader2, Plus, Pencil, Trash2, Star } from 'lucide-react';
import Modal from '../components/Modal';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [activeUser, setActiveUser] = useState(null);

  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'MEMBER' });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    performance: 'MEETS',
    feedback: '',
    strengths: '',
    improvements: '',
  });
  const [reviews, setReviews] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users. Ensure you have admin privileges.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormData({ name: '', email: '', password: '', role: 'MEMBER' });
    setModalError('');
    setShowEdit(false);
    setShowReview(false);
    setShowCreate(true);
  };

  const openEditModal = (user) => {
    setActiveUser(user);
    setFormData({ name: user.name, email: user.email, password: '', role: user.role });
    setModalError('');
    setShowCreate(false);
    setShowReview(false);
    setShowEdit(true);
  };

  const openReviewModal = async (user) => {
    setActiveUser(user);
    setReviewForm({ rating: 5, performance: 'MEETS', feedback: '', strengths: '', improvements: '' });
    setShowCreate(false);
    setShowEdit(false);
    setShowReview(true);
    setReviewLoading(true);
    try {
      const res = await api.get(`/reviews?memberId=${user._id}`);
      setReviews(res.data);
    } catch (err) {
      setReviews([]);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError('');
    try {
      const res = await api.post('/users', formData);
      setUsers([res.data, ...users]);
      closeManageModal();
    } catch (err) {
      setModalError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!activeUser) return;
    setSubmitting(true);
    setModalError('');
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
      };
      const res = await api.put(`/users/${activeUser._id}`, payload);
      setUsers(users.map((u) => (u._id === activeUser._id ? res.data : u)));
      closeManageModal();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to update user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Delete this user? This action cannot be undone.')) return;
    try {
      await api.delete(`/users/${userId}`);
      setUsers(users.filter((u) => u._id !== userId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!activeUser) return;
    setSubmitting(true);
    try {
      const payload = {
        memberId: activeUser._id,
        ...reviewForm,
        strengths: reviewForm.strengths.split(',').map((item) => item.trim()).filter(Boolean),
        improvements: reviewForm.improvements.split(',').map((item) => item.trim()).filter(Boolean),
      };
      await api.post('/reviews', payload);
      const res = await api.get(`/reviews?memberId=${activeUser._id}`);
      setReviews(res.data);
      setReviewForm({ rating: 5, performance: 'MEETS', feedback: '', strengths: '', improvements: '' });
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const closeManageModal = () => {
    setShowCreate(false);
    setShowEdit(false);
    setActiveUser(null);
    setModalError('');
  };

  const closeReviewModal = () => {
    setShowReview(false);
    setActiveUser(null);
  };

  const formatPerformance = (value) => {
    if (!value) return '';
    return value.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-md shadow-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Member Management
        </h2>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </button>
      </div>

      <div className="bg-white shadow sm:rounded-lg overflow-hidden border border-gray-200">
        {users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y border-t border-gray-200 divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                          {u.name?.substring(0, 2).toUpperCase() || 'U'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{u.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{u.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        u.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {u.role === 'ADMIN' ? 'Admin' : 'Member'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-3">
                        {u.role === 'MEMBER' && (
                          <button className="text-indigo-600 hover:text-indigo-800" onClick={() => openReviewModal(u)}>
                            Review
                          </button>
                        )}
                        <button className="text-gray-600 hover:text-gray-800" onClick={() => openEditModal(u)}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-700" onClick={() => handleDeleteUser(u._id)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={showCreate || showEdit} onClose={closeManageModal} title={showCreate ? 'Add New Member' : 'Edit Member'} size="lg">
        {modalError && (
          <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded">
            {modalError}
          </div>
        )}
        <form onSubmit={showCreate ? handleCreateSubmit : handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-md sm:text-sm border-gray-300 border p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 block w-full rounded-md sm:text-sm border-gray-300 border p-2"
              required
            />
          </div>
          {showCreate && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 block w-full rounded-md sm:text-sm border-gray-300 border p-2"
                minLength={8}
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="mt-1 block w-full rounded-md sm:text-sm border-gray-300 border p-2"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : showCreate ? 'Create' : 'Save'}
            </button>
            <button
              type="button"
              onClick={closeManageModal}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showReview && !!activeUser} onClose={closeReviewModal} title={activeUser ? `Review ${activeUser.name}` : 'Review'} size="lg">
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Rating</label>
            <select
              value={reviewForm.rating}
              onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
              className="mt-1 block w-full rounded-md sm:text-sm border-gray-300 border p-2"
            >
              {[1, 2, 3, 4, 5].map((rating) => (
                <option key={rating} value={rating}>{rating}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Performance</label>
            <select
              value={reviewForm.performance}
              onChange={(e) => setReviewForm({ ...reviewForm, performance: e.target.value })}
              className="mt-1 block w-full rounded-md sm:text-sm border-gray-300 border p-2"
            >
              <option value="EXCEEDS">Exceeds</option>
              <option value="MEETS">Meets</option>
              <option value="NEEDS_IMPROVEMENT">Needs Improvement</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Feedback</label>
            <textarea
              rows="3"
              value={reviewForm.feedback}
              onChange={(e) => setReviewForm({ ...reviewForm, feedback: e.target.value })}
              className="mt-1 block w-full rounded-md sm:text-sm border-gray-300 border p-2"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Strengths</label>
              <input
                type="text"
                value={reviewForm.strengths}
                onChange={(e) => setReviewForm({ ...reviewForm, strengths: e.target.value })}
                className="mt-1 block w-full rounded-md sm:text-sm border-gray-300 border p-2"
                placeholder="Ownership, API design"
              />
              <p className="mt-1 text-xs text-gray-500">Separate items with commas.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Improvement Areas</label>
              <input
                type="text"
                value={reviewForm.improvements}
                onChange={(e) => setReviewForm({ ...reviewForm, improvements: e.target.value })}
                className="mt-1 block w-full rounded-md sm:text-sm border-gray-300 border p-2"
                placeholder="Risk updates, estimates"
              />
              <p className="mt-1 text-xs text-gray-500">Separate items with commas.</p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : 'Submit Review'}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-700">Recent Reviews</h4>
          {reviewLoading ? (
            <div className="py-4 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-sm text-gray-500 mt-3">No reviews yet.</div>
          ) : (
            <div className="space-y-3 mt-3">
              {reviews.map((review) => (
                <div key={review._id} className="border border-gray-200 rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{review.reviewer?.name || 'Admin'}</span>
                    <span className="text-xs uppercase tracking-wide text-gray-500">{formatPerformance(review.performance)}</span>
                  </div>
                  <div className="flex items-center mt-2 space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={`h-4 w-4 ${review.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`} />
                    ))}
                    <span className="text-xs text-gray-500 ml-2">{review.rating}/5</span>
                  </div>
                  {review.feedback && <p className="text-sm text-gray-600 mt-2">{review.feedback}</p>}
                  {(review.strengths?.length > 0 || review.improvements?.length > 0) && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-green-700">Strengths</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(review.strengths || []).map((item) => (
                            <span key={item} className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-amber-700">Improvement Areas</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(review.improvements || []).map((item) => (
                            <span key={item} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={closeReviewModal}
            className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 text-gray-700 text-sm"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Users;
