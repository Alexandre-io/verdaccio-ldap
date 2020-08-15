/* jshint expr:true */
const Auth = require('../../index');
const should = require('chai').should();
const bunyan = require('bunyan');
const log = bunyan.createLogger({ name: 'verdaccio-ldap' });

describe('ldap auth', function () {
  let auth;
  describe('tests without cache', () => {
    before(() => {
      auth = new Auth({
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
    });

    it('should match user', function (done) {
      auth.authenticate('user', 'password', function (err, results) {
        (err === null).should.be.true;
        results[0].should.equal('user');
        done();
      });
    });
  });

  describe('tests with cache', () => {
    before(() => {
      auth = new Auth({
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
    });

    it('should use cache', function (done) {
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

    it('should return false and set cache', function (done) {
      const user = 'wronguser';
      const password = 'password';
      const hash = auth.getHashByPasswordOrLogError(user, password);
      const key = user + hash;
      (auth._userCache.get(key) !== null).should.be.false;
      auth.authenticate(user, password, function (err, results) {
        (err === null).should.be.true;
        results.should.be.false;
        (auth._userCache.get(key) !== null).should.be.true;
        done();
      });
    });
  });

  describe('test admin password', () => {
    let config;
    const password = '1234';
    before(() => {
      config = {
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
      };
    });

    it('should read password from config', function (done) {
      config.client_options.adminPassword = password;
      auth = new Auth(config, { logger: log });
      auth._config.client_options.adminPassword.should.equal(password);
      done()
    })

    it('should read password from env if exist', function(done) {
      process.env.LDAP_ADMIN_PASS = password;
      auth = new Auth(config, { logger: log });
      auth._config.client_options.adminPassword.should.equal(password);
      done()
    })

    it('should override password from env if exist', function(done) {
      config.client_options.adminPassword = 'asdf';
      process.env.LDAP_ADMIN_PASS = password;
      auth = new Auth(config, { logger: log });
      auth._config.client_options.adminPassword.should.equal(password);
      done()
    })
  })
});
