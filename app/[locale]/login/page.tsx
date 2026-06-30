import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md py-12">
      <h1 className="mb-6 text-3xl font-bold">
        Login
      </h1>

      <LoginForm />
    </div>
  );
}

