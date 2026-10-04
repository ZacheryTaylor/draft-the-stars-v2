export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (error) return <p className="error" role="alert">{error}</p>;
  if (success) return <p className="notice" role="status">{success}</p>;
  return null;
}
