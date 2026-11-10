const sessions = new Map();

function getSession(userId) {
  const key = String(userId);
  let session = sessions.get(key);

  if (!session) {
    session = {
      mode: null,
      busy: false,
      referenceScenario: null,
      ideationTranscript: null,
      ideationStage: null,
    };

    sessions.set(key, session);
  }

  return session;
}

function tryLock(userId) {
  const session = getSession(userId);
  if (session.busy) return false;
  session.busy = true;
  return true;
}

function unlock(userId) {
  getSession(userId).busy = false;
}

function clearMode(userId) {
  const session = getSession(userId);
  session.mode = null;
  session.referenceScenario = null;
  session.ideationTranscript = null;
  session.ideationStage = null;
}

module.exports = {
  getSession,
  tryLock,
  unlock,
  clearMode,
};