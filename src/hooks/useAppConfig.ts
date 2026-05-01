import { useState } from 'react';
import { clearConfig, loadConfig, saveConfig } from '../lib/storage';
import type { AppConfig } from '../lib/types';

export function useAppConfig() {
    const [config, setConfig] = useState<AppConfig>(() => loadConfig());

    const updateConfig = (updates: Partial<AppConfig>) => {
        setConfig((prev) => {
            if(updates.skipLowest && updates.skipLowestCount === undefined) {
                updates.skipLowestCount = 1;
            }
            const next = { ...prev, ...updates };
            saveConfig(next);
            return next;
        });
    };

    const resetConfig = () => {
        clearConfig();
        setConfig(loadConfig());
    };

    return { config, updateConfig, resetConfig };
}
