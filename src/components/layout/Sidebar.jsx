import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Users, Package, ShoppingCart, 
  Contact, Menu, X, ChevronLeft, FlaskConical, Settings, BarChart2, Truck,
  AlertCircle, ShoppingBag, Boxes
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "לוח בקרה", icon: LayoutDashboard },
  { path: "/customers", label: "לקוחות", icon: Users },
  { path: "/products", label: "מוצרים", icon: Package },
  { path: "/orders", label: "הזמנות", icon: ShoppingCart },
  { path: "/contacts", label: "אנשי קשר", icon: Contact },
  { path: "/suppliers", label: "ספקים", icon: Truck },
];

const managementItems = [
  { path: "/shortage-report", label: "חוסרים לייצור", icon: AlertCircle },
  { path: "/supplier-orders", label: "הזמנות לספקים", icon: ShoppingBag },
];

const rivhitItems = [
  { path: "/sync", label: "סנכרון נתונים", icon: BarChart2 },
  { path: "/rivhit-test", label: "בדיקת ריווחית", icon: FlaskConical },
  { path: "/rivhit-settings", label: "הגדרות ריווחית", icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-card rounded-lg shadow-md border border-border"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 right-0 h-full z-50 bg-sidebar text-sidebar-foreground transition-all duration-200 flex flex-col",
          collapsed ? "w-16" : "w-56",
          mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          {!collapsed && (
            <span className="font-bold text-base truncate">PetPro CRM</span>
          )}
          <button
            onClick={() => {
              if (mobileOpen) setMobileOpen(false);
              else setCollapsed(!collapsed);
            }}
            className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {!collapsed && (
            <p className="text-xs text-sidebar-foreground/30 px-3 pt-4 pb-1 uppercase tracking-wider">ניהול</p>
          )}
          {collapsed && <div className="border-t border-sidebar-border my-2" />}
          {managementItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {!collapsed && (
            <p className="text-xs text-sidebar-foreground/30 px-3 pt-4 pb-1 uppercase tracking-wider">ריווחית</p>
          )}
          {collapsed && <div className="border-t border-sidebar-border my-2" />}

          {rivhitItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}