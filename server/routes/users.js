const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const prisma = require('../prisma');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// @route   GET /api/users
// @desc    Get all users (excludes password)
// @access  Private/Admin
router.get('/', [requireAuth, requireAdmin], async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    res.json(users.map((user) => ({
      ...user,
      _id: user.id,
      id: undefined,
    })));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/me
// @desc    Get current user profile with stats
// @access  Private
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        reviewsReceived: {
          select: {
            id: true,
            rating: true,
            feedback: true,
            performance: true,
            strengths: true,
            improvements: true,
            createdAt: true,
            reviewer: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        reviewsGiven: {
          select: {
            id: true,
            rating: true,
            feedback: true,
            performance: true,
            strengths: true,
            improvements: true,
            createdAt: true,
            member: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const serializeTask = (task) => ({
      ...task,
      _id: task.id,
      id: undefined,
      project: task.project ? { _id: task.project.id, name: task.project.name } : null,
    });

    const serializeActivity = (entry) => ({
      ...entry,
      _id: entry.id,
      id: undefined,
      actor: entry.actor ? { _id: entry.actor.id, name: entry.actor.name, email: entry.actor.email } : null,
      task: entry.task ? { _id: entry.task.id, title: entry.task.title } : null,
      project: entry.project ? { _id: entry.project.id, name: entry.project.name } : null,
    });

    const now = new Date();

    if (user.role === 'ADMIN') {
      const [tasks, totalProjects, totalMembers, ratingAggregate, recentActivity] = await Promise.all([
        prisma.task.findMany({
          select: {
            id: true,
            title: true,
            status: true,
            dueDate: true,
            assignedAt: true,
            project: { select: { id: true, name: true } },
          },
        }),
        prisma.project.count(),
        prisma.user.count({ where: { role: 'MEMBER' } }),
        prisma.review.aggregate({ _avg: { rating: true } }),
        prisma.activityLog.findMany({
          where: { actorId: req.user.id },
          include: {
            actor: { select: { id: true, name: true, email: true } },
            task: { select: { id: true, title: true } },
            project: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((task) => task.status === 'DONE').length;
      const todoTasks = tasks.filter((task) => task.status === 'TODO').length;
      const inProgressTasks = tasks.filter((task) => task.status === 'IN_PROGRESS').length;
      const overdueTasks = tasks.filter((task) => task.status !== 'DONE' && task.dueDate && task.dueDate < now).length;
      const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
      const avgRating = ratingAggregate?._avg?.rating ? Number(ratingAggregate._avg.rating.toFixed(2)) : 0;
      const reviewsGiven = user.reviewsGiven.map((review) => ({
        ...review,
        _id: review.id,
        id: undefined,
        member: review.member
          ? { _id: review.member.id, name: review.member.name, email: review.member.email }
          : null,
      }));

      return res.json({
        id: undefined,
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        reviewsReceived: reviewsGiven,
        reviewsGiven,
        tasks: tasks.map(serializeTask),
        activity: recentActivity.map(serializeActivity),
        stats: {
          totalProjects,
          totalMembers,
          totalTasks,
          totalAssigned: totalTasks,
          completedTasks,
          pendingTasks: todoTasks + inProgressTasks,
          todoTasks,
          inProgressTasks,
          overdueTasks,
          completionRate,
          avgRating,
          reviewCount: reviewsGiven.length,
          performanceScore: completionRate,
        },
      });
    }

    const [tasks, ratingAggregate, recentActivity] = await Promise.all([
      prisma.task.findMany({
        where: { assignedTo: req.user.id },
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
          assignedAt: true,
          project: { select: { id: true, name: true } },
        },
      }),
      prisma.review.aggregate({ where: { memberId: req.user.id }, _avg: { rating: true } }),
      prisma.activityLog.findMany({
        where: { memberId: req.user.id },
        include: {
          actor: { select: { id: true, name: true, email: true } },
          task: { select: { id: true, title: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);

    const totalAssigned = tasks.length;
    const completedTasks = tasks.filter((task) => task.status === 'DONE').length;
    const todoTasks = tasks.filter((task) => task.status === 'TODO').length;
    const inProgressTasks = tasks.filter((task) => task.status === 'IN_PROGRESS').length;
    const overdueTasks = tasks.filter((task) => task.status !== 'DONE' && task.dueDate && task.dueDate < now).length;
    const completionRate = totalAssigned === 0 ? 0 : Math.round((completedTasks / totalAssigned) * 100);
    const avgRating = ratingAggregate?._avg?.rating ? Number(ratingAggregate._avg.rating.toFixed(2)) : 0;

    res.json({
      ...user,
      _id: user.id,
      id: undefined,
      reviewsReceived: user.reviewsReceived.map((review) => ({
        ...review,
        _id: review.id,
        id: undefined,
        reviewer: review.reviewer
          ? { _id: review.reviewer.id, name: review.reviewer.name, email: review.reviewer.email }
          : null,
      })),
      tasks: tasks.map(serializeTask),
      activity: recentActivity.map(serializeActivity),
      stats: {
        totalAssigned,
        completedTasks,
        pendingTasks: todoTasks + inProgressTasks,
        todoTasks,
        inProgressTasks,
        overdueTasks,
        completionRate,
        avgRating,
        reviewCount: user.reviewsReceived.length,
        performanceScore: Math.min(100, Math.round((completionRate * 0.65) + ((avgRating / 5) * 35))),
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users
// @desc    Admin create user (member/admin)
// @access  Private/Admin
router.post(
  '/',
  [requireAuth, requireAdmin],
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('role').isIn(['ADMIN', 'MEMBER']).withMessage('Role must be ADMIN or MEMBER'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, email, password, role } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ message: 'User with this email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
          teamId: req.user.teamId || null,
        },
      });

      res.status(201).json({
        id: undefined,
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/users/:id
// @desc    Get single user profile
// @access  Private
router.get('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        reviewsReceived: {
          select: {
            id: true,
            rating: true,
            feedback: true,
            performance: true,
            strengths: true,
            improvements: true,
            createdAt: true,
            reviewer: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      ...user,
      _id: user.id,
      id: undefined,
      reviewsReceived: user.reviewsReceived.map((review) => ({
        ...review,
        _id: review.id,
        id: undefined,
        reviewer: review.reviewer
          ? { _id: review.reviewer.id, name: review.reviewer.name, email: review.reviewer.email }
          : null,
      })),
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Admin update user details
// @access  Private/Admin
router.put('/:id', [requireAuth, requireAdmin], async (req, res) => {
  try {
    const { name, email, role } = req.body;

    if (role && !['ADMIN', 'MEMBER'].includes(role)) {
      return res.status(400).json({ message: 'Role must be ADMIN or MEMBER' });
    }

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (email && email !== existing.email) {
      const duplicate = await prisma.user.findUnique({ where: { email } });
      if (duplicate) {
        return res.status(409).json({ message: 'Email is already in use' });
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
        ...(role ? { role } : {}),
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    res.json({
      ...updated,
      _id: updated.id,
      id: undefined,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Admin delete user
// @access  Private/Admin
router.delete('/:id', [requireAuth, requireAdmin], async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own active admin account' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await prisma.$transaction([
      prisma.activityLog.deleteMany({ where: { memberId: req.params.id } }),
      prisma.activityLog.updateMany({ where: { actorId: req.params.id }, data: { actorId: null } }),
      prisma.taskHistory.updateMany({ where: { changedById: req.params.id }, data: { changedById: null } }),
      prisma.review.deleteMany({
        where: {
          OR: [
            { reviewerId: req.params.id },
            { memberId: req.params.id },
          ],
        },
      }),
      prisma.task.updateMany({ where: { assignedTo: req.params.id }, data: { assignedTo: null } }),
      prisma.task.updateMany({ where: { createdBy: req.params.id }, data: { createdBy: req.user.id } }),
      prisma.project.updateMany({ where: { createdBy: req.params.id }, data: { createdBy: req.user.id } }),
      prisma.user.delete({ where: { id: req.params.id } }),
    ]);

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
