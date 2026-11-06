# Urban Logistikk

Nettside for Urban Logistikk AS med tilbudsskjema, tjenestesider og administrasjon av transportforespørsler.

## Drift på Render

Render bygger Dockerfile fra GitHub. Blueprint-filen oppretter en webtjeneste med en vedvarende disk på /var/data. Forespørsler lagres i SQLite på denne disken. /health kontrollerer lagring og konfigurasjon.

Åpne /admin over HTTPS for å behandle forespørsler. Brukernavnet styres av ADMIN_USERNAME, og passordet ligger i ADMIN_PASSWORD i tjenestens miljøinnstillinger. FORM_RATE_LIMIT_SECRET brukes til å begrense antall innsendinger. Hold disse verdiene utenfor Git.

Nye forespørsler vises i administrasjonen. Kunden får et referansenummer etter innsending. Tidligere henvendelser fra det gamle nettstedet ligger hos den opprinnelige skjemaleverandøren.
