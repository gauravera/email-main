import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Users, Mail, Send, Activity } from "lucide-react";
import Link from "next/link";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (session?.user?.email !== adminEmail) {
    redirect("/");
  }

  const [totalLogins, totalMailsGenerated, totalMailsSent, users] = await Promise.all([
    prisma.user.count(),
    prisma.emailDraft.count(),
    prisma.emailDraft.count({
      where: {
        status: "sent",
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        accounts: {
          select: {
            scope: true
          }
        },
        campaigns: {
          select: {
            _count: {
              select: {
                drafts: {
                  where: { status: "sent" }
                }
              }
            }
          }
        }
      }
    })
  ]);

  return (
    <div className="flex-1 p-8 min-h-screen bg-background">
      <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-8">
        Admin Console
      </h1>
      
      <div className="grid gap-6 md:grid-cols-3">
        {/* Total Logins Card */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Total Logins</h3>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{totalLogins}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total registered users on the platform
            </p>
          </div>
        </div>
        
        {/* Mails Generated Card */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Mails Generated</h3>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{totalMailsGenerated}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total number of emails drafted
            </p>
          </div>
        </div>

        {/* Mails Sent Card */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Mails Sent</h3>
            <Send className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">{totalMailsSent}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total number of emails successfully sent
            </p>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight mb-6">Registered Users</h2>
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium">Mails Sent</th>
                  <th className="px-6 py-4 font-medium">Permissions</th>
                  <th className="px-6 py-4 font-medium">Joined Date</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => {
                  const requestedScopes = [
                    "openid",
                    "email",
                    "profile",
                    "https://www.googleapis.com/auth/gmail.send",
                    "https://www.googleapis.com/auth/generative-language.retriever"
                  ];
                  const userScopeString = u.accounts[0]?.scope || "";
                  const grantedCount = requestedScopes.filter(s => userScopeString.includes(s)).length;
                  const totalCount = requestedScopes.length;
                  const hasAll = grantedCount === totalCount;
                  const mailsSent = u.campaigns.reduce((acc, c) => acc + c._count.drafts, 0);
                  
                  return (
                  <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-4">
                      <img
                        src={u.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`}
                        alt={u.name || "User"}
                        className="w-10 h-10 rounded-full border border-border object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="font-medium text-foreground">
                        {u.name || "Unknown User"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {u.email}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {mailsSent}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        hasAll ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                      }`}>
                        {grantedCount}/{totalCount} Granted
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/user/${u.id}`}
                        className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-border bg-background hover:bg-muted h-8 px-3 transition-colors"
                      >
                        <Activity className="w-3 h-3 mr-2" />
                        View Analytics
                      </Link>
                    </td>
                  </tr>
                );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
