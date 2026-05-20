const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../prisma');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return [];
};

const serializeReview = (review) => ({
  ...review,
  _id: review.id,
  id: undefined,
  reviewer: review.reviewer ? { _id: review.reviewer.id, name: review.reviewer.name, email: review.reviewer.email } : undefined,
  member: review.member ? { _id: review.member.id, name: review.member.name, email: review.member.email } : undefined,
});

// @route   POST /api/reviews
// @desc    Create member review
// @access  Private/Admin
router.post(
  '/',
  [requireAuth, requireAdmin],
  [
    body('memberId').notEmpty().withMessage('memberId is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('performance').isIn(['EXCEEDS', 'MEETS', 'NEEDS_IMPROVEMENT']).withMessage('Invalid performance mark'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { memberId, rating, feedback, performance, strengths, improvements } = req.body;

      const member = await prisma.user.findUnique({ where: { id: memberId } });
      if (!member || member.role !== 'MEMBER') {
        return res.status(400).json({ message: 'Target user must be a member' });
      }

      const review = await prisma.review.create({
        data: {
          rating,
          feedback: feedback || null,
          performance,
          strengths: normalizeList(strengths),
          improvements: normalizeList(improvements),
          reviewerId: req.user.id,
          memberId,
        },
        include: {
          reviewer: { select: { id: true, name: true, email: true } },
          member: { select: { id: true, name: true, email: true } },
        },
      });

      await prisma.$transaction([
        prisma.activityLog.create({
          data: {
            type: 'REVIEW_RECEIVED',
            message: `New review received (${rating}/5)`,
            actorId: req.user.id,
            memberId,
            reviewId: review.id,
          },
        }),
        prisma.activityLog.create({
          data: {
            type: 'RATING_UPDATED',
            message: `Rating updated to ${rating}/5`,
            actorId: req.user.id,
            memberId,
            reviewId: review.id,
          },
        }),
      ]);

      res.status(201).json(serializeReview(review));
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/reviews
// @desc    Get reviews (admin can query by memberId, member sees own)
// @access  Private
router.get('/', requireAuth, async (req, res) => {
  try {
    const { memberId } = req.query;

    if (req.user.role === 'MEMBER') {
      const reviews = await prisma.review.findMany({
        where: { memberId: req.user.id },
        include: {
          reviewer: { select: { id: true, name: true, email: true } },
          member: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json(reviews.map(serializeReview));
    }

    const reviews = await prisma.review.findMany({
      where: memberId ? { memberId } : {},
      include: {
        reviewer: { select: { id: true, name: true, email: true } },
        member: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(reviews.map(serializeReview));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
