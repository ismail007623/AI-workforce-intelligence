import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Horizontal bar chart with the AI Workforce tokens: dark text, muted
 * ticks, subtle grid, brand purple as the default bar color. Bars can
 * be colored per datum via `colorFor`.
 */
export function AttendanceChart<T extends object>({
  data,
  categoryKey,
  valueKey,
  valueName,
  colorFor,
  defaultColor = "#6554e8",
  height = 240,
  suffix = "",
}: {
  data: T[];
  categoryKey: string;
  valueKey: string;
  valueName: string;
  colorFor?: (datum: T) => string;
  defaultColor?: string;
  height?: number;
  suffix?: string;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e9f1" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#6b7085" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey={categoryKey}
            width={92}
            tick={{ fontSize: 11, fill: "#17172b" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<AttendanceChartTooltip suffix={suffix} />}
            cursor={{ fill: "#f8f8fc" }}
          />
          <Bar dataKey={valueKey} name={valueName} radius={[0, 4, 4, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={colorFor ? colorFor(d) : defaultColor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AttendanceChartTooltip({
  active,
  payload,
  label,
  suffix = "",
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-semibold text-[var(--color-text-muted)]">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-xs font-medium" style={{ color: p.color }}>
          {p.name}: {p.value}
          {suffix}
        </p>
      ))}
    </div>
  );
}
