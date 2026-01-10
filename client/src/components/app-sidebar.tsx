import { LayoutDashboard, Users, Calendar, Briefcase, Trophy, Award, LogOut, FileText } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { XPBar } from "@/components/game/xp-bar";
import { DailyQuestProgress } from "@/components/daily-quest-progress";
import { useAuth } from "@/lib/auth";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Contacts", url: "/contacts", icon: Users },
  { title: "Follow-ups", url: "/follow-ups", icon: Calendar },
  { title: "Opportunities", url: "/opportunities", icon: Briefcase },
  { title: "Outcomes", url: "/outcomes", icon: Trophy },
  { title: "Achievements", url: "/achievements", icon: Award },
  { title: "Templates", url: "/templates", icon: FileText },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">JQ</span>
          </div>
          <span className="font-serif font-semibold text-lg">Job Quest</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {user && (
          <div className="px-4 pb-4">
            <XPBar currentXP={user.totalXP} level={user.currentLevel} />
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} data-testid={`nav-${item.title.toLowerCase()}`}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Today</SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <DailyQuestProgress compact />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {user && (
          <div className="space-y-3">
            <div className="px-2">
              <p className="text-sm font-medium truncate">{user.email}</p>
              <p className="text-xs text-muted-foreground">Level {user.currentLevel}</p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={logout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
