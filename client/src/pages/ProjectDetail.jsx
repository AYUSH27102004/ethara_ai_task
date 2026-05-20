import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Loader2, Plus, UserPlus, Calendar, AlertCircle, Users } from 'lucide-react';
import { startOfDay } from 'date-fns';
import Modal from '../components/Modal';

const ProjectDetail = () => {
  const { id } = useParams();
  const { isAdmin, user } = useAuth();
  
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [showAddMember, setShowAddMember] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showEditTask, setShowEditTask] = useState(false);
  
  // Member Modal State
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [memberSubmitting, setMemberSubmitting] = useState(false);
  const [memberError, setMemberError] = useState('');

  // Task Modal State (Create)
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'Medium',
    status: 'TODO',
    dueDate: ''
  });
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskError, setTaskError] = useState('');

  // Task Modal State (Edit / Member Status)
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    fetchProject();
  }, [id, isAdmin, user?.id]);

  const fetchProject = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const res = await api.get(`/projects/${id}`);
      setProject(res.data.project);
      const fetchedTasks = res.data.tasks || [];
      setTasks(fetchedTasks);
    } catch (err) {
      setError('Failed to load project details.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  // --- Add Member Handlers ---
  const handleOpenAddMember = async () => {
    setShowCreateTask(false);
    setShowEditTask(false);
    setEditingTask(null);
    setMemberError('');
    setShowAddMember(true);
    try {
      const res = await api.get('/users');
      setAllUsers(res.data);
    } catch (err) {
      setMemberError('Failed to load users list.');
    }
  };

  const closeAddMember = () => {
    setShowAddMember(false);
    setMemberError('');
    setSelectedUserId('');
  };

  const openCreateTask = () => {
    setShowAddMember(false);
    setShowEditTask(false);
    setEditingTask(null);
    setTaskError('');
    setShowCreateTask(true);
  };

  const closeCreateTask = () => {
    setShowCreateTask(false);
    setTaskError('');
    setTaskData({ title: '', description: '', assignedTo: '', priority: 'Medium', status: 'TODO', dueDate: '' });
  };

  const closeEditTask = () => {
    setShowEditTask(false);
    setEditingTask(null);
  };

  const submitAddMember = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      setMemberError('Please select a user');
      return;
    }
    setMemberSubmitting(true);
    setMemberError('');
    try {
      const res = await api.post(`/projects/${id}/members`, { userId: selectedUserId });
      setProject(res.data); // backend returns populated project
      closeAddMember();
    } catch (err) {
      setMemberError(err.response?.data?.message || 'Failed to add member.');
    } finally {
      setMemberSubmitting(false);
    }
  };

  // --- Create Task Handlers ---
  const submitCreateTask = async (e) => {
    e.preventDefault();
    if (!taskData.title.trim() || !taskData.assignedTo) {
      setTaskError('Title and Assigned Member are required.');
      return;
    }

    setTaskSubmitting(true);
    setTaskError('');
    try {
      const payload = { ...taskData, projectId: id };
      const res = await api.post('/tasks', payload);
      setTasks([...tasks, res.data]);
      fetchProject(false);
      closeCreateTask();
    } catch (err) {
      setTaskError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Error creating task.');
    } finally {
      setTaskSubmitting(false);
    }
  };

  // --- Edit Task Status Handlers (Members & Admins) ---
  const handleOpenEditTask = (task) => {
    if (!isAdmin && task.assignedTo !== user.id) {
       // Just visual blocker, back-end rejects anyway, but let's be nice
       alert("You can only edit your own tasks.");
       return;
    }
    setEditingTask(task);
    setShowAddMember(false);
    setShowCreateTask(false);
    setShowEditTask(true);
  };

  const submitEditTask = async (e) => {
    e.preventDefault();
    setTaskSubmitting(true);
    try {
      // Member can only change status per backend route
      const payload = { status: editingTask.status }; 

      // If needed, Admin logic could go here full edit, but prompt specified members only changing status dropdown
      // so updating 'status' field universally is safe and aligns exactly with requirement constraints.
      
      const res = await api.put(`/tasks/${editingTask._id}`, payload);
      // Update local task array
      setTasks(tasks.map(t => t._id === res.data._id ? res.data : t));
      fetchProject(false);
      closeEditTask();
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating task.');
    } finally {
      setTaskSubmitting(false);
    }
  };

  // UI Helpers
  const getAvatarInitials = (name) => name?.substring(0, 2).toUpperCase() || 'U';

  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === 'DONE') return false;
    return startOfDay(new Date(dueDate)) < startOfDay(new Date());
  };

  const taskProgress = tasks.length === 0
    ? 0
    : Math.round((tasks.filter((task) => task.status === 'DONE').length / tasks.length) * 100);
  const displayProgress = isAdmin ? taskProgress : project?.progress ?? taskProgress;

  // Kanban helpers
  const columns = ['TODO', 'IN_PROGRESS', 'DONE'];
  const getNextStatus = (status) => {
    if (status === 'TODO') return 'IN_PROGRESS';
    if (status === 'IN_PROGRESS') return 'DONE';
    return null;
  };
  
  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  }
  if (error || !project) {
    return <div className="bg-red-50 text-red-600 p-4 rounded">{error || 'Project not found.'}</div>;
  }

  const usersNotInProject = allUsers.filter(
    u => !project.members.some(member => member._id === u._id)
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white shadow sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-2xl leading-6 font-bold text-gray-900">{project.name}</h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">{project.description || 'No description provided.'}</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
            <div>
              Created by <span className="font-medium text-gray-900">{project.createdByUser?.name || 'Admin'}</span>
            </div>
            <div>
              Team members <span className="font-medium text-gray-900">{project.members.length}</span>
            </div>
            <div>
              Progress <span className="font-medium text-gray-900">{displayProgress}%</span>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${displayProgress}%` }} />
          </div>
        </div>
      </div>

      {/* Members Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Members</h3>
          {isAdmin && (
            <button
              onClick={handleOpenAddMember}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              Add Member
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {project.members.map((member) => (
            <div key={member._id} className="bg-white border rounded-lg shadow-sm p-4 flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                {getAvatarInitials(member.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                <p className="text-sm text-gray-500 truncate">{member.email}</p>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                member.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
              }`}>
                {member.role === 'ADMIN' ? 'Admin' : 'Member'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
          {isAdmin && (
            <button
              onClick={openCreateTask}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Task
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map(status => {
            const colTasks = tasks.filter(t => t.status === status);
            const statusLabel = {
              TODO: 'Todo',
              IN_PROGRESS: 'In Progress',
              DONE: 'Done',
            }[status];

            return (
              <div key={status} className="bg-gray-100 rounded-lg p-4 h-[600px] overflow-y-auto border border-gray-200 shadow-sm">
                <h4 className="font-semibold text-gray-700 mb-4 flex justify-between">
                  <span>{statusLabel}</span>
                  <span className="bg-gray-200 text-gray-600 py-0.5 px-2 rounded-full text-xs">{colTasks.length}</span>
                </h4>
                
                <div className="space-y-3">
                  {colTasks.map(task => {
                    // Assignee display logic
                    const assignedUser = project.members.find(m => m._id === task.assignedTo);
                    const overdue = isOverdue(task.dueDate, task.status);
                    
                    const priorityColor = {
                      'Low': 'bg-gray-100 text-gray-800',
                      'Medium': 'bg-yellow-100 text-yellow-800',
                      'High': 'bg-red-100 text-red-800'
                    }[task.priority] || 'bg-gray-100 text-gray-600';

                    return (
                      <div 
                        key={task._id} 
                        onClick={() => handleOpenEditTask(task)}
                        className={`bg-white p-4 rounded shadow-sm cursor-pointer border hover:border-indigo-400 transition-colors ${overdue ? 'border-red-300' : 'border-gray-200'}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="text-sm font-bold text-gray-900 leading-tight">{task.title}</h5>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColor}`}>
                            {task.priority}
                          </span>
                        </div>
                        
                        <div className="text-xs text-gray-500 mb-3 flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span className="truncate">{assignedUser ? assignedUser.name : 'Unassigned'}</span>
                        </div>
                        
                        {(task.dueDate || overdue) && (
                          <div className={`mt-2 text-xs flex items-center font-medium ${overdue ? 'text-red-600' : 'text-gray-500'}`}>
                            <Calendar className="h-3 w-3 mr-1" />
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ''}
                            {overdue && <span className="ml-1 flex items-center"><AlertCircle className="h-3 w-3 ml-1 mr-0.5"/> Overdue</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal isOpen={showAddMember} onClose={closeAddMember} title="Add Project Member" size="md">
        {memberError && <div className="mb-4 bg-red-50 text-red-600 text-sm p-2 rounded">{memberError}</div>}

        <form onSubmit={submitAddMember}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Select User</label>
            <select 
              value={selectedUserId} 
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 border p-2 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">-- Choose User --</option>
              {usersNotInProject.map(u => (
                <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>
          <div className="mt-5 sm:flex sm:flex-row-reverse">
            <button type="submit" disabled={memberSubmitting} className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent px-4 py-2 bg-indigo-600 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:text-sm">
              {memberSubmitting ? 'Adding...' : 'Add Member'}
            </button>
            <button type="button" onClick={closeAddMember} className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm">
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showCreateTask} onClose={closeCreateTask} title="Create New Task" size="lg">
        {taskError && <div className="mb-4 bg-red-50 text-red-600 text-sm p-2 rounded">{taskError}</div>}

        <form onSubmit={submitCreateTask} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title <span className="text-red-500">*</span></label>
            <input type="text" required value={taskData.title} onChange={e => setTaskData({...taskData, title: e.target.value})} className="mt-1 block w-full rounded border-gray-300 border p-2 text-sm focus:border-indigo-500 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea rows="2" value={taskData.description} onChange={e => setTaskData({...taskData, description: e.target.value})} className="mt-1 block w-full rounded border-gray-300 border p-2 text-sm focus:border-indigo-500 focus:ring-indigo-500" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Assign To <span className="text-red-500">*</span></label>
              <select required value={taskData.assignedTo} onChange={e => setTaskData({...taskData, assignedTo: e.target.value})} className="mt-1 block w-full rounded border-gray-300 border p-2 text-sm focus:border-indigo-500 focus:ring-indigo-500">
                <option value="">-- Member --</option>
                {project.members
                  .filter((m) => m.role === 'MEMBER')
                  .map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Due Date</label>
              <input type="date" value={taskData.dueDate} onChange={e => setTaskData({...taskData, dueDate: e.target.value})} min={new Date().toISOString().split('T')[0]} className="mt-1 block w-full rounded border-gray-300 border p-2 text-sm focus:border-indigo-500 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select value={taskData.priority} onChange={e => setTaskData({...taskData, priority: e.target.value})} className="mt-1 block w-full rounded border-gray-300 border p-2 text-sm focus:border-indigo-500 focus:ring-indigo-500">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select value={taskData.status} onChange={e => setTaskData({...taskData, status: e.target.value})} className="mt-1 block w-full rounded border-gray-300 border p-2 text-sm focus:border-indigo-500 focus:ring-indigo-500">
                <option value="TODO">Todo</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>

          <div className="mt-5 sm:flex sm:flex-row-reverse border-t pt-4">
            <button type="submit" disabled={taskSubmitting} className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent px-4 py-2 bg-indigo-600 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:text-sm">
              {taskSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </button>
            <button type="button" onClick={closeCreateTask} className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm">
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showEditTask && !!editingTask} onClose={closeEditTask} title="Update Task Status" size="sm">
        {editingTask && (
          <>
            <p className="text-sm font-medium text-gray-600 mb-4 truncate">{editingTask.title}</p>

            <form onSubmit={submitEditTask}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
                <select 
                  value={editingTask.status} 
                  onChange={e => setEditingTask({...editingTask, status: e.target.value})} 
                  className="block w-full rounded border-gray-300 border p-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {(isAdmin
                    ? columns
                    : [editingTask.status, getNextStatus(editingTask.status)].filter(Boolean)
                  ).map((status) => (
                    <option key={status} value={status}>
                      {status === 'TODO' ? 'Todo' : status === 'IN_PROGRESS' ? 'In Progress' : 'Done'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 sm:flex sm:flex-row-reverse border-t pt-4">
                <button type="submit" disabled={taskSubmitting} className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent px-4 py-2 bg-indigo-600 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:text-sm">
                  {taskSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
                </button>
                <button type="button" onClick={closeEditTask} className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 bg-white text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}
      </Modal>

    </div>
  );
};

export default ProjectDetail;
