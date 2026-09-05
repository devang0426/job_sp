import { SignIn } from "@clerk/nextjs";
import { DemoCredentialsCard } from "@/components/auth/DemoCredentialsCard";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-base p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8 max-w-5xl w-full">
        <DemoCredentialsCard />
        <div className="w-full flex justify-center">
          <SignIn />
        </div>
      </div>
    </div>
  );
}

