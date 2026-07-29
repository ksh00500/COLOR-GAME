package com.ksh.tangogame;

import android.app.Activity;
import android.content.pm.ApplicationInfo;
import androidx.annotation.NonNull;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.gms.ads.rewarded.ServerSideVerificationOptions;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.FormError;
import com.google.android.ump.UserMessagingPlatform;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "RewardAds")
public class RewardAdsPlugin extends Plugin {
    private final AtomicBoolean requestInProgress = new AtomicBoolean(false);
    private final AtomicBoolean mobileAdsInitialized = new AtomicBoolean(false);
    private ConsentInformation consentInformation;

    @Override
    public void load() {
        consentInformation = UserMessagingPlatform.getConsentInformation(getContext());
    }

    private void initializeMobileAds(Activity activity, Runnable onReady) {
        if (mobileAdsInitialized.compareAndSet(false, true)) {
            MobileAds.initialize(activity, initializationStatus -> onReady.run());
        } else {
            onReady.run();
        }
    }

    private void withConsent(Activity activity, PluginCall call, Runnable onReady) {
        ConsentRequestParameters parameters = new ConsentRequestParameters.Builder().build();
        consentInformation.requestConsentInfoUpdate(
            activity,
            parameters,
            () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(
                activity,
                formError -> {
                    if (formError != null && !consentInformation.canRequestAds()) {
                        requestInProgress.set(false);
                        call.reject("Consent is required before requesting ads.", "CONSENT_REQUIRED");
                        return;
                    }
                    if (!consentInformation.canRequestAds()) {
                        requestInProgress.set(false);
                        call.reject("Ads cannot be requested with the current consent status.", "ADS_NOT_ALLOWED");
                        return;
                    }
                    onReady.run();
                }
            ),
            requestError -> {
                if (consentInformation.canRequestAds()) {
                    onReady.run();
                    return;
                }
                requestInProgress.set(false);
                call.reject(requestError.getMessage(), "CONSENT_INFO_UNAVAILABLE");
            }
        );
    }

    @PluginMethod
    public void showRewarded(PluginCall call) {
        String customData = call.getString("customData", "");
        String userId = call.getString("userId", "");
        String requestedAdUnitId = call.getString("adUnitId", "");
        if (customData.isEmpty() || userId.isEmpty()) {
            call.reject("Reward session data is required.", "INVALID_REWARD_SESSION");
            return;
        }
        if (!requestInProgress.compareAndSet(false, true)) {
            call.reject("A rewarded ad request is already in progress.", "REWARD_AD_IN_PROGRESS");
            return;
        }

        Activity activity = getActivity();
        activity.runOnUiThread(() -> withConsent(
            activity,
            call,
            () -> initializeMobileAds(activity, () -> {
                boolean isDebugBuild = (
                    getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE
                ) != 0;
                String adUnitId = isDebugBuild
                    ? getContext().getString(R.string.admob_test_rewarded_ad_unit_id)
                    : requestedAdUnitId;
                if (adUnitId == null || adUnitId.trim().isEmpty()) {
                    requestInProgress.set(false);
                    call.reject("The production rewarded ad unit ID is missing.", "ADMOB_NOT_CONFIGURED");
                    return;
                }
                RewardedAd.load(
                    activity,
                    adUnitId,
                    new AdRequest.Builder().build(),
                    new RewardedAdLoadCallback() {
                        @Override
                        public void onAdLoaded(@NonNull RewardedAd rewardedAd) {
                            AtomicBoolean earnedReward = new AtomicBoolean(false);
                            rewardedAd.setServerSideVerificationOptions(
                                new ServerSideVerificationOptions.Builder()
                                    .setCustomData(customData)
                                    .setUserId(userId)
                                    .build()
                            );
                            rewardedAd.setFullScreenContentCallback(
                                new FullScreenContentCallback() {
                                    @Override
                                    public void onAdDismissedFullScreenContent() {
                                        requestInProgress.set(false);
                                        JSObject result = new JSObject();
                                        result.put("earnedReward", earnedReward.get());
                                        call.resolve(result);
                                    }

                                    @Override
                                    public void onAdFailedToShowFullScreenContent(
                                        @NonNull AdError adError
                                    ) {
                                        requestInProgress.set(false);
                                        call.reject(
                                            adError.getMessage(),
                                            "REWARD_AD_SHOW_FAILED"
                                        );
                                    }
                                }
                            );
                            rewardedAd.show(activity, rewardItem -> earnedReward.set(true));
                        }

                        @Override
                        public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                            requestInProgress.set(false);
                            call.reject(
                                loadAdError.getMessage(),
                                "REWARD_AD_LOAD_FAILED"
                            );
                        }
                    }
                );
            })
        ));
    }

    @PluginMethod
    public void showPrivacyOptions(PluginCall call) {
        Activity activity = getActivity();
        activity.runOnUiThread(() -> UserMessagingPlatform.showPrivacyOptionsForm(
            activity,
            formError -> resolvePrivacyOptions(call, formError)
        ));
    }

    private void resolvePrivacyOptions(PluginCall call, FormError formError) {
        if (formError != null) {
            call.reject(formError.getMessage(), "PRIVACY_OPTIONS_UNAVAILABLE");
            return;
        }
        call.resolve();
    }
}
