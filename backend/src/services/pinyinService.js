const db = require('../models/dbAdapter');
const { ErrorCodes } = require('../utils/errorCodes');
const { createAppError } = require('../utils/appError');
const {
  getCurriculumLessons,
  getCurriculumStages,
  getLessonById,
} = require('../content/pinyinCurriculum');

function normalizeCompletedLessonIds(value) {
  return Array.isArray(value) ? Array.from(new Set(value.filter(Boolean))) : [];
}

function getProgressSummary(progressRecord) {
  const lessons = getCurriculumLessons();
  const completedLessonIds = normalizeCompletedLessonIds(progressRecord?.completedLessonIds);
  const completedSet = new Set(completedLessonIds);
  const currentLesson = lessons.find((lesson) => !completedSet.has(lesson.id)) || null;

  return {
    completedLessonIds,
    completedLessons: completedLessonIds.length,
    totalLessons: lessons.length,
    completionRate: lessons.length === 0 ? 0 : Math.round((completedLessonIds.length / lessons.length) * 100),
    currentLessonId: progressRecord?.currentLessonId || currentLesson?.id || null,
    currentLesson,
    lastCompletedLessonId: progressRecord?.lastCompletedLessonId || null,
    updatedAt: progressRecord?.updatedAt || null,
    totalMinutes: lessons.reduce((total, lesson) => total + lesson.durationMinutes, 0),
  };
}

async function getOrCreateProgress(userId) {
  const progress = await db.pinyinProgress.findByUserId(userId);
  if (progress) {
    return progress;
  }

  const firstLesson = getCurriculumLessons()[0] || null;
  return db.pinyinProgress.create({
    userId,
    currentLessonId: firstLesson?.id || null,
    lastCompletedLessonId: null,
    completedLessonIds: [],
  });
}

async function getOverview(user) {
  const progressRecord = await getOrCreateProgress(user.id);

  return {
    data: {
      stages: getCurriculumStages(),
      summary: getProgressSummary(progressRecord),
    },
  };
}

async function getSummary(user) {
  const progressRecord = await getOrCreateProgress(user.id);

  return {
    data: {
      summary: getProgressSummary(progressRecord),
    },
  };
}

async function completeLesson(user, payload) {
  const lessonId = payload.lessonId;
  const lesson = getLessonById(lessonId);

  if (!lesson) {
    throw createAppError(404, ErrorCodes.PARAM_INVALID, '课程不存在');
  }

  const progressRecord = await getOrCreateProgress(user.id);
  const completedLessonIds = normalizeCompletedLessonIds(progressRecord.completedLessonIds);

  if (!completedLessonIds.includes(lessonId)) {
    completedLessonIds.push(lessonId);
  }

  const lessons = getCurriculumLessons();
  const completedSet = new Set(completedLessonIds);
  const nextLesson = lessons.find((item) => !completedSet.has(item.id)) || null;

  const updatedProgress = await db.pinyinProgress.update(progressRecord.id, {
    completedLessonIds,
    currentLessonId: nextLesson?.id || null,
    lastCompletedLessonId: lessonId,
  });

  return {
    data: {
      summary: getProgressSummary(updatedProgress),
      justCompletedLessonId: lessonId,
    },
    message: '课程进度已记录',
  };
}

module.exports = {
  completeLesson,
  getOverview,
  getSummary,
};
