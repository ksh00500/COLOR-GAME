package com.ksh.tangogame;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        NativeThemePlugin.applySavedTheme(this);
        registerPlugin(GoogleAuthPlugin.class);
        registerPlugin(RewardAdsPlugin.class);
        registerPlugin(BannerAdsPlugin.class);
        registerPlugin(NativeThemePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
