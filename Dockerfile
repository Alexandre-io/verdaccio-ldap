FROM verdaccio/verdaccio:4
USER root
RUN yarn add verdaccio-ldap
USER verdaccio