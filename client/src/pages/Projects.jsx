import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Loader2, Plus, Users, LayoutList } from 'lucide-react';
import Modal from '../components/Modal';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (err) {
      setError('Failed to load projects. Ensure you are authenticated.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setModalError('Project Name is required');
      return;
    }

    setSubmitting(true);
    setModalError('');
    try {
      const res = await api.post('/projects', formData);
      setProjects([...projects, res.data]);
      setShowModal(false);
      setFormData({ name: '', description: '' });
    } catch (err) {
      if (err.response?.data?.message) {
        setModalError(err.response.data.message);
      } else if (err.response?.data?.errors) {
        setModalError(err.response.data.errors[0].msg);
      } else {
        setModalError('An error occurred while creating the project.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const closeCreateModal = () => {
    setShowModal(false);
    setModalError('');
    setFormData({ name: '', description: '' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-4 mt-6">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-dashed border-gray-300">
          <LayoutList className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
          <p className="mt-1 text-sm text-gray-500">
            {isAdmin ? 'Get started by creating a new project.' : 'You are not assigned to any projects yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project._id}
              onClick={() => navigate(`/projects/${project._id}`)}
              className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow duration-200 border border-gray-100 flex flex-col h-full"
            >
              <div className="p-5 flex-grow">
                <h3 className="text-lg leading-6 font-semibold text-gray-900 truncate">
                  {project.name}
                </h3>
                <p className="mt-2 text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">
                  {project.description || 'No description provided.'}
                </p>
                <div className="mt-4 text-xs text-gray-500">
                  Created by {project.createdByUser?.name || 'Admin'}
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Progress</span>
                    <span>{project.progress || 0}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${project.progress || 0}%` }} />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{project.members?.length || 0} Members</span>
                </div>
                <div className="text-gray-500">
                  {project.totalTasks || 0} Tasks
                </div>
                <div className="font-medium text-indigo-600 hover:text-indigo-500">
                  View details &rarr;
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={closeCreateModal} title="Create New Project" size="lg">
        {modalError && (
          <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded">
            {modalError}
          </div>
        )}
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Project Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 flex-1 block w-full rounded-md sm:text-sm border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 border p-2"
              placeholder="e.g., Q3 Marketing Campaign"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              id="description"
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 flex-1 block w-full rounded-md sm:text-sm border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 border p-2"
              placeholder="Brief description of the project"
            />
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 items-center"
            >
              {submitting && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
              Create
            </button>
            <button
              type="button"
              onClick={closeCreateModal}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Projects;
