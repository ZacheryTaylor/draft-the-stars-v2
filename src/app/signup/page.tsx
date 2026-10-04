import { signUp } from "../actions";
import { SignupView } from "@/views/AccountViews";
import { serverRoutes } from "@/views/routes";

export const metadata = { title: "Sign up" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <SignupView action={signUp} error={error} r={serverRoutes} />;
}
