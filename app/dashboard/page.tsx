"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import KpiCard from "@/components/ui/KpiCard";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Order = {
  id: string;
  amount: number;
  status: string;
  userId: string;
  createdAt: string;
};

type TooltipPayloadItem = {
  color?: string;
  name?: string;
  value?: number | string;
};

type CustomTooltipProps = {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadItem[];
  isDark?: boolean;
};

type PieLabelProps = {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
};

const formatDateLabel = (date: string) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });

const renderPieLabel = ({
  cx = 0,
  cy = 0,
  midAngle = 0,
  innerRadius = 0,
  outerRadius = 0,
  percent = 0,
}: PieLabelProps) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
      fontWeight={700}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function CustomTooltip({ active, label, payload, isDark }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className={`rounded-lg border p-3 shadow-xl ${
        isDark
          ? "border-slate-700 bg-slate-900/95 text-slate-100"
          : "border-slate-200 bg-white/95 text-slate-800"
      }`}
    >
      <p
        className={`mb-1 text-xs font-medium ${
          isDark ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {label ? formatDateLabel(label) : ""}
      </p>
      {payload.map((item, idx) => (
        <p
          key={`${item.name || "value"}-${idx}`}
          className="text-sm font-semibold"
          style={{ color: item.color }}
        >
          {(item.name || "Value") + ": "}
          {typeof item.value === "number"
            ? item.value.toLocaleString("en-IN")
            : item.value}
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [animatedRevenue, setAnimatedRevenue] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const prevRevenueRef = useRef(0);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      return;
    }
    localStorage.setItem("theme", "dark");
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/orders", {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) return;

        const data = await res.json();
        if (Array.isArray(data)) {
          setOrders(data);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };

    fetchOrders();
  }, [status]);

  const handleAddOrder = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: Math.floor(Math.random() * 2000) + 500,
          status: "completed",
        }),
      });

      if (!res.ok) return;

      const newOrder = await res.json();
      setOrders((prev) => [...prev, newOrder]);
    } catch (error) {
      console.error("Error creating order:", error);
    } finally {
      setLoading(false);
    }
  };

  const userName = session?.user?.name?.trim() || "User";
  const userEmail = session?.user?.email?.trim() || "No email";
  const userInitials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  const completedOrders = orders.filter(
    (order) => order.status.toLowerCase() === "completed"
  );
  const pendingOrders = orders.filter(
    (order) => order.status.toLowerCase() === "pending"
  );

  const totalRevenue = completedOrders.reduce((sum, order) => sum + order.amount, 0);
  const totalOrders = orders.length;

  useEffect(() => {
    let frame = 0;
    const duration = 900;
    const startValue = prevRevenueRef.current;
    const diff = totalRevenue - startValue;
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const next = startValue + diff * progress;
      setAnimatedRevenue(next);
      prevRevenueRef.current = next;
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [totalRevenue]);

  const groupedRevenueByDate = useMemo(() => {
    const map = new Map<string, number>();

    completedOrders.forEach((order) => {
      const dateKey = new Date(order.createdAt).toISOString().split("T")[0];
      map.set(dateKey, (map.get(dateKey) || 0) + Number(order.amount));
    });

    const grouped = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));

    if (grouped.length === 1) {
      const only = grouped[0];
      const baseDate = new Date(only.date);
      const factors = [0.35, 0.5, 0.65, 0.8];
      const mock = factors.map((factor, index) => {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() - (4 - index));
        return {
          date: d.toISOString().split("T")[0],
          amount: Math.max(1, Math.round(only.amount * factor)),
        };
      });
      return [...mock, only];
    }

    return grouped;
  }, [completedOrders]);

  const groupedOrdersByDate = useMemo(() => {
    const map = new Map<string, number>();

    orders.forEach((order) => {
      const dateKey = new Date(order.createdAt).toISOString().split("T")[0];
      map.set(dateKey, (map.get(dateKey) || 0) + 1);
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }, [orders]);

  const orderStatusData = [
    { name: "Completed", value: completedOrders.length },
    { name: "Pending", value: pendingOrders.length },
  ];

  const pieColors = ["#2563eb", "#f59e0b"];

  const recentOrders = orders
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  const isDark = theme === "dark";

  const pageClass = isDark
    ? "bg-slate-900 text-slate-200"
    : "bg-slate-50 text-slate-800";

  const cardClass = isDark
    ? "border-slate-700 bg-slate-800 text-slate-200"
    : "border-slate-200 bg-white text-slate-800";

  const mutedClass = isDark ? "text-slate-400" : "text-slate-500";

  const addButtonClass = isDark
    ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
    : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white";

  const logoutButtonClass = isDark
    ? "bg-red-500/90 text-white hover:bg-red-500"
    : "bg-red-500 text-white hover:bg-red-600";

  if (status === "loading") {
    return <div className="p-10">Checking authentication...</div>;
  }

  if (status === "unauthenticated") {
    return <div className="p-10">Please login.</div>;
  }

  return (
    <main
      className={`min-h-screen p-6 transition-colors duration-300 md:p-8 ${pageClass}`}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={handleAddOrder}
              disabled={loading}
              className={`rounded-lg px-4 py-2 shadow-md transition-all duration-300 hover:opacity-90 disabled:opacity-50 ${addButtonClass}`}
            >
              {loading ? "Adding..." : "+ Add Order"}
            </button>

            <div
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 shadow-md transition-colors duration-300 ${cardClass}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-600 text-sm font-semibold text-white">
                {userInitials || "U"}
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold">{userName}</p>
                <p className={`text-xs ${mutedClass}`}>{userEmail}</p>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className={`rounded-lg px-4 py-2 shadow-sm transition-colors duration-300 ${logoutButtonClass}`}
            >
              Logout
            </button>

             <button
              onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors duration-300 ${cardClass}`}
              aria-label="Toggle theme"
            >
              {isDark ? "\u2600\uFE0F" : "\uD83C\uDF19"}
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div
            className={`rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl ${
              isDark
                ? "[&>div]:border-slate-700 [&>div]:bg-slate-800 [&>div]:text-slate-200 [&>div_h2]:text-slate-100 [&>div_p]:text-slate-400"
                : ""
            }`}
          >
            <KpiCard title="Revenue" value={Math.round(animatedRevenue)} growth={12} />
          </div>
          <div
            className={`rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl ${
              isDark
                ? "[&>div]:border-slate-700 [&>div]:bg-slate-800 [&>div]:text-slate-200 [&>div_h2]:text-slate-100 [&>div_p]:text-slate-400"
                : ""
            }`}
          >
            <KpiCard title="Orders" value={totalOrders} growth={8} />
          </div>
          <div
            className={`rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl ${
              isDark
                ? "[&>div]:border-slate-700 [&>div]:bg-slate-800 [&>div]:text-slate-200 [&>div_h2]:text-slate-100 [&>div_p]:text-slate-400"
                : ""
            }`}
          >
            <KpiCard title="Customers" value={totalOrders} growth={-3} />
          </div>
          <div
            className={`rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl ${
              isDark
                ? "[&>div]:border-slate-700 [&>div]:bg-slate-800 [&>div]:text-slate-200 [&>div_h2]:text-slate-100 [&>div_p]:text-slate-400"
                : ""
            }`}
          >
            <KpiCard title="Conversion Rate" value={4.5} growth={2} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section
            className={`rounded-xl border p-5 shadow-md transition-colors duration-300 ${cardClass}`}
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Revenue Trend</h2>
              <p className={`text-sm ${mutedClass}`}>Sum of completed revenue by day</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={groupedRevenueByDate}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#64748b" opacity={0.2} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateLabel}
                    stroke="#94a3b8"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#2563eb"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    isAnimationActive
                    animationDuration={800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section
            className={`rounded-xl border p-5 shadow-md transition-colors duration-300 ${cardClass}`}
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Order Status</h2>
              <p className={`text-sm ${mutedClass}`}>Completed vs pending distribution</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={108}
                    paddingAngle={4}
                    label={renderPieLabel}
                    labelLine={false}
                    isAnimationActive
                    animationDuration={800}
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell
                        key={`${entry.name}-${index}`}
                        fill={pieColors[index % pieColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
                  <Legend verticalAlign="bottom" height={32} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section
            className={`rounded-xl border p-5 shadow-md transition-colors duration-300 ${cardClass}`}
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Orders Per Day</h2>
              <p className={`text-sm ${mutedClass}`}>Number of orders created each day</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupedOrdersByDate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#64748b" opacity={0.2} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateLabel}
                    stroke="#94a3b8"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
                  <Legend />
                  <Bar
                    dataKey="count"
                    name="Orders"
                    fill="#0ea5e9"
                    barSize={40}
                    radius={[8, 8, 0, 0]}
                    isAnimationActive
                    animationDuration={900}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section
            className={`rounded-xl border p-5 shadow-md transition-colors duration-300 ${cardClass}`}
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Revenue Line</h2>
              <p className={`text-sm ${mutedClass}`}>Smooth revenue movement by date</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={groupedRevenueByDate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#64748b" opacity={0.2} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateLabel}
                    stroke="#94a3b8"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    name="Revenue"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5 }}
                    isAnimationActive
                    animationDuration={900}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <section
          className={`mt-6 rounded-xl border p-5 shadow-md transition-colors duration-300 ${cardClass}`}
        >
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Recent Orders</h2>
            <p className={`text-sm ${mutedClass}`}>Last 5 orders sorted by latest activity</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <table className="min-w-full text-sm">
              <thead>
                <tr
                  className={`border-b text-left ${
                    isDark
                      ? "border-slate-700 text-slate-400"
                      : "border-slate-200 text-slate-500"
                  }`}
                >
                  <th className="px-4 py-3 font-medium">Order ID</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className={`border-b transition ${
                      isDark
                        ? "border-slate-700/70 hover:bg-slate-700/35"
                        : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium">{order.id.slice(0, 8)}...</td>
                    <td className={`px-4 py-3 ${mutedClass}`}>
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {order.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          order.status.toLowerCase() === "completed"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className={`px-4 py-6 text-center ${mutedClass}`}>
                      No orders available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
