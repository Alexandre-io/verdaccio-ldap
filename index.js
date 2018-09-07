const Promise = require('bluebird');
const rfc2253 = require('rfc2253');
const LdapAuth = require('ldapauth-fork');
const Cache = require('ldapauth-fork/lib/cache');
const bcryptjs = require('bcryptjs');

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

  // always set ldapauth cache false
  self._config.client_options.cache = false;

  // TODO: Set more defaults
  self._config.groupNameAttribute = self._config.groupNameAttribute || 'cn';

  if (config.cache) {
    self._userCache = new Cache(100, 300, stuff.logger, 'user');
    self._salt = bcrypt.genSaltSync();
  }

  return self;
}

module.exports = Auth;

//
// Attempt to authenticate user against LDAP backend
//
Auth.prototype.authenticate = function (username, password, callback) {

  if (this._config.cache) {
    const cached = this._userCache.get(username);
    if (cached && bcrypt.compareSync(password, cached.password)) {
      return callback(null, authenticatedUserGroups(cached.user));
    }
  }

  // ldap client
  const ldapClient = new LdapAuth(this._config.client_options);

  ldapClient.authenticateAsync(username, password)
    .then((user) => {
      if (!user) return [];

      if (this._config.cache) {
        try {
          const hash = bcrypt.hashSync(password, this._salt);
          this._userCache.set(username, { password: hash, user: user, });
        } catch(err) {
          this._logger.warn({
            username: username,
            err: err,
          }, `verdaccio-ldap bcrypt hash error ${err}`);
        }
      }

      return authenticatedUserGroups(user);
    })
    .catch((err) => {
      // 'No such user' is reported via error
      this._logger.warn({
        username: username,
        err: err,
      }, `verdaccio-ldap error ${err}`);

      return false; // indicates failure
    })
    .asCallback(callback);

  ldapClient.on('error', (err) => {
    this._logger.warn({
      err: err,
    }, `verdaccio-ldap error ${err}`);
  });
};

function authenticatedUserGroups(user) {
  return [
      user.cn,
      // _groups or memberOf could be single els or arrays.
      ...user._groups ? [].concat(user._groups).map((group) => group.cn) : [],
      ...user.memberOf ? [].concat(user.memberOf).map((groupDn) => rfc2253.parse(groupDn).get('CN')) : [],
  ];
}
