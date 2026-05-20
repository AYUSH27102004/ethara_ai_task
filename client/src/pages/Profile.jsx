import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FolderOpen,
  Loader2,
  Mail,
  MessageSquare,
  Star,
  Target,
  UserCircle,
  Users,
} from 'lucide-react';

const formatDate = (value) => {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const initials = (name) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const formatPerformance = (value) => {
  if (!value) return 'Performance';
  return value.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase());
};

const StatCard = ({ label, value, icon: Icon, tone = 'bg-slate-100 text-slate-700' }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      </div>
      <div className={`rounded-lg p-3 ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get('/users/me');
        setProfile(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const taskGroups = useMemo(() => {
    const tasks = profile?.tasks || [];
    return {
      todo: tasks.filter((task) => task.status === 'TODO').length,
      inProgress: tasks.filter((task) => task.status === 'IN_PROGRESS').length,
      done: tasks.filter((task) => task.status === 'DONE').length,
    };
  }, [profile]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error || 'Profile not found.'}
      </div>
    );
  }

  const stats = profile.stats || {};
  const isAdmin = profile.role === 'ADMIN';
  const reviews = isAdmin ? profile.reviewsGiven || [] : profile.reviewsReceived || [];
  const activity = profile.activity || [];
  const taskTotal = isAdmin ? stats.totalTasks : stats.totalAssigned;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-cyan-100 text-2xl font-bold text-cyan-800">
              {initials(profile.name)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-950">{profile.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {profile.email}
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {profile.role === 'ADMIN' ? 'Admin' : 'Member'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {formatDate(profile.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-slate-950 px-5 py-4 text-white">
            <p className="text-sm text-slate-300">{isAdmin ? 'Team completion' : 'Performance score'}</p>
            <p className="mt-1 text-3xl font-bold">{stats.performanceScore || 0}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isAdmin ? (
          <>
            <StatCard label="Projects Managed" value={stats.totalProjects || 0} icon={FolderOpen} tone="bg-cyan-50 text-cyan-700" />
            <StatCard label="Team Members" value={stats.totalMembers || 0} icon={Users} tone="bg-emerald-50 text-emerald-700" />
            <StatCard label="Total Tasks" value={stats.totalTasks || 0} icon={Target} tone="bg-violet-50 text-violet-700" />
            <StatCard label="Reviews Given" value={stats.reviewCount || 0} icon={MessageSquare} tone="bg-amber-50 text-amber-700" />
          </>
        ) : (
          <>
            <StatCard label="Total Assigned" value={stats.totalAssigned || 0} icon={Target} tone="bg-cyan-50 text-cyan-700" />
            <StatCard label="Completed" value={stats.completedTasks || 0} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-700" />
            <StatCard label="Completion" value={`${stats.completionRate || 0}%`} icon={Activity} tone="bg-violet-50 text-violet-700" />
            <StatCard label="Average Rating" value={`${stats.avgRating || 0}/5`} icon={Star} tone="bg-amber-50 text-amber-700" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-950">{isAdmin ? 'Team Task Breakdown' : 'Task Breakdown'}</h2>
            <span className="text-sm text-slate-500">{stats.pendingTasks || 0} open tasks</span>
          </div>
          <div className="mt-5 space-y-4">
            {[
              { label: 'Todo', count: taskGroups.todo, color: 'bg-slate-500' },
              { label: 'In Progress', count: taskGroups.inProgress, color: 'bg-cyan-500' },
              { label: 'Done', count: taskGroups.done, color: 'bg-emerald-500' },
            ].map((item) => {
              const width = taskTotal ? Math.round((item.count / taskTotal) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{item.label}</span>
                    <span className="text-slate-500">{item.count}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            {stats.overdueTasks || 0} overdue tasks need attention.
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">{isAdmin ? 'Reviews Given' : 'Ratings'}</h2>
          {reviews.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500">
              {isAdmin ? 'No admin reviews have been submitted yet.' : 'No reviews have been submitted yet.'}
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {reviews.slice(0, 3).map((review) => (
                <div key={review._id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">
                      {isAdmin && review.member?.name ? review.member.name : formatPerformance(review.performance)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600">
                      <Star className="h-4 w-4 fill-current" />
                      {review.rating}/5
                    </span>
                  </div>
                  {isAdmin && <p className="mt-1 text-xs font-medium text-slate-500">{formatPerformance(review.performance)}</p>}
                  {review.feedback && <p className="mt-2 text-sm text-slate-600">{review.feedback}</p>}
                  <p className="mt-3 text-xs text-slate-400">{formatDate(review.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Recent Activity</h2>
        {activity.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500">
            No activity has been recorded yet.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {activity.map((entry) => (
              <div key={entry._id} className="flex gap-3">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{entry.message || entry.type}</p>
                  <p className="text-xs text-slate-500">
                    {entry.actor?.name ? `${entry.actor.name} - ` : ''}
                    {formatDate(entry.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Profile;
