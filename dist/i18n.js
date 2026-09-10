/* ------------------------------------------------------------------
 * Doodle District — runtime i18n layer
 *
 * game.js is a minified bundle whose UI copy is hard-coded and, in a few
 * places, doubles as logic keys ("rifle", "katana", "district"...). So we
 * never touch the bundle: we sit on top of the DOM and translate only the
 * text that is actually rendered. Game state stays English throughout.
 *
 * Anything with no entry falls through to the original English, so a
 * partial dictionary is always safe. window.i18n.missing() lists whatever
 * showed up on screen without a translation.
 * ------------------------------------------------------------------ */
(function () {
  'use strict';

  var LS_KEY = 'dd.lang';

  /* ---------- languages ---------- */

  var LANGS = [
    { code: 'en', label: 'English' },
    { code: 'zh', label: '简体中文' },
    { code: 'zh-Hant', label: '繁體中文' },
    { code: 'ko', label: '한국어' },
    { code: 'ja', label: '日本語' },
    { code: 'de', label: 'Deutsch' },
    { code: 'fr', label: 'Français' },
    { code: 'pt', label: 'Português' }
  ];

  /* Fragments reused inside the dynamic rules below. */
  var ZH_HOW = {
    rifle: '步枪', shotgun: '霰弹枪', sniper: '狙击枪', revolver: '左轮',
    katana: '武士刀', grenade: '手雷', 'their own bullet': '自己的子弹',
    headshot: '爆头'
  };

  var ZH = {
    /* ---- title / shell ---- */
    'Doodle District': '涂鸦街区',
    'a scribbled survival shooter': '一款涂鸦风生存射击游戏',

    /* ---- main menu ---- */
    'QUICK PLAY': '快速游戏',
    'PLAY ONLINE': '联机游戏',
    'CREATE LOBBY': '创建房间',
    'JOIN': '加入',
    'LEAVE': '离开',
    'LEAVE MATCH': '退出对局',
    'START': '开始',
    'START MATCH': '开始对局',
    'BACK': '返回',
    'MENU': '菜单',
    'LOBBY': '房间',
    'REFRESH': '刷新',
    'Options': '选项',
    'Create': '创建',
    'MATCH ON': '对局进行中',
    'PAUSED': '已暂停',
    'ERASED': '已被擦除',
    'solo · survive the waves': '单人 · 挺过每一波',
    'jumps into an open public lobby, or opens one for you':
      '直接加入一个空闲公开房间，没有就替你开一个',
    'public lobbies': '公开房间',
    'have a code?': '有房间码？',
    'type the code your friend gave you': '输入朋友给你的房间码',
    'enter a lobby code': '请输入房间码',
    'enter code here': '在这里输入房间码',
    'your name': '你的昵称',
    'code': '房间码',
    'CODE': '房间码',
    'map': '地图',
    'or': '或',
    'looking…': '查找中…',
    'just looked': '刚刚刷新',
    'no open public lobbies': '暂无空闲的公开房间',
    'all public lobbies are busy - host a private one':
      '公开房间都满了 — 自己开一个私人房吧',
    'public': '公开',
    'private · friends only · not reachable from quick play':
      '私人 · 仅限好友 · 快速游戏搜不到',
    'this lobby is public: anyone can quick play in, or type the code':
      '这是公开房间：任何人都能快速游戏进来，也可以输入房间码',
    'private lobby: ask the host for the code': '私人房间：向房主索取房间码',
    'private lobby: friends type this code under PLAY ONLINE → JOIN':
      '私人房间：好友在「联机游戏 → 加入」里输入这个码',
    'people can still join once it is running': '开局之后仍然可以加入',
    'clock starts when someone joins': '有人加入后开始计时',
    'redrawn at the start': '开局时重新绘制',
    'free for all': '自由混战',
    'FREE FOR ALL': '自由混战',
    'kills · score': '击杀 · 得分',
    'you survived': '你活下来了',
    'back to the lobby in a moment…': '马上返回房间…',
    'the others are on their way back': '其他人正在返回',
    'asking the host to start…': '正在请求房主开始…',
    'opening a lobby…': '正在开设房间…',
    'looking for an open lobby…': '正在查找空闲房间…',

    /* ---- maps ---- */
    'DOODLE STATION': '涂鸦车站', 'DOODLE TEMPLE': '涂鸦神庙',
    'platforms, footbridges and parked trains': '站台、天桥与停靠的列车',
    'a stepped pyramid, cloisters and a sunken pool': '阶梯金字塔、回廊与下沉水池',
    'DOODLE DISTRICT': '涂鸦街区',
    'DOODLE JUNGLE': '涂鸦丛林',
    'DOODLE MEXICO': '涂鸦墨西哥',
    'streets, rooftops and fire escapes': '街道、屋顶与消防梯',
    'canopies, vines and a lost temple': '树冠、藤蔓与失落神庙',
    'a sun-baked plaza · piñatas, tacos and mariachi ':
      '烈日广场 · 皮纳塔、塔可与马里亚奇',

    /* ---- HUD ---- */
    'HP': '生命',
    'SCORE': '得分',
    'WAVE': '波次',
    'KATANA': '武士刀',
    'SLASH READY': '斩击就绪',
    'READY': '就绪',
    'GRAPPLE': '钩爪',
    'enemies left': '个敌人',
    'RELOADING': '换弹中',
    'hold': '按住',
    'to reel in · tap it again to let go mid-swing': '收绳 · 摆荡途中再点一次松手',
    'block with': '用',
    'and some of their bullets go back at them': '格挡，部分子弹会原路弹回',
    'reloading…': '换弹中…',

    /* ---- weapons ---- */
    'RIFLE': '步枪',
    'SHOTGUN': '霰弹枪',
    'SNIPER': '狙击枪',
    'REVOLVER': '左轮',
    'auto · put the red dot on them': '全自动 · 把红点套在他们身上',
    'pump · devastating up close': '泵动 · 近身毁灭性输出',
    'scoped bolt action · one shot, one erasure': '带镜栓动 · 一枪一个',
    'hand cannon · headshots erase': '手炮 · 爆头即抹除',
    'slash · hold aim to block & return bullets':
      '挥砍 · 按住瞄准可格挡并弹回子弹',
    'rifle · shotgun · sniper · katana': '步枪 · 霰弹枪 · 狙击枪 · 武士刀',
    'grenade · hold it to throw further': '手雷 · 按住可扔得更远',
    'grenade · hold to throw further': '手雷 · 按住可扔得更远',
    'grenades': '手雷',
    'return their bullets': '把子弹弹回去',

    /* ---- enemies ---- */
    'GRUNT': '杂兵',
    'RUSHER': '突袭者',
    'HEAVY': '重装兵',
    'SHIELDBEARER': '持盾兵',
    'INK BOMB': '墨水炸弹',
    'PAPER WASP': '纸黄蜂',
    'THE DOODLER': '涂鸦者',
    'THE ERASER': '橡皮擦',
    'THE INKBLOT': '墨渍怪',
    'they are crawling off the page': '他们正从纸上爬出来',

    /* ---- kill / score labels ---- */
    'HEADSHOT': '爆头',
    'BLOCKED': '已格挡',
    'DEFLECTED': '已弹开',
    'PARRIED': '完美格挡',
    'RETURNED': '原路奉还',
    'EXECUTED': '处决',
    'SLICED': '斩杀',
    'YANKED': '拽落',
    'CUT DOWN': '被斩落',
    'PERFECT PARRY': '完美格挡',
    'RETURN TO SENDER': '原路奉还',
    'ROPE CUT': '绳索被割断',
    'SHIELD BROKEN': '盾牌破碎',
    'FELL OFF THE PAGE': '掉出纸面',
    'OFF THE PAGE': '掉出纸面',
    'AIRBORNE': '滞空',
    '· AIRBORNE': '· 滞空',
    'erased': '被擦除',
    'their own bullet': '自己的子弹',
    'fell off the page': '掉出纸面',
    'fell off the page · -1': '掉出纸面 · -1',
    'fell off the page · -1 kill': '掉出纸面 · -1 击杀',

    /* ---- run modifiers ---- */
    'SWARM · more of them, thinner': '蜂拥 · 数量更多，血更薄',
    'HEAVY INK · they hit harder': '浓墨 · 他们打得更痛',
    'CAFFEINATED · they move fast': '过量咖啡因 · 他们跑得飞快',
    'SWARM': '蜂拥',
    'stay off the ground': '别落地',
    'kills in the air are worth more · stay off the floor':
      '空中击杀分数更高 · 别沾地',

    /* ---- pickups ---- */
    '+35 HP': '+35 生命',
    '+AMMO · +GRENADE': '+弹药 · +手雷',
    'BANANA · +35 HP': '香蕉 · +35 生命',
    'TACO · +35 HP': '塔可 · +35 生命',

    /* ---- state / prompts ---- */
    'YOU WIN': '你赢了',
    'STILL THERE?': '还在吗？',
    'BACK IN': '重生倒计时',
    'HOST LEFT': '房主已离开',
    'HOST REMOVED': '房主已被移除',
    'YOU ARE THE HOST NOW': '你现在是房主',
    'click the page to grab the mouse': '点击页面以锁定鼠标',
    'move or you get kicked for inactivity': '动一动，否则会因挂机被踢',
    'kicked for inactivity': '因挂机被踢出',
    'lobby closed: everyone was idle': '房间已关闭：所有人都在挂机',
    'removed from this lobby': '已被移出该房间',
    'spawn protection · 2s': '出生保护 · 2 秒',
    'you joined a match in progress': '你加入了一场进行中的对局',
    'the match is already on': '对局已经开始',
    'keep scribbling': '继续涂吧',
    'ink harder': '再用力点',
    'swing for it': '荡过去',
    'grapple needs a breather': '钩爪需要冷却',
    'your rope got cut': '你的绳索被割断了',
    'out of breath · land to recover': '力竭 · 落地才能恢复',
    'blocked · the dash did not reach': '被挡住了 · 冲刺没够到',
    'turn off': '关闭',
    'music on': '音乐已开',
    'music off': '音乐已关',
    'the host': '房主',

    /* ---- settings ---- */
    'look sensitivity': '视角灵敏度',
    'invert vertical look': '反转垂直视角',
    'music': '音乐',
    'trackpad mode': '触控板模式',

    /* ---- controls ---- */
    'MOUSE + KEYBOARD': '键盘 + 鼠标',
    'PS5 CONTROLLER': 'PS5 手柄',
    'move': '移动',
    'look': '视角',
    'jump': '跳跃',
    'fire / slash': '开火 / 斩击',
    'reload': '换弹',
    'aim / block': '瞄准 / 格挡',
    'aim down sights / block': '开镜 / 格挡',
    '(or RMB) aim / block': '（或右键）瞄准 / 格挡',
    'sprint': '疾跑',
    'crouch': '下蹲',
    'pause': '暂停',
    'next weapon': '切换武器',
    'scoreboard (online)': '记分板（联机）',
    'quick katana slash': '快速拔刀斩',
    'quick katana slash, then back to your gun': '快速拔刀斩，然后切回枪',
    'slide · air dash': '滑铲 · 空中冲刺',
    'slide on the ground · air dash in the air': '地面滑铲 · 空中冲刺',
    'jump (again on a wall = wall jump)': '跳跃（贴墙再按一次 = 蹬墙跳）',
    'again in the air = double jump': '空中再按一次 = 二段跳',
    'dash-slash once the gauge is lit': '仪表亮起后可冲刺斩',
    'dash-slash once the katana gauge is lit': '刀气槽亮起后可冲刺斩',
    'grapple (hold to reel, ✕ to launch)': '钩爪（按住收绳，✕ 弹射）',
    'grapple: tap to swing, hold to reel, jump to launch':
      '钩爪：轻点摆荡，按住收绳，跳跃弹射',
    'Shift aims · double-tap W sprints': 'Shift 瞄准 · 双击 W 疾跑',
    'Mouse': '鼠标',
    'Both mouse buttons': '鼠标左右键',
    'L stick': '左摇杆',
    'R stick': '右摇杆',
    '1-4 / wheel': '1-4 / 滚轮',

    /* ---- networking errors ---- */
    'could not connect': '连接失败',
    'could not load the networking library · check your connection and reload':
      '联网库加载失败 · 请检查网络后刷新',
    'networking library did not load': '联网库未能加载',
    'could not reach the matchmaking server · check your connection':
      '无法连接匹配服务器 · 请检查网络',
    'signalling server timed out': '信令服务器超时',
    'could not take over the lobby': '接管房间失败',
    'no lobby with that code': '没有这个房间码对应的房间',
    'no lobby with that code · check it with your friend':
      '找不到该房间码 · 和朋友再核对一下',
    'no answer from that lobby': '该房间没有响应',
    "that lobby's host did not answer": '该房间的房主没有响应',
    'the host did not answer': '房主没有响应',
    'no answer from the host · try again, or LEAVE and rejoin':
      '房主无响应 · 再试一次，或先离开再重新加入',
    'no answer yet · knocking once more…': '还没响应 · 再敲一次门…',
    'the host is busy · try again in a moment': '房主正忙 · 稍后再试',
    'that lobby is closed': '该房间已关闭',
    'lobby no longer available': '该房间已不可用',
    'that lobby is full': '该房间已满',
    'that lobby is full · try another code': '该房间已满 · 换个房间码试试',
    'the lobby turned you away': '房间拒绝了你的加入',
    'leave the lobby first': '请先离开当前房间',
    'leave your lobby first': '请先离开你的房间',
    'found the lobby but could not connect · one of you may be on a network that blocks it':
      '找到了房间但连不上 · 你们其中一方的网络可能屏蔽了直连',
    'the host left the lobby': '房主离开了房间',
    'lost the match when the host left': '房主离开导致对局中断',
    'connecting to the new host now · this only takes a few seconds':
      '正在连接新房主 · 只需几秒',
    'connected to the new host': '已连接到新房主',
    'you are hosting now · hold on': '现在由你做房主 · 稍等',
    'game updated: everyone must refresh to join': '游戏已更新：所有人需刷新后才能加入',
    'game updated: refresh the page to join': '游戏已更新：刷新页面后才能加入',
    'something went wrong': '出了点问题',
    'lost connection': '连接已断开',
    'lobby kick': '被房主踢出',
    'local peer block': '本机已屏蔽该玩家',
    'invalid game messages': '非法的游戏消息',
    'impossible health': '异常的生命值',
    'sustained impossible fire rate': '持续异常的射速',
    'sustained impossible damage rate': '持续异常的伤害频率',
    'sustained impossible grenade rate': '持续异常的手雷频率',
    '· in a match': '· 对局中',
    '· looking for another lobby…': '· 正在寻找其他房间…',
    '· moving to a new host': '· 正在迁移到新房主',
    '· opening a lobby of your own': '· 正在替你开设房间',
    '· on attached': '· 已连接'
  };

  /* Dynamic copy: numbers, player names, lobby codes. Each entry is
     [pattern, replacement] where replacement may be a function. */
  function zhHow(s) {
    return s.split(' ').map(function (w) { return ZH_HOW[w] || w; }).join('');
  }

  var ZH_RULES = [
    [/^WAVE (\d+)$/, '第 $1 波'],
    [/^wave (\d+) · score ([\d,]+)$/, '第 $1 波 · 得分 $2'],
    [/^wave (\d+) ·$/, '第 $1 波 ·'],
    [/^CHECKPOINT · WAVE (\d+)$/, '存档点 · 第 $1 波'],
    [/^WAVE (\d+) CLEARED$/, '第 $1 波已清空'],
    [/^next wave in (\d+)$/, '$1 秒后进入下一波'],
    [/^back on the page in (\d+)$/, '$1 秒后回到纸面'],
    [/^combo x(\d+)$/, '连击 x$1'],
    [/^catch your breath · \+(\d+)$/, '喘口气 · +$1'],
    [/^\+(\d+) HP$/, '+$1 生命'],

    [/^first to (\d+)$/, '先到 $1 分'],
    [/^free for all · first to (\d+) · (\d+)\/(\d+) players$/,
      '自由混战 · 先到 $1 分 · $2/$3 人'],
    [/^free for all · first to (\d+) · up to 10 players$/,
      '自由混战 · 先到 $1 分 · 最多 10 人'],
    [/^free for all · first to (\d+)$/, '自由混战 · 先到 $1 分'],
    [/^free for all · up to 10 players$/, '自由混战 · 最多 10 人'],
    [/^free for all · lobby (\S+)$/, '自由混战 · 房间 $1'],
    [/^first to (\d+) · (\d+) left · lobby (\S+)$/, '先到 $1 分 · 剩 $2 · 房间 $3'],
    [/^(\d+)\/(\d+) players$/, '$1/$2 人'],
    [/^(\d+) players in$/, '房内 $1 人'],
    [/^(\d+) K · (\d+) D$/, '$1 杀 · $2 死'],
    [/^(\d+) kills · (\d+) deaths$/, '$1 次击杀 · $2 次死亡'],
    [/^(\d+) minutes · everyone is fair game$/, '$1 分钟 · 人人皆敌'],
    [/^lobby code (\S+)$/, '房间码 $1'],
    [/^anyone can start · (.+)$/, function (m, a) { return '任何人都能开始 · ' + tr(a); }],
    [/^could not look: (.+)$/, function (m, a) { return '查询失败：' + tr(a); }],
    [/^test features on · (.+) unlocked$/, '测试功能已开启 · 已解锁 $1'],

    [/^(.+) IS COMING$/, function (m, a) { return tr(a) + ' 来了'; }],
    [/^erased by (.+?) · (.+)$/, function (m, a, b) { return '被 ' + a + ' 擦除 · ' + zhHow(b); }],
    [/^erased by (.+)$/, '被 $1 擦除'],
    [/^(.+) fell off the page · -1 kill$/, '$1 掉出了纸面 · -1 击杀'],
    [/^(.+) fell off the page$/, '$1 掉出了纸面'],
    [/^(.+) lost connection$/, '$1 掉线了'],
    [/^(.+) is back$/, '$1 回来了'],
    [/^(.+) was removed: (.+)$/, function (m, a, b) { return a + ' 已被移除：' + tr(b); }],
    [/^(.+) blocked on this device: (.+)$/, function (m, a, b) { return a + ' 已在本机屏蔽：' + tr(b); }],
    [/^(.+)'s lobby$/, '$1 的房间'],

    [/^CLICK ANYWHERE \(or press (.+)\) TO PLAY$/, '点击任意处（或按 $1）开始游戏'],
    [/^CLICK ANYWHERE \(or press (.+)\) TO RESUME$/, '点击任意处（或按 $1）继续'],
    [/^CLICK ANYWHERE \(or press (.+)\) TO KEEP PLAYING$/, '点击任意处（或按 $1）继续游戏'],
    [/^CLICK \(or press (.+)\) TO DRAW AGAIN$/, '点击（或按 $1）重新开始']
  ];

  var TABLES = { zh: { exact: ZH, rules: ZH_RULES } };

  /* Load translations from separate files via window.i18nTranslations */
  function loadTranslations() {
    if (window.i18nTranslations) {
      Object.keys(window.i18nTranslations).forEach(function (lang) {
        var trans = window.i18nTranslations[lang];
        if (trans && trans.exact && trans.rules) {
          TABLES[lang] = { exact: trans.exact, rules: trans.rules };
        }
      });
    }
  }

  /* ---------- engine ---------- */

  /* Printed on keycap badges — never translated, never reported as missing. */
  var KEYCAPS = /^(?:W|A|S|D|WASD|W W|Shift|Space|Tab|Esc|Ctrl|Alt|LMB|RMB|MMB|Mouse\d?|[A-Z0-9]|F\d{1,2}|L[123]|R[123]|L2 \+ R2|[A-Z][A-Z0-9]? ?\/ ?[A-Za-z0-9 \-]{1,14}|d-pad[A-Za-z \-]*|✕|○|△|□)$/;

  var lang = 'en';
  var missing = Object.create(null);

  /* Collapse the &nbsp; the HUD uses for spacing so a key matches either way. */
  function key(s) { return s.replace(/[\s ]+/g, ' ').trim(); }

  function tr(core) {
    var t = TABLES[lang];
    if (!t || !core) return core;
    var k = key(core);
    if (!k) return core;
    if (Object.prototype.hasOwnProperty.call(t.exact, k)) return t.exact[k];
    for (var i = 0; i < t.rules.length; i++) {
      var m = k.match(t.rules[i][0]);
      if (m) {
        var rep = t.rules[i][1];
        return typeof rep === 'function' ? rep.apply(null, m) : k.replace(t.rules[i][0], rep);
      }
    }
    if (/[A-Za-z]{2}/.test(k) && !KEYCAPS.test(k)) missing[k] = (missing[k] || 0) + 1;
    return core;
  }

  /* Keep the node's surrounding whitespace so HUD spacing survives. */
  function translate(raw) {
    var m = raw.match(/^([\s ]*)([\s\S]*?)([\s ]*)$/);
    var out = tr(m[2]);
    return out === m[2] ? raw : m[1] + out + m[3];
  }

  /* node -> {src, out} so we can skip our own writes (no observer loop)
     and restore the English original when the language changes. */
  var seen = new WeakMap();

  /* A few words are both menu labels and the legend printed on a PS5 button.
     Inside a keycap <b> they must stay as the controller prints them. */
  var KEYCAP_ONLY = { 'Create': 1, 'Options': 1 };

  function doText(node) {
    var p = node.parentElement;
    if (p && p.tagName === 'B' && KEYCAP_ONLY[key(node.data)]) return;
    var rec = seen.get(node);
    var src = rec && rec.out === node.data ? rec.src : node.data;
    if (!src || !/[A-Za-z]/.test(src)) return;
    var out = translate(src);
    if (out !== node.data) {
      node.data = out;
      seen.set(node, { src: src, out: out });
    } else {
      seen.set(node, { src: src, out: out });
    }
  }

  var ATTRS = ['placeholder', 'title', 'aria-label'];

  function doAttrs(el) {
    if (!el.getAttribute) return;
    var store = el.__i18n || (el.__i18n = Object.create(null));
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i], cur = el.getAttribute(a);
      if (cur == null) continue;
      var rec = store[a];
      var src = rec && rec.out === cur ? rec.src : cur;
      var out = translate(src);
      store[a] = { src: src, out: out };
      if (out !== cur) el.setAttribute(a, out);
    }
  }

  /* The code input is a value the player types — never touch it. */
  function skip(el) {
    return el && (el.id === 'codebox' || el.id === 'namebox' ||
      el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.id === 'i18n-bar');
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 || skip(root)) return;
    doAttrs(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: function (n) {
        if (n.nodeType === 1) return skip(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var els = root.querySelectorAll('[placeholder],[title],[aria-label]');
    for (var i = 0; i < els.length; i++) if (!skip(els[i])) doAttrs(els[i]);
    var n;
    while ((n = w.nextNode())) doText(n);
  }

  var observer = new MutationObserver(function (muts) {
    if (lang === 'en') return;
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttrs(m.target);
      else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
    }
  });

  /* Restore every English original, then re-translate under the new language. */
  function retranslateAll() {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var n, nodes = [];
    while ((n = w.nextNode())) nodes.push(n);
    for (var i = 0; i < nodes.length; i++) {
      var rec = seen.get(nodes[i]);
      if (rec && rec.out === nodes[i].data) nodes[i].data = rec.src;
    }
    var els = document.body.querySelectorAll('[placeholder],[title],[aria-label]');
    for (var k = 0; k < els.length; k++) {
      var store = els[k].__i18n;
      if (!store) continue;
      for (var a in store) if (store[a].out === els[k].getAttribute(a)) els[k].setAttribute(a, store[a].src);
    }
    if (lang !== 'en') walk(document.body);
    var langMap = { 'zh': 'zh-CN', 'zh-Hant': 'zh-TW', 'ko': 'ko-KR', 'ja': 'ja-JP', 'de': 'de-DE', 'fr': 'fr-FR', 'pt': 'pt-BR' };
    document.documentElement.lang = langMap[lang] || 'en';
    var t = TABLES[lang];
    var title = t && t.exact ? (t.exact['Doodle District'] || 'Doodle District') : 'Doodle District';
    document.title = title;
  }

  function setLang(code) {
    if (!TABLES[code] && code !== 'en') return;
    lang = code;
    try { localStorage.setItem(LS_KEY, code); } catch (e) {}
    retranslateAll();
  }

  /* ---------- language picker ---------- */

  function buildBar() {
    var bar = document.createElement('div');
    bar.id = 'i18n-bar';
    var sel = document.createElement('select');
    LANGS.forEach(function (l) {
      var o = document.createElement('option');
      o.value = l.code; o.textContent = l.label;
      if (l.code === lang) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () { setLang(sel.value); sel.blur(); });
    /* The game grabs pointer lock on any page click — keep ours to ourselves. */
    ['mousedown', 'mouseup', 'click', 'pointerdown', 'keydown'].forEach(function (ev) {
      bar.addEventListener(ev, function (e) { e.stopPropagation(); }, true);
    });
    bar.appendChild(sel);
    document.body.appendChild(bar);

    var css = document.createElement('style');
    css.textContent =
      '#i18n-bar{position:fixed;top:10px;right:12px;z-index:99999;font-family:"Patrick Hand",system-ui,sans-serif}' +
      '#i18n-bar select{font:inherit;font-size:15px;color:#2a2a33;background:rgba(252,251,245,.9);' +
      'border:2px solid #2a2a33;border-radius:8px;padding:3px 8px;cursor:pointer;outline:none}' +
      '#i18n-bar.hidden{display:none}';
    document.head.appendChild(css);

    /* Hide it while playing (pointer locked) so it never sits over the crosshair. */
    document.addEventListener('pointerlockchange', function () {
      bar.classList.toggle('hidden', !!document.pointerLockElement);
    });
  }

  /* ---------- boot ---------- */

  function start() {
    loadTranslations();
    try { lang = localStorage.getItem(LS_KEY) || 'en'; } catch (e) {}
    if (!TABLES[lang] && lang !== 'en') lang = 'en';
    observer.observe(document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS
    });
    buildBar();
    if (lang !== 'en') retranslateAll();
  }

  window.i18n = {
    set: setLang,
    get: function () { return lang; },
    langs: LANGS,
    tables: TABLES,
    /* Untranslated copy seen on screen, most frequent first. */
    missing: function () {
      return Object.keys(missing).sort(function (a, b) { return missing[b] - missing[a]; })
        .map(function (k) { return k + '  (x' + missing[k] + ')'; });
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
