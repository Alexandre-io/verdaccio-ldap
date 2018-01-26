const Promise = require('bluebird');
const LdapAuth = require('ldapauth-fork');

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

  return self;
}

module.exports = Auth;

//
// Attempt to authenticate user against LDAP backend
//
Auth.prototype.authenticate = function (user, password, callback) {
  const LdapClient = new LdapAuth(this._config.client_options);

  LdapClient.authenticateAsync(user, password)
  .then((ldapUser) => {
    if (!ldapUser) return [];

    return [
      ldapUser.cn,
      ...ldapUser._groups ? ldapUser._groups.map((group) => group.cn) : []
    ];
  })
  .catch((err) => {
    // 'No such user' is reported via error
    this._logger.warn({
      user: user,
      err: err,
    }, 'LDAP error @{err}');

    return false; // indicates failure
  })
  .finally(() => {
    return LdapClient.closeAsync()
    .catch((err) => {
      this._logger.warn({
        err: err
      }, 'LDAP error on close @{err}');
    })
  })
  .asCallback(callback);
};
