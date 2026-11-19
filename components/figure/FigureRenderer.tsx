import type { FigureSpec } from "@/lib/schemas";

/**
 * FigureSpec을 SVG로 그린다. Phase 1은 점·선분·원·라벨만 지원한다.
 * 좌표는 수학 좌표계(y 위쪽)로 받고, 화면 좌표로 뒤집어 그린다.
 */
export function FigureRenderer({ spec, width = 240, height = 180 }: { spec: FigureSpec; width?: number; height?: number }) {
  const pts = spec.points ?? [];
  const xs = [...pts.map((p) => p.x), ...(spec.circle ? [spec.circle.cx - spec.circle.r, spec.circle.cx + spec.circle.r] : [])];
  const ys = [...pts.map((p) => p.y), ...(spec.circle ? [spec.circle.cy - spec.circle.r, spec.circle.cy + spec.circle.r] : [])];
  if (xs.length === 0) return null;

  const pad = 20;
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min((width - pad * 2) / (maxX - minX || 1), (height - pad * 2) / (maxY - minY || 1));
  const tx = (x: number) => pad + (x - minX) * scale;
  const ty = (y: number) => height - pad - (y - minY) * scale;
  const byLabel = new Map(pts.map((p) => [p.label, p]));

  const segments = spec.segments ?? (spec.type === "triangle" || spec.type === "polygon"
    ? pts.map((p, i) => [p.label, pts[(i + 1) % pts.length].label] as [string, string])
    : []);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="문제 도형" className="mx-auto">
      {spec.type === "coordinate" && (
        <g stroke="#999" strokeWidth={0.8}>
          {minX <= 0 && maxX >= 0 && <line x1={tx(0)} y1={pad / 2} x2={tx(0)} y2={height - pad / 2} />}
          {minY <= 0 && maxY >= 0 && <line x1={pad / 2} y1={ty(0)} x2={width - pad / 2} y2={ty(0)} />}
        </g>
      )}
      {spec.circle && (
        <circle cx={tx(spec.circle.cx)} cy={ty(spec.circle.cy)} r={spec.circle.r * scale} fill="none" stroke="black" strokeWidth={1.3} />
      )}
      {segments.map(([a, b], i) => {
        const p = byLabel.get(a), q = byLabel.get(b);
        if (!p || !q) return null;
        return <line key={i} x1={tx(p.x)} y1={ty(p.y)} x2={tx(q.x)} y2={ty(q.y)} stroke="black" strokeWidth={1.3} />;
      })}
      {pts.map((p) => (
        <g key={p.label}>
          <circle cx={tx(p.x)} cy={ty(p.y)} r={2} fill="black" />
          <text x={tx(p.x) + 5} y={ty(p.y) - 5} fontSize={12}>{p.label}</text>
        </g>
      ))}
    </svg>
  );
}
