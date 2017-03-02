
## Installation

```sh
$ npm install verdaccio
$ npm install verdaccio-ldap
```

## Config

Add to your `config.yaml`:

```yaml
auth:
  ldap:
    type: ldap
    groupNameAttribute: 'cn'
    client_options:
      url: "ldaps://ldap.example.com"
      adminDn: "cn=admin,dc=example,dc=com"
      adminPassword: "admin"
      searchBase: "ou=People,dc=example,dc=com"
      searchFilter: "(uid={{username}})"
      cache: False
      searchAttributes:
        - "*"
        - memberOf
      tlsOptions:
        rejectUnauthorized: False
```

## For plugin writers

It's called as:

```js
require('verdaccio-ldap')(config, stuff)
```

Where:

 - config - module's own config
 - stuff - collection of different internal verdaccio objects
   - stuff.config - main config
   - stuff.logger - logger

This should export two functions:

 - `adduser(user, password, cb)`
   
   It should respond with:
    - `cb(err)` in case of an error (error will be returned to user)
    - `cb(null, false)` in case registration is disabled (next auth plugin will be executed)
    - `cb(null, true)` in case user registered successfully
   
   It's useful to set `err.status` property to set http status code (e.g. `err.status = 403`).

 - `authenticate(user, password, cb)`
   
   It should respond with:
    - `cb(err)` in case of a fatal error (error will be returned to user, keep those rare)
    - `cb(null, false)` in case user not authenticated (next auth plugin will be executed)
    - `cb(null, [groups])` in case user is authenticated
   
   Groups is an array of all users/usergroups this user has access to. You should probably include username itself here.
   
