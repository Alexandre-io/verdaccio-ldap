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
      # Optional
      cache: False
```

## Authentication Cache

In order to avoid too many authentication requests to the underlying
gitlab instance, the plugin provides an in-memory cache that will save
the detected groups of the users for a configurable ttl in seconds.
No clear-text password will be saved in-memory, just an SHA-256 hash
and the groups information.

By default, the cache will be enabled and the credentials will be stored
for 300 seconds. The ttl is checked on access, but there's also an
internal timer that will check expired values regularly, so data of
users not actively interacting with the system will also be eventually
invalidated.

```yaml
auth:
  ldap:
    url: https://gitlab.com
    authCache:
      enabled: (default true)
      ttl: (default: 300)
```

*Please note* that this implementation is in-memory and not
multi-process; if the cluster module is used for starting several
verdaccio processes, each process will store its own copy of the cache,
so each user will actually be logged in multiple times.

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

