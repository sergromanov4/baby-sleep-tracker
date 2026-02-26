import type { Repository } from './repository';

// Today the whole app works on top of IndexedDB (Dexie).
// We reuse the existing implementation from lib/repo.
import * as local from '@/lib/repo';

export const LocalRepository: Repository = {
  listChildren: local.listChildren,
  createChild: local.createChild,
  setActiveChild: local.setActiveChild,
  getActiveChild: local.getActiveChild,

  startSleepSession: local.startSleepSession,
  stopSleepSession: local.stopSleepSession,
  getRunningSleepSession: local.getRunningSleepSession,
  listSleepSessionsInRange: local.listSleepSessionsInRange,
  updateSleepSession: local.updateSleepSession,
  createSleepSessionManual: local.createSleepSessionManual,
  deleteSleepSession: local.deleteSleepSession,

  addGrowthEntry: local.addGrowthEntry,
  listGrowthEntries: local.listGrowthEntries,
  deleteGrowthEntry: local.deleteGrowthEntry,
};
