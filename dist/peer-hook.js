/* ------------------------------------------------------------------
 * PeerJS 信令服务器切换 —— 同 three-hook.js / paper.js 的思路，不动 game.js
 *
 * game.js 里是 `new window.Peer(id, {debug, config:{iceServers}})`，选项里没有
 * host/port，所以默认连公共服务 0.peerjs.com。这里把 window.Peer 包一层，在
 * 本地开发时把 host/port/path/key 合并进去，指向 peerserver-go。
 *
 * 生效规则（按优先级）：
 *   1. ?peer=cloud                  → 强制用官方公共服务
 *   2. ?peer=host:port 或 ?peer=1   → 强制用指定/默认本地服务
 *   3. window.PEER_SERVER = {...}   → 直接给一份 peerjs 选项
 *   4. 页面跑在 localhost 上         → 自动用 localhost:9000（run.sh 起的那个）
 *   5. 页面跑在 SELF_HOSTED 域名上   → 同源的 wss://<域名>/peerjs（nginx 反代到 127.0.0.1:9000）
 *   6. 其它                          → 不改动，走公共服务
 *
 * 本地模式下 game.js 自己会把房号前缀切成 doodledev-，和线上房号天然隔离。
 * ------------------------------------------------------------------ */

(function () {
  var DEFAULT_PORT = 9000;
  /* 自建信令服务的线上域名：nginx 把 /peerjs 反代到本机 9000，走同源同端口。 */
  var SELF_HOSTED = ['cs.igami.top'];
  var Real = window.Peer;
  if (typeof Real !== 'function') return;

  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var param = new URLSearchParams(location.search).get('peer');

  function serverFor() {
    if (param === 'cloud' || param === '0' || param === 'off') return null;
    if (param) {
      var host = param === '1' || param === 'local' ? location.hostname : param.split(':')[0];
      var port = Number(param.split(':')[1]) || DEFAULT_PORT;
      return { host: host, port: port, path: '/', key: 'peerjs', secure: location.protocol === 'https:' };
    }
    if (window.PEER_SERVER) return window.PEER_SERVER;
    if (SELF_HOSTED.indexOf(location.hostname) !== -1) {
      var https = location.protocol === 'https:';
      return {
        host: location.hostname,
        port: Number(location.port) || (https ? 443 : 80),
        path: '/',
        key: 'peerjs',
        secure: https
      };
    }
    if (isLocal) {
      return { host: location.hostname, port: DEFAULT_PORT, path: '/', key: 'peerjs', secure: false };
    }
    return null;
  }

  var server = serverFor();
  var stats = { server: server, peers: 0 };
  window.peerHook = stats;
  if (!server) return;

  console.log('[peer-hook] signalling via ' + (server.secure ? 'wss' : 'ws') + '://' +
    server.host + ':' + server.port + (server.path || '/') + 'peerjs?key=' + server.key);

  /* 只补 game.js 没给的连接参数，debug / config.iceServers 一律保留原值。 */
  function merge(options) {
    var out = {};
    for (var k in server) out[k] = server[k];
    for (var j in options) out[j] = options[j];
    out.host = server.host;
    out.port = server.port;
    out.path = server.path || '/';
    out.key = server.key || 'peerjs';
    out.secure = !!server.secure;
    return out;
  }

  function Hooked(id, options) {
    stats.peers++;
    return new Real(id, merge(options));
  }
  Hooked.prototype = Real.prototype;
  for (var k in Real) Hooked[k] = Real[k];   /* Peer.utils 等静态成员 */

  window.Peer = Hooked;
})();
