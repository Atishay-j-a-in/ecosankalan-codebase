const Challenge = require('../models/Challenge');
const ChallengeProgress = require('../models/ChallengeProgress');
const { issueReward } = require('../services/rewardEngine');

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const startOfCurrentWeekIST = (now = new Date()) => {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const day = ist.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  ist.setUTCDate(ist.getUTCDate() - diffToMonday);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - IST_OFFSET_MS);
};

const initialProgress = (challenge) =>
  challenge.tasks.map((task, taskIndex) => ({
    taskIndex,
    currentCount: 0,
    completed: false,
  }));

const nowUTC = () => new Date();

exports.createChallenge = async (req, res) => {
  try {
    const { title, description, tasks, rewardPoints, rewardVoucherPartner, startDate, expiryDate } = req.body;

    if (!title || !description || !Array.isArray(tasks) || tasks.length === 0 || !startDate || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'title, description, tasks (non-empty array), startDate, and expiryDate are required',
      });
    }

    const start = new Date(startDate);
    const expiry = new Date(expiryDate);

    if (expiry <= start) {
      return res.status(400).json({
        success: false,
        message: 'expiryDate must be after startDate',
      });
    }

    for (const task of tasks) {
      if (!task.action || !task.targetCount || task.targetCount < 1) {
        return res.status(400).json({
          success: false,
          message: 'Each task must have action (string) and targetCount (min 1)',
        });
      }
    }

    const challenge = await Challenge.create({
      title,
      description,
      tasks,
      rewardPoints: rewardPoints || 0,
      rewardVoucherPartner: rewardVoucherPartner || undefined,
      startDate: start,
      expiryDate: expiry,
    });

    res.status(201).json({ success: true, challenge });
  } catch (err) {
    if (err?.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors)[0]?.message || 'Invalid challenge data',
      });
    }
    res.status(500).json({ success: false, message: 'Failed to create challenge' });
  }
};

exports.updateChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = [
      'title', 'description', 'tasks', 'rewardPoints',
      'rewardVoucherPartner', 'startDate', 'expiryDate', 'isActive',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.expiryDate) updates.expiryDate = new Date(updates.expiryDate);

    if (updates.startDate && updates.expiryDate && updates.expiryDate <= updates.startDate) {
      return res.status(400).json({
        success: false,
        message: 'expiryDate must be after startDate',
      });
    }

    if (updates.tasks) {
      for (const task of updates.tasks) {
        if (!task.action || !task.targetCount || task.targetCount < 1) {
          return res.status(400).json({
            success: false,
            message: 'Each task must have action (string) and targetCount (min 1)',
          });
        }
      }
    }

    const challenge = await Challenge.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }

    res.status(200).json({ success: true, challenge });
  } catch (err) {
    if (err?.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors)[0]?.message || 'Invalid challenge data',
      });
    }
    res.status(500).json({ success: false, message: 'Failed to update challenge' });
  }
};

exports.deleteChallenge = async (req, res) => {
  try {
    const challenge = await Challenge.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }

    res.status(200).json({ success: true, message: 'Challenge deactivated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete challenge' });
  }
};

exports.joinChallenge = async (req, res) => {
  try {
    const now = nowUTC();
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge not found' });
    }

    if (!challenge.isActive) {
      return res.status(400).json({ success: false, message: 'Challenge is not active' });
    }

    if (now < challenge.startDate || now > challenge.expiryDate) {
      return res.status(400).json({ success: false, message: 'Challenge is not currently active' });
    }

    const existing = await ChallengeProgress.findOne({
      userId: req.user.userId,
      challengeId: challenge._id,
      weekStartDate: challenge.startDate,
    });

    if (existing) {
      return res.status(409).json({ success: false, message: 'Already joined this challenge' });
    }

    const progress = await ChallengeProgress.create({
      userId: req.user.userId,
      challengeId: challenge._id,
      weekStartDate: challenge.startDate,
      taskProgress: initialProgress(challenge),
    });

    res.status(201).json({ success: true, progress });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to join challenge' });
  }
};

