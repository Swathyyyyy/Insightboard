type KpiCardProps = {
  title: string;
  value: number;
  growth: number;
};

export default function KpiCard({ title, value, growth }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border">
      <p className="text-sm text-slate-500">{title}</p>

      <div className="flex justify-between items-center mt-2">
        <h2 className="text-2xl font-bold text-slate-800">
          {value.toLocaleString("en-IN")}
        </h2>

        <span
          className={`text-sm font-medium ${
            growth >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {growth >= 0 ? `+${growth}%` : `${growth}%`}
        </span>
      </div>
    </div>
  );
}
