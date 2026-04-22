import { Redirect } from "expo-router";

export default function OldTabsRedirect() {
  return <Redirect href="/(home)/(tabs)" />;
}
