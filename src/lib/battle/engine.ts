/**
 * 战斗引擎 —— 纯函数 reducer，单一状态对象，无 React 依赖。
 * 每次 action 通过 structuredClone 复制状态后在副本上修改，保证外部状态不被污染。
 *
 * 回合循环（参数均在回合开始时结算）：
 * 玩家回合开始：回能(每回合能量) → 抽牌(每回合抽牌) → 格挡刷新(每回合格挡) → 自动攻击怪物(每回合攻击)
 * 出牌阶段：打出攻击/格挡/抽牌/回能/消耗效果的牌
 * 结束回合：弃手牌 → 怪物回合开始：格挡刷新(每回合格挡) → 攻击玩家(每回合攻击) → 下一回合
 */
import { shuffle } from "@/lib/utils";
import type { BattleAction, BattleState, ResolvedCard } from "./types";

/** 初始（未开始）状态 */
export function createInitialState(): BattleState {
  return {
    status: "IDLE",
    turn: 0,
    player: {
      hp: 80,
      maxHp: 80,
      block: 0,
      energy: 0,
      params: { maxHp: 80, perTurnAttack: 0, perTurnBlock: 0, perTurnDraw: 5, perTurnEnergy: 3 },
    },
    enemy: {
      hp: 80,
      maxHp: 80,
      block: 0,
      params: { maxHp: 80, perTurnAttack: 8, perTurnBlock: 8 },
    },
    drawPile: [],
    hand: [],
    discardPile: [],
    exhaustPile: [],
    log: [],
  };
}

function clone(state: BattleState): BattleState {
  return structuredClone(state);
}

/** 对目标单位造成伤害：格挡优先抵消，溢出扣 HP；返回实际扣除 HP 的伤害 */
function damageTarget(unit: { hp: number; block: number }, amount: number): number {
  const absorbed = Math.min(unit.block, amount);
  unit.block -= absorbed;
  const dealt = amount - absorbed;
  unit.hp = Math.max(0, unit.hp - dealt);
  return dealt;
}

/** 抽牌：抽牌堆不足时把弃牌堆洗回抽牌堆；返回实际抽到的张数 */
function drawCards(state: BattleState, count: number): number {
  let drawn = 0;
  for (let i = 0; i < count; i++) {
    if (state.drawPile.length === 0) {
      if (state.discardPile.length === 0) break;
      state.drawPile = shuffle(state.discardPile);
      state.discardPile = [];
      state.log.push("弃牌堆洗入抽牌堆。");
    }
    state.hand.push(state.drawPile.pop() as string);
    drawn++;
  }
  return drawn;
}

/** 开始战斗：读取牌组 → 洗牌 → 第 1 回合玩家行动 */
function startBattle(
  state: BattleState,
  deck: string[],
  playerParams: BattleState["player"]["params"],
  enemyParams: BattleState["enemy"]["params"]
): BattleState {
  const s = clone(state);
  if (deck.length === 0) {
    s.log.push("牌组为空，请先到「组牌工作台」组牌。");
    return s;
  }
  s.turn = 1;
  s.player = { hp: playerParams.maxHp, maxHp: playerParams.maxHp, block: 0, energy: 0, params: playerParams };
  s.enemy = { hp: enemyParams.maxHp, maxHp: enemyParams.maxHp, block: 0, params: enemyParams };
  s.drawPile = shuffle([...deck]);
  s.hand = [];
  s.discardPile = [];
  s.exhaustPile = [];
  s.log = [];
  return startPlayerTurn(s);
}

/** 玩家回合开始：回能 → 抽牌 → 格挡刷新 → 自动攻击怪物 */
function startPlayerTurn(state: BattleState): BattleState {
  const p = state.player;
  state.status = "PLAYER_TURN";
  state.log.push(`第 ${state.turn} 回合开始。`);

  // 回能
  p.energy = p.params.perTurnEnergy;
  if (p.energy > 0) state.log.push(`获得 ${p.energy} 点能量。`);

  // 抽牌
  const drawn = drawCards(state, p.params.perTurnDraw);
  if (drawn > 0) state.log.push(`抽 ${drawn} 张牌。`);

  // 格挡刷新（出牌获得的格挡会持续到下一次刷新）
  if (p.params.perTurnBlock > 0) {
    p.block = p.params.perTurnBlock;
    state.log.push(`获得 ${p.block} 点格挡。`);
  } else {
    p.block = 0;
  }

  // 自动攻击怪物
  if (p.params.perTurnAttack > 0) {
    const dealt = damageTarget(state.enemy, p.params.perTurnAttack);
    state.log.push(`自动攻击怪物 ${p.params.perTurnAttack} 点伤害，怪物承受 ${dealt} 点。`);
    if (state.enemy.hp <= 0) return finishVictory(state);
  }
  return state;
}

