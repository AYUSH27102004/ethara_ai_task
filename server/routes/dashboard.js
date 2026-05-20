const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

const STATUS_LABELS = {
  TODO: 'Todo',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

const serializeUserLite = (user) => user
  ? { _id: user.id, name: user.name, email: user.email, role: user.role }
  : null;

const serializeTask = (task) => ({
  _id: task.id,
  title: task.title,
  description: task.description,
  status: task.status,
  statusLabel: STATUS_LABELS[task.status] || task.status,
  priority: task.priority,
  dueDate: task.dueDate,
  assignedAt: task.assignedAt,
  assignedTo: task.assignedTo,
  projectId: task.projectId,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
  project: task.project ? { _id: task.project.id, name: task.project.name } : null,
  createdBy: serializeUserLite(task.createdByUser),
  assignedToUser: serializeUserLite(task.assignedToUser),
});

const serializeReview = (review) => ({
  _id: review.id,
  rating: review.rating,
  feedback: review.feedback,
  performance: review.performance,
  strengths: review.strengths || [],
  improvements: review.improvements || [],
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
  reviewer: serializeUserLite(review.reviewer),
  member: serializeUserLite(review.member),
});

const serializeActivity = (entry) => ({
  _id: entry.id,
  type: entry.type,
  message: entry.message,
  createdAt: entry.createdAt,
  actor: serializeUserLite(entry.actor),
  task: entry.task ? { _id: entry.task.id, title: entry.task.title, status: entry.task.status } : null,
  project: entry.project ? { _id: entry.project.id, name: entry.project.name } : null,
  review: entry.review ? { _id: entry.review.id, rating: entry.review.rating } : null,
});

const calculateMemberSummary = (tasks, reviews) => {
  const now = new Date();
  const totalAssigned = tasks.length;
  const todo = tasks.filter((task) => task.status === 'TODO').length;
  const inProgress = tasks.filter((task) => task.status === 'IN_PROGRESS').length;
  const completed = tasks.filter((task) => task.status === 'DONE').length;
  const overdue = tasks.filter((task) => task.status !== 'DONE' && task.dueDate && task.dueDate < now).length;
  const avgRating = reviews.length === 0
    ? 0
    : Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(2));
  const completionRate = totalAssigned === 0 ? 0 : Math.round((completed / totalAssigned) * 100);
  const performanceScore = Math.min(100, Math.round((completionRate * 0.65) + ((avgRating / 5) * 35)));

  return {
    totalAssigned,
    todo,
    pending: todo + inProgress,
    inProgress,
    completed,
    overdue,
    avgRating,
    performanceScore,
    completionRate,
  };
};

// @route   GET /api/dashboard/admin
// @desc    Admin dashboard summary
// @access  Private/Admin
router.get('/admin', [requireAuth, requireAdmin], async (req, res) => {
  try {
    const now = new Date();

    const [
      totalMembers,
      totalProjects,
      totalTasks,
      completedTasks,
      todoTasks,
      inProgressTasks,
      overdueTasks,
      reviewAggregate,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'MEMBER' } }),
      prisma.project.count(),
      prisma.task.count(),
      prisma.task.count({ where: { status: 'DONE' } }),
      prisma.task.count({ where: { status: 'TODO' } }),
      prisma.task.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.task.count({
        where: {
          status: { not: 'DONE' },
          dueDate: { lt: now },
        },
      }),
      prisma.review.aggregate({ _avg: { rating: true } }),
    ]);

    res.json({
      totalMembers,
      totalProjects,
      totalTasks,
      completedTasks,
      todoTasks,
      inProgressTasks,
      pendingTasks: todoTasks + inProgressTasks,
      overdueTasks,
      averageRating: reviewAggregate?._avg?.rating
        ? Number(reviewAggregate._avg.rating.toFixed(2))
        : 0,
      completionRate: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/member
// @desc    Member dashboard summary and workstream
// @access  Private/Member
router.get('/member', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'MEMBER') {
      return res.status(403).json({ message: 'Access denied: member role required' });
    }

    const [profile, myTasks, reviews, activities] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.task.findMany({
        where: { assignedTo: req.user.id },
        include: {
          project: { select: { id: true, name: true } },
          createdByUser: { select: { id: true, name: true, email: true, role: true } },
          assignedToUser: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: [
          { status: 'asc' },
          { dueDate: 'asc' },
          { assignedAt: 'desc' },
        ],
      }),
      prisma.review.findMany({
        where: { memberId: req.user.id },
        include: {
          reviewer: { select: { id: true, name: true, email: true, role: true } },
          member: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.activityLog.findMany({
        where: { memberId: req.user.id },
        include: {
          actor: { select: { id: true, name: true, email: true, role: true } },
          task: { select: { id: true, title: true, status: true } },
          project: { select: { id: true, name: true } },
          review: { select: { id: true, rating: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    if (!profile) {
      return res.status(404).json({ message: 'User not found' });
    }

    const summary = calculateMemberSummary(myTasks, reviews);
    const serializedReviews = reviews.map(serializeReview);

    res.json({
      profile: {
        _id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        createdAt: profile.createdAt,
      },
      summary,
      // Backward-compatible fields for older components.
      completedTasks: summary.completed,
      pendingTasks: summary.pending,
      progress: summary.completionRate,
      myTasks: myTasks.map(serializeTask),
      reviews: serializedReviews,
      latestReviews: serializedReviews.slice(0, 4),
      ratingTrend: serializedReviews
        .slice()
        .reverse()
        .map((review, index) => ({
          _id: review._id,
          label: `Review ${index + 1}`,
          rating: review.rating,
          createdAt: review.createdAt,
        })),
      activity: activities.map(serializeActivity),
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
