import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ksh.tangogame",
  appName: "Tango",
  webDir: "../web/dist",
  server: {
    androidScheme: "https",
    hostname: "localhost",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#171815",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1200,
      backgroundColor: "#171815",
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: true,
      style: "DARK",
    },
  },
};

export default config;