/** 打出卡牌：费用校验 → 攻击/格挡/抽牌/回能 → 移入消耗堆或弃牌堆 */
function playCard(state: BattleState, cardId: string, resolve: (id: string) => ResolvedCard | null): BattleState {
  const s = clone(state);
  if (s.status !== "PLAYER_TURN") return s;

  const idx = s.hand.indexOf(cardId);
  if (idx < 0) return s;

  const card = resolve(cardId);
  if (!card) return s;
  // X 费牌（cost < 0）或不可出牌：直接跳过
  if (card.cost < 0) {
    s.log.push(`「${card.name}」为 X 费牌，当前模拟暂不支持。`);
    return s;
  }
  if (s.player.energy < card.cost) {
    s.log.push(`能量不足，无法打出「${card.name}」。`);
    return s;
  }

  s.player.energy -= card.cost;
  s.hand.splice(idx, 1);

  // 打出后立即移入消耗堆或弃牌堆（与 STS 一致：抽牌效果结算时该牌已在弃牌堆，可被洗回）
  if (card.exhaust) {
    s.exhaustPile.push(cardId);
  } else {
    s.discardPile.push(cardId);
  }

  // 攻击
  if (card.damage > 0) {
    const dealt = damageTarget(s.enemy, card.damage);
    s.log.push(`「${card.name}」造成 ${card.damage} 点伤害，怪物承受 ${dealt} 点。`);
    if (s.enemy.hp <= 0) return finishVictory(s);
  }

  // 格挡
  if (card.block > 0) {
    s.player.block += card.block;
    s.log.push(`「${card.name}」获得 ${card.block} 点格挡。`);
  }

  // 抽牌
  if (card.draw > 0) {
    const drawn = drawCards(s, card.draw);
    s.log.push(`「${card.name}」抽 ${drawn} 张牌。`);
  }

  // 回能
  if (card.energy > 0) {
    s.player.energy += card.energy;
    s.log.push(`「${card.name}」获得 ${card.energy} 点能量。`);
  }

  if (card.exhaust) {
    s.log.push(`「${card.name}」被消耗（本场战斗不能再打出）。`);
  }
  return s;
}

/** 结束回合：弃手牌 → 怪物回合（格挡刷新 → 攻击玩家）→ 进入下一回合 */
function endTurn(state: BattleState): BattleState {
  const s = clone(state);
  if (s.status !== "PLAYER_TURN") return s;
  s.status = "ENEMY_TURN";

  // 弃掉全部手牌
  if (s.hand.length > 0) {
    s.discardPile.push(...s.hand);
    s.hand = [];
  }

  // 怪物回合：格挡刷新
  if (s.enemy.params.perTurnBlock > 0) {
    s.enemy.block = s.enemy.params.perTurnBlock;
    s.log.push(`怪物获得 ${s.enemy.block} 点格挡。`);
  } else {
    s.enemy.block = 0;
  }

  // 怪物攻击玩家
  if (s.enemy.params.perTurnAttack > 0) {
    const dealt = damageTarget(s.player, s.enemy.params.perTurnAttack);
    s.log.push(`怪物攻击 ${s.enemy.params.perTurnAttack} 点伤害，你承受 ${dealt} 点。`);
    if (s.player.hp <= 0) return finishDefeat(s);
  }

  // 进入下一回合
  s.turn += 1;
  return startPlayerTurn(s);
}

function finishVictory(state: BattleState): BattleState {
  state.status = "VICTORY";
  state.log.push("战斗胜利！");
  return state;
}

function finishDefeat(state: BattleState): BattleState {
  state.status = "DEFEAT";
  state.log.push("战斗失败…");
  return state;
}

/** 战斗中实时更新双方参数：每回合攻击/格挡/抽牌/能量在下一回合生效，HP 不越界 */
function updateParams(
  state: BattleState,
  player: BattleState["player"]["params"],
  enemy: BattleState["enemy"]["params"]
): BattleState {
  const s = clone(state);
  if (s.status === "IDLE") return s; // 待开始状态无战斗实体，参数由 START 读取
  s.player.params = player;
  s.player.maxHp = player.maxHp;
  s.player.hp = Math.min(s.player.hp, player.maxHp);
  s.enemy.params = enemy;
  s.enemy.maxHp = enemy.maxHp;
  s.enemy.hp = Math.min(s.enemy.hp, enemy.maxHp);
  return s;
}

/** 战斗中直接修改当前 HP（限制在 0 ~ 生命上限；归零即判胜/判负） */
function updateHp(state: BattleState, target: "player" | "enemy", hp: number): BattleState {
  const s = clone(state);
  if (s.status === "IDLE") return s;
  const unit = target === "player" ? s.player : s.enemy;
  unit.hp = Math.max(0, Math.min(unit.maxHp, hp));
  if (unit.hp <= 0) return target === "enemy" ? finishVictory(s) : finishDefeat(s);
  return s;
}

/** 引擎 reducer：接收当前状态与动作，返回新状态 */
export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case "START":
      return startBattle(state, action.deck, action.player, action.enemy);
    case "PLAY_CARD":
      return playCard(state, action.cardId, action.resolve);
    case "END_TURN":
      return endTurn(state);
    case "UPDATE_PARAMS":
      return updateParams(state, action.player, action.enemy);
    case "UPDATE_HP":
      return updateHp(state, action.target, action.hp);
    case "RESET":
      return createInitialState();
    default:
      return state;
  }
}
