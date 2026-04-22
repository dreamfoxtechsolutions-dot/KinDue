import { Redirect } from "expo-router";

export default function OldIndexRedirect() {
  return <Redirect href="/(home)/(tabs)" />;
}
