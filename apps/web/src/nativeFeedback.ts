import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isNativeApp } from "./nativeApp";

export const notifyTilePlaced = async (): Promise<void> => {
  if (!isNativeApp()) return;
  await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
};

export const notifyInvalidMove = async (): Promise<void> => {
  if (!isNativeApp()) return;
  await Haptics.notification({ type: NotificationType.Error }).catch(() => undefined);
};
