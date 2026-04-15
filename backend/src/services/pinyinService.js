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

function sanitizeProgressData(progressRecord) {
  const lessons = getCurriculumLessons();
  const validLessonIds = new Set(lessons.map((lesson) => lesson.id));
  const completedLessonIds = normalizeCompletedLessonIds(progressRecord?.completedLessonIds)
    .filter((lessonId) => validLessonIds.has(lessonId));
  const completedSet = new Set(completedLessonIds);
  const fallbackCurrentLesson = lessons.find((lesson) => !completedSet.has(lesson.id)) || null;
  const currentLessonId = (
    progressRecord?.currentLessonId
    && validLessonIds.has(progressRecord.currentLessonId)
    && !completedSet.has(progressRecord.currentLessonId)
  )
    ? progressRecord.currentLessonId
    : (fallbackCurrentLesson?.id || null);
  const lastCompletedLessonId = (
    progressRecord?.lastCompletedLessonId
    && validLessonIds.has(progressRecord.lastCompletedLessonId)
    && completedSet.has(progressRecord.lastCompletedLessonId)
  )
    ? progressRecord.lastCompletedLessonId
    : null;

  return {
    completedLessonIds,
    currentLessonId,
    lastCompletedLessonId,
  };
}

function getProgressSummary(progressRecord) {
  const lessons = getCurriculumLessons();
  const {
    completedLessonIds,
    currentLessonId,
    lastCompletedLessonId,
  } = sanitizeProgressData(progressRecord);
  const completedSet = new Set(completedLessonIds);
  const fallbackCurrentLesson = lessons.find((lesson) => !completedSet.has(lesson.id)) || null;
  const currentLesson = lessons.find((lesson) => lesson.id === currentLessonId) || fallbackCurrentLesson;

  return {
    completedLessonIds,
    completedLessons: completedLessonIds.length,
    totalLessons: lessons.length,
    completionRate: lessons.length === 0 ? 0 : Math.round((completedLessonIds.length / lessons.length) * 100),
    currentLessonId: currentLessonId || currentLesson?.id || null,
    currentLesson,
    lastCompletedLessonId,
    updatedAt: progressRecord?.updatedAt || null,
    totalMinutes: lessons.reduce((total, lesson) => total + lesson.durationMinutes, 0),
  };
}

async function getOrCreateProgress(userId) {
  const progress = await db.pinyinProgress.findByUserId(userId);
  if (progress) {
    const sanitizedProgress = sanitizeProgressData(progress);
    const currentCompletedLessonIds = normalizeCompletedLessonIds(progress.completedLessonIds);
    const hasChanged = (
      sanitizedProgress.currentLessonId !== (progress.currentLessonId || null)
      || sanitizedProgress.lastCompletedLessonId !== (progress.lastCompletedLessonId || null)
      || sanitizedProgress.completedLessonIds.length !== currentCompletedLessonIds.length
      || sanitizedProgress.completedLessonIds.some((lessonId, index) => lessonId !== currentCompletedLessonIds[index])
    );

    if (!hasChanged) {
      return progress;
    }

    const updatedProgress = await db.pinyinProgress.update(progress.id, sanitizedProgress);
    return updatedProgress || progress;
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
