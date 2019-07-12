const Auth = require('../../index');
const should = require('chai').should();
const bunyan = require('bunyan');
const log = bunyan.createLogger({ name: 'verdaccio-ldap' });


describe('ldap auth', function () {
  it('should match user', function (done) {

    const auth = new Auth({
      client_options: {
        url: "ldap://localhost:4389",
        searchBase: 'ou=users,dc=myorg,dc=com',
        searchFilter: '(&(objectClass=posixAccount)(!(shadowExpire=0))(uid={{username}}))',
        groupDnProperty: 'cn',
        groupSearchBase: 'ou=groups,dc=myorg,dc=com',
        // If you have memberOf:
        searchAttributes: ['*', 'memberOf'],
        // Else, if you don't:
        // groupSearchFilter: '(memberUid={{dn}})',
      }
    }, { logger: log });

    auth.authenticate('user', 'password', function (err, results) {
      (err === null).should.be.true;
      results[0].should.equal('user');
      done();
    });

  });

  it('should use cache', function (done) {
    const auth = new Auth({
      cache: true,
      client_options: {
        url: "ldap://localhost:4389",
        searchBase: 'ou=users,dc=myorg,dc=com',
        searchFilter: '(&(objectClass=posixAccount)(!(shadowExpire=0))(uid={{username}}))',
        groupDnProperty: 'cn',
        groupSearchBase: 'ou=groups,dc=myorg,dc=com',
        // If you have memberOf:
        searchAttributes: ['*', 'memberOf'],
        // Else, if you don't:
        // groupSearchFilter: '(memberUid={{dn}})',
      }
    }, { logger: log });

    auth.authenticate('user', 'password', function (err, results) {
      (err === null).should.be.true;
      should.not.exist(results.cacheHit);
      results[0].should.equal('user');

      auth.authenticate('user', 'password', function (err, results) {
        (err === null).should.be.true;
        results.cacheHit.should.be.true;
        results[0].should.equal('user');
        done();
      });
    });
  });
});
