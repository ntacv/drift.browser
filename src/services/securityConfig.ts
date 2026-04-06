export const securityFeatures = {
  firefoxSyncEnabled: false,
} as const;

export const isFirefoxSyncEnabled = (): boolean => securityFeatures.firefoxSyncEnabled;
