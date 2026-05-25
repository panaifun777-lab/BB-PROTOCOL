// ===== Engine Store — Zustand Global State =====

import { create } from 'zustand';

export interface ModuleStatus {
  online: boolean;
  port: number;
  lastUpdate: number;
  metrics: Record<string, number>;
}

interface EngineState {
  ifdCalculator: ModuleStatus;
  eceOracle: ModuleStatus;
  poueProver: ModuleStatus;
  mcpRouter: ModuleStatus;
  updateModule: (module: string, status: ModuleStatus) => void;
}

const defaultModuleStatus: ModuleStatus = {
  online: false,
  port: 0,
  lastUpdate: 0,
  metrics: {},
};

export const useEngineStore = create<EngineState>((set) => ({
  ifdCalculator: { ...defaultModuleStatus },
  eceOracle: { ...defaultModuleStatus },
  poueProver: { ...defaultModuleStatus },
  mcpRouter: { ...defaultModuleStatus },

  updateModule: (module, status) =>
    set((state) => {
      if (module in state) {
        return { [module]: status };
      }
      return state;
    }),
}));
