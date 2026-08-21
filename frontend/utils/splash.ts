export const MINIMUM_SPLASH_DURATION_MS = 1_500;

type SplashReadiness = {
  hasHydrated: boolean;
  fontsLoaded: boolean;
  minimumDurationElapsed: boolean;
};

export function shouldShowSplash({
  hasHydrated,
  fontsLoaded,
  minimumDurationElapsed,
}: SplashReadiness): boolean {
  return !hasHydrated || !fontsLoaded || !minimumDurationElapsed;
}
