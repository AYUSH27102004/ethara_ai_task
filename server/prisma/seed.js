const bcrypt = require('bcrypt');
const prisma = require('../prisma');

const seed = async () => {
  const password = 'task123#';
  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.activityLog.deleteMany(),
    prisma.taskHistory.deleteMany(),
    prisma.review.deleteMany(),
    prisma.task.deleteMany(),
    prisma.project.deleteMany(),
    prisma.user.deleteMany(),
    prisma.team.deleteMany(),
  ]);

  const team = await prisma.team.create({
    data: {
      name: 'Team Alpha',
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@gmail.com',
      password: hashedPassword,
      role: 'ADMIN',
      teamId: team.id,
    },
  });

  const members = await prisma.user.createMany({
    data: [
      {
        name: 'Member One',
        email: 'member1@gmail.com',
        password: hashedPassword,
        role: 'MEMBER',
        teamId: team.id,
      },
      {
        name: 'Member Two',
        email: 'member2@gmail.com',
        password: hashedPassword,
        role: 'MEMBER',
        teamId: team.id,
      },
      {
        name: 'Member Three',
        email: 'member3@gmail.com',
        password: hashedPassword,
        role: 'MEMBER',
        teamId: team.id,
      },
    ],
  });

  const memberUsers = await prisma.user.findMany({
    where: { role: 'MEMBER' },
    orderBy: { email: 'asc' },
  });

  const project = await prisma.project.create({
    data: {
      name: 'Website Redesign System',
      description: 'Revamp the product site with a modern component system and reusable UX patterns.',
      createdBy: admin.id,
      teamId: team.id,
      members: {
        connect: [
          { id: admin.id },
          ...memberUsers.map((member) => ({ id: member.id })),
        ],
      },
    },
  });

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [member1, member2, member3] = memberUsers;

  const tasks = [];

  tasks.push(await prisma.task.create({
    data: {
      title: 'Design Dashboard UI',
      description: 'Create summary cards, task board, and review timeline components.',
      status: 'TODO',
      priority: 'High',
      dueDate: nextWeek,
      assignedAt: threeDaysAgo,
      projectId: project.id,
      assignedTo: member1.id,
      createdBy: admin.id,
    },
  }));

  tasks.push(await prisma.task.create({
    data: {
      title: 'Build Authentication API',
      description: 'Implement JWT login, signup, and role-based access control.',
      status: 'IN_PROGRESS',
      priority: 'High',
      dueDate: tomorrow,
      assignedAt: lastWeek,
      projectId: project.id,
      assignedTo: member2.id,
      createdBy: admin.id,
    },
  }));

  tasks.push(await prisma.task.create({
    data: {
      title: 'Integrate PostgreSQL Database',
      description: 'Connect Prisma models and verify migrations in staging.',
      status: 'DONE',
      priority: 'Medium',
      dueDate: yesterday,
      assignedAt: lastWeek,
      projectId: project.id,
      assignedTo: member3.id,
      createdBy: admin.id,
    },
  }));

  tasks.push(await prisma.task.create({
    data: {
      title: 'Fix Notification Bugs',
      description: 'Resolve missed notification triggers in task updates.',
      status: 'IN_PROGRESS',
      priority: 'Medium',
      dueDate: yesterday,
      assignedAt: threeDaysAgo,
      projectId: project.id,
      assignedTo: member1.id,
      createdBy: admin.id,
    },
  }));

  tasks.push(await prisma.task.create({
    data: {
      title: 'Deploy Backend to Vercel',
      description: 'Ship production-ready deployment with env validation.',
      status: 'TODO',
      priority: 'Low',
      dueDate: nextWeek,
      assignedAt: twoDaysAgo,
      projectId: project.id,
      assignedTo: member2.id,
      createdBy: admin.id,
    },
  }));

  const historyWrites = [];
  const activityWrites = [];

  tasks.forEach((task) => {
    historyWrites.push(prisma.taskHistory.create({
      data: {
        taskId: task.id,
        status: 'TODO',
        changedById: admin.id,
        createdAt: task.assignedAt,
      },
    }));

    if (task.status === 'IN_PROGRESS' || task.status === 'DONE') {
      historyWrites.push(prisma.taskHistory.create({
        data: {
          taskId: task.id,
          status: 'IN_PROGRESS',
          changedById: task.assignedTo,
          createdAt: twoDaysAgo,
        },
      }));
    }

    if (task.status === 'DONE') {
      historyWrites.push(prisma.taskHistory.create({
        data: {
          taskId: task.id,
          status: 'DONE',
          changedById: task.assignedTo,
          createdAt: yesterday,
        },
      }));
    }

    activityWrites.push(prisma.activityLog.create({
      data: {
        type: 'TASK_ASSIGNED',
        message: `Task assigned: ${task.title}`,
        actorId: admin.id,
        memberId: task.assignedTo,
        taskId: task.id,
        projectId: task.projectId,
        createdAt: task.assignedAt,
      },
    }));

    if (task.status === 'IN_PROGRESS') {
      activityWrites.push(prisma.activityLog.create({
        data: {
          type: 'STATUS_UPDATED',
          message: `Status updated to IN PROGRESS`,
          actorId: task.assignedTo,
          memberId: task.assignedTo,
          taskId: task.id,
          projectId: task.projectId,
          createdAt: twoDaysAgo,
        },
      }));
    }

    if (task.status === 'DONE') {
      activityWrites.push(prisma.activityLog.create({
        data: {
          type: 'TASK_COMPLETED',
          message: `Task completed: ${task.title}`,
          actorId: task.assignedTo,
          memberId: task.assignedTo,
          taskId: task.id,
          projectId: task.projectId,
          createdAt: yesterday,
        },
      }));
    }
  });

  await prisma.$transaction([...historyWrites, ...activityWrites]);

  const reviews = [];

  reviews.push(await prisma.review.create({
    data: {
      rating: 4,
      feedback: 'Strong ownership on sprint commitments and thoughtful handoffs.',
      performance: 'MEETS',
      strengths: ['Ownership', 'Reliable delivery'],
      improvements: ['Document edge cases earlier'],
      reviewerId: admin.id,
      memberId: member1.id,
      createdAt: lastWeek,
    },
  }));

  reviews.push(await prisma.review.create({
    data: {
      rating: 5,
      feedback: 'Consistently delivers ahead of schedule and mentors peers.',
      performance: 'EXCEEDS',
      strengths: ['Ownership', 'Mentorship', 'Delivery speed'],
      improvements: ['Share sprint updates earlier'],
      reviewerId: admin.id,
      memberId: member1.id,
    },
  }));

  reviews.push(await prisma.review.create({
    data: {
      rating: 4,
      feedback: 'Strong technical execution with solid collaboration.',
      performance: 'MEETS',
      strengths: ['API design', 'Collaboration'],
      improvements: ['Proactive risk flagging'],
      reviewerId: admin.id,
      memberId: member2.id,
    },
  }));

  reviews.push(await prisma.review.create({
    data: {
      rating: 5,
      feedback: 'Improved deployment readiness and communicated release risks clearly.',
      performance: 'EXCEEDS',
      strengths: ['Release planning', 'Ownership'],
      improvements: ['Keep runbooks updated'],
      reviewerId: admin.id,
      memberId: member2.id,
      createdAt: twoDaysAgo,
    },
  }));

  reviews.push(await prisma.review.create({
    data: {
      rating: 3,
      feedback: 'Needs more proactive updates on blockers and progress.',
      performance: 'NEEDS_IMPROVEMENT',
      strengths: ['Attention to detail'],
      improvements: ['Daily standup clarity', 'Time estimates'],
      reviewerId: admin.id,
      memberId: member3.id,
    },
  }));

  const reviewActivities = reviews.flatMap((review) => ([
    prisma.activityLog.create({
      data: {
        type: 'REVIEW_RECEIVED',
        message: `New review received (${review.rating}/5)`,
        actorId: admin.id,
        memberId: review.memberId,
        reviewId: review.id,
        createdAt: review.createdAt,
      },
    }),
    prisma.activityLog.create({
      data: {
        type: 'RATING_UPDATED',
        message: `Rating updated to ${review.rating}/5`,
        actorId: admin.id,
        memberId: review.memberId,
        reviewId: review.id,
        createdAt: review.createdAt,
      },
    }),
  ]));

  await prisma.$transaction(reviewActivities);

  console.log('Seed completed');
};

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
