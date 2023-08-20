FROM verdaccio/verdaccio:5
USER root
RUN npm install --global verdaccio-ldap
USER verdaccio
