package com.ksh.tangogame;

import android.app.Activity;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import androidx.annotation.NonNull;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "BannerAds")
public class BannerAdsPlugin extends Plugin {
    private final AtomicBoolean mobileAdsInitialized = new AtomicBoolean(false);
    private ConsentInformation consentInformation;
    private FrameLayout bannerContainer;
    private AdView bannerView;
    private String loadedAdUnitId;

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
                    if (!consentInformation.canRequestAds()) {
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
                call.reject(requestError.getMessage(), "CONSENT_INFO_UNAVAILABLE");
            }
        );
    }

    @PluginMethod
    public void showFixed(PluginCall call) {
        Activity activity = getActivity();
        String requestedAdUnitId = call.getString("adUnitId", "");
        activity.runOnUiThread(() -> withConsent(
            activity,
            call,
            () -> initializeMobileAds(activity, () -> {
                boolean isDebugBuild = (
                    getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE
                ) != 0;
                String adUnitId = isDebugBuild
                    ? getContext().getString(R.string.admob_test_banner_ad_unit_id)
                    : requestedAdUnitId;

                if (adUnitId == null || adUnitId.trim().isEmpty()) {
                    call.reject("The production banner ad unit ID is missing.", "ADMOB_BANNER_NOT_CONFIGURED");
                    return;
                }

                if (bannerView != null && adUnitId.equals(loadedAdUnitId)) {
                    bannerContainer.setVisibility(View.VISIBLE);
                    resolveVisible(call);
                    return;
                }

                destroyBanner();
                createBanner(activity, adUnitId, call);
            })
        ));
    }

    private void createBanner(Activity activity, String adUnitId, PluginCall call) {
        ViewGroup content = activity.findViewById(android.R.id.content);
        FrameLayout container = new FrameLayout(activity);
        container.setBackgroundColor(Color.TRANSPARENT);
        container.setClipChildren(false);
        FrameLayout.LayoutParams containerParams = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            Gravity.BOTTOM
        );
        content.addView(container, containerParams);

        ViewCompat.setOnApplyWindowInsetsListener(container, (view, windowInsets) -> {
            Insets systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            FrameLayout.LayoutParams params = (FrameLayout.LayoutParams) view.getLayoutParams();
            if (params.bottomMargin != systemBars.bottom) {
                params.bottomMargin = systemBars.bottom;
                view.setLayoutParams(params);
            }
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(container);

        AdView adView = new AdView(activity);
        adView.setAdSize(AdSize.BANNER);
        adView.setAdUnitId(adUnitId);
        FrameLayout.LayoutParams adParams = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            Gravity.CENTER_HORIZONTAL
        );
        container.addView(adView, adParams);

        bannerContainer = container;
        bannerView = adView;
        loadedAdUnitId = adUnitId;
        adView.setAdListener(new AdListener() {
            @Override
            public void onAdLoaded() {
                resolveVisible(call);
            }

            @Override
            public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                destroyBanner();
                call.reject(loadAdError.getMessage(), "BANNER_AD_LOAD_FAILED");
            }
        });
        adView.loadAd(new AdRequest.Builder().build());
    }

    private void resolveVisible(PluginCall call) {
        JSObject result = new JSObject();
        result.put("visible", true);
        result.put("heightDp", 50);
        call.resolve(result);
    }

    @PluginMethod
    public void hide(PluginCall call) {
        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            if (bannerContainer != null) {
                bannerContainer.setVisibility(View.GONE);
            }
            call.resolve();
        });
    }

    private void destroyBanner() {
        if (bannerView != null) {
            bannerView.destroy();
            bannerView = null;
        }
        if (bannerContainer != null) {
            ViewGroup parent = (ViewGroup) bannerContainer.getParent();
            if (parent != null) {
                parent.removeView(bannerContainer);
            }
            bannerContainer = null;
        }
        loadedAdUnitId = null;
    }

    @Override
    protected void handleOnDestroy() {
        getActivity().runOnUiThread(this::destroyBanner);
        super.handleOnDestroy();
    }
}
