import { requireAdminSession } from "@/lib/admin-session";

/**
 * Every admin page passes through one shared auth gate so the editorial area
 * does not rely on each route remembering to protect itself manually.
 */
export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdminSession();
  return children;
}
