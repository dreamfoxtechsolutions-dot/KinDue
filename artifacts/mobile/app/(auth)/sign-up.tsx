import React, { useCallback, useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useSSO, useSignUp } from "@clerk/expo";
import type { Href } from "expo-router";
import { Link, useRouter } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

type Step = "options" | "email" | "verify";

export default function SignUpScreen() {
  useWarmUpBrowser();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { startSSOFlow } = useSSO();
  const { signUp, fetchStatus } = useSignUp();

  const [step, setStep] = useState<Step>("options");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const isLoading = fetchStatus === "fetching";

  const onGooglePress = useCallback(async () => {
    try {
      await WebBrowser.dismissBrowser();
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId) {
        setActive!({
          session: createdSessionId,
          navigate: async ({ decorateUrl }) => {
            router.replace(decorateUrl("/") as Href);
          },
        });
      }
    } catch (err) {
      console.error(err);
      setLocalError("Google sign-up failed. Please try again.");
    }
  }, [startSSOFlow, router]);

  const onSubmitEmail = async () => {
    if (!firstName || !email || !password) {
      setLocalError("Please fill in all fields.");
      return;
    }
    setLocalError("");
    const { error } = await signUp.password({
      firstName,
      emailAddress: email,
      password,
    });
    if (error) {
      setLocalError(error.message || "Sign up failed.");
      return;
    }
    await signUp.verifications.sendEmailCode();
    setStep("verify");
  };

  const onVerify = async () => {
    if (!code) {
      setLocalError("Please enter the verification code.");
      return;
    }
    setLocalError("");
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: ({ decorateUrl }) => router.replace(decorateUrl("/") as Href),
      });
    } else {
      setLocalError("Verification failed. Please try again.");
    }
  };

  const errorMsg = localError;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1, justifyContent: "center" },
    inner: {
      paddingHorizontal: 28,
      paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 20,
      paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 40,
    },
    logoArea: { alignItems: "center", marginBottom: 40 },
    logoCircle: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    appName: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 4,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius + 4,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 16,
    },
    sectionSubtitle: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 16,
      marginTop: -8,
    },
    socialBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.secondary,
      borderRadius: colors.radius,
      paddingVertical: 14,
      gap: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    socialBtnText: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 16,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginHorizontal: 12,
    },
    emailBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.muted,
      borderRadius: colors.radius,
      paddingVertical: 14,
      gap: 8,
    },
    emailBtnText: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    input: {
      backgroundColor: colors.muted,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    passwordRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.muted,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    passwordInput: {
      flex: 1,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },
    eyeBtn: { paddingHorizontal: 14 },
    errorText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.destructive,
      marginBottom: 12,
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 4,
    },
    primaryBtnText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: "#ffffff",
    },
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
      gap: 4,
    },
    backBtnText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    footer: { flexDirection: "row", justifyContent: "center", marginTop: 20, gap: 4 },
    footerText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    footerLink: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
    },
  });

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.inner}>
          <View style={s.logoArea}>
            <View style={s.logoCircle}>
              <Feather name="home" size={32} color="#ffffff" />
            </View>
            <Text style={s.appName}>KinDue</Text>
            <Text style={s.subtitle}>Household bill coordination</Text>
          </View>

          <View style={s.card}>
            {step === "options" && (
              <>
                <Text style={s.sectionTitle}>Create account</Text>
                <TouchableOpacity
                  style={s.socialBtn}
                  onPress={onGooglePress}
                  activeOpacity={0.75}
                >
                  <Feather name="globe" size={20} color={colors.foreground} />
                  <Text style={s.socialBtnText}>Continue with Google</Text>
                </TouchableOpacity>

                <View style={s.dividerRow}>
                  <View style={s.dividerLine} />
                  <Text style={s.dividerText}>OR</Text>
                  <View style={s.dividerLine} />
                </View>

                <TouchableOpacity
                  style={s.emailBtn}
                  onPress={() => setStep("email")}
                  activeOpacity={0.75}
                >
                  <Feather name="mail" size={18} color={colors.mutedForeground} />
                  <Text style={s.emailBtnText}>Continue with Email</Text>
                </TouchableOpacity>
              </>
            )}

            {step === "email" && (
              <>
                <TouchableOpacity
                  style={s.backBtn}
                  onPress={() => { setStep("options"); setLocalError(""); }}
                >
                  <Feather name="arrow-left" size={16} color={colors.mutedForeground} />
                  <Text style={s.backBtnText}>Back</Text>
                </TouchableOpacity>
                <Text style={s.sectionTitle}>Create account</Text>

                <TextInput
                  style={s.input}
                  placeholder="First name"
                  placeholderTextColor={colors.mutedForeground}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
                <TextInput
                  style={s.input}
                  placeholder="Email address"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
                <View style={s.passwordRow}>
                  <TextInput
                    style={s.passwordInput}
                    placeholder="Password"
                    placeholderTextColor={colors.mutedForeground}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                    <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                {!!errorMsg && <Text style={s.errorText}>{errorMsg}</Text>}

                <TouchableOpacity
                  style={[s.primaryBtn, isLoading && { opacity: 0.6 }]}
                  onPress={onSubmitEmail}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={s.primaryBtnText}>Continue</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {step === "verify" && (
              <>
                <Text style={s.sectionTitle}>Verify your email</Text>
                <Text style={s.sectionSubtitle}>
                  We sent a code to {email}
                </Text>

                <TextInput
                  style={s.input}
                  placeholder="6-digit code"
                  placeholderTextColor={colors.mutedForeground}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />

                {!!errorMsg && <Text style={s.errorText}>{errorMsg}</Text>}

                <TouchableOpacity
                  style={[s.primaryBtn, isLoading && { opacity: 0.6 }]}
                  onPress={onVerify}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={s.primaryBtnText}>Verify & Sign Up</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>Already have an account?</Text>
            <Link href="/(auth)/sign-in" asChild>
              <TouchableOpacity>
                <Text style={s.footerLink}>Sign in</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
