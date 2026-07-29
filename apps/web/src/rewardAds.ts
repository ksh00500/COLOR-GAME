import { registerPlugin } from "@capacitor/core";

interface RewardAdsPlugin {
  showRewarded(options: {
    adUnitId: string;
    customData: string;
    userId: string;
  }): Promise<{ earnedReward: boolean }>;
  showPrivacyOptions(): Promise<void>;
}

const rewardAds = registerPlugin<RewardAdsPlugin>("RewardAds");

export const showNativeRewardedAd = (options: {
  adUnitId: string;
  customData: string;
  userId: string;
}): Promise<{ earnedReward: boolean }> => rewardAds.showRewarded(options);

export const showNativeAdPrivacyOptions = (): Promise<void> =>
  rewardAds.showPrivacyOptions();
