import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

// Native implementation. Metro resolves this file on iOS/Android.
// The .web.ts stub above is used on web, so expo-image-picker is
// never bundled for the web target.

export async function pickImage(
  aspect: [number, number],
): Promise<{ uri: string; mimeType?: string } | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Permission needed",
      "Allow access to your photo library in Settings.",
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect,
    quality: 0.85,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0];
}
