/**
 * 合并 className，过滤空值（不依赖 clsx/tailwind-merge 的轻量实现）
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * 统一 API 成功响应：{ success: true, data }
 */
export function ok<T>(data: T) {
  return { success: true as const, data };
}

/**
 * 统一 API 错误响应：{ success: false, data: null, error: string }
 */
export function fail(error: string, status = 400) {
  return Response.json({ success: false as const, data: null, error }, { status });
}

/**
 * 洗牌（Fisher–Yates）
 */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
