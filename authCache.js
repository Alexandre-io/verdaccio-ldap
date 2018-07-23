const NodeCache = require('node-cache');
const Crypto = require('crypto');

const DEFAULT_TTL = 300;

function AuthCache(logger, ttl) {
  this._logger = logger;
  this._ttl = ttl || DEFAULT_TTL;

  this._storage = new NodeCache({
    stdTTL: this._ttl,
    useClones: false
  });
  var self = this;
  this._storage.on('expired', function (key, value) {
    if (self._logger.trace()) {
      self._logger.trace('[ldap] expired key:', key, 'with value:', value);
    }
  });
}

AuthCache.prototype.DEFAULT_TTL = DEFAULT_TTL;

AuthCache.prototype.findUser = function (username, password) {
  return this._storage.get(this._generateKeyHash(username, password));
};
AuthCache.prototype.storeUser = function (username, password, userData) {
  return this._storage.set(this._generateKeyHash(username, password), userData);
};

AuthCache.prototype._generateKeyHash = function (username, password) {
  const sha = Crypto.createHash('sha256');
  sha.update(JSON.stringify({ username, password }));
  return sha.digest('hex');
};

module.exports = AuthCache;
