const Promise = require('bluebird');
const rfc2253 = require('rfc2253');
const LdapAuth = require('ldapauth-fork');
const Cache = require('ldapauth-fork/lib/cache');
const bcrypt = require('bcryptjs');

// environment variable name to set ldap admin password
// Note: it will override the one in config file.
const LDAP_ADMIN_PASS_ENV = 'LDAP_ADMIN_PASS';

Promise.promisifyAll(LdapAuth.prototype);

function authenticatedUserGroups(user, groupNameAttribute) {
  return [
    user.cn,
    // _groups or memberOf could be single els or arrays.
    ...user._groups ? [].concat(user._groups).map((group) => group[groupNameAttribute]) : [],
    ...user.memberOf ? [].concat(user.memberOf).map((groupDn) => rfc2253.parse(groupDn).get('CN')) : [],
  ];
}

function Auth(config, stuff) {
  const self = Object.create(Auth.prototype);
  self._users = {};

  // config for this module
  self._config = config;

  // verdaccio logger
  self._logger = stuff.logger;

  // pass verdaccio logger to ldapauth
  self._config.client_options.log = stuff.logger;

  // always set ldapauth cache false
  self._config.client_options.cache = false;

  // TODO: Set more defaults
  self._config.groupNameAttribute = self._config.groupNameAttribute || 'cn';

  if (config.cache) {
    const size = typeof config.cache.size === 'number' ? config.cache.size : 100;
    const expire = typeof config.cache.expire === 'number' ? config.cache.expire : 300;
    self._userCache = new Cache(size, expire, stuff.logger, 'user');
    self._salt = bcrypt.genSaltSync();
  }

  if (LDAP_ADMIN_PASS_ENV in process.env) {
    self._config.client_options.adminPassword = process.env[LDAP_ADMIN_PASS_ENV];
  }

  return self;
}

module.exports = Auth;

//
// Attempt to authenticate user against LDAP backend
//
Auth.prototype.authenticate = function (username, password, callback) {

  const hash = this.getHashByPasswordOrLogError(username, password);
  if (this._config.cache) {
    const cached = this._userCache.get(username + hash);
    if (cached && cached.password && bcrypt.compareSync(password, cached.password)) {
      if (cached.error) {
        return callback(null, false);
      }
      const userGroups = authenticatedUserGroups(cached.user, this._config.groupNameAttribute);
      userGroups.cacheHit = true;
      return callback(null, userGroups);
    }
  }

  // ldap client
  const ldapClient = new LdapAuth(this._config.client_options);

  let currentUser;
  let currentError;

  ldapClient.authenticateAsync(username, password)
    .then((user) => {
      if (!user) {
        return [];
      }
      currentUser = user;

      return authenticatedUserGroups(user, this._config.groupNameAttribute);
    })
    .catch((err) => {
      currentError = err;
      // 'No such user' is reported via error
      this._logger.warn({ username, err }, `verdaccio-ldap error ${err}`);
      return false; // indicates failure
    })
    .finally(() => {
      if (this._config.cache) {
        this._userCache.set(username + hash, { password: hash, user: currentUser, error: currentError });
      }
      // This will do nothing with Node 10 (https://github.com/joyent/node-ldapjs/issues/483)
      ldapClient.closeAsync()
        .catch((err) => {
          this._logger.warn({ err }, `verdaccio-ldap error on close ${err}`);
        });
    })
    .asCallback(callback);

  ldapClient.on('error', (err) => {
    this._logger.warn({ err }, `verdaccio-ldap error ${err}`);
  });
};

Auth.prototype.getHashByPasswordOrLogError = function(username, password) {
  try {
    return bcrypt.hashSync(password, this._salt);
  } catch(err) {
    this._logger.warn({ username, err }, `verdaccio-ldap bcrypt hash error ${err}`);
  }
};
