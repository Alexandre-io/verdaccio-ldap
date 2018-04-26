const Auth = require('./index');
const bunyan = require('bunyan');
const log = bunyan.createLogger({name: 'myapp'});

const auth = new Auth({
  client_options: {
    url: "ldaps://ldap.myorg.com",
    searchBase: 'ou=users,dc=myorg,dc=com',
    searchFilter: '(&(objectClass=posixAccount)(!(shadowExpire=0))(uid={{username}}))',
    groupDnProperty: 'cn',
    groupSearchBase: 'ou=groups,dc=myorg,dc=com',
    // If you have memberOf:
    searchAttributes: ['*', 'memberOf'],
    // Else, if you don't:
    // groupSearchFilter: '(memberUid={{dn}})',
  }
}, {logger: log})

auth.authenticate('user', 'password', function(err, results) {
  console.log(`err: ${err}, groups: ${results}`);
})
