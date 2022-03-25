### Code of omeglit.com v2

This is a Omegle clone experiment from when Omegle still worked with Flash Player.

### How to run Docker Compose

1. Configure .env and cloudflare.ini file (if behind cloudflare)

2. Starting

`docker-compose up -d [--build for rebuilding]
`
3. Stopping

`docker-compose down
`
4. Generate certificates manually

`docker-compose run --rm certbot_cf certonly --dns-cloudflare --dns-cloudflare-credentials /root/cloudflare.ini --dns-cloudflare-propagation-seconds 10 -d omeglit.com -d www.omeglit.com
`

5. Renew certificates with a cronjob

`docker-compose run --rm certbot_cf renew --dry-run
`
### Command line local --help

**== Omeglit v2 server ==**

`node main.js [--help] [--with-http] [--localhost]`

Command line server start options:

`--help` Display this help

`--with-public-server` Serve http public folder too

`--localhost` Localhost mode (no SSL)

## Donate
https://ko-fi.com/cypherbits

Monero address:
`4BCveGZaPM7FejGkhFyHgtjVXZw52RrYxKs7znZdmnWLfB3xDKAW6SkYZPpNhqBvJA8crE8Tug8y7hx8U9KAmq83PwLtVLe`


## Licenced under
**Creative Commons 4.0 Attribution-NonCommercial-ShareAlike 4.0 International**

Legal text: https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode