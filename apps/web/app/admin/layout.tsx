import { logoutAdminAction } from "@/actions/admin-auth";
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
  const session = await requireAdminSession();

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-[5vh] z-30 px-[5vw]">
        <div className="mx-auto flex w-full max-w-[1192px] justify-end">
          <div className="pointer-events-auto inline-flex items-center gap-4 rounded-full border border-[#dde4ef] bg-white/95 px-4 py-3 shadow-[0_14px_38px_rgba(38,51,71,0.08)]">
            <div className="text-right">
              <div className="text-[13px] font-medium uppercase tracking-[0.18em] text-[#7f8794]">
                Admin
              </div>
              <div className="text-[14px] text-[#2f3138]">{session.user.email}</div>
            </div>

            <form action={logoutAdminAction}>
              <button
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#182fc7] px-4 text-[14px] font-medium text-[#182fc7] transition hover:bg-[#182fc7] hover:text-white"
                type="submit"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </div>

      {children}
    </>
  );
}
