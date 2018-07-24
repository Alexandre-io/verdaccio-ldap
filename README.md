# verdaccio-ldap [![Build Status](https://travis-ci.org/Alexandre-io/verdaccio-ldap.svg?branch=master)](https://travis-ci.org/Alexandre-io/verdaccio-ldap) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/b15683d154d44347bccc4360d48436a7)](https://www.codacy.com/app/alexandre_io/verdaccio-ldap?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=Alexandre-io/verdaccio-ldap&amp;utm_campaign=Badge_Grade) [![Greenkeeper badge](https://badges.greenkeeper.io/Alexandre-io/verdaccio-ldap.svg)](https://greenkeeper.io/)

`verdaccio-ldap` is a fork of `sinopia-ldap`. It aims to keep backwards compatibility with `sinopia`, while keeping up with npm changes.

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
    client_options:
      url: "ldaps://ldap.example.com"
      # Only required if you need auth to bind
      adminDn: "cn=admin,dc=example,dc=com"
      adminPassword: "admin"
      # Search base for users
      searchBase: "ou=People,dc=example,dc=com"
      searchFilter: "(uid={{username}})"
      # If you are using groups, this is also needed
      groupDnProperty: 'cn',
      groupSearchBase: 'ou=groups,dc=myorg,dc=com',
      # If you have memberOf support on your ldap
      searchAttributes: ['*', 'memberOf']
      # Else, if you don't (use one or the other):
      # groupSearchFilter: '(memberUid={{dn}})'
      # 
      # Optional, default false. If true, then up to 100 credentials at a time will be cached for 5 minutes.
      cache: false
      # Optional
      reconnect: true
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
   