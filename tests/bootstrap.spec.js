const { spawn } = require('child_process');
let server;

before(function (done) {
    server = spawn('node', ['node_modules/ldap-server-mock/server.js', '--conf=../../tests/ldap-server-mock-conf.json', '--database=../../tests/users.json']);
    setTimeout(done, 1000);
});

after(function (done) {
    server.kill('SIGKILL');
    done();
});
