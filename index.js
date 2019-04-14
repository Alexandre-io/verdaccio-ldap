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
// Convert each of the user group search results into a group name string
//
Auth.prototype.getGroupForGroup = function (group) {
  return group[this._config.groupNameAttribute];
};

//
// Convert each user.memberOf into a group name string
//
Auth.prototype.getGroupForMemberOf = function (groupDn) {
  return rfc2253.parse(groupDn).get('CN');
};

//
// Attempt to authenticate user against LDAP backend
//
Auth.prototype.authenticate = function (user, password, callback) {

  this._ldapClient.authenticateAsync(user, password)
    .then((ldapUser) => {
      if (!ldapUser) return [];

      return [
        ldapUser.cn,
        // _groups or memberOf could be single els or arrays.
        ...ldapUser._groups ? [].concat(ldapUser._groups).map(this.getGroupForGroup) : [],
        ...ldapUser.memberOf ? [].concat(ldapUser.memberOf).map(this.getGroupForMemberOf) : [],
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
    .asCallback(callback);
};