exports.getActiveChallenges = async (req, res) => {
  try {
    const now = nowUTC();
    const challenges = await Challenge.find({
      isActive: true,
      startDate: { $lte: now },
      expiryDate: { $gte: now },
    }).lean();

    const progressRows = await ChallengeProgress.find({
      userId: req.user.userId,
      challengeId: { $in: challenges.map((challenge) => challenge._id) },
    }).lean();

    const progressByChallenge = new Map(
      progressRows.map((progress) => [String(progress.challengeId), progress])
    );

    res.status(200).json(challenges.map((challenge) => ({
      ...challenge,
      progress: progressByChallenge.get(String(challenge._id)) || {
        taskProgress: initialProgress(challenge),
        allCompleted: false,
        rewardIssued: false,
      },
      deadline: challenge.expiryDate,
    })));
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load active challenges' });
  }
};

exports.updateProgress = async (req, res) => {
  try {
    const { action, category, count = 1 } = req.body;
    const incrementBy = Number(count);
    const now = nowUTC();
    const challenge = await Challenge.findOne({
      _id: req.params.id,
      isActive: true,
      startDate: { $lte: now },
      expiryDate: { $gte: now },
    });

    if (!challenge) return res.status(404).json({ success: false, message: 'Challenge not found' });
    if (!action || !Number.isFinite(incrementBy) || incrementBy <= 0) {
      return res.status(400).json({ success: false, message: 'action and positive count are required' });
    }

    let progress = await ChallengeProgress.findOne({
      userId: req.user.userId,
      challengeId: challenge._id,
    });

    if (!progress) {
      progress = await ChallengeProgress.create({
        userId: req.user.userId,
        challengeId: challenge._id,
        weekStartDate: challenge.startDate,
        taskProgress: initialProgress(challenge),
      });
    }

    challenge.tasks.forEach((task, taskIndex) => {
      const categoryMatches = !task.category || !category || task.category === category;
      if (task.action === action && categoryMatches) {
        const taskProgress = progress.taskProgress.find((item) => item.taskIndex === taskIndex);
        taskProgress.currentCount = Math.min(task.targetCount, taskProgress.currentCount + incrementBy);
        taskProgress.completed = taskProgress.currentCount >= task.targetCount;
      }
    });

    progress.allCompleted = progress.taskProgress.every((item) => item.completed);
    if (progress.allCompleted && !progress.completedAt) progress.completedAt = new Date();
    await progress.save();

    let reward = null;
    if (progress.allCompleted && !progress.rewardIssued) {
      reward = await issueReward(req.user.userId, challenge._id, challenge.startDate);
      progress = await ChallengeProgress.findById(progress._id);
    }

    res.status(200).json({ progress, reward });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update challenge progress' });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const currentWeek = startOfCurrentWeekIST();
    const start = new Date(currentWeek.getTime() - 7 * 7 * 24 * 60 * 60 * 1000);
    const progressRows = await ChallengeProgress.find({
      userId: req.user.userId,
      weekStartDate: { $gte: start, $lte: currentWeek },
    }).populate('challengeId', 'title tasks').sort({ weekStartDate: -1 }).lean();

    const grouped = new Map();
    progressRows.forEach((progress) => {
      const key = progress.weekStartDate.toISOString();
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push({
        challengeTitle: progress.challengeId?.title || 'Challenge',
        status: progress.allCompleted ? 'completed' : 'missed',
        rewardReceived: progress.rewardIssued,
        progressAtEnd: progress.taskProgress,
      });
    });

    res.status(200).json(
      Array.from(grouped.entries())
        .slice(0, 8)
        .map(([weekStartDate, challenges]) => ({ weekStartDate, challenges }))
    );
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load challenge history' });
  }
};

exports.getAdminChallenges = async (req, res) => {
  try {
    const challenges = await Challenge.find()
      .sort({ startDate: -1, createdAt: -1 })
      .lean();
    res.status(200).json(challenges);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load challenges' });
  }
};
