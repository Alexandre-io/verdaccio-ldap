const Auth = require('./index');

const auth = new Auth({
  client_options: {
    url: "ldaps://ldap.myorg.com",
    searchBase: 'ou=users,dc=myorg,dc=com',
    searchFilter: '(&(objectClass=posixAccount)(!(shadowExpire=0))(uid={{username}}))',
    groupDnProperty: 'cn',
    groupSearchBase: 'ou=groups,dc=myorg,dc=com',
    groupSearchFilter: '(memberUid={{dn}})',
  }
}, {logger: console})

auth.authenticate('user', 'password', function(err, results) {
  console.log(`err: ${err}, groups: ${results}`);
})
