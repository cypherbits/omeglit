FROM node:16-alpine as production

COPY . /opt/omeglit

RUN cd /opt/omeglit && npm update

ENTRYPOINT node /opt/omeglit/main.js

FROM production as dev

ENTRYPOINT node /opt/omeglit/main.js --localhost