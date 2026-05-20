import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Flag,
  FolderOpen,
  ListTodo,
  Loader2,
  MessageSquare,
  RefreshCw,
  Star,
  Target,
  TrendingUp,
  UserCircle,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const STATUS_LABELS = {
  TODO: 'Todo',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

const ACTIVITY_LABELS = {
  TASK_ASSIGNED: 'Task assigned',
  STATUS_UPDATED: 'Status updated',
  TASK_COMPLETED: 'Task completed',
  REVIEW_RECEIVED: 'Review received',
  RATING_UPDATED: 'Rating updated',
};

const emptySummary = {
  totalAssigned: 0,
  todo: 0,
  pending: 0,
  inProgress: 0,
  completed: 0,
  overdue: 0,
  avgRating: 0,
  performanceScore: 0,
  completionRate: 0,
};

const formatDate = (value) => {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (value) => {
  if (!value) return 'Not recorded';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatPerformance = (value) => {
  if (!value) return 'Performance';
  return value.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase());
};

const isOverdue = (dueDate, status) => {
  if (!dueDate || status === 'DONE') return false;
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
};

const getNextStatus = (status) => {
  if (status === 'TODO') return 'IN_PROGRESS';
  if (status === 'IN_PROGRESS') return 'DONE';
  return null;
};

const statusClasses = {
  TODO: 'bg-slate-100 text-slate-700 border-slate-200',
  IN_PROGRESS: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  DONE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const priorityClasses = {
  Low: 'bg-slate-100 text-slate-700',
  Medium: 'bg-amber-50 text-amber-700',
  High: 'bg-rose-50 text-rose-700',
};

const toneClasses = {
  cyan: 'bg-cyan-50 text-cyan-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
  violet: 'bg-violet-50 text-violet-700',
  slate: 'bg-slate-100 text-slate-700',
  indigo: 'bg-indigo-50 text-indigo-700',
};

const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
    {children}
  </span>
);

const SummaryCard = ({ label, value, helper, icon: Icon, tone = 'slate' }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
        {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
      </div>
      <div className={`rounded-lg p-3 ${toneClasses[tone] || toneClasses.slate}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

const ProgressBar = ({ value, color = 'bg-cyan-500' }) => (
  <div className="h-2 rounded-full bg-slate-100">
    <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(value || 0, 100))}%` }} />
  </div>
);

const EmptyState = ({ title, description }) => (
  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
    <p className="text-sm font-semibold text-slate-800">{title}</p>
    <p className="mt-1 text-sm text-slate-500">{description}</p>
  </div>
);

const TaskCard = ({ task, onOpen, onMove, updating }) => {
  const overdue = isOverdue(task.dueDate, task.status);
  const nextStatus = getNextStatus(task.status);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(task)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onOpen(task);
      }}
      className={`w-full rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-cyan-300 hover:shadow-md ${
        overdue ? 'border-rose-200' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-slate-950">{task.title}</h4>
          <p className="mt-1 text-xs font-medium text-slate-500">{task.project?.name || 'No project'}</p>
        </div>
        <Badge className={priorityClasses[task.priority] || priorityClasses.Medium}>{task.priority}</Badge>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-slate-600">
        {task.description || 'No task description provided.'}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge className={statusClasses[task.status] || statusClasses.TODO}>{STATUS_LABELS[task.status] || task.status}</Badge>
        {overdue && <Badge className="border-rose-200 bg-rose-50 text-rose-700">Overdue</Badge>}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-2">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          Due {formatDate(task.dueDate)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          Assigned {formatDate(task.assignedAt)}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
          <Eye className="h-3.5 w-3.5" />
          Details
        </span>
        {nextStatus ? (
          <button
            type="button"
            onClick={(event) => onMove(task, nextStatus, event)}
            className="inline-flex items-center gap-1 rounded-md bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : STATUS_LABELS[nextStatus]}
            {!updating && <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Complete
          </span>
        )}
      </div>
    </div>
  );
};

const TaskDetailsModal = ({ task, loading, updating, onClose, onMove }) => {
  if (!task) return null;
  const nextStatus = getNextStatus(task.status);
  const histories = task.histories || [];
  const activity = task.activityLogs || [];

  return (
    <Modal isOpen={!!task} onClose={onClose} title="Task Details" size="xl">
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-7 w-7 animate-spin text-cyan-600" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-950">{task.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{task.description || 'No description provided.'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={statusClasses[task.status] || statusClasses.TODO}>{STATUS_LABELS[task.status] || task.status}</Badge>
              <Badge className={priorityClasses[task.priority] || priorityClasses.Medium}>{task.priority}</Badge>
              {isOverdue(task.dueDate, task.status) && <Badge className="border-rose-200 bg-rose-50 text-rose-700">Overdue</Badge>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Project</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{task.project?.name || 'No project'}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Assigned by</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{task.createdBy?.name || 'Admin'}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Created</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(task.createdAt)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Due date</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(task.dueDate)}</p>
            </div>
          </div>

          {nextStatus && (
            <button
              type="button"
              disabled={updating}
              onClick={(event) => onMove(task, nextStatus, event)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Move to {STATUS_LABELS[nextStatus]}
            </button>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <section>
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-950">
                <Activity className="h-4 w-4 text-cyan-600" />
                Comments & Activity
              </h4>
              <div className="mt-3 space-y-3">
                {activity.length === 0 ? (
                  <EmptyState title="No activity yet" description="Task updates will appear here." />
                ) : (
                  activity.map((entry) => (
                    <div key={entry._id} className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm font-medium text-slate-900">{entry.message || ACTIVITY_LABELS[entry.type] || entry.type}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {entry.actor?.name || 'System'} - {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section>
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-950">
                <RefreshCw className="h-4 w-4 text-emerald-600" />
                Status History
              </h4>
              <div className="mt-3 space-y-3">
                {histories.length === 0 ? (
                  <EmptyState title="No status history" description="Status changes will be recorded here." />
                ) : (
                  histories.map((entry) => (
                    <div key={entry._id} className="flex gap-3">
                      <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{STATUS_LABELS[entry.status] || entry.status}</p>
                        <p className="text-xs text-slate-500">
                          {entry.changedBy?.name || 'System'} - {formatDateTime(entry.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </Modal>
  );
};

const ReviewCard = ({ review }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-slate-950">{review.reviewer?.name || 'Admin'}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{formatDate(review.createdAt)}</p>
      </div>
      <Badge className="border-amber-200 bg-amber-50 text-amber-700">
        <Star className="mr-1 h-3.5 w-3.5 fill-current" />
        {review.rating}/5
      </Badge>
    </div>
    <p className="mt-3 text-xs font-semibold uppercase text-slate-500">{formatPerformance(review.performance)}</p>
    {review.feedback && <p className="mt-2 text-sm text-slate-600">{review.feedback}</p>}
    {(review.strengths?.length > 0 || review.improvements?.length > 0) && (
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-emerald-700">Strengths</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(review.strengths || []).map((item) => (
              <span key={item} className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                {item}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-amber-700">Improvement Areas</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(review.improvements || []).map((item) => (
              <span key={item} className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    )}
  </div>
);

const ActivityTimeline = ({ items }) => (
  <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-bold text-slate-950">Activity Timeline</h2>
      <Activity className="h-5 w-5 text-cyan-600" />
    </div>
    <div className="mt-5 space-y-4">
      {items.length === 0 ? (
        <EmptyState title="No activity recorded" description="Assignments, reviews, and status updates will appear here." />
      ) : (
        items.map((entry) => (
          <div key={entry._id} className="flex gap-3">
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{entry.message || ACTIVITY_LABELS[entry.type] || entry.type}</p>
              <p className="text-xs text-slate-500">
                {entry.actor?.name || 'System'} - {formatDateTime(entry.createdAt)}
              </p>
              {entry.task?.title && <p className="mt-1 text-xs text-slate-400">{entry.task.title}</p>}
            </div>
          </div>
        ))
      )}
    </div>
  </section>
);

const AdminDashboard = ({ stats, recentTasks, projects }) => {
  const completion = stats.completionRate || 0;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Projects" value={stats.totalProjects || projects.length} icon={FolderOpen} tone="cyan" helper="Active workspaces" />
        <SummaryCard label="Team Members" value={stats.totalMembers || 0} icon={Users} tone="indigo" helper="Employees in system" />
        <SummaryCard label="Total Tasks" value={stats.totalTasks || 0} icon={Briefcase} tone="slate" helper={`${completion}% completed`} />
        <SummaryCard label="Overdue Tasks" value={stats.overdueTasks || 0} icon={AlertTriangle} tone="rose" helper="Open past due date" />
        <SummaryCard label="Pending" value={stats.pendingTasks || 0} icon={ListTodo} tone="amber" helper="Todo + in progress" />
        <SummaryCard label="Completed" value={stats.completedTasks || 0} icon={CheckCircle2} tone="emerald" helper="Done tasks" />
        <SummaryCard label="Average Rating" value={`${stats.averageRating || 0}/5`} icon={Star} tone="violet" helper="Across submitted reviews" />
        <SummaryCard label="Project Progress" value={`${completion}%`} icon={TrendingUp} tone="cyan" helper="Overall task completion" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950">Recent Tasks</h2>
            <span className="text-sm text-slate-500">Auto-refreshes with latest database state</span>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase text-slate-500">
                  <th className="pb-3 pr-4">Task</th>
                  <th className="pb-3 pr-4">Project</th>
                  <th className="pb-3 pr-4">Owner</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTasks.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-sm text-slate-500">No tasks found.</td>
                  </tr>
                ) : (
                  recentTasks.map((task) => {
                    const overdue = isOverdue(task.dueDate, task.status);
                    return (
                      <tr key={task._id} className="text-sm">
                        <td className="py-4 pr-4 font-semibold text-slate-950">{task.title}</td>
                        <td className="py-4 pr-4 text-slate-600">{task.project?.name || 'Unknown'}</td>
                        <td className="py-4 pr-4 text-slate-600">{task.assignedToUser?.name || 'Unassigned'}</td>
                        <td className="py-4 pr-4">
                          <Badge className={statusClasses[task.status] || statusClasses.TODO}>
                            {STATUS_LABELS[task.status] || task.status}
                          </Badge>
                        </td>
                        <td className={`py-4 ${overdue ? 'font-semibold text-rose-600' : 'text-slate-600'}`}>
                          {formatDate(task.dueDate)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Project Progress</h2>
          <div className="mt-5 space-y-4">
            {projects.length === 0 ? (
              <EmptyState title="No projects" description="Create a project to begin assigning work." />
            ) : (
              projects.slice(0, 5).map((project) => (
                <div key={project._id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800">{project.name}</span>
                    <span className="text-slate-500">{project.progress || 0}%</span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={project.progress || 0} color="bg-emerald-500" />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
};

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [adminStats, setAdminStats] = useState({});
  const [projects, setProjects] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [memberData, setMemberData] = useState({
    profile: null,
    summary: emptySummary,
    myTasks: [],
    reviews: [],
    latestReviews: [],
    ratingTrend: [],
    activity: [],
  });
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetails, setTaskDetails] = useState(null);
  const [taskDetailLoading, setTaskDetailLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(null);
  const [statusError, setStatusError] = useState('');

  const fetchDashboardData = useCallback(async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      if (isAdmin) {
        const [statsRes, projectsRes, tasksRes] = await Promise.all([
          api.get('/dashboard/admin'),
          api.get('/projects'),
          api.get('/tasks'),
        ]);

        setAdminStats(statsRes.data || {});
        setProjects(projectsRes.data || []);
        setRecentTasks((tasksRes.data || []).slice(0, 8));
      } else {
        const res = await api.get('/dashboard/member');
        setMemberData({
          profile: res.data.profile || null,
          summary: { ...emptySummary, ...(res.data.summary || {}) },
          myTasks: res.data.myTasks || [],
          reviews: res.data.reviews || [],
          latestReviews: res.data.latestReviews || res.data.reviews || [],
          ratingTrend: res.data.ratingTrend || [],
          activity: res.data.activity || [],
        });
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchDashboardData();
    const interval = window.setInterval(() => fetchDashboardData(true), 15000);
    return () => window.clearInterval(interval);
  }, [fetchDashboardData]);

  const groupedTasks = useMemo(() => {
    return memberData.myTasks.reduce(
      (acc, task) => {
        acc[task.status] = [...(acc[task.status] || []), task];
        return acc;
      },
      { TODO: [], IN_PROGRESS: [], DONE: [] }
    );
  }, [memberData.myTasks]);

  const openTaskDetails = async (task) => {
    setSelectedTask(task);
    setTaskDetails(task);
    setTaskDetailLoading(true);
    setStatusError('');

    try {
      const res = await api.get(`/tasks/${task._id}`);
      setTaskDetails(res.data);
    } catch (err) {
      setStatusError(err.response?.data?.message || 'Failed to load task details.');
    } finally {
      setTaskDetailLoading(false);
    }
  };

  const closeTaskDetails = () => {
    setSelectedTask(null);
    setTaskDetails(null);
    setStatusError('');
  };

  const handleMoveTask = async (task, nextStatus, event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!task?._id || !nextStatus) return;

    setStatusUpdating(task._id);
    setStatusError('');

    try {
      const res = await api.put(`/tasks/${task._id}`, { status: nextStatus });
      const updatedTask = res.data;

      setMemberData((prev) => ({
        ...prev,
        myTasks: prev.myTasks.map((item) => (item._id === updatedTask._id ? { ...item, ...updatedTask } : item)),
      }));

      if (selectedTask?._id === updatedTask._id) {
        setTaskDetails((prev) => ({ ...(prev || {}), ...updatedTask }));
        const details = await api.get(`/tasks/${updatedTask._id}`);
        setTaskDetails(details.data);
      }

      await fetchDashboardData(true);
    } catch (err) {
      setStatusError(err.response?.data?.message || 'Failed to update task status.');
    } finally {
      setStatusUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  const summary = memberData.summary || emptySummary;
  const latestReviews = memberData.latestReviews || memberData.reviews || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
            {isAdmin ? 'Admin overview' : 'Employee workspace'}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            {isAdmin ? 'Team Task Manager' : `Welcome back${memberData.profile?.name ? `, ${memberData.profile.name}` : ''}`}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => fetchDashboardData(true)}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {isAdmin ? (
        <AdminDashboard stats={adminStats} recentTasks={recentTasks} projects={projects} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-7">
            <SummaryCard label="Total Assigned" value={summary.totalAssigned} icon={Target} tone="cyan" helper="Tasks assigned to you" />
            <SummaryCard label="Pending Tasks" value={summary.pending} icon={ListTodo} tone="amber" helper="Todo + in progress" />
            <SummaryCard label="In Progress" value={summary.inProgress} icon={RefreshCw} tone="indigo" helper="Actively moving" />
            <SummaryCard label="Completed" value={summary.completed} icon={CheckCircle2} tone="emerald" helper={`${summary.completionRate}% completion`} />
            <SummaryCard label="Overdue" value={summary.overdue} icon={AlertTriangle} tone="rose" helper="Needs attention" />
            <SummaryCard label="Avg Rating" value={`${summary.avgRating}/5`} icon={Star} tone="violet" helper={`${memberData.reviews.length} reviews`} />
            <SummaryCard label="Performance" value={`${summary.performanceScore}%`} icon={BarChart3} tone="slate" helper="Completion + rating" />
          </div>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950">My Tasks</h2>
                <p className="mt-1 text-sm text-slate-500">Track assigned work by stage and move tasks forward as you complete them.</p>
              </div>
              <div className="min-w-[180px]">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Completion</span>
                  <span>{summary.completionRate}%</span>
                </div>
                <div className="mt-2">
                  <ProgressBar value={summary.completionRate} color="bg-emerald-500" />
                </div>
              </div>
            </div>

            {statusError && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {statusError}
              </div>
            )}

            {memberData.myTasks.length === 0 ? (
              <div className="mt-5">
                <EmptyState title="No tasks assigned" description="Assigned work will appear here as soon as an admin creates it." />
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                {['TODO', 'IN_PROGRESS', 'DONE'].map((status) => (
                  <div key={status} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800">{STATUS_LABELS[status]}</h3>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                        {groupedTasks[status]?.length || 0}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {(groupedTasks[status] || []).length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                          No tasks in this stage.
                        </div>
                      ) : (
                        groupedTasks[status].map((task) => (
                          <TaskCard
                            key={task._id}
                            task={task}
                            onOpen={openTaskDetails}
                            onMove={handleMoveTask}
                            updating={statusUpdating === task._id}
                          />
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">My Reviews</h2>
                  <p className="mt-1 text-sm text-slate-500">Admin ratings, feedback, strengths, and improvement areas.</p>
                </div>
                <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                  <Star className="mr-1 h-3.5 w-3.5 fill-current" />
                  {summary.avgRating}/5
                </Badge>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {latestReviews.length === 0 ? (
                  <div className="lg:col-span-2">
                    <EmptyState title="No reviews yet" description="Feedback from admins will appear in this section." />
                  </div>
                ) : (
                  latestReviews.slice(0, 4).map((review) => <ReviewCard key={review._id} review={review} />)
                )}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-950">Performance</h2>
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="mt-5 space-y-5">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">Performance score</span>
                    <span className="text-slate-500">{summary.performanceScore}%</span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={summary.performanceScore} color="bg-cyan-500" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">Task completion</span>
                    <span className="text-slate-500">{summary.completionRate}%</span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={summary.completionRate} color="bg-emerald-500" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-950">Ratings Trend</h3>
                  {memberData.ratingTrend.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">No rating trend yet.</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {memberData.ratingTrend.slice(-5).map((item) => (
                        <div key={item._id}>
                          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                            <span>{formatDate(item.createdAt)}</span>
                            <span>{item.rating}/5</span>
                          </div>
                          <ProgressBar value={(item.rating / 5) * 100} color="bg-amber-500" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <ActivityTimeline items={memberData.activity || []} />
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-950">Profile Snapshot</h2>
                <UserCircle className="h-5 w-5 text-cyan-600" />
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">Role</p>
                  <p className="mt-2 text-sm font-bold text-slate-950">{memberData.profile?.role || 'MEMBER'}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">Email</p>
                  <p className="mt-2 break-all text-sm font-bold text-slate-950">{memberData.profile?.email || 'Not set'}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">Joined</p>
                  <p className="mt-2 text-sm font-bold text-slate-950">{formatDate(memberData.profile?.createdAt)}</p>
                </div>
              </div>
            </section>
          </div>

          <TaskDetailsModal
            task={taskDetails || selectedTask}
            loading={taskDetailLoading}
            updating={statusUpdating === (taskDetails || selectedTask)?._id}
            onClose={closeTaskDetails}
            onMove={handleMoveTask}
          />
        </>
      )}
    </div>
  );
};

export default Dashboard;
