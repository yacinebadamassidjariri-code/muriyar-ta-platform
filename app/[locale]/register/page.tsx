import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md py-12">
      <h1 className="mb-6 text-3xl font-bold">
        Register
      </h1>

      <RegisterForm />
    </div>
  );
}