import { logIn } from "../actions";
import { LoginView } from "@/views/AccountViews";
import { serverRoutes } from "@/views/routes";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  return <LoginView action={logIn} error={error} next={next} r={serverRoutes} />;
}
