"use client";

/**
 * 卡牌筛选面板 —— 受控组件。
 * 筛选状态由父级（CardGrid）通过 useSearchParams / useRouter 管理并同步到 URL。
 */
import { cn } from "@/lib/utils";

// 角色（单选）：全部 + 5 个角色
const CHARACTER_OPTIONS = ["全部", "铁甲战士", "静默猎手", "故障机器人", "亡灵契约师", "储君"];

// 类型（多选）
const TYPE_OPTIONS = ["攻击", "技能", "能力", "无色", "诅咒", "事件", "任务", "状态", "先古之民"];

// 稀有度（多选）
const RARITY_OPTIONS = ["基础", "普通", "罕见", "稀有"];

// 能耗（多选）：0/1/2/3/4+（>=4）/X（-1）
const COST_OPTIONS = ["0", "1", "2", "3", "4+", "X"];

export interface FilterState {
  search: string;
  character: string;
  types: string[];
  rarities: string[];
  costs: string[];
  upgraded: "0" | "1"; // 0=升级前（默认），1=升级后
}

// 可切换的筛选 chip
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2 py-0.5 text-xs transition-colors",
        active
          ? "border-blue-500 bg-blue-600 text-white"
          : "border-border bg-background text-muted-foreground hover:border-blue-400 hover:text-blue-500"
      )}
    >
      {children}
    </button>
  );
}

// 一组多选筛选（空数组 = 全部）
function MultiSelectGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-12 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <Chip active={selected.length === 0} onClick={() => onToggle("__clear__")}>
        全部
      </Chip>
      {options.map((o) => (
        <Chip key={o} active={selected.includes(o)} onClick={() => onToggle(o)}>
          {o}
        </Chip>
      ))}
    </div>
  );
}

export default function CardFilter({
  state,
  onChange,
}: {
  state: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
}) {
  const toggleList = (key: "types" | "rarities" | "costs", value: string) => {
    const list = state[key];
    if (value === "__clear__") {
      onChange({ [key]: [] });
    } else {
      onChange({
        [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
      });
    }
  };

  const resetAll = () =>
    onChange({ search: "", character: "全部", types: [], rarities: [], costs: [], upgraded: "0" });

  return (
    <div className="mb-8 space-y-2 rounded-lg border border-border bg-background-secondary p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* 搜索 */}
        <input
          value={state.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="搜索卡牌名称..."
          className="h-7 w-44 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-blue-500"
        />
        {/* 角色（单选） */}
        <div className="flex items-center gap-1.5">
          <span className="w-12 shrink-0 text-xs font-medium text-muted-foreground">角色</span>
          <select
            value={state.character}
            onChange={(e) => onChange({ character: e.target.value })}
            className="h-7 rounded-md border border-border bg-background px-1 text-xs outline-none focus:border-blue-500"
          >
            {CHARACTER_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        {/* 重置：常驻显示，带边框 */}
        <button
          type="button"
          onClick={resetAll}
          className="ml-auto rounded-md border border-border bg-background px-2.5 py-1 text-xs text-blue-400 transition-colors hover:bg-blue-500/10 hover:text-blue-300"
        >
          重置筛选
        </button>
      </div>

      <MultiSelectGroup
        label="类型"
        options={TYPE_OPTIONS}
        selected={state.types}
        onToggle={(v) => toggleList("types", v)}
      />
      <MultiSelectGroup
        label="稀有度"
        options={RARITY_OPTIONS}
        selected={state.rarities}
        onToggle={(v) => toggleList("rarities", v)}
      />
      <MultiSelectGroup
        label="能耗"
        options={COST_OPTIONS}
        selected={state.costs}
        onToggle={(v) => toggleList("costs", v)}
      />
      {/* 升级（二选一，默认升级前） */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="w-12 shrink-0 text-xs font-medium text-muted-foreground">升级</span>
        <Chip active={state.upgraded === "0"} onClick={() => onChange({ upgraded: "0" })}>
          升级前
        </Chip>
        <Chip active={state.upgraded === "1"} onClick={() => onChange({ upgraded: "1" })}>
          升级后
        </Chip>
      </div>
    </div>
  );
}
