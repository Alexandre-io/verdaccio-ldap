# 6.0.0 / 2022-10-02
- Update npm dependencies
- Cache: use md5 instead of bcryptjs
- Remove travis ci & add github workflows

# 5.0.0 / 2022-04-22
- Update dependencies
- Drop support NodeJS < 15

# 4.2.0 / 2020-08-15
- Support using env to set adminPassword #79 (@secret104278)
- Update dev. dependencies

# 4.1.0 / 2020-05-23
- Update dependencies
- Drop support NodeJS < 12.4.0
- Add snyk

# 4.0.1 / 2020-03-11
- Update package-lock.json

# 4.0.0 / 2019-06-22
- Upgrade ldapauth-fork
- Drop support NodeJS < 8.x
- Make groupNameAttribute option take effect #59 (@jharris4)
- Fix lodash security issue
- Fix authentication issues #47 #60

# 3.1.0
- Update ldapauth-fork (Rebind admin client after reconnect)