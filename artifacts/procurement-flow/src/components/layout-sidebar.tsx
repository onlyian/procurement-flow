import { useLocation, Link } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { LayoutDashboard, Package, Inbox, ArrowRightLeft, LogOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/requests", label: "Requests", icon: Inbox },
  { href: "/transactions", label: "Transactions", icon: ArrowRightLeft },
];

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  return (
    <div className="flex h-screen w-full bg-muted/20">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-background flex flex-col hidden md:flex">
        <div className="flex h-14 items-center px-6 border-b">
          <div className="flex items-center gap-2 font-bold text-lg text-primary tracking-tight">
            <div className="bg-primary text-primary-foreground p-1 rounded-md">
              <Package className="h-5 w-5" />
            </div>
            ProcurementFlow
          </div>
        </div>

        <nav className="flex-1 overflow-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                      location === item.href
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t p-4">
          {!isLoaded ? (
            <div className="flex items-center gap-3 px-2 py-1">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : user ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.imageUrl} />
                  <AvatarFallback>{user.firstName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-sm font-medium">
                    {user.fullName || "User"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.primaryEmailAddress?.emailAddress}
                  </span>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full text-left"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col">
        {children}
      </main>
    </div>
  );
}
