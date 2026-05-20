const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const prisma = require('../prisma');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

const serializeProject = (project) => {
  const { id, members, createdByUser, tasks, ...rest } = project;
  const totalTasks = tasks ? tasks.length : 0;
  const doneTasks = tasks ? tasks.filter((task) => task.status === 'DONE').length : 0;
  const progress = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  return {
    ...rest,
    _id: id,
    members: members ? members.map((member) => member.id) : undefined,
    createdByUser: createdByUser
      ? { _id: createdByUser.id, name: createdByUser.name, email: createdByUser.email }
      : null,
    totalTasks,
    progress,
  };
};

const serializeProjectWithMembers = (project) => {
  const { id, members, createdByUser, totalTasks, progress, tasks, ...rest } = project;
  const taskCount = tasks ? tasks.length : totalTasks || 0;
  const doneTasks = tasks ? tasks.filter((task) => task.status === 'DONE').length : 0;
  const projectProgress = progress !== undefined
    ? progress
    : taskCount === 0
      ? 0
      : Math.round((doneTasks / taskCount) * 100);

  return {
    ...rest,
    _id: id,
    createdByUser: createdByUser
      ? { _id: createdByUser.id, name: createdByUser.name, email: createdByUser.email }
      : null,
    totalTasks: taskCount,
    progress: projectProgress,
    members: members.map((member) => ({
      _id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
    })),
  };
};

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private/Admin
router.post(
  '/',
  [requireAuth, requireAdmin],
  [body('name').notEmpty().withMessage('Name is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, description } = req.body;
      
      const savedProject = await prisma.project.create({
        data: {
          name,
          description,
          createdBy: req.user.id,
          teamId: req.user.teamId || null,
          members: {
            connect: [{ id: req.user.id }],
          },
        },
        include: {
          members: { select: { id: true } },
          createdByUser: { select: { id: true, name: true, email: true } },
          tasks: { select: { status: true } },
        },
      });

      res.status(201).json(serializeProject(savedProject));
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/projects
// @desc    Get projects (Admin sees all, Member sees assigned)
// @access  Private
router.get('/', requireAuth, async (req, res) => {
  try {
    const where = req.user.role === 'ADMIN'
      ? {}
      : { members: { some: { id: req.user.id } } };

    const projects = await prisma.project.findMany({
      where,
      include: {
        members: { select: { id: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
        tasks: { select: { status: true } },
      },
    });

    res.json(projects.map(serializeProject));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/projects/:id
// @desc    Get project details along with populated members and tasks
// @access  Private
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        members: { select: { id: true, name: true, email: true, role: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
        tasks: { select: { status: true } },
      },
    });
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Role-based Access Control for viewing project
    if (req.user.role !== 'ADMIN') {
      const isMember = project.members.some((member) => member.id === req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: 'Access denied: You are not a member of this project' });
      }
    }

    const taskWhere = req.user.role === 'ADMIN'
      ? { projectId: req.params.id }
      : { projectId: req.params.id, assignedTo: req.user.id };

    const tasks = await prisma.task.findMany({
      where: taskWhere,
      include: {
        project: { select: { id: true, name: true } },
        assignedToUser: { select: { id: true, name: true, email: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' },
        { assignedAt: 'desc' },
      ],
    });

    res.json({
      project: serializeProjectWithMembers({
        ...project,
        totalTasks: project.tasks.length,
        progress: project.tasks.length === 0
          ? 0
          : Math.round((project.tasks.filter((task) => task.status === 'DONE').length / project.tasks.length) * 100),
      }),
      tasks: tasks.map((task) => ({
        ...task,
        _id: task.id,
        id: undefined,
        project: task.project ? { _id: task.project.id, name: task.project.name } : null,
        assignedToUser: task.assignedToUser
          ? { _id: task.assignedToUser.id, name: task.assignedToUser.name, email: task.assignedToUser.email }
          : null,
        createdBy: task.createdByUser
          ? { _id: task.createdByUser.id, name: task.createdByUser.name, email: task.createdByUser.email }
          : null,
        createdByUser: undefined,
      })),
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update a project
// @access  Private/Admin
router.put('/:id', [requireAuth, requireAdmin], async (req, res) => {
  try {
    const { name, description } = req.body;
    let project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { members: { select: { id: true } } },
    });
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...(name ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
      },
      include: { members: { select: { id: true } } },
    });

    res.json(serializeProject(project));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete project and cascade delete tasks
// @access  Private/Admin
router.delete('/:id', [requireAuth, requireAdmin], async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const projectTasks = await prisma.task.findMany({
      where: { projectId: req.params.id },
      select: { id: true },
    });
    const projectTaskIds = projectTasks.map((task) => task.id);

    await prisma.$transaction([
      prisma.taskHistory.deleteMany({ where: { taskId: { in: projectTaskIds } } }),
      prisma.activityLog.deleteMany({ where: { projectId: req.params.id } }),
      prisma.task.deleteMany({ where: { projectId: req.params.id } }),
      prisma.project.delete({ where: { id: req.params.id } }),
    ]);

    res.json({ message: 'Project and associated tasks successfully removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/projects/:id/members
// @desc    Add member to a project
// @access  Private/Admin
router.post('/:id/members', [requireAuth, requireAdmin], async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { members: { select: { id: true } } },
    });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const userToAdd = await prisma.user.findUnique({ where: { id: userId } });
    if (!userToAdd) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (project.members.some((member) => member.id === userId)) {
      return res.status(400).json({ message: 'User is already a member of this project' });
    }

    const updatedProject = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        members: { connect: { id: userId } },
      },
      include: {
        members: { select: { id: true, name: true, email: true, role: true } },
        tasks: { select: { status: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(serializeProjectWithMembers(updatedProject));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
