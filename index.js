const Promise = require('bluebird');
const rfc2253 = require('rfc2253');
const LdapAuth = require('ldapauth-fork');

Promise.promisifyAll(LdapAuth.prototype);

function Auth(config, stuff) {
  const self = Object.create(Auth.prototype);
  self._users = {};
  // default cache time is 3 minutes
  self.cacheTime = config.cacheTime || 1000 * 60 * 3;

  // config for this module
  self._config = config;

  // verdaccio logger
  self._logger = stuff.logger;

  // pass verdaccio logger to ldapauth
  self._config.client_options.log = stuff.logger;

  // TODO: Set more defaults
  self._config.groupNameAttribute = self._config.groupNameAttribute || 'cn';

  // ldap client
  self._ldapClient = new LdapAuth(self._config.client_options);

  self._ldapClient.on('error', (err) => {
    self._logger.warn({
      err: err,
    }, `LDAP error ${err}`);
  });

  return self;
}

module.exports = Auth;

//
// Attempt to authenticate user against LDAP backend
//
Auth.prototype.authenticate = function (user, password, callback) {
  var cache = this.getCacheUser(user);
  if(cache) {
    return callback(null, cache);
  }
  this._ldapClient.authenticateAsync(user, password)
    .then((ldapUser) => {
      if (!ldapUser) return [];
      var res = [
        ldapUser.cn,
        // _groups or memberOf could be single els or arrays.
        ...ldapUser._groups ? [].concat(ldapUser._groups).map((group) => group.cn) : [],
        ...ldapUser.memberOf ? [].concat(ldapUser.memberOf).map((groupDn) => rfc2253.parse(groupDn).get('CN')) : [],
      ];
      if(this.cacheTime) {
        this.setCacheUser(user, res);
      }
      return res;
    })
    .catch((err) => {
      // 'No such user' is reported via error
      this._logger.warn({
        user: user,
        err: err,
      }, `LDAP error ${err}`);

      return false; // indicates failure
    })
    .asCallback(callback);
};

Auth.prototype.getCacheUser = function(user) {
  if(!this._users[user]) {
    return null;
  }
  var cacheUser = this._users[user];
  if(Date.now() > cacheUser.expiredTime) {
    delete this._users[user];
    return null;
  }
  this.setCacheUser(user, cacheUser.data);
  return cacheUser.data;
};

Auth.prototype.setCacheUser = function(user, data) {
  this._users[user] = {
    data,
    expiredTime: Date.now() + this.cacheTime
  };
};

Auth.prototype.clearCacheUser = function() {
  this._users = {};
};
