const Promise = require('bluebird');
const rfc2253 = require('rfc2253');
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
        // _groups or memberOf could be single els or arrays.
        ...ldapUser._groups ? [].concat(ldapUser._groups).map((group) => group.cn) : [],
        ...ldapUser.memberOf ? [].concat(ldapUser.memberOf).map((groupDn) => rfc2253.parse(groupDn).get('CN')) : [],
      ];
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
      LdapClient.close();
      return ldapUser;
    })
    .asCallback(callback);
};
