import { SignUp } from "@clerk/react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <SignUp
        appearance={{
          variables: {
            colorPrimary: "#1a8fa0",
            borderRadius: "0.5rem",
          },
        }}
      />
    </div>
  );
}
