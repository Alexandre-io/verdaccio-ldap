const Promise = require('bluebird');
const rfc2253 = require('rfc2253');
const LdapAuth = require('ldapauth-fork');
const AuthCache = require('./authCache');

Promise.promisifyAll(LdapAuth.prototype);

function Auth(config, stuff) {
  const self = Object.create(Auth.prototype);
  self._users = {};

  // config for this module
  self._config = config;

  // verdaccio logger
  self._logger = stuff.logger;

  // pass verdaccio logger to ldapauth
  self._config.client_options.log = stuff.logger;

  // TODO: Set more defaults
  self._config.groupNameAttribute = self._config.groupNameAttribute || 'cn';

  // auth cache
  if ((self._config._authCache || {}).enabled === false) {
    self._logger.info('[ldap] auth cache disabled');
  } else {
    const ttl = (self._config._authCache || {}).ttl || AuthCache.prototype.DEFAULT_TTL;
    self._authCache = new AuthCache(self._logger, ttl);

    self._logger.info('[ldap] initialized auth cache with ttl:', ttl, 'seconds');
  }
  return self;
}


//
// Attempt to authenticate user against LDAP backend
//
Auth.prototype.authenticate = function (user, password, callback) {
  const self = this;
  self._logger.trace('[ldap] authenticate called for user:', user);

  // Try to find the user groups in the cache
  const cachedUserGroups = self._getCachedUserGroups(user, password);

  if (cachedUserGroups) {
    self._logger.debug(
      '[ldap] user found in cache:', user, 'authenticated, with groups:',
      cachedUserGroups
    );
    return callback(null, cachedUserGroups);
  }

  // Not found in cache, query ldap
  self._logger.trace('[ldap] not found user in cache:', user);

  const LdapClient = new LdapAuth(self._config.client_options);

  LdapClient.authenticateAsync(user, password)
    .then((ldapUser) => {
      if (!ldapUser) return [];
      const ownedGroups = [
        ldapUser.cn,
        // _groups or memberOf could be single els or arrays.
        ...ldapUser._groups ? [].concat(ldapUser._groups).map((group) => group.cn) : [],
        ...ldapUser.memberOf ? [].concat(ldapUser.memberOf).map((groupDn) => rfc2253.parse(groupDn).get('CN')) : [],
      ];
      // Store found groups in cache
      self._setCachedUserGroups(user, password, ownedGroups);
      self._logger.trace('[ldap] saving data in cache for user:', user);
      self._logger.debug('[ldap] user:', user, 'authenticated, with groups:', ownedGroups);
      return ownedGroups;
    })
    .catch((err) => {
      // 'No such user' is reported via error
      this._logger.warn({
        user: user,
        err: err,
      }, `LDAP error ${err}`);

      return false; // indicates failure
    })
    .finally((ldapUser) => {
      /*
       * LdapClient.closeAsync doesn't work with node 10.x
       *
       * return LdapClient.closeAsync()
       *    .catch((err) => {
       *      this._logger.warn({
       *        err: err
       *      }, 'LDAP error on close @{err}');
       *  });
       */
      if(ldapUser) {
        LdapClient.close();
      }
      return ldapUser;
    })
    .asCallback(callback);
};

Auth.prototype.authenticate = function (user, password, callback) {
  this._logger.trace('[ldap] adduser called for user:', user);
  return callback(null, true);
}

Auth.prototype._getCachedUserGroups = function (username, password) {
  if (!this._authCache) {
    return null;
  }
  const userData = this._authCache.findUser(username, password);
  return (userData || {}).groups || null;
};

Auth.prototype._setCachedUserGroups = function (username, password, groups) {
  return this._authCache && this._authCache.storeUser(username, password, { username, groups });
};

module.exports = Auth;
