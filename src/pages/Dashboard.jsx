import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Package, ShoppingCart, Contact } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";

const StatCard = ({ icon: Icon, label, value, color, to }) => (
  <Link to={to}>
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  </Link>
);

export default function Dashboard() {
  const { data: customers = [], isLoading: loadingC } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });
  const { data: products = [], isLoading: loadingP } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });
  const { data: orders = [], isLoading: loadingO } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 10),
  });
  const { data: contacts = [], isLoading: loadingCo } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list(),
  });

  const isLoading = loadingC || loadingP || loadingO || loadingCo;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="לוח בקרה" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader title="לוח בקרה" description="סקירה כללית של העסק" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="לקוחות" value={customers.length} color="bg-blue-500" to="/customers" />
        <StatCard icon={Package} label="מוצרים" value={products.length} color="bg-emerald-500" to="/products" />
        <StatCard icon={ShoppingCart} label="הזמנות" value={orders.length} color="bg-amber-500" to="/orders" />
        <StatCard icon={Contact} label="אנשי קשר" value={contacts.length} color="bg-purple-500" to="/contacts" />
      </div>

      {/* Recent orders */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">הזמנות אחרונות</h2>
            <Link to="/orders" className="text-sm text-primary hover:underline">הצג הכל</Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">אין הזמנות</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{order.customer_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{order.order_date || "—"}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}