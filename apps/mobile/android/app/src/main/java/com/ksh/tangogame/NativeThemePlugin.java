package com.ksh.tangogame;

import android.app.UiModeManager;
import android.content.Context;
import android.os.Build;
import androidx.appcompat.app.AppCompatDelegate;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeTheme")
public class NativeThemePlugin extends Plugin {
    private static final String PREFERENCES = "tango_native_theme";
    private static final String THEME_KEY = "theme";

    static void applySavedTheme(Context context) {
        String theme = context
            .getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            .getString(THEME_KEY, "system");
        applyTheme(context, theme);
    }

    private static void applyTheme(Context context, String theme) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            UiModeManager manager = context.getSystemService(UiModeManager.class);
            if (manager == null) return;
            if ("dark".equals(theme)) {
                manager.setApplicationNightMode(UiModeManager.MODE_NIGHT_YES);
            } else if ("light".equals(theme)) {
                manager.setApplicationNightMode(UiModeManager.MODE_NIGHT_NO);
            } else {
                manager.setApplicationNightMode(UiModeManager.MODE_NIGHT_AUTO);
            }
            return;
        }

        if ("dark".equals(theme)) {
            AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES);
        } else if ("light".equals(theme)) {
            AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO);
        } else {
            AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM);
        }
    }

    @PluginMethod
    public void setTheme(PluginCall call) {
        String theme = call.getString("theme", "system");
        if (!"system".equals(theme) && !"light".equals(theme) && !"dark".equals(theme)) {
            call.reject("Unsupported theme.", "INVALID_THEME");
            return;
        }

        Context context = getContext();
        String storedTheme = context
            .getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            .getString(THEME_KEY, "system");
        if (theme.equals(storedTheme)) {
            JSObject result = new JSObject();
            result.put("theme", theme);
            call.resolve(result);
            return;
        }

        context
            .getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            .edit()
            .putString(THEME_KEY, theme)
            .apply();

        getActivity().runOnUiThread(() -> {
            applyTheme(context, theme);
            JSObject result = new JSObject();
            result.put("theme", theme);
            call.resolve(result);
        });
    }
}
