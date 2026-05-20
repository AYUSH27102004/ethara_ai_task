const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const prisma = require('../prisma');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

const VALID_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
const MEMBER_TRANSITIONS = {
  TODO: ['TODO', 'IN_PROGRESS'],
  IN_PROGRESS: ['IN_PROGRESS', 'DONE'],
  DONE: ['DONE'],
};

const serializeTask = (task) => ({
  ...task,
  _id: task.id,
  id: undefined,
  project: task.project ? { _id: task.project.id, name: task.project.name } : null,
  assignedToUser: task.assignedToUser
    ? { _id: task.assignedToUser.id, name: task.assignedToUser.name, email: task.assignedToUser.email }
    : null,
  createdBy: task.createdByUser
    ? { _id: task.createdByUser.id, name: task.createdByUser.name, email: task.createdByUser.email }
    : undefined,
  createdByUser: undefined,
});

const serializeTaskDetail = (task) => ({
  ...serializeTask(task),
  createdBy: task.createdByUser
    ? { _id: task.createdByUser.id, name: task.createdByUser.name, email: task.createdByUser.email }
    : null,
  createdByUser: undefined,
  histories: task.histories
    ? task.histories.map((entry) => ({
        ...entry,
        _id: entry.id,
        id: undefined,
        changedBy: entry.changedBy
          ? { _id: entry.changedBy.id, name: entry.changedBy.name, email: entry.changedBy.email }
          : null,
      }))
    : [],
  activityLogs: task.activityLogs
    ? task.activityLogs.map((entry) => ({
        ...entry,
        _id: entry.id,
        id: undefined,
        actor: entry.actor
          ? { _id: entry.actor.id, name: entry.actor.name, email: entry.actor.email }
          : null,
      }))
    : [],
});

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private/Admin
router.post(
  '/',
  [requireAuth, requireAdmin],
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('projectId').notEmpty().withMessage('ProjectId is required'),
    body('assignedTo').notEmpty().withMessage('AssignedTo is required'),
    body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'DONE']).withMessage('Invalid status'),
    body('priority').optional().isIn(['Low', 'Medium', 'High']).withMessage('Invalid priority'),
    body('dueDate').optional().custom((value) => {
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Strip time for comparison
      if (selectedDate < today) {
        throw new Error('Due date cannot be in the past');
      }
      return true;
    })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { title, description, status, priority, dueDate, projectId, assignedTo } = req.body;

      // Validate Project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { members: { select: { id: true, role: true } } },
      });
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Validate assignedTo is a member of the project
      const assignedMember = project.members.find((member) => member.id === assignedTo);
      if (!assignedMember || assignedMember.role !== 'MEMBER') {
        return res.status(400).json({ message: 'Assigned user must be a member of this project' });
      }

      const savedTask = await prisma.task.create({
        data: {
          title,
          description,
          status: status || 'TODO',
          priority: priority || 'Medium',
          dueDate: dueDate ? new Date(dueDate) : null,
          projectId,
          assignedTo,
          assignedAt: new Date(),
          createdBy: req.user.id,
        },
      });

      await prisma.$transaction([
        prisma.taskHistory.create({
          data: {
            taskId: savedTask.id,
            status: savedTask.status,
            changedById: req.user.id,
          },
        }),
        prisma.activityLog.create({
          data: {
            type: 'TASK_ASSIGNED',
            message: `Task assigned: ${savedTask.title}`,
            actorId: req.user.id,
            memberId: assignedTo,
            taskId: savedTask.id,
            projectId,
          },
        }),
      ]);

      const taskWithRelations = await prisma.task.findUnique({
        where: { id: savedTask.id },
        include: {
          project: { select: { id: true, name: true } },
          assignedToUser: { select: { id: true, name: true, email: true } },
          createdByUser: { select: { id: true, name: true, email: true } },
        },
      });

      res.status(201).json(serializeTask(taskWithRelations));
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/tasks
// @desc    Get tasks with optional filters
// @access  Private
router.get('/', requireAuth, async (req, res) => {
  try {
    const { projectId, status, assignedTo } = req.query;
    let query = {};

    if (projectId) query.projectId = projectId;
    if (status) query.status = status;

    // Role-based access control for displaying tasks
    if (req.user.role === 'MEMBER') {
      // Member can only see their assigned tasks
      query.assignedTo = req.user.id;
    } else {
      // Admin can filter by assignedTo query param
      if (assignedTo) query.assignedTo = assignedTo;
    }

    const tasks = await prisma.task.findMany({
      where: query,
      include: {
        project: { select: { id: true, name: true } },
        assignedToUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tasks.map(serializeTask));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/tasks/:id
// @desc    Get task by ID
// @access  Private
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        project: { select: { id: true, name: true } },
        assignedToUser: { select: { id: true, name: true, email: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
        histories: {
          include: { changedBy: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
        activityLogs: {
          include: { actor: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Role-based access control
    if (req.user.role === 'MEMBER' && task.assignedTo !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You are not assigned to this task' });
    }

    res.json(serializeTaskDetail(task));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update task details
// @access  Private
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, assignedTo } = req.body;
    let task = await prisma.task.findUnique({ where: { id: req.params.id } });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const previousStatus = task.status;
    const previousAssignee = task.assignedTo;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid task status' });
    }

    // Role-based processing
    if (req.user.role === 'MEMBER') {
      if (task.assignedTo !== req.user.id) {
        return res.status(403).json({ message: 'Access denied: You are not assigned to this task' });
      }

      // Check if Member is trying to update unauthorized fields
      const disallowedFields = ['title', 'description', 'priority', 'dueDate', 'assignedTo', 'projectId'];
      const incomingFields = Object.keys(req.body);
      const isAttemptingUnauthorizedUpdate = incomingFields.some(field => disallowedFields.includes(field));

      if (isAttemptingUnauthorizedUpdate) {
        return res.status(403).json({ message: 'Members are only permitted to update the task status' });
      }

      if (!status) {
        return res.status(400).json({ message: 'Status is required for member task updates' });
      }

      if (!MEMBER_TRANSITIONS[previousStatus]?.includes(status)) {
        return res.status(400).json({
          message: 'Members can only move tasks forward from Todo to In Progress to Done',
        });
      }

      if (status) {
        task = await prisma.task.update({
          where: { id: req.params.id },
          data: { status },
        });

        if (status !== previousStatus) {
          await prisma.$transaction([
            prisma.taskHistory.create({
              data: {
                taskId: task.id,
                status,
                changedById: req.user.id,
              },
            }),
            prisma.activityLog.create({
              data: {
                type: status === 'DONE' ? 'TASK_COMPLETED' : 'STATUS_UPDATED',
                message: `Status updated to ${status.replace('_', ' ')}`,
                actorId: req.user.id,
                memberId: req.user.id,
                taskId: task.id,
                projectId: task.projectId,
              },
            }),
          ]);
        }
      }
    } else if (req.user.role === 'ADMIN') {
      const data = {
        ...(title ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      };

      if (assignedTo && assignedTo !== task.assignedTo) {
        const project = await prisma.project.findUnique({
          where: { id: task.projectId },
          include: { members: { select: { id: true, role: true } } },
        });

        const assignedMember = project?.members.find((member) => member.id === assignedTo);
        if (!assignedMember || assignedMember.role !== 'MEMBER') {
          return res.status(400).json({ message: 'New assigned user must be a member of the project' });
        }
        data.assignedTo = assignedTo;
        data.assignedAt = new Date();
      }

      task = await prisma.task.update({
        where: { id: req.params.id },
        data,
      });

      const activityWrites = [];

      if (status && status !== previousStatus) {
        activityWrites.push(
          prisma.taskHistory.create({
            data: {
              taskId: task.id,
              status,
              changedById: req.user.id,
            },
          })
        );

        activityWrites.push(
          prisma.activityLog.create({
            data: {
              type: status === 'DONE' ? 'TASK_COMPLETED' : 'STATUS_UPDATED',
              message: `Status updated to ${status.replace('_', ' ')}`,
              actorId: req.user.id,
              memberId: task.assignedTo || req.user.id,
              taskId: task.id,
              projectId: task.projectId,
            },
          })
        );
      }

      if (assignedTo && assignedTo !== previousAssignee) {
        activityWrites.push(
          prisma.activityLog.create({
            data: {
              type: 'TASK_ASSIGNED',
              message: `Task assigned: ${task.title}`,
              actorId: req.user.id,
              memberId: assignedTo,
              taskId: task.id,
              projectId: task.projectId,
            },
          })
        );
      }

      if (activityWrites.length > 0) {
        await prisma.$transaction(activityWrites);
      }
    }

    if (!task) {
      return res.status(400).json({ message: 'No updates were applied to this task' });
    }

    const taskWithRelations = await prisma.task.findUnique({
      where: { id: task.id },
      include: {
        project: { select: { id: true, name: true } },
        assignedToUser: { select: { id: true, name: true, email: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(serializeTask(taskWithRelations));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
// @access  Private/Admin
router.delete('/:id', [requireAuth, requireAdmin], async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: 'Task successfully removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
