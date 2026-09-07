import { redirect } from "next/navigation";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = searchParams ? await searchParams : {};
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      query.set(key, value);
    }
  }
  const queryString = query.toString();
  redirect(queryString ? `/sign-in?${queryString}` : "/sign-in");
}
